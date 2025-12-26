import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createEndpoint } from '../endpoints/createEndpoint.ts';
import { EndpointDefinition } from '../web/ExpressEndpointSetup.ts';

describe('createEndpoint', () => {
  describe('valid endpoints', () => {
    it('should return the endpoint definition unchanged for valid endpoints', () => {
      const definition: EndpointDefinition = {
        method: 'GET',
        path: '/users',
        description: 'Get all users',
        responseSchema: z.array(z.object({ id: z.string(), name: z.string() })),
        handler: async () => [{ id: '1', name: 'Test' }],
      };

      const result = createEndpoint(definition);

      expect(result.method).toBe('GET');
      expect(result.path).toBe('/users');
      expect(result.description).toBe('Get all users');
      expect(result.handler).toBe(definition.handler);
    });

    it('should allow endpoints with request and response schemas', () => {
      const definition: EndpointDefinition = {
        method: 'POST',
        path: '/users',
        requestSchema: z.object({ name: z.string(), email: z.string() }),
        responseSchema: z.object({ id: z.string() }),
        handler: async (input) => ({ id: 'new-id' }),
      };

      const result = createEndpoint(definition);

      expect(result.handler).toBe(definition.handler);
    });

    it('should allow endpoints with path parameters', () => {
      const definition: EndpointDefinition = {
        method: 'GET',
        path: '/users/:userId',
        responseSchema: z.object({ id: z.string() }),
        handler: async (input) => ({ id: input.userId }),
      };

      const result = createEndpoint(definition);

      expect(result.handler).toBe(definition.handler);
    });

    it('should allow endpoints without schemas', () => {
      const definition: EndpointDefinition = {
        method: 'GET',
        path: '/health',
        handler: async () => ({ status: 'ok' }),
      };

      const result = createEndpoint(definition);

      expect(result.handler).toBe(definition.handler);
    });
  });

  describe('path validation - /api prefix', () => {
    it('should replace handler for endpoints with /api prefix', () => {
      const originalHandler = async () => ({ message: 'test' });
      const definition: EndpointDefinition = {
        method: 'GET',
        path: '/api/users',
        handler: originalHandler,
      };

      const result = createEndpoint(definition);

      // Handler should be replaced
      expect(result.handler).not.toBe(originalHandler);
      expect(result.path).toBe('/api/users');
      expect(result.method).toBe('GET');
    });

    it('should throw error when calling endpoint with /api prefix', () => {
      const definition: EndpointDefinition = {
        method: 'GET',
        path: '/api/bad-endpoint',
        handler: async () => ({ message: 'test' }),
      };

      const result = createEndpoint(definition);

      // The replacement handler throws synchronously
      expect(() => result.handler({})).toThrow(
        'Misconfigured endpoint /api/bad-endpoint: API endpoints should not start with /api'
      );
    });

    it('should reject /api prefix for all HTTP methods', () => {
      const methods: Array<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'> = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        const definition: EndpointDefinition = {
          method,
          path: '/api/test',
          handler: async () => ({}),
        };

        const result = createEndpoint(definition);

        // The replacement handler throws synchronously
        expect(() => result.handler({})).toThrow(/API endpoints should not start with \/api/);
      }
    });

    it('should allow paths that contain /api but do not start with it', () => {
      const originalHandler = async () => ({ message: 'test' });
      const definition: EndpointDefinition = {
        method: 'GET',
        path: '/v1/api/users',
        handler: originalHandler,
      };

      const result = createEndpoint(definition);

      // Handler should not be replaced
      expect(result.handler).toBe(originalHandler);
    });
  });

  describe('OpenAPI schema validation', () => {
    it('should reject z.function() in request schema', () => {
      const definition: EndpointDefinition = {
        method: 'POST',
        path: '/test-function',
        requestSchema: z.object({
          callback: z.function(),
        }),
        handler: async () => ({ success: true }),
      };

      const result = createEndpoint(definition);

      // The replacement handler throws synchronously
      expect(() => result.handler({})).toThrow(/Misconfigured endpoint/);
    });

    it('should reject z.instanceof() in request schema', () => {
      const definition: EndpointDefinition = {
        method: 'POST',
        path: '/test-instanceof',
        requestSchema: z.object({
          date: z.instanceof(Date),
        }),
        handler: async () => ({ success: true }),
      };

      const result = createEndpoint(definition);

      expect(() => result.handler({})).toThrow(/Misconfigured endpoint/);
    });

    it('should reject z.symbol() in response schema', () => {
      const definition: EndpointDefinition = {
        method: 'GET',
        path: '/test-symbol',
        responseSchema: z.object({
          id: z.symbol(),
        }),
        handler: async () => ({ id: Symbol('test') }),
      };

      const result = createEndpoint(definition);

      expect(() => result.handler({})).toThrow(/Misconfigured endpoint/);
    });

    it('should reject z.promise() in response schema', () => {
      const definition: EndpointDefinition = {
        method: 'GET',
        path: '/test-promise',
        responseSchema: z.promise(z.object({ data: z.string() })),
        handler: async () => ({ data: 'test' }),
      };

      const result = createEndpoint(definition);

      expect(() => result.handler({})).toThrow(/Misconfigured endpoint/);
    });

    it('should reject z.void() in response schema', () => {
      const definition: EndpointDefinition = {
        method: 'GET',
        path: '/test-void',
        responseSchema: z.void(),
        handler: async () => undefined,
      };

      const result = createEndpoint(definition);

      expect(() => result.handler({})).toThrow(/Misconfigured endpoint/);
    });

    it('should allow common Zod types that are OpenAPI compatible', () => {
      const definition: EndpointDefinition = {
        method: 'POST',
        path: '/valid-schemas',
        requestSchema: z.object({
          name: z.string(),
          age: z.number(),
          active: z.boolean(),
          tags: z.array(z.string()),
          status: z.enum(['active', 'inactive']),
          optional: z.string().optional(),
          nullable: z.string().nullable(),
        }),
        responseSchema: z.object({
          id: z.string(),
          createdAt: z.string(),
        }),
        handler: async () => ({ id: '123', createdAt: new Date().toISOString() }),
      };

      const result = createEndpoint(definition);

      // Handler should not be replaced for valid schemas
      expect(result.handler).toBe(definition.handler);
    });
  });

  describe('error message format', () => {
    it('should include endpoint path in error message for /api prefix', () => {
      const definition: EndpointDefinition = {
        method: 'GET',
        path: '/api/specific-path',
        handler: async () => ({}),
      };

      const result = createEndpoint(definition);

      expect(() => result.handler({})).toThrow('/api/specific-path');
    });

    it('should include endpoint path in error message for schema validation', () => {
      const definition: EndpointDefinition = {
        method: 'GET',
        path: '/schema-error-path',
        responseSchema: z.symbol(),
        handler: async () => Symbol('test'),
      };

      const result = createEndpoint(definition);

      expect(() => result.handler({})).toThrow('/schema-error-path');
    });
  });
});
