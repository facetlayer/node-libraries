import express, { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { isHttpError, NotFoundError } from '../Errors';
import { recordHttpRequest, recordHttpResponse } from '../Metrics';
import { getCurrentRequestContext } from '../RequestContext';
import { SseResponse } from './SseResponse';
import { PrismApp, endpointKey } from '../app/PrismApp';

type EndpointRequireOption = 'authenticated-user';

export interface EndpointDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (input: any) => Promise<any> | any;
  requestSchema?: z.ZodSchema;
  responseSchema?: z.ZodSchema;
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

export function createEndpoint(
  definition: EndpointDefinition
): EndpointDefinition {
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

function getOneHandler(
  prismApp: PrismApp,
  endpoint: { method: string; path: string }
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const method = req.method;
    const path = req.path;

    try {
      recordHttpRequest(method, endpoint.path);

      // TODO: Authentication check

      const inputData = getRequestDataFromReq(req);

      const result = await prismApp.callEndpoint({ method: endpoint.method, path: endpoint.path, input: inputData });

      // TODO: Handle SSE response

      res.status(200).json(result);
      recordHttpResponse(endpoint.method, endpoint.path, 200, Date.now() - startTime);
      return;
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

      recordHttpResponse(method, endpoint.path, statusCode, duration);
    }
  };
}

export function mountPrismApp(
  app: express.Application,
  prismApp: PrismApp,
): void {

  // Register each endpoint with Express to support path parameters
  const endpoints = prismApp.listAllEndpoints();

  for (const endpoint of endpoints) {
    const handler = getOneHandler(prismApp, endpoint);

    switch (endpoint.method) {
      case 'GET':
        app.get(endpoint.path, handler);
        break;
      case 'POST':
        app.post(endpoint.path, handler);
        break;
      case 'PUT':
        app.put(endpoint.path, handler);
        break;
      case 'DELETE':
        app.delete(endpoint.path, handler);
        break;
      case 'PATCH':
        app.patch(endpoint.path, handler);
        break;
    }
  }
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
