import * as TreeSitterModule from 'web-tree-sitter';
import { EditResult, SyntaxNode, Parser as IParser } from '../types';

// Handle ES module interop: web-tree-sitter might be the default export or the module itself depending on the environment
const TreeSitter = (TreeSitterModule as any).default || TreeSitterModule;

// URLs for WASM binaries - using jsDelivr which supports CORS
// Ensure the version matches the JS library version (0.20.8) to prevent ABI mismatch
const TREE_SITTER_WASM_URL = 'https://cdn.jsdelivr.net/npm/web-tree-sitter@0.20.8/tree-sitter.wasm';
const JS_LANG_WASM_URL = 'https://cdn.jsdelivr.net/npm/tree-sitter-wasms@0.1.13/out/tree-sitter-javascript.wasm';

let parser: IParser | null = null;

/**
 * Initializes the Tree-sitter parser and loads the JavaScript language.
 */
export const initParser = async (): Promise<void> => {
  if (parser) return;

  try {
    await TreeSitter.init({
      locateFile: () => TREE_SITTER_WASM_URL,
    });
    parser = new TreeSitter();
    const Lang = await TreeSitter.Language.load(JS_LANG_WASM_URL);
    if (parser) {
      parser.setLanguage(Lang);
    }
  } catch (e) {
    console.error("Failed to initialize parser:", e);
    throw e;
  }
};

/**
 * Recursively compares two AST nodes for structural equivalence.
 * Ignores whitespace, comments, and trailing commas/semicolons, focuses on syntax structure.
 */
const compareAstNodes = (node1: SyntaxNode, node2: SyntaxNode): boolean => {
  // Must have the same node type
  if (node1.type !== node2.type) return false;
  
  // For leaf nodes (terminals), compare text content
  if (node1.childCount === 0 && node2.childCount === 0) {
    return node1.text === node2.text;
  }
  
  // Filter out non-significant children (comments, whitespace, and trailing punctuation)
  const getSignificantChildren = (node: SyntaxNode) => {
    const children = node.children.filter(child => 
      !child.type.includes('comment') && 
      child.type !== 'ERROR'
    );
    
    // Remove trailing comma or semicolon if it's the last child
    if (children.length > 0) {
      const lastChild = children[children.length - 1];
      if (lastChild.type === ',' || lastChild.type === ';') {
        return children.slice(0, -1);
      }
    }
    
    return children;
  };
  
  const children1 = getSignificantChildren(node1);
  const children2 = getSignificantChildren(node2);
  
  // Must have same number of significant children
  if (children1.length !== children2.length) return false;
  
  // Recursively compare all children
  for (let i = 0; i < children1.length; i++) {
    if (!compareAstNodes(children1[i], children2[i])) {
      return false;
    }
  }
  
  return true;
};

/**
 * Checks if two code snippets are AST-equivalent by comparing their parsed AST structures.
 * This ignores formatting differences like whitespace, comments, etc.
 */
const areAstEquivalent = (code1: string, code2: string): boolean => {
  if (!parser) return false;
  
  try {
    const tree1 = parser.parse(code1);
    const tree2 = parser.parse(code2);
    
    const isEquivalent = compareAstNodes(tree1.rootNode, tree2.rootNode);
    
    tree1.delete();
    tree2.delete();
    
    return isEquivalent;
  } catch (e) {
    return false;
  }
};

interface MatchCandidate {
  node: SyntaxNode;
  score: number; // Higher is better
  matchType: 'exact' | 'ast';
}

/**
 * Collects all potential matching nodes with their match quality scores.
 */
const collectMatchCandidates = (
  node: SyntaxNode,
  targetCode: string,
  candidates: MatchCandidate[]
): void => {
  const addCandidate = (candidateNode: SyntaxNode, candidateText: string) => {
    if (candidateText === targetCode) {
      candidates.push({ node: candidateNode, score: 100, matchType: 'exact' });
    } else if (areAstEquivalent(candidateText, targetCode)) {
      candidates.push({ node: candidateNode, score: 80, matchType: 'ast' });
    }
  };

  const nodeText = node.text;
  addCandidate(node, nodeText);

  // Also consider sequences of consecutive siblings to handle multi-statement matches
  if (node.children && node.children.length > 1) {
    const parentStart = node.startIndex;
    const SEQUENCE_LIMIT = 200;
    let sequenceCount = 0;

    for (let i = 0; i < node.children.length; i++) {
      const startChild = node.children[i];
      for (let j = i + 1; j < node.children.length; j++) {
        if (sequenceCount >= SEQUENCE_LIMIT) break;
        const endChild = node.children[j];

        // Avoid duplicating the full parent span
        if (i === 0 && j === node.children.length - 1) continue;

        const combinedText = nodeText.slice(
          startChild.startIndex - parentStart,
          endChild.endIndex - parentStart
        );

        const combinedNode: SyntaxNode = {
          type: `${node.type}_sequence`,
          text: combinedText,
          startIndex: startChild.startIndex,
          endIndex: endChild.endIndex,
          startPosition: startChild.startPosition,
          endPosition: endChild.endPosition,
          children: node.children.slice(i, j + 1),
          childCount: j - i + 1
        };

        addCandidate(combinedNode, combinedText);
        sequenceCount++;
      }
      if (sequenceCount >= SEQUENCE_LIMIT) break;
    }
  }

  // Recurse into children
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      collectMatchCandidates(child, targetCode, candidates);
    }
  }
};

/**
 * Finds the best matching node. Prefers:
 * 1. Exact matches
 * 2. AST-equivalent matches (syntax structure)
 * Among equal scores, prefers smaller (more specific) nodes.
 * Returns error if multiple matches are found.
 */
const findBestMatch = (
  node: SyntaxNode,
  targetCode: string
): { node: SyntaxNode; matchType: string; candidates?: MatchCandidate[] } | null => {
  const candidates: MatchCandidate[] = [];
  collectMatchCandidates(node, targetCode, candidates);

  if (candidates.length === 0) return null;

  // Sort by score (desc), then by text length (asc) to get the most specific match
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.node.text.length - b.node.text.length;
  });

  const best = candidates[0];
  
  // Check if there are multiple matches at the same quality level
  const topScore = best.score;
  const topMatches = candidates.filter(c => c.score === topScore);
  
  if (topMatches.length > 1) {
    // Multiple matches found at the same quality level
    return { node: best.node, matchType: best.matchType, candidates: topMatches };
  }

  return { node: best.node, matchType: best.matchType };
};

/**
 * Performs the AST-assisted find and replace.
 */
export const performAstEdit = (
  sourceCode: string,
  oldString: string,
  newString: string
): EditResult => {
  if (!parser) {
    return {
      success: false,
      message: "Parser not initialized",
      newCode: null
    };
  }

  if (!oldString.trim()) {
     return {
      success: false,
      message: "Search string cannot be empty",
      newCode: null
    };
  }

  let tree;
  try {
    tree = parser.parse(sourceCode);
  } catch (e) {
    return {
      success: false,
      message: "Failed to parse source code",
      newCode: null
    };
  }
  
  try {
    const result = findBestMatch(tree.rootNode, oldString);

    if (!result) {
      return {
        success: false,
        message: "No matching syntax node found. Check if your search pattern corresponds to a valid AST node.",
        newCode: null
      };
    }

    const { node: match, matchType, candidates } = result;

    // Check for multiple matches
    if (candidates && candidates.length > 1) {
      const matchDetails = candidates.slice(0, 5).map(c => ({
        text: c.node.text.length > 60 ? c.node.text.substring(0, 57) + '...' : c.node.text,
        type: c.node.type,
        startLine: c.node.startPosition.row + 1,
        endLine: c.node.endPosition.row + 1,
        matchType: c.matchType
      }));

      const matchTypeDesc = matchType === 'exact' 
        ? 'exact matches' 
        : 'AST-equivalent matches (syntax structure)';

      return {
        success: false,
        message: `Found ${candidates.length} ${matchTypeDesc}. Please make your search pattern more specific to match only one location.`,
        newCode: null,
        multipleMatches: {
          count: candidates.length,
          matches: matchDetails
        }
      };
    }

    // Perform replacement using exact indices from the AST
    const before = sourceCode.slice(0, match.startIndex);
    const after = sourceCode.slice(match.endIndex);
    const newCode = before + newString + after;

    // Generate descriptive message based on match type
    const matchTypeDesc = matchType === 'exact' 
      ? 'exact match' 
      : 'AST-equivalent match';

    return {
      success: true,
      message: `Replaced '${match.type}' (${matchTypeDesc})`,
      newCode,
      matchRange: {
        start: { ...match.startPosition, index: match.startIndex },
        end: { ...match.endPosition, index: match.endIndex }
      }
    };

  } finally {
    if (tree) {
      tree.delete();
    }
  }
};
