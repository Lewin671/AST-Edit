# AST-Edit

A demo app for precise, AST-based code editing using Tree-sitter.

## Features
- **AST precision**: Edits code by structure, not just text
- **Whitespace & punctuation tolerant**: Ignores formatting and trailing commas/semicolons
- **Multi-match detection**: Prevents accidental edits when multiple matches are found
- **Clear error messages**: Shows match details for easy refinement

## Usage

Install dependencies:
```bash
pnpm install
```

Start dev server:
```bash
pnpm dev
```

Build for production:
```bash
pnpm build
```

## Multi-Match Example
If your search matches multiple locations, AST-Edit will refuse to edit and show match details (type, lines, preview) to help you refine your pattern.

## License
MIT

