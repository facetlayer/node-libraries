import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response } from 'express';
import { Authorization } from './authorization/Authorization.ts';

/*
 * RequestContext
 *
 * Helper object stored on every incoming request using AsyncLocalStorage.
 *
 * Includes
 *  - The request and response objects
 *  - Authorization data
 */

export interface RequestContext {
  requestId: string;
  startTime: number;
  req?: Request;
  res?: Response;
  auth: Authorization;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();


export function withRequestContext<T>(context: RequestContext, fn: () => T): T {
  return requestContextStorage.run(context, fn);
}

export function getCurrentRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

export const RequestContext = {
  getCurrentRequestContext,
};
