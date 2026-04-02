import { z } from 'zod';

export type EndpointRequireOption = 'authenticated-user';

export interface EndpointDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (input: any) => Promise<any> | any;
  requestSchema?: z.ZodSchema;
  responseSchema?: z.ZodSchema;
  description?: string;
  requires?: EndpointRequireOption[];
  /**
   * Unique identifier for this endpoint in the OpenAPI schema.
   * If not provided, one will be generated from the method and path.
   * Must be unique across all endpoints in the app.
   */
  operationId?: string;
}
