
# @facetlayer/streams #

Streams utility class.

A `Stream` object can receive events, and pipe them to a destination.

### Differences compared to Node.js streams ###

Compared to Node.js streams, this streams library is more opinionated and tries to do more helpful stuff.

Specific differences:

 - facetlayer/streams has a builtin event type for 'done' (meaning success), of 'fail'.
 - facetlayer/streams has builtin log events - send 'info', 'warn', or 'error' messages as part of a stream, if you want.
 - facetlayer/streams has a single .pipe() function which takes a single callback that receives StreamEvent objects, instead
   of having different listeners for different event types.

# Documentation #

## Stream - basic usage ##

### `new Stream()` ###

Creates a new stream object.

New streams will store events in an internal buffer until they have a receiver.

### `Stream.item(item)` ###

Send a single `item` event to the stream. Items are the primary data for a stream.

### `Stream.done()` ###

Send a `done` event to the stream. This signals that the request was successful and all items were sent.

### `Stream.fail(err)` ###

Send a `fail` event to the stream. This signals that the request failed, and any items that were sent
(if any) might have been incomplete.

The `err` value will be captured as an ErrorDetails object (see "Error handling" below)

### `Stream.pipe(receiver)` ###

Hook up a receiver for the stream. Once hooked up, all backlogged events will be immediately
sent to the receiver, and any future events will be immediately sent to the receiver.

One stream can only have one receiver and the receiver can't be changed after created.

The receiver can be:

 - A function that takes a `StreamEvent` as its input (simple callback style).
 - An object that implements a function `.event(event: StreamEvent)`.
 - Another `Stream` instance (which has `.event`).

**Example - Simple callback:**

```typescript
const stream = new Stream();

// Use pipe() with a simple callback to receive all events
stream.pipe((event) => {
  switch (event.t) {
    case 'item':
      console.log('Received item:', event.item);
      break;
    case 'done':
      console.log('Stream completed');
      break;
    case 'fail':
      console.error('Stream failed:', event.error);
      break;
  }
});

stream.item('hello');
stream.item('world');
stream.done();
```

### `Stream.listen(callbacks)` ###

A convenience wrapper around `pipe()` that takes an object with separate callbacks for each event type.
This is useful when you only care about certain event types.

**Parameters:**
- `callbacks.item?(item)` - Called for each item event
- `callbacks.done?()` - Called when the stream completes successfully
- `callbacks.fail?(error)` - Called if the stream fails

**Example:**

```typescript
const stream = new Stream();

// Use listen() when you want separate handlers for each event type
stream.listen({
  item: (msg) => console.log('Received:', msg),
  done: () => console.log('All done!'),
  fail: (err) => console.error('Error:', err.errorMessage)
});

stream.item('hello');
stream.done();
```

**Note:** Unlike `pipe()`, `listen()` does not accept a simple callback function. Use `pipe()` if you want to handle all events with a single callback.

### `Stream.map(callback)` / `Stream.mapcat(callback)` / `Stream.filter(callback)` ###

Transformation helpers that return a new stream.

 - `.map(cb)` — transforms each item via `cb`. If `cb` returns a falsy value
   the item is dropped (this means `.map` also acts as a filter). Errors
   thrown from `cb` close the output stream with `fail`.
 - `.mapcat(cb)` — like `.map`, but `cb` returns an array and each element
   is emitted as its own item.
 - `.filter(cb)` — keeps items for which `cb` returns a truthy value.
   Errors thrown from `cb` close the output stream with `fail`.

Non-item events (logs, hints) pass through all three unchanged.

### `Stream.spyEvents(callback)` / `Stream.spyItems(callback)` ###

Returns a new stream that forwards all events unchanged while calling
`callback` as a side effect. Useful for logging or metrics. The callback
can't modify the events.

### `Stream.logSpy({label})` ###

Convenience wrapper around `spyEvents` that prints every event to the
console with a prefix. Replaces the deprecated `logToConsole()`.

### Consumer helpers ###

 - `await stream.promiseItems()` — collect all items into an array.
 - `await stream.promiseItem()` — resolve with the first item.
 - `await stream.wait()` — resolve when the stream closes.
 - `await stream.forEach(callback)` — call `callback` for each item. The
   promise rejects if the stream fails or the callback throws.
 - `stream.takeItemsSync()` / `takeEventsSync()` / `takeItemSync()` — the
   same operations but synchronous; throws if the stream hasn't finished.
 - `for await (const item of stream)` — consume as an async iterator.
 - `for (const item of stream)` — consume as a synchronous iterator
   (throws if the stream hasn't finished).

### Static constructors ###

 - `Stream.fromList(items)` — a closed stream containing the given items.
 - `Stream.fromEvents(events)` — a stream pre-loaded with raw events.
 - `Stream.newEmptyStream()` — a stream that is already `done`.
 - `Stream.newNullStream()` — a stream with a null receiver that discards
   everything sent to it.

## StreamDispatcher ##

`StreamDispatcher` fans a single event source out to multiple listener
streams. Each call to `.newListener()` returns a new `Stream` that
receives every event sent to the dispatcher. Listeners that close or
raise `BackpressureStop` are automatically removed.

```typescript
import { StreamDispatcher } from '@facetlayer/streams';

const dispatcher = new StreamDispatcher();

const a = dispatcher.newListener();
const b = dispatcher.newListener();

a.listen({ item: (x) => console.log('a:', x) });
b.listen({ item: (x) => console.log('b:', x) });

dispatcher.item('hello');
dispatcher.close();
```

## StreamProtocolValidator ##

`StreamProtocolValidator` checks that a stream of events follows the
protocol rules: event types are known, no events are sent after `done`
or `fail`, `hint` events appear before any items, and only one `hint`
is sent. Use `wrapStreamInValidator(description, downstream)` to insert
a validator between a producer and consumer, or call `.check(event)` on
each event manually. Call `.finalize()` after the producer stops to
verify that the stream was actually closed.

## dynamicOutputToStream and callbackToStream ##

See below — these turn arbitrary return values (promises, iterators,
arrays, etc.) into stream events.

## Error handling ##

The library implements a class called `ErrorDetails` to help normalize handling different kinds of errors.

See [docs/error-handling.md](docs/error-handling.md) for the full guide.

```
export interface ErrorDetails {
    // Unique ID assigend to this error when it's captured.
    errorId?: string
    
    // Short enum-like string to categorize the error.
    errorType?: string

    // Readable error message.
    errorMessage: string

    // Stack trace.
    stack?: any

    // Previous error that caused this one.
    cause?: ErrorDetails

    // Arbitrary related information about the error, depending on the context.
    related?: Array< Record<string, string> >
}
```

### captureError(error) ###

Captures an error and converts it into an `ErrorDetails` object.

The incoming `error` value can be one of the following:

 - A Javascript `Error` instance
   - The code will capture `.message` as `.errorMessage`, and the `.stack`.
 - An `ErrorDetails` object.
 - A string. The string will be used as the `errorMessage`.

## dynamicOutputToStream(output, stream) ##

The function `dynamicOutputToStream` turns an arbitrary value into Stream events.

One way to use this, is when implementing server endpoint handlers. When writing
a endpoint handler, you might want some to be async, some might be implemented as iterators,
and some might return streams. Using this function helps normalize the results to always produce a stream.

### Example ###

```ts
import { dynamicOutputToStream, Stream } from '@facetlayer/streams';


function* iteratorResult() {
    yield 1;
    yield 2;
    yield 3;
}

const iterator = iteratorResult();

// Sends the iterator result (1, 2, 3) as items to a stream.
const stream = new Stream();
dynamicOutputToStream(iterator, stream);
```

### Translation rules ###

| type | result |
| ---  | ------ |
| Falsy value | Stream is `done` with no items. |
| Array | Each item is sent to the output. |
| Stream instance | The Stream value is `pipe`d to the output. |
| Object is an iterator | Each item from the iterator is sent to the stream. |
| Object is an async iterator | Each item from the iterator is sent to the stream. |
| Object is a promise | The callback waits for the promise to resolve, and then runs the translation rules on the resul.t Of the promise rejects then the error is sent to the stream with `.fail` |
| Other object | The object is sent as a single item |

## callbackToStream(callback, stream) ##

Calls `callback` and then sends the output to the stream using `dynamicOutputToStream`.

Will also catch any uncaught errors from the callback, and send those to the stream as a `fail` event.
