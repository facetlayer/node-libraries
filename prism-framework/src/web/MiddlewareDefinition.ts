import type { NextFunction, Request, Response } from 'express';

export interface MiddlewareDefinition {
  path: string;
  handler: (req: Request, res: Response, next: NextFunction) => void;
}
