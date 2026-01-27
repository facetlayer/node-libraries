# Code Examples

This file tests that headings inside code blocks are ignored.

## JavaScript Example

```javascript
// # This is not a heading
const x = 1;
## Neither is this
```

## Markdown in Code

```markdown
# This heading should be ignored
## So should this one
```

## Real Heading After Code

This is a real heading.
