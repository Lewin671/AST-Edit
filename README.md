# AST-Edit

Simple demo app for precise AST-based code editing with intelligent multi-match detection.

## Features

✨ **AST-Based Precision**: Uses Tree-sitter to understand code structure, not just text patterns
🔍 **Whitespace Tolerant**: Matches code regardless of formatting differences
⚠️ **Multi-Match Detection**: Automatically detects and reports when a pattern matches multiple locations
🎯 **Smart Error Messages**: Provides detailed information about all matches found

## Quick Start

Install dependencies:

```bash
pnpm install
```

Run development server:

```bash
pnpm dev
```

Build for production:

```bash
pnpm build
```

## Multi-Match Detection

When your search pattern matches multiple locations in the code, AST-Edit will:

1. ❌ **Refuse to perform the replacement** - preventing unintended changes
2. 📊 **Show the number of matches** found at the same quality level
3. 📍 **Display match details** including:
   - AST node type
   - Line number range
   - Code snippet preview
   - Match type (exact/normalized/no-whitespace)

### Example

If you search for `let result = 0` in code that has multiple variable declarations, you'll see:

```
⚠️ Found 2 exact matches. Please make your search pattern more specific to match only one location.

Matches:
1. expression_statement (Lines 3-3): let result = 0
2. expression_statement (Lines 8-8): let result = 0
```

This helps you refine your search pattern to be more specific and ensures you're editing exactly what you intended.

## License

MIT

