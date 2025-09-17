# @facetlayer/csv-tool

Small utility to stream rows into CSV/TSV format and optionally write them to a file. Built on `@facetlayer/streams`.

## Install

```
yarn add @facetlayer/csv-tool
# or
npm i @facetlayer/csv-tool
```

## Quick Start

Transform an event stream of objects into CSV-formatted lines:

```ts
import { Stream } from '@facetlayer/streams'
import { transformToCsvFormat } from '@facetlayer/csv-tool'

const input = new Stream<any>()
const csv = transformToCsvFormat(input, {
  fields: ['name', 'age', 'city'],
  // separator: ',' // default ','; '\t' for TSV
  // includeHeader: true
})

csv.pipe(evt => {
  if (evt.t === 1 /* c_item */) {
    // evt.item.line is a CSV string for each row
    console.log(evt.item.line)
  }
})

// Emit rows
input.item({ name: 'John', age: 30, city: 'New York' })
input.item({ name: 'Jane', age: 25, city: 'San Francisco' })
input.done()
```

Write directly to a file as CSV:

```ts
import { createCsvFileStream } from '@facetlayer/csv-tool'

const stream = createCsvFileStream({
  filename: 'out.csv',
  fields: ['name', 'age']
  // flags: 'w' | 'a' etc. (optional)
})

stream.item({ name: 'John', age: 30 })
stream.item({ name: 'Jane', age: 25 })
stream.done() // closes the file
```

## API

- `transformToCsvFormat(input, options) => Stream<{ line: string }>`: Emits a header line immediately, then one CSV line per input item.
- `createCsvFileStream(options) => Stream<any>`: Returns a writable `Stream` you can `.item()` into. Writes a header and each row to `options.filename` and closes on `.done()` or `.fail()`.

### Options

- `fields: string[] | Record<string, string>`: Ordered list of field keys to include. When provided as an object, the current behavior uses the object keys for both order and header values.
- `separator?: '\t' | ','`: Field separator. Defaults to `','`. Use `'\t'` for TSV. (Backward-compat alias `seperator` is still supported.)
- `includeHeader?: boolean`: Include header line. Defaults to `true`.
- `filename: string` (for file streams): Output file path.
- `flags?: string` (for file streams): Passed to `fs.createWriteStream` (e.g. `'w'`, `'a'`).

## Development

Scripts:

```
yarn build   # compile TypeScript to dist/
yarn test    # run unit tests (vitest)
```
