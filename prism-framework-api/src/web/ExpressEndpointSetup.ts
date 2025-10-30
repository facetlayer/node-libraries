import express, { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { isHttpError, NotImplementedError } from '../Errors';
import { metricHttpRequest, metricHttpResponse } from '../Metrics';
import { getCurrentRequestContext } from '../RequestContext';
import { SseResponse } from './SseResponse';

type EndpointRequireOption = 'authenticated-user';

export interface EndpointDefinition<TRequest, TResponse> {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (input: TRequest) => Promise<TResponse> | TResponse;
  requestSchema?: z.ZodSchema<TRequest>;
  responseSchema?: z.ZodSchema<TResponse>;
  description?: string;
  requires?: EndpointRequireOption[];
}

export function getRequestDataFromReq(req: Request): any {
  let result = {};

  if (req.body) {
    result = { ...result, ...req.body };
  }

  if (req.params) {
    result = { ...result, ...req.params };
  }

  if (req.query) {
    result = { ...result, ...req.query };
  }

  return result;
}

export function createEndpoint<TRequest, TResponse>(
  definition: EndpointDefinition<TRequest, TResponse>
): EndpointDefinition<TRequest, TResponse> {
  return definition;
}

// Helper for logging - can be overridden by applications
export let logDebug = (message: string) => console.log(`[DEBUG] ${message}`);
export let logWarn = (message: string) => console.warn(`[WARN] ${message}`);
export let logError = (message: string, details?: any, error?: Error) => {
  console.error(`[ERROR] ${message}`, details, error);
};

export function setLoggers(debug: typeof logDebug, warn: typeof logWarn, error: typeof logError) {
  logDebug = debug;
  logWarn = warn;
  logError = error;
}

export function mountEndpoint(
  app: express.Application,
  endpoint: EndpointDefinition<any, any>
): void {
  const { method, path, handler, requestSchema, responseSchema } = endpoint;

  const wrappedHandler = async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      metricHttpRequest(method, path);

      const context = getCurrentRequestContext();

      // Check the .requires section.
      for (const requirement of endpoint.requires || []) {
        if (requirement === 'authenticated-user') {
          // Applications should implement this check by providing their own middleware
          // or by wrapping the handler. This is a placeholder that applications can override.
          if (!context?.auth?.getResource('user')) {
            return res.status(401).json({ error: 'Authentication required' });
          }
        }
      }

      const inputData = getRequestDataFromReq(req);

      let input: any;
      if (requestSchema) {
        const validationResult = requestSchema.safeParse(inputData);
        if (!validationResult.success) {
          logWarn('Request rejected: schema validation failed');
          return res.status(400).json({
            error: 'Schema validation failed',
            details: validationResult.error.issues,
          });
        }
        input = validationResult.data;
      } else {
        input = inputData;
      }

      const result = await handler(input);

      // Check if result has startSse function - if so, enter SSE mode
      if (
        result &&
        typeof result === 'object' &&
        'startSse' in result &&
        typeof result.startSse === 'function'
      ) {
        const sseResponse = new SseResponse(res);
        result.startSse(sseResponse);
        metricHttpResponse(method, path, 200, Date.now() - startTime);
        return;
      }

      if (result && responseSchema) {
        const validationResult = responseSchema.safeParse(result);
        if (!validationResult.success) {
          logWarn(`Response schema validation failed for ${method} ${path}`);
        }
      }

      // If the handler returned a result, send it as JSON
      if (result !== undefined) {
        res.json(result);
      }

      logDebug(`response 200: ${method} ${path}`);
      metricHttpResponse(method, path, 200, Date.now() - startTime);
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      let statusCode = 500;

      if (isHttpError(error)) {
        statusCode = error.statusCode;

        if (error.statusCode >= 500 || error.statusCode == null) {
          logError(
            `Server error in endpoint ${method} ${path}`,
            {
              path,
              method,
              errorMessage: error.message,
              stack: error.stack,
            },
            error as Error
          );
        }

        logDebug(`response ${error.statusCode}: ${method} ${path}`);
        res.status(error.statusCode).json({
          message: error.message,
          details: error.details,
        });
      } else {
        console.error('Unhandled error in endpoint', {
          path,
          method,
          errorMessage: error.message,
          stack: error.stack,
        });
        logError(
          `Unhandled error in endpoint handler ${method} ${path}`,
          {
            path,
            method,
            errorMessage: error.message,
            stack: error.stack,
          },
          error as Error
        );
        logDebug(`response 500: ${method} ${path}`);
        res.status(500).json({
          message: 'Internal Server Error',
        });
      }

      metricHttpResponse(method, path, statusCode, duration);
    }
  };

  switch (method) {
    case 'GET':
      app.get(path, wrappedHandler);
      break;
    case 'POST':
      app.post(path, wrappedHandler);
      break;
    case 'PUT':
      app.put(path, wrappedHandler);
      break;
    case 'DELETE':
      app.delete(path, wrappedHandler);
      break;
    case 'PATCH':
      app.patch(path, wrappedHandler);
      break;
    default:
      throw new NotImplementedError(`Unsupported HTTP method: ${method}`);
  }
}

export function mountEndpoints(
  app: express.Application,
  endpoints: EndpointDefinition<any, any>[]
): void {
  endpoints.forEach(endpoint => mountEndpoint(app, endpoint));
}

export function mountMiddleware(
  app: express.Application,
  middleware: { path: string; handler: (req: Request, res: Response, next: NextFunction) => void }
): void {
  app.use(middleware.path, middleware.handler);
}

export function mountMiddlewares(
  app: express.Application,
  middlewares: {
    path: string;
    handler: (req: Request, res: Response, next: NextFunction) => void;
  }[]
): void {
  middlewares.forEach(middleware => mountMiddleware(app, middleware));
}
