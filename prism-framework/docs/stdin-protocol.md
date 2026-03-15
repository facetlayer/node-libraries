# Stdin/Stdout Protocol

Prism Framework apps can run in **stdin protocol mode** instead of starting an HTTP server. This is useful for:

- Embedding a Prism app as a subprocess in a larger application
- Composing multiple Prism apps to serve parts of a web UI
- Running in environments where opening a port is not desirable
- Building process-based microservice architectures

## How It Works

When started with `--stdin`, the app communicates over **newline-delimited JSON (NDJSON)** on stdin and stdout:

- The parent process sends **request messages** as JSON lines to the app's stdin
- The app sends **response messages** as JSON lines to its stdout
- All logging is redirected to stderr so it doesn't interfere with the protocol

The same endpoints defined with `createEndpoint` work identically in both modes.

## Usage

### Setting Up Your App

Use `startStdinServer` as an alternative to `startServer`:

```typescript
import {
  createEndpoint, App, startServer, startStdinServer,
  type ServiceDefinition,
} from '@facetlayer/prism-framework';
import { z } from 'zod';

const myService: ServiceDefinition = {
  name: 'items',
  endpoints: [
    createEndpoint({
      method: 'GET',
      path: '/items',
      responseSchema: z.array(z.object({ id: z.string(), name: z.string() })),
      handler: async () => [{ id: '1', name: 'Item 1' }],
    }),
  ],
};

const app = new App({ services: [myService] });

if (process.argv.includes('--stdin')) {
  startStdinServer({ app });
} else {
  await startServer({ app, port: 3000 });
}
```

### Launching as a Subprocess

From the parent process, spawn the app and communicate over pipes:

```typescript
import { spawn } from 'child_process';

const child = spawn('node', ['my-app.js', '--stdin'], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

// Send a request
child.stdin.write(JSON.stringify({
  id: 'req-1',
  method: 'GET',
  path: '/items',
}) + '\n');

// Read responses line by line
let buffer = '';
child.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop();
  for (const line of lines) {
    if (!line.trim()) continue;
    const response = JSON.parse(line);
    console.log('Response:', response);
  }
});
```

## Protocol Specification

### Request Message

Each request is a single JSON line written to the app's stdin:

```json
{
  "id": "unique-request-id",
  "method": "GET",
  "path": "/items/123",
  "body": { "optional": "data" }
}
```

| Field    | Type   | Required | Description                                    |
|----------|--------|----------|------------------------------------------------|
| `id`     | string | Yes      | Unique ID to correlate the response             |
| `method` | string | Yes      | HTTP method: GET, POST, PUT, DELETE, PATCH      |
| `path`   | string | Yes      | Endpoint path, e.g. `/items` or `/items/123`    |
| `body`   | object | No       | Request body / input data                       |

### Response Message

Each response is a single JSON line written to stdout:

```json
{
  "id": "unique-request-id",
  "status": 200,
  "body": { "id": "123", "name": "Item" }
}
```

| Field    | Type   | Description                                    |
|----------|--------|------------------------------------------------|
| `id`     | string | Matches the request ID                          |
| `status` | number | HTTP-style status code (200, 400, 404, 500, etc.) |
| `body`   | any    | Response data or error details                  |

### Ready Signal

When the app starts, it sends a ready message:

```json
{ "id": "_ready", "status": 200, "body": { "message": "stdin server ready" } }
```

Wait for this message before sending requests.

### Error Responses

Errors from handlers (using `NotFoundError`, `BadRequestError`, etc.) are returned with the appropriate status code:

```json
{ "id": "req-1", "status": 404, "body": { "message": "Item not found" } }
```

Invalid JSON or missing fields return status 400:

```json
{ "id": "unknown", "status": 400, "body": { "message": "Invalid JSON" } }
```

### Process Lifecycle

- The app exits when stdin is closed (EOF)
- The parent should close stdin to signal the app to shut down
- All logging output goes to stderr, keeping stdout clean for the protocol

## Composing Multiple Subprocess UIs

A key use case is running multiple Prism apps as subprocesses that each render a portion of a larger web UI. The parent process acts as a coordinator:

```
┌──────────────────────────────────────────┐
│           Parent Web Server              │
│                                          │
│  ┌─────────────┐  ┌─────────────┐       │
│  │ App A        │  │ App B        │      │
│  │ (--stdin)    │  │ (--stdin)    │      │
│  │ /dashboard/* │  │ /settings/* │       │
│  └──────┬───────┘  └──────┬──────┘      │
│         │stdin/stdout      │stdin/stdout  │
│         └─────────┬────────┘             │
│                   │                      │
│         Request Router                   │
└──────────────────────────────────────────┘
```

The parent process routes incoming HTTP requests to the appropriate subprocess based on path prefix, translates them to stdin protocol messages, and sends the subprocess responses back to the browser.
