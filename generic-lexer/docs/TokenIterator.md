# TokenIterator

Cursor-based API for consuming tokens one at a time. This is the main tool
for writing parsers on top of generic-lexer.

## Creating an Iterator

```typescript
import { lexStringToIterator, lexifyString, TokenIterator } from '@facetlayer/generic-lexer'

// Shorthand
const it = lexStringToIterator("x = 42")

// Or from a LexedText
const text = lexifyString("x = 42")
const it = new TokenIterator(text)
```

## Peeking

```typescript
it.next()           // Get the Token object at current position
it.next(1)          // Lookahead by 1 position
it.next(-1)         // Look back by 1 position
it.nextText()       // Get the text of the current token (e.g., "x")
it.nextText(1)      // Text of the next token (e.g., "=")
it.nextUnquotedText()  // Text with quotes removed and escapes processed
it.nextLength()     // Character length of the current token
it.finished()       // true if no more tokens
it.finished(2)      // true if fewer than 3 tokens remain
```

## Type Checking

```typescript
import { t_equals, t_ident, t_lparen } from '@facetlayer/generic-lexer'

it.nextIs(t_equals)           // true if current token is "="
it.nextIs(t_ident, 1)         // true if next token is an identifier
it.nextIsIdentifier("const")  // true if current token is the identifier "const"
it.nextIsIdentifier("let", 1) // true if next token is the identifier "let"
```

## Consuming

All consume methods advance the position forward.

```typescript
it.consume()              // Advance past the current token
it.consume(t_equals)      // Assert current token is "=", then advance
                          // Throws if it doesn't match
it.consumeIdentifier("fn") // Assert current token is identifier "fn", then advance

it.consumeAsText()        // Consume and return the text (e.g., "42")
it.consumeAsUnquotedText() // Consume and return unquoted text

it.tryConsume(t_semicolon)  // Consume if it matches, return true/false
                             // Does NOT throw on mismatch

// Consume multiple tokens while a condition holds
const text = it.consumeAsTextWhile(token => token.match !== t_rparen)
// Returns concatenated text of all consumed tokens
```

## Skipping

```typescript
it.skipSpaces()           // Skip all t_space tokens
it.skipNewlines()         // Skip all t_space and t_newline tokens
it.skipUntilNewline()     // Skip to (and past) the next newline
it.skipWhile(t => t.match !== t_semicolon)  // Skip while condition is true
```

Aliases: `consumeSpace()` = `skipSpaces()`, `consumeWhitespace()` = `skipNewlines()`

## Position Control

```typescript
const pos = it.getPosition()  // Save current position
// ... try some parsing ...
it.restore(pos)               // Backtrack to saved position

it.jumpTo(5)                  // Jump to token index 5
it.advance()                  // Move forward by 1 (same as consume with no assertion)

const copy = it.copy()        // Create a new iterator at the same position
```

## Source Position Helpers

```typescript
it.getReadableSourcePos(it.getPosition())  // "line 3, char 10"

it.toSourcePos(firstToken, lastToken)
// { posStart, posEnd, lineStart, columnStart, lineEnd, columnEnd }

it.spanToString(startTokenIndex, endTokenIndex)  // Extract original text
```

## Error Messages

When `consume()` fails, it throws a descriptive error:

```
expected token: lparen, found: ident (NOT)
```

This tells you: (1) what was expected, (2) what token type was found, and
(3) the actual text of the unexpected token.

## Example: Simple Expression Parser

```typescript
import { lexStringToIterator, t_lparen, t_rparen, t_comma } from '@facetlayer/generic-lexer'

function parseFunctionCall(input: string) {
  const it = lexStringToIterator(input, { autoSkipSpaces: true })

  const name = it.consumeAsText()
  it.consume(t_lparen)

  const args: string[] = []
  while (!it.tryConsume(t_rparen)) {
    if (args.length > 0) it.consume(t_comma)
    args.push(it.consumeAsText())
  }

  return { name, args }
}

parseFunctionCall("foo(a, b, c)")
// { name: "foo", args: ["a", "b", "c"] }
```
