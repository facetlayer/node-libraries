import { PrismApp } from './PrismApp.ts';
import { ServiceDefinition } from '../ServiceDefinition.ts';
import { isHttpError, ResponseSchemaValidationError, SchemaValidationError } from '../Errors.ts';

export interface CallEndpointOptions {
  method: string;
  path: string;
  input?: any;
  onResponseSchemaFail?: (error: any, result: any) => void;
}

/**
 * Call an endpoint programmatically without going through HTTP
 * This is useful for testing or for calling endpoints from scripts/tools
 */
export async function callEndpoint(app: PrismApp, options: CallEndpointOptions) {
    // Find the endpoint using pattern matching
    const match = app.matchEndpoint(options.method, options.path);

    if (!match) {
      throw new Error(`Endpoint not found: ${options.method} ${options.path}`);
    }

    const { endpoint, params } = match;

    // Merge path parameters with input data
    let input = { ...params, ...(options.input || {}) };

    // Validate input if schema is provided
    if (endpoint.requestSchema) {
      const validationResult = endpoint.requestSchema.safeParse(input);
      if (!validationResult.success) {
        throw new SchemaValidationError('Schema validation failed', validationResult.error.issues);
      }
      input = validationResult.data;
    }

    // Call the handler
    const result = await endpoint.handler(input);

    // Validate output if schema is provided
    if (endpoint.responseSchema) {
      const validationResult = endpoint.responseSchema.safeParse(result);
      if (!validationResult.success) {
        const error = new ResponseSchemaValidationError('Response schema validation failed', validationResult.error.issues);
        if (options.onResponseSchemaFail) {
          options.onResponseSchemaFail(error, result);
        } else {
          throw error;
        }
      }
    }

    return result;
}
