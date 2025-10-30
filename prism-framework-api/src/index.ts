// Framework exports
export {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  HttpError,
  NotFoundError,
  NotImplementedError,
  ServiceUnavailableError,
  UnauthorizedError,
  ValidationError,
  createErrorFromStatus,
  isHttpError,
} from './Errors';

export type { EnvSchema } from './env/EnvSchema';
export { checkEnvVars, getEnv } from './Env';

export { createApp, startServer } from './web/ExpressAppSetup';
export type { MainSetupConfig } from './web/ExpressAppSetup';

export { getMetrics, metricHttpRequest, metricHttpResponse } from './Metrics';

export type { RequestContext } from './RequestContext';
export { getCurrentRequestContext, withRequestContext } from './RequestContext';
export { requestContextMiddleware } from './web/requestContextMiddleware';

export type { MiddlewareDefinition, ServiceDefinition } from './ServiceDefinition';

// Authorization exports
export type { CookieAuthSource, AuthSource, Permission, Resource, UserPermissions } from './authorization';
export { Authorization } from './authorization';

// Web framework exports
export { corsMiddleware } from './web/corsMiddleware';
export type { EndpointDefinition } from './web/ExpressEndpointSetup';
export {
  createEndpoint,
  getRequestDataFromReq,
  mountEndpoint,
  mountEndpoints,
  mountMiddleware,
  mountMiddlewares,
  setLoggers,
} from './web/ExpressEndpointSetup';
export { localhostOnlyMiddleware } from './web/localhostOnlyMiddleware';
export { SseResponse } from './web/SseResponse';

// Launch configuration exports
export type { LoggingSettings, LaunchConfig } from './launch/launchConfig';
export { getDatabaseConfig, getLaunchConfig, getLoggingConfig, setLaunchConfig } from './launch/launchConfig';

// Database setup exports
export type { DatabaseInitializationOptions } from './databases/DatabaseInitializationOptions';
export type { MigrationBehavior } from '@facetlayer/sqlite-wrapper';
export { getStatementsForDatabase } from './databases/DatabaseSetup';
