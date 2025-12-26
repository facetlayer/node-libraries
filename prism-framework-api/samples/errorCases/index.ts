/**
 * Sample project to test validation checks in createEndpoint.ts
 *
 * This sample creates various endpoints to test:
 * 1. Valid endpoints (should work fine)
 * 2. Endpoints with paths starting with /api (should fail validation)
 * 3. Endpoints with Zod schemas that are not compatible with OpenAPI
 */

import { z } from 'zod';
import {
  App,
  createEndpoint,
  createExpressApp,
} from '../../dist/index.js';

// ============================================
// VALID ENDPOINTS - These should work fine
// ============================================

const validGetEndpoint = createEndpoint({
  method: 'GET',
  path: '/users',
  description: 'Get all users',
  responseSchema: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })),
  handler: async () => {
    return [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ];
  },
});

const validPostEndpoint = createEndpoint({
  method: 'POST',
  path: '/users',
  description: 'Create a user',
  requestSchema: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
  responseSchema: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
  handler: async (input) => {
    return {
      id: 'new-id',
      name: input.name,
      email: input.email,
    };
  },
});

const validPathParamEndpoint = createEndpoint({
  method: 'GET',
  path: '/users/:userId',
  description: 'Get a specific user by ID',
  responseSchema: z.object({
    id: z.string(),
    name: z.string(),
  }),
  handler: async (input) => {
    return { id: input.userId, name: 'Test User' };
  },
});

// ============================================
// ERROR CASE 1: Path starts with /api
// This should trigger the validation warning and throw an error when called
// ============================================

const badPathApiPrefix = createEndpoint({
  method: 'GET',
  path: '/api/bad-endpoint',
  description: 'This endpoint has a path starting with /api which is not allowed',
  responseSchema: z.object({
    message: z.string(),
  }),
  handler: async () => {
    return { message: 'This should not be reachable' };
  },
});

const badPathApiPrefixPost = createEndpoint({
  method: 'POST',
  path: '/api/another-bad-endpoint',
  description: 'Another endpoint with /api prefix',
  requestSchema: z.object({
    data: z.string(),
  }),
  responseSchema: z.object({
    result: z.string(),
  }),
  handler: async (input) => {
    return { result: input.data };
  },
});

// ============================================
// ERROR CASE 2: Zod schemas incompatible with OpenAPI
// Some Zod types cannot be converted to OpenAPI schemas
// ============================================

// Using z.function() - not supported by OpenAPI
const badSchemaWithFunction = createEndpoint({
  method: 'POST',
  path: '/bad-function-schema',
  description: 'This endpoint uses z.function() which is not supported by OpenAPI',
  requestSchema: z.object({
    callback: z.function(),
  }),
  responseSchema: z.object({
    success: z.boolean(),
  }),
  handler: async () => {
    return { success: true };
  },
});

// Using z.instanceof() - not supported by OpenAPI
const badSchemaWithInstanceof = createEndpoint({
  method: 'POST',
  path: '/bad-instanceof-schema',
  description: 'This endpoint uses z.instanceof() which is not supported by OpenAPI',
  requestSchema: z.object({
    date: z.instanceof(Date),
  }),
  responseSchema: z.object({
    timestamp: z.number(),
  }),
  handler: async (input) => {
    return { timestamp: Date.now() };
  },
});

// Using z.promise() in response - may cause issues
const badSchemaWithPromise = createEndpoint({
  method: 'GET',
  path: '/bad-promise-schema',
  description: 'This endpoint uses z.promise() in response which may not be supported',
  responseSchema: z.promise(z.object({
    data: z.string(),
  })),
  handler: async () => {
    return { data: 'test' };
  },
});

// Using z.lazy() for recursive types - may cause issues
const categorySchema: z.ZodType<any> = z.lazy(() => z.object({
  name: z.string(),
  subcategories: z.array(categorySchema).optional(),
}));

const badSchemaWithLazy = createEndpoint({
  method: 'GET',
  path: '/bad-lazy-schema',
  description: 'This endpoint uses z.lazy() for recursive types',
  responseSchema: categorySchema,
  handler: async () => {
    return { name: 'Root', subcategories: [] };
  },
});

// Using z.symbol() - not JSON serializable, not supported by OpenAPI
const badSchemaWithSymbol = createEndpoint({
  method: 'GET',
  path: '/bad-symbol-schema',
  description: 'This endpoint uses z.symbol() which is not supported',
  responseSchema: z.object({
    id: z.symbol(),
  }),
  handler: async () => {
    return { id: Symbol('test') };
  },
});

// Using z.void() in response - not typical for JSON APIs
const badSchemaWithVoid = createEndpoint({
  method: 'GET',
  path: '/bad-void-schema',
  description: 'This endpoint uses z.void() which may not work for JSON APIs',
  responseSchema: z.void(),
  handler: async () => {
    return undefined;
  },
});

// ============================================
// Create the app and mount endpoints
// ============================================

const app = new App({
  name: 'Error Cases Sample',
  description: 'Sample app to test validation checks',
});

// Register valid endpoints
app.addService({
  name: 'valid-service',
  endpoints: [
    validGetEndpoint,
    validPostEndpoint,
    validPathParamEndpoint,
  ],
});

// Register endpoints with bad /api paths
app.addService({
  name: 'bad-api-path-service',
  endpoints: [
    badPathApiPrefix,
    badPathApiPrefixPost,
  ],
});

// Register endpoints with bad schemas
app.addService({
  name: 'bad-schema-service',
  endpoints: [
    badSchemaWithFunction,
    badSchemaWithInstanceof,
    badSchemaWithPromise,
    badSchemaWithLazy,
    badSchemaWithSymbol,
    badSchemaWithVoid,
  ],
});

// Start the server
const PORT = 3099;
const expressApp = createExpressApp({
  port: PORT,
  app: app,
  openapiConfig: { enable: true, enableSwagger: true },
});

expressApp.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Error Cases Sample Server Started');
  console.log('='.repeat(60));
  console.log(`\nServer running at http://localhost:${PORT}\n`);

  console.log('VALID ENDPOINTS (should work):');
  console.log('  GET  http://localhost:3099/users');
  console.log('  POST http://localhost:3099/users');
  console.log('  GET  http://localhost:3099/users/:userId');

  console.log('\nERROR CASE 1 - Path starts with /api (should fail):');
  console.log('  GET  http://localhost:3099/api/bad-endpoint');
  console.log('  POST http://localhost:3099/api/another-bad-endpoint');

  console.log('\nERROR CASE 2 - Bad Zod schemas (may fail):');
  console.log('  POST http://localhost:3099/bad-function-schema');
  console.log('  POST http://localhost:3099/bad-instanceof-schema');
  console.log('  GET  http://localhost:3099/bad-promise-schema');
  console.log('  GET  http://localhost:3099/bad-lazy-schema');
  console.log('  GET  http://localhost:3099/bad-symbol-schema');
  console.log('  GET  http://localhost:3099/bad-void-schema');

  console.log('\n' + '='.repeat(60) + '\n');
});
