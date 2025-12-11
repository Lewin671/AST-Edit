import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('web-tree-sitter', () => {
  interface Point { row: number; column: number }
  interface SyntaxNode {
    type: string;
    text: string;
    startIndex: number;
    endIndex: number;
    startPosition: Point;
    endPosition: Point;
    children: SyntaxNode[];
    childCount: number;
  }

  const buildTree = (input: string) => {
    const NEWLINE_LENGTH = 1;
    const lines = input.split('\n');
    const children: SyntaxNode[] = [];
    let offset = 0;
    let row = 0;

    for (const line of lines) {
      const length = line.length;

      if (length > 0) {
        const startIndex = offset;
        const endIndex = offset + length;
        const node: SyntaxNode = {
          type: 'statement',
          text: line,
          startIndex,
          endIndex,
          startPosition: { row, column: 0 },
          endPosition: { row, column: length },
          children: [],
          childCount: 0
        };

        children.push(node);
      }

      const newlineLength = row < lines.length - 1 ? NEWLINE_LENGTH : 0;
      offset += length + newlineLength;
      row += 1;
    }

    return {
      rootNode: {
        type: 'program',
        text: input,
        startIndex: 0,
        endIndex: input.length,
        startPosition: { row: 0, column: 0 },
        endPosition: { row: Math.max(row - 1, 0), column: lines[lines.length - 1]?.length ?? 0 },
        children,
        childCount: children.length
      },
      delete() {}
    };
  };

  class MockParser {
    parse(input: string) {
      return buildTree(input);
    }
    setLanguage() {}
  }

  const MockTreeSitter = Object.assign(MockParser, {
    init: vi.fn(async () => {}),
    Language: { load: vi.fn(async () => ({})) }
  });

  return { default: MockTreeSitter };
});

import { initParser, performAstEdit } from './astEngine';

describe('performAstEdit', () => {
  beforeAll(async () => {
    await initParser();
  });

  it('matches and replaces consecutive top-level statements', () => {
    const source = 'const a = 1;\nconst b = 2;\nconst c = 3;';
    const oldString = 'const a = 1;\nconst b = 2;';

    const result = performAstEdit(source, oldString, '// replaced');

    expect(result.success).toBe(true);
    expect(result.newCode).toBe('// replaced\nconst c = 3;');
  });
});
