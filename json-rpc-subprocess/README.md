# json-rpc-subprocess

A small utility that launches a child process and implements requests & responses that
use JSON-RPC 2.0 using the process's stdin and stdout pipes.

Intended for handling Model Context Protocol (MCP) apps running in stdin mode.

## Installation

```bash
pnpm add @facetlayer/json-rpc-subprocess
# or
npm install @facetlayer/json-rpc-subprocess
```

## Quick start

```ts
import { JsonRpcSubprocess } from '@facetlayer/json-rpc-subprocess';

const worker = new JsonRpcSubprocess({ timeout: 10_000 });
worker.spawn('node', ['path/to/worker-script.js']);

worker.on('stdout', (line) => console.log('child stdout:', line));
worker.on('response', (response) => console.log('json-rpc response', response));
worker.on('output-error', (line) => console.warn('process had non-json output', line));

await worker.waitForStart();

const result = await worker.sendRequest('someMethod', { example: true });
console.log(result);

await worker.waitForExit();
```

## API

### JsonRpcSubprocess

`JsonRpcSubprocess` extends Node.js `EventEmitter`.

#### constructor(options?: JsonRpcSubprocessOptions)
Creates a new wrapper instance. The only option today is `timeout` (milliseconds) which defaults to `30000` and controls how long `sendRequest` waits for a response before rejecting.

#### spawn(command, args?: string[], spawnOptions?: SpawnOptions)
Launches the child process with `child_process.spawn`. You must call this exactly once before interacting with the subprocess. Requests will be queued until the underlying process emits `spawn`.

#### waitForStart(): Promise<void>
Resolves once the child process successfully emits its `spawn` event. Rejects if the process fails to spawn (for example, an invalid executable).

#### sendRequest(method: string, params?: any): Promise<any>

Serialises a JSON-RPC 2.0 request, writes it to the child process stdin, and resolves with the returned `result`. The promise rejects when the subprocess sends an error response, times out, exits with a non-zero code before responding, or is killed.

The library handles enqueued requests, so you can call .sendRequest before the subprocess has
fully launched, and it will be sent to stdin when the subprocess is ready.

#### kill(): void
Terminates the subprocess (if running), rejects any pending `sendRequest` promises, and emits `killed`.

#### isRunning(): boolean
Returns `true` while the child process exists and has not been killed.

#### hasStarted(): boolean
Returns `true` after the child process has emitted `spawn`.

#### hasExited(): boolean
Returns `true` once the child process has exited for any reason.

#### exitCode(): number | null
Returns the exit code from the child process if it has exited, otherwise `null`.

#### waitForExit(): Promise<number>
Resolves with the subprocess exit code (treats a `null` exit code as `0`) once it exits. If the process has already exited the promise resolves immediately.

#### options: JsonRpcSubprocessOptions
Exposes the options object currently in use (useful for inspecting the active timeout).

### Types

- `JsonRpcSubprocessOptions` — `{ timeout?: number }`, default `timeout` is `30000` ms.
- `JsonRpcRequest` and `JsonRpcResponse` — JSON-RPC 2.0 request/response payload shapes that are re-exported for convenience.

## Events

`JsonRpcSubprocess` emits the following custom events in addition to standard `EventEmitter` events:

- `request` — emits the JSON-RPC request object each time `sendRequest` writes to stdin.
- `response` — emits every JSON-RPC response parsed from stdout.
- `response-error` — emitted when a response arrives without a matching pending request.
- `stdout` — emits each line produced on stdout.
- `stderr` — emits each line produced on stderr.
- `output-error` — emitted when a stdout line cannot be parsed as JSON.
- `spawn` - forwarded from the underlying child-process `spawn` event.
- `exit` — forwards the underlying child-process `exit` event `(code, signal)`.
- `killed` — emitted after `kill()` is invoked.

## License

MIT
