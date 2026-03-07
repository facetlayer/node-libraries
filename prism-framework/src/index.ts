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
} from './Errors.ts';


export { createExpressApp, startServer } from './web/ExpressAppSetup.ts';
export type { ServerSetupConfig } from './web/ExpressAppSetup.ts';

export { getMetrics, recordHttpRequest, recordHttpResponse } from './Metrics.ts';

export type { RequestContext } from './RequestContext.ts';
export { getCurrentRequestContext, withRequestContext } from './RequestContext.ts';
export { requestContextMiddleware } from './web/requestContextMiddleware.ts';

export type { MiddlewareDefinition, ServiceDefinition } from './ServiceDefinition.ts';

// Authorization exports
export type { CookieAuthSource, AuthSource, Permission, Resource, UserPermissions } from './authorization/index.ts';
export { Authorization } from './authorization/index.ts';

// Web framework exports
export { corsMiddleware } from './web/corsMiddleware.ts';
export type { CorsConfig } from './web/corsMiddleware.ts';
export type { EndpointDefinition } from './web/ExpressEndpointSetup.ts';
export {
  getRequestDataFromReq,
  mountMiddleware,
  mountMiddlewares,
  mountPrismApp,
} from './web/ExpressEndpointSetup.ts';
export { localhostOnlyMiddleware } from './web/localhostOnlyMiddleware.ts';
export { SseResponse } from './web/SseResponse.ts';
export { createEndpoint } from './endpoints/createEndpoint.ts';

// OpenAPI exports
export type { OpenAPIDocumentInfo, ParseExpressPathForOpenAPIResult } from './web/openapi/OpenAPI.ts';
export { generateOpenAPISchema, parseExpressPathForOpenAPI } from './web/openapi/OpenAPI.ts';

// Endpoint listing exports
export { createListingEndpoints } from './web/EndpointListing.ts';

// SSE Connection Management exports
export { ConnectionManager } from './sse/ConnectionManager.ts';

// App exports
export { PrismApp as App } from './app/PrismApp.ts';
export type { PrismAppConfig as AppConfig } from './app/PrismApp.ts';

// Launch configuration exports
export type { LoggingSettings, LaunchConfig } from './launch/launchConfig.ts';
export { getDatabaseConfig, getLaunchConfig, getLoggingConfig, setLaunchConfig } from './launch/launchConfig.ts';

// Database setup exports
export type { DatabaseInitializationOptions } from './databases/DatabaseInitializationOptions.ts';
export type { MigrationBehavior } from '@facetlayer/sqlite-wrapper';
export { getStatementsForDatabase } from './databases/DatabaseSetup.ts';

// Endpoint calling exports
export type { CallEndpointOptions } from './app/callEndpoint.ts';
export { callEndpoint } from './app/callEndpoint.ts';
