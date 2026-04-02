import type { EndpointDefinition } from './endpoints/EndpointDefinition.ts';

/*
 * ServiceDefinition
 *
 * A service is a self-contained module that can contain:
 *  - API endpoints
 *  - Middleware (transport-specific, e.g. Express middleware)
 *  - Database schemas
 *  - Background jobs
 */

export interface ServiceDefinition {
  name: string;

  // API endpoints
  endpoints?: EndpointDefinition[];

  // Middleware (transport-specific, typed as any[] to avoid Express dependency in core)
  middleware?: any[];

  // Database schemas
  databases?: Record<string, {
    statements: string[];
  }>;

  // Callback used to launch background jobs
  startJobs?: () => Promise<void>;
}
