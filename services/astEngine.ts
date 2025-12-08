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
 * Normalizes code strings to ignore whitespace differences.
 * Collapses multiple spaces/newlines into a single space and trims.
 */
const normalize = (str: string): string => {
  return str.replace(/\s+/g, ' ').trim();
};

/**
 * Removes all whitespace for strict comparison.
 */
const removeAllWhitespace = (str: string): string => {
  return str.replace(/\s+/g, '');
};

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

interface MatchCandidate {
  node: SyntaxNode;
  score: number; // Higher is better
  matchType: 'exact' | 'normalized' | 'no-whitespace';
}

/**
 * Collects all potential matching nodes with their match quality scores.
 */
const collectMatchCandidates = (
  node: SyntaxNode,
  originalTarget: string,
  normalizedTarget: string,
  noWhitespaceTarget: string,
  candidates: MatchCandidate[]
): void => {
  const nodeText = node.text;
  const normalizedNodeText = normalize(nodeText);
  const noWhitespaceNodeText = removeAllWhitespace(nodeText);

  // Exact match (highest priority)
  if (nodeText === originalTarget) {
    candidates.push({ node, score: 100, matchType: 'exact' });
  }
  // Normalized match (ignore extra whitespace)
  else if (normalizedNodeText === normalizedTarget) {
    candidates.push({ node, score: 80, matchType: 'normalized' });
  }
  // No-whitespace match (most flexible)
  else if (noWhitespaceNodeText === noWhitespaceTarget) {
    candidates.push({ node, score: 60, matchType: 'no-whitespace' });
  }

  // Recurse into children
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      collectMatchCandidates(child, originalTarget, normalizedTarget, noWhitespaceTarget, candidates);
    }
  }
};

/**
 * Finds the best matching node. Prefers:
 * 1. Exact matches
 * 2. Normalized matches (whitespace-insensitive)
 * 3. No-whitespace matches
 * Among equal scores, prefers smaller (more specific) nodes.
 */
const findBestMatch = (
  node: SyntaxNode,
  originalTarget: string,
  normalizedTarget: string,
  noWhitespaceTarget: string
): { node: SyntaxNode; matchType: string } | null => {
  const candidates: MatchCandidate[] = [];
  collectMatchCandidates(node, originalTarget, normalizedTarget, noWhitespaceTarget, candidates);

  if (candidates.length === 0) return null;

  // Sort by score (desc), then by text length (asc) to get the most specific match
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.node.text.length - b.node.text.length;
  });

  const best = candidates[0];
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
  
  const normalizedTarget = normalize(oldString);
  const noWhitespaceTarget = removeAllWhitespace(oldString);
  
  try {
    const result = findBestMatch(tree.rootNode, oldString, normalizedTarget, noWhitespaceTarget);

    if (!result) {
      return {
        success: false,
        message: "No matching syntax node found. Check if your search pattern corresponds to a valid AST node.",
        newCode: null
      };
    }

    const { node: match, matchType } = result;

    // Perform replacement using exact indices from the AST
    const before = sourceCode.slice(0, match.startIndex);
    const after = sourceCode.slice(match.endIndex);
    const newCode = before + newString + after;

    // Generate descriptive message based on match type
    const matchTypeDesc = matchType === 'exact' 
      ? 'exact match' 
      : matchType === 'normalized' 
        ? 'whitespace-normalized match'
        : 'structure match (ignoring all whitespace)';

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