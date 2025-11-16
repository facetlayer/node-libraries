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


export { createExpressApp, startServer } from './web/ExpressAppSetup';
export type { ServerSetupConfig } from './web/ExpressAppSetup';

export { getMetrics, recordHttpRequest, recordHttpResponse } from './Metrics';

export type { RequestContext } from './RequestContext';
export { getCurrentRequestContext, withRequestContext } from './RequestContext';
export { requestContextMiddleware } from './web/requestContextMiddleware';

export type { MiddlewareDefinition, ServiceDefinition } from './ServiceDefinition';

// Authorization exports
export type { CookieAuthSource, AuthSource, Permission, Resource, UserPermissions } from './authorization';
export { Authorization } from './authorization';

// Web framework exports
export { corsMiddleware } from './web/corsMiddleware';
export type { CorsConfig } from './web/corsMiddleware';
export type { EndpointDefinition } from './web/ExpressEndpointSetup';
export {
  createEndpoint,
  getRequestDataFromReq,
  mountMiddleware,
  mountMiddlewares,
  mountPrismApp,
  setLoggers,
} from './web/ExpressEndpointSetup';
export { localhostOnlyMiddleware } from './web/localhostOnlyMiddleware';
export { SseResponse } from './web/SseResponse';

// OpenAPI exports
export type { OpenAPIDocumentInfo, ParseExpressPathForOpenAPIResult } from './web/OpenAPI';
export { generateOpenAPISchema, parseExpressPathForOpenAPI } from './web/OpenAPI';

// Endpoint listing exports
export { createListingEndpoints } from './web/EndpointListing';

// Swagger UI exports
export { setupSwaggerUI } from './web/SwaggerUI';

// SSE Connection Management exports
export { ConnectionManager } from './sse/ConnectionManager';

// App exports
export { App } from './app/App';

// Launch configuration exports
export type { LoggingSettings, LaunchConfig } from './launch/launchConfig';
export { getDatabaseConfig, getLaunchConfig, getLoggingConfig, setLaunchConfig } from './launch/launchConfig';

// Database setup exports
export type { DatabaseInitializationOptions } from './databases/DatabaseInitializationOptions';
export type { MigrationBehavior } from '@facetlayer/sqlite-wrapper';
export { getStatementsForDatabase } from './databases/DatabaseSetup';

// Endpoint calling exports
export type { CallEndpointOptions } from './app/callEndpoint';
export { callEndpoint } from './app/callEndpoint';
