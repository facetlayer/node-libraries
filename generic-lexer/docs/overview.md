# generic-lexer Overview

A generic lexer (tokenizer) for source code. Works well with many mainstream
syntaxes including JavaScript, TypeScript, SQL, and similar languages.

## Quick Start

```typescript
import { lexifyString, lexStringToIterator, t_ident, t_equals } from '@facetlayer/generic-lexer'

// Option 1: Get a LexedText object with token array
const text = lexifyString("const x = 42;")
console.log(text.tokens.length)               // 7
console.log(text.getTokenText(text.tokens[0])) // "const"

// Option 2: Get a TokenIterator for parsing
const it = lexStringToIterator("const x = 42;")
it.nextText()      // "const"
it.nextIs(t_ident)  // true
it.consume()        // advance past "const"
it.consumeAsText()  // "x" (returns text and advances)
it.consume(t_equals) // assert "=" and advance
```

## Settings

Pass a `LexerSettings` object as the second argument:

```typescript
const text = lexifyString(code, {
  autoSkipSpaces: true,      // Omit space tokens from output
  autoSkipNewlines: true,    // Omit newline tokens from output
  cStyleLineComments: true,  // Recognize // as line comments
  cStyleBlockComments: true, // Recognize /* */ as block comments
  bashStyleLineComments: true, // Recognize # as line comments
})
```

All settings are optional and default to `false`.

## How It Works

1. Scans the input string character by character
2. Matches multi-character operators first (`===`, `==`, `=>`, `->`, `||`, `&&`, etc.)
3. Then checks for comments, integers, identifiers, quoted strings, spaces
4. Falls back to single-character token matching
5. Unrecognized characters get the `t_unrecognized` token type
6. Bracket pairs (`()`, `[]`, `{}`) are automatically matched via `pairsWithIndex`

## Key Concepts

- **Token**: A matched piece of text with its type, position, and line/column info
- **TokenDef**: Defines a token type (e.g., `t_lparen`, `t_ident`, `t_equals`)
- **LexedText**: Container holding the token array and original source string
- **TokenIterator**: Cursor-based API for consuming tokens during parsing
