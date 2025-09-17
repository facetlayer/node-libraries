Ideas and future improvements

- Separator-aware quoting: Only quote on the active separator, CR, LF, or quotes. For TSV, avoid quoting because of commas unless needed.
- Record fields: When `fields` is a `Record<key, headerLabel>`, use record values for header labels while reading values from the record keys. Document ordering rules.
- Newline option: Support `newline?: '\n' | '\r\n'` to allow Windows CSV style.
- File stream error handling: Attach `fileOut.on('error')` and surface errors to consumers instead of only logging.
- Backpressure: Respect `write()` backpressure by pausing until `'drain'` or document current best-effort behavior.
- Typings: Add generics to infer allowed item keys from `fields` for stronger type safety.
- Exports map: Add `exports` field for clearer ESM/CJS interop if needed.
- More tests: Embedded quotes, CRLF handling, tabs with CSV, large inputs, and file error flow.

