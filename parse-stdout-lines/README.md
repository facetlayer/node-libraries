# parse-stdout-lines

A TypeScript utility for parsing Unix pipe streams into individual lines.

## Installation

```bash
npm install @facetlayer/parse-stdout-lines
```

## Usage

```typescript
import { unixPipeToLines } from '@facetlayer/parse-stdout-lines';
import { spawn } from 'child_process';

const child = spawn('ls', ['-la']);

unixPipeToLines(child.stdout, (line: string | null) => {
  if (line === null) {
    console.log('Stream closed');
  } else {
    console.log('Line:', line);
  }
});
```

### `unixPipeToLines(stream: NodeJS.ReadableStream, onLineFn: (line: string | null) => void): void`

Converts a readable stream into line-by-line output.

The `onLineFn` will be called separately for each completed line.

When the stream is done, `onLineFn` will be called one last time with `null`.
