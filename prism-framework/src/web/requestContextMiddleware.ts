import { AsyncLocalStorage } from 'async_hooks';
import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Authorization } from '../authorization/Authorization.ts';
import { RequestContext } from '../RequestContext.ts';
import { requestContextStorage } from '../RequestContext.ts';

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
    const requestId = uuidv4();
    const startTime = Date.now();
  
    const context: RequestContext = {
      requestId,
      startTime,
      req,
      res,
      auth: new Authorization(),
    };
  
    res.setHeader('X-Request-ID', requestId);
  
    requestContextStorage.run(context, () => {
      next();
    });
}