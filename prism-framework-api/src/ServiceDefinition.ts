import { NextFunction, Request, Response } from 'express';
import { EndpointDefinition } from './web/ExpressEndpointSetup';

export interface MiddlewareDefinition {
  path: string;
  handler: (req: Request, res: Response, next: NextFunction) => void;
}

/*
 * ServiceDefinition
 *
 * A service is a self-contained module that can contain:
 *  - API endpoints
 *  - Middleware
 *  - Database schemas
 *  - Background jobs
 */

export interface ServiceDefinition {
  name: string;
  
  // API endpoints
  endpoints?: EndpointDefinition<any, any>[];

  // Middleware
  middleware?: MiddlewareDefinition[];

  // Database schemas
  databases?: Record<string, {
    statements: string[];
  }>;

  // Callback used to launch background jobs
  startJobs?: () => Promise<void>;
}
