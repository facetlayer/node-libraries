# Token Types

All token constants are exported from the package. Import them directly:

```typescript
import { t_lparen, t_ident, t_equals, ... } from '@facetlayer/generic-lexer'
```

## Brackets (auto-paired)

| Constant | Text | Pairs With |
|----------|------|------------|
| `t_lparen` | `(` | `t_rparen` |
| `t_rparen` | `)` | `t_lparen` |
| `t_lbracket` | `[` | `t_rbracket` |
| `t_rbracket` | `]` | `t_lbracket` |
| `t_lbrace` | `{` | `t_rbrace` |
| `t_rbrace` | `}` | `t_lbrace` |

Bracket tokens have a `pairsWithIndex` field pointing to the token index of
their matching bracket. If brackets are mismatched, the token gets an `error` field.

## Comparison Operators

| Constant | Text |
|----------|------|
| `t_lthan` | `<` |
| `t_gthan` | `>` |
| `t_lthaneq` | `<=` |
| `t_gthaneq` | `>=` |

## Equality Operators

| Constant | Text |
|----------|------|
| `t_equals` | `=` |
| `t_double_equals` | `==` |
| `t_triple_equals` | `===` |
| `t_bang_equals` | `!=` |
| `t_bang_double_equals` | `!==` |

## Arithmetic & Arrows

| Constant | Text |
|----------|------|
| `t_plus` | `+` |
| `t_dash` | `-` |
| `t_double_dash` | `--` |
| `t_star` | `*` |
| `t_slash` | `/` |
| `t_percent` | `%` |
| `t_right_arrow` | `->` |
| `t_right_fat_arrow` | `=>` |

## Logical Operators

| Constant | Text |
|----------|------|
| `t_bar` | `\|` |
| `t_double_bar` | `\|\|` |
| `t_amp` | `&` |
| `t_double_amp` | `&&` |
| `t_exclaim` | `!` |

## Punctuation

| Constant | Text |
|----------|------|
| `t_dot` | `.` |
| `t_comma` | `,` |
| `t_semicolon` | `;` |
| `t_colon` | `:` |
| `t_hash` | `#` |
| `t_dollar` | `$` |
| `t_tilde` | `~` |
| `t_question` | `?` |

## Variable-Length Tokens

| Constant | Description |
|----------|-------------|
| `t_ident` | Identifiers: starts with letter or `_`, continues with letters, digits, `-`, or `_` |
| `t_integer` | Digit sequences (e.g., `42`, `100`) |
| `t_quoted_string` | Strings in single quotes, double quotes, or backticks. Supports `\` escapes. |
| `t_space` | One or more space characters |
| `t_tab` | Tab character |
| `t_newline` | Newline character |
| `t_line_comment` | Line comment (enabled via settings) |
| `t_block_comment` | Block comment (enabled via settings) |
| `t_unrecognized` | Any character that doesn't match another token |

## Operator Precedence

The lexer checks multi-character operators before shorter ones:

- `===` before `==` before `=`
- `!==` before `!=` before `!`
- `--` before `->`  before `-`
- `||` before `|`
- `&&` before `&`
- `<=` before `<`, `>=` before `>`

## The `everyToken` Array

A convenience array containing all token definitions:

```typescript
import { everyToken } from '@facetlayer/generic-lexer'

for (const tokenDef of everyToken) {
  console.log(tokenDef.name) // "lparen", "rparen", "ident", ...
}
```
