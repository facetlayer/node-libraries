/**
 * @facetlayer/prism-framework/core
 *
 * Transport-agnostic core exports for Prism Framework.
 * Use this entry point when you don't need Express/HTTP server functionality,
 * e.g. in Expo/React Native apps or other non-Node environments.
 */

// App
export { PrismApp, PrismApp as App } from './app/PrismApp.ts';
export type { PrismAppConfig as AppConfig } from './app/PrismApp.ts';

// Endpoint calling
export type { CallEndpointOptions } from './app/callEndpoint.ts';
export { callEndpoint } from './app/callEndpoint.ts';

// Endpoint definition
export type { EndpointDefinition, EndpointRequireOption } from './endpoints/EndpointDefinition.ts';
export { createEndpoint } from './endpoints/createEndpoint.ts';

// Service definition
export type { ServiceDefinition } from './ServiceDefinition.ts';

// Errors
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

// Request context
export type { RequestContext } from './RequestContext.ts';
export { getCurrentRequestContext, withRequestContext } from './RequestContext.ts';

// Database interface
export type { PrismDatabase } from './databases/DatabaseInterface.ts';
