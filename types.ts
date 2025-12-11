export type MatchType = 'exact' | 'ast' | 'token';

export interface EditResult {
  success: boolean;
  message: string;
  newCode: string | null;
  matchRange?: {
    start: { row: number; column: number; index: number };
    end: { row: number; column: number; index: number };
  };
  matchType?: MatchType;
  multipleMatches?: {
    count: number;
    matches: Array<{
      text: string;
      type: string;
      startLine: number;
      endLine: number;
      matchType: MatchType;
    }>;
  };
}

export enum EngineStatus {
  LOADING = 'LOADING',
  READY = 'READY',
  ERROR = 'ERROR'
}

// Minimal type definitions for web-tree-sitter to avoid explicit dependency errors in this environment
// In a real project, we would rely on @types/web-tree-sitter
export interface Point {
  row: number;
  column: number;
}

export interface SyntaxNode {
  type: string;
  text: string;
  startIndex: number;
  endIndex: number;
  startPosition: Point;
  endPosition: Point;
  children: SyntaxNode[];
  childCount: number;
}

export interface Tree {
  rootNode: SyntaxNode;
  delete(): void;
}

export interface Parser {
  parse(input: string): Tree;
  setLanguage(language: any): void;
  delete(): void;
}
