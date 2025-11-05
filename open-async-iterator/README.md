# open-async-iterator

A small utility for creating async iterators that can be controlled externally.

This allows you to take events from a callback-based context (such as Node.js streams), and
pipe those events into an async iterator, where it can be used in any function that uses async operations.

## Installation

```bash
npm install @facetlayer/open-async-iterator
```

## Usage

```typescript
import { openAsyncIterator } from '@facetlayer/open-async-iterator'

// Create the iterator.
const { send, done, iterator } = openAsyncIterator<number>()

// The 'driver' code sends values to the iterator and marks it as done.
send(1);
send(2);
send(3);
done();

// Then a different part of the code consumes the iterator (this can happen in parallel)
for await (const value of iterator) {
  console.log(value) // Outputs: 1, 2, 3
}
```

## API

### `openAsyncIterator<T>()`

Creates a new open async iterator.

**Returns:**
- `send(value: T)` - Function to send a value to the iterator
- `done()` - Function to mark the iterator as complete
- `iterator` - The async iterator object

### Error Handling

Calling `send()` after `done()` will throw an error:

```typescript
const { send, done } = openAsyncIterator()

done()
send(1) // Throws: "usage error: called send() after done()"
```
