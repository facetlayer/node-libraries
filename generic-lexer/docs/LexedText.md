# LexedText

Container for the result of `lexifyString()`. Holds the token array and
provides methods for extracting text from tokens.

## Properties

- `tokens: Token[]` - Array of all tokens
- `originalStr: string` - The original input string

## Methods

### getTokenText(token)

Extract the raw text for a token from the original string.

```typescript
const text = lexifyString("hello world")
text.getTokenText(text.tokens[0])  // "hello"
```

### getUnquotedText(token)

Like `getTokenText`, but for quoted strings it strips the surrounding quotes
and processes escape sequences (`\n`, `\t`, `\\`, `\"`, `\'`, `\0`, `\b`, `\f`, `\v`).

```typescript
const text = lexifyString(`"hello\\nworld"`)
text.getTokenText(text.tokens[0])     // '"hello\\nworld"'
text.getUnquotedText(text.tokens[0])  // 'hello\nworld'
```

For non-quoted tokens, returns the same as `getTokenText`.

### getTextRange(startTokenIndex, endTokenIndex)

Extract the original source text spanning from `startTokenIndex` (inclusive)
to `endTokenIndex` (exclusive).

```typescript
const text = lexifyString("a + b * c")
text.getTextRange(0, 3)  // "a + b" (tokens 0, 1, 2)
```

### getLastTokenIndex()

Returns the total number of tokens (same as `tokens.length`).

### tokenCharIndex(tokenIndex) / startCharOfToken(tokenIndex) / endCharOfToken(tokenIndex)

Get the character position in the original string for a given token index.

### toDebugDump()

Returns a human-readable dump of all tokens for debugging:

```
ident: textStart=0 textEnd=5 text=hello
space: textStart=5 textEnd=6 text=
ident: textStart=6 textEnd=11 text=world
```

## Token Interface

Each `Token` object has these fields:

| Field | Type | Description |
|-------|------|-------------|
| `match` | `TokenDef` | Which token type matched (e.g., `t_ident`, `t_lparen`) |
| `length` | `number` | Character length of the token |
| `tokenIndex` | `number` | Index in the token array |
| `textStart` | `number` | Start position in original string |
| `textEnd` | `number` | End position in original string |
| `lineStart` | `number` | Line number (1-based) |
| `lineEnd` | `number` | End line number (for multiline tokens like strings) |
| `columnStart` | `number` | Column number (1-based) |
| `leadingIndent` | `number` | Number of spaces at the start of this token's line |
| `pairsWithIndex` | `number?` | Token index of matching bracket (for bracket tokens) |
| `error` | `string?` | Error message if bracket is mismatched |
