import { createInterface } from 'readline';
import { PrismApp } from '../app/PrismApp.ts';
import { isHttpError } from '../Errors.ts';
import { validateAppOrThrow } from '../app/validateApp.ts';
import { setLogStderr } from '../logging/index.ts';

/**
 * JSON message sent from the parent process to the stdin server.
 */
export interface StdinRequest {
  /** Unique request ID for correlating responses. */
  id: string;
  /** HTTP method (GET, POST, PUT, DELETE, PATCH). */
  method: string;
  /** Endpoint path, e.g. "/users" or "/users/123". */
  path: string;
  /** Request body / input data. */
  body?: any;
}

/**
 * JSON message sent back from the stdin server to the parent process.
 */
export interface StdinResponse {
  /** Matches the request ID. */
  id: string;
  /** HTTP-style status code. */
  status: number;
  /** Response body. */
  body: any;
}

export interface StdinServerConfig {
  app: PrismApp;
}

/**
 * Start processing requests from stdin and writing responses to stdout.
 *
 * Each line on stdin must be a JSON-encoded StdinRequest.
 * Each response is a JSON-encoded StdinResponse written as a single line to stdout.
 *
 * When stdin closes, the process exits.
 */
export function startStdinServer(config: StdinServerConfig): void {
  // Redirect logInfo to stderr so it doesn't corrupt the stdout JSON protocol
  setLogStderr(true);

  validateAppOrThrow(config.app);

  const app = config.app;

  const rl = createInterface({
    input: process.stdin,
    terminal: false,
  });

  function sendResponse(response: StdinResponse): void {
    process.stdout.write(JSON.stringify(response) + '\n');
  }

  function sendError(id: string | null, status: number, message: string, details?: any): void {
    const response: StdinResponse = {
      id: id ?? 'unknown',
      status,
      body: { message, ...(details ? { details } : {}) },
    };
    sendResponse(response);
  }

  rl.on('line', async (line: string) => {
    let request: StdinRequest;

    // Parse the JSON request
    try {
      request = JSON.parse(line);
    } catch {
      sendError(null, 400, 'Invalid JSON');
      return;
    }

    if (!request.id || !request.method || !request.path) {
      sendError(request?.id ?? null, 400, 'Missing required fields: id, method, path');
      return;
    }

    try {
      const result = await app.callEndpoint({
        method: request.method.toUpperCase(),
        path: request.path,
        input: request.body ?? {},
      });

      sendResponse({
        id: request.id,
        status: 200,
        body: result,
      });
    } catch (error: any) {
      if (isHttpError(error)) {
        sendResponse({
          id: request.id,
          status: error.statusCode,
          body: {
            message: error.message,
            ...(error.details ? { details: error.details } : {}),
          },
        });
      } else {
        sendResponse({
          id: request.id,
          status: 500,
          body: { message: error.message ?? 'Internal Server Error' },
        });
      }
    }
  });

  rl.on('close', () => {
    process.exit(0);
  });

  // Signal readiness to the parent process
  sendResponse({
    id: '_ready',
    status: 200,
    body: { message: 'stdin server ready' },
  });
}
