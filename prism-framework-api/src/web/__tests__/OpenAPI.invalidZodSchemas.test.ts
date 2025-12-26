import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { validateServicesForOpenapi } from '../openapi/validateServicesForOpenapi.ts';
import { generateOpenAPISchema } from '../openapi/OpenAPI.ts';
import { ServiceDefinition } from '../../ServiceDefinition.ts';
import { createEndpoint } from '../../endpoints/createEndpoint.ts';
import { EndpointDefinition } from '../ExpressEndpointSetup.ts';

describe('validateServicesForOpenapi', () => {
  it('should return empty array for valid schemas', () => {
    const services: ServiceDefinition[] = [
      {
        name: 'test-service',
        endpoints: [
          createEndpoint({
            method: 'GET',
            path: '/test',
            requestSchema: z.object({ id: z.string() }),
            responseSchema: z.object({ result: z.string() }),
            handler: async () => ({ result: 'ok' }),
          }),
        ],
      },
    ];

    const result = validateServicesForOpenapi(services);

    expect(result.problemEndpoints).toEqual([]);
  });

  it('should detect z.lazy() schemas as problematic when not using createEndpoint', () => {
    // Test the raw validation function with endpoints that haven't been sanitized
    interface TreeNode {
      name: string;
      children?: TreeNode[];
    }

    const TreeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
      z.object({
        name: z.string(),
        children: z.array(TreeNodeSchema).optional(),
      })
    );

    // Create endpoint directly without createEndpoint to test raw validation
    const rawEndpoint: EndpointDefinition = {
      method: 'GET',
      path: '/codebase/scan',
      requestSchema: z.object({ directory: z.string() }),
      responseSchema: z.object({ tree: TreeNodeSchema }),
      handler: async () => ({ tree: { name: 'root' } }),
    };

    const services: ServiceDefinition[] = [
      {
        name: 'codebase',
        endpoints: [rawEndpoint],
      },
    ];

    const result = validateServicesForOpenapi(services);

    expect(result.problemEndpoints).toHaveLength(1);
    expect(result.problemEndpoints[0].path).toBe('/codebase/scan');
    expect(result.problemEndpoints[0].method).toBe('GET');
    expect(result.problemEndpoints[0].error.errorMessage).toContain('Unknown zod object type');
  });

  it('should return empty when createEndpoint sanitizes invalid schemas', () => {
    // When using createEndpoint, invalid schemas are removed so validation passes
    interface TreeNode {
      name: string;
      children?: TreeNode[];
    }

    const TreeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
      z.object({
        name: z.string(),
        children: z.array(TreeNodeSchema).optional(),
      })
    );

    const services: ServiceDefinition[] = [
      {
        name: 'codebase',
        endpoints: [
          createEndpoint({
            method: 'GET',
            path: '/codebase/scan',
            requestSchema: z.object({ directory: z.string() }),
            responseSchema: z.object({ tree: TreeNodeSchema }),
            handler: async () => ({ tree: { name: 'root' } }),
          }),
        ],
      },
    ];

    // createEndpoint removes the invalid schemas, so validation passes
    const result = validateServicesForOpenapi(services);
    expect(result.problemEndpoints).toEqual([]);
  });

  it('should handle services with no endpoints', () => {
    const services: ServiceDefinition[] = [
      {
        name: 'empty-service',
        endpoints: [],
      },
    ];

    const result = validateServicesForOpenapi(services);

    expect(result.problemEndpoints).toEqual([]);
  });

  it('should handle undefined endpoints array', () => {
    const services: ServiceDefinition[] = [
      {
        name: 'no-endpoints-service',
      } as ServiceDefinition,
    ];

    const result = validateServicesForOpenapi(services);

    expect(result.problemEndpoints).toEqual([]);
  });
});

describe('generateOpenAPISchema', () => {
  it('should succeed when createEndpoint sanitizes invalid schemas', () => {
    // createEndpoint removes invalid schemas, so OpenAPI generation succeeds
    interface TreeNode {
      name: string;
      children?: TreeNode[];
    }

    const TreeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
      z.object({
        name: z.string(),
        children: z.array(TreeNodeSchema).optional(),
      })
    );

    const services: ServiceDefinition[] = [
      {
        name: 'test',
        endpoints: [
          createEndpoint({
            method: 'GET',
            path: '/tree',
            responseSchema: z.object({ tree: TreeNodeSchema }),
            handler: async () => ({ tree: { name: 'root' } }),
          }),
        ],
      },
    ];

    // Should not throw because createEndpoint removed the invalid schema
    const schema = generateOpenAPISchema(services, {
      version: '1.0.0',
      title: 'Test',
      description: 'Test',
    });

    expect(schema.openapi).toBe('3.1.0');
    expect(schema.paths!['/tree']).toBeDefined();
  });

  it('should throw for raw endpoints with invalid schemas', () => {
    // Test that raw endpoints (not sanitized by createEndpoint) still throw
    interface TreeNode {
      name: string;
      children?: TreeNode[];
    }

    const TreeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
      z.object({
        name: z.string(),
        children: z.array(TreeNodeSchema).optional(),
      })
    );

    const rawEndpoint: EndpointDefinition = {
      method: 'GET',
      path: '/tree',
      responseSchema: z.object({ tree: TreeNodeSchema }),
      handler: async () => ({ tree: { name: 'root' } }),
    };

    const services: ServiceDefinition[] = [
      {
        name: 'test',
        endpoints: [rawEndpoint],
      },
    ];

    expect(() =>
      generateOpenAPISchema(services, {
        version: '1.0.0',
        title: 'Test',
        description: 'Test',
      })
    ).toThrow('Unknown zod object type');
  });

  it('should succeed with valid non-recursive schemas', () => {
    const services: ServiceDefinition[] = [
      {
        name: 'test',
        endpoints: [
          createEndpoint({
            method: 'GET',
            path: '/users',
            requestSchema: z.object({ id: z.string() }),
            responseSchema: z.object({
              user: z.object({
                id: z.string(),
                name: z.string(),
                email: z.string(),
              }),
            }),
            handler: async () => ({
              user: { id: '1', name: 'Test', email: 'test@example.com' },
            }),
          }),
          createEndpoint({
            method: 'POST',
            path: '/users',
            requestSchema: z.object({
              name: z.string(),
              email: z.string(),
            }),
            responseSchema: z.object({ id: z.string() }),
            handler: async () => ({ id: '1' }),
          }),
        ],
      },
    ];

    const schema = generateOpenAPISchema(services, {
      version: '1.0.0',
      title: 'Test API',
      description: 'Test API Description',
    });

    expect(schema.openapi).toBe('3.1.0');
    expect(schema.info.title).toBe('Test API');
    expect(schema.paths!['/users']).toBeDefined();
  });
});
