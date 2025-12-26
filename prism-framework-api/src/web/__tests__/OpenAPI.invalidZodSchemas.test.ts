import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { validateEndpointForOpenapi, generateOpenAPISchema } from '../openapi/OpenAPI.ts';
import { ServiceDefinition } from '../../ServiceDefinition.ts';
import { createEndpoint } from '../../endpoints/createEndpoint.ts';

describe('findProblematicEndpoints', () => {
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

    const result = validateEndpointForOpenapi(services);

    expect(result.problemEndpoints).toEqual([]);
  });

  it('should detect z.lazy() schemas as problematic', () => {
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

    const result = validateEndpointForOpenapi(services);

    expect(result.problemEndpoints).toHaveLength(1);
    expect(result.problemEndpoints[0].path).toBe('/codebase/scan');
    expect(result.problemEndpoints[0].method).toBe('GET');
    expect(result.problemEndpoints[0].error).toContain('Unknown zod object type');
  });

  it('should detect z.lazy() in request schemas', () => {
    interface RecursiveInput {
      value: string;
      nested?: RecursiveInput;
    }

    const RecursiveInputSchema: z.ZodType<RecursiveInput> = z.lazy(() =>
      z.object({
        value: z.string(),
        nested: RecursiveInputSchema.optional(),
      })
    );

    const services: ServiceDefinition[] = [
      {
        name: 'recursive-service',
        endpoints: [
          createEndpoint({
            method: 'POST',
            path: '/recursive',
            requestSchema: RecursiveInputSchema,
            responseSchema: z.object({ success: z.boolean() }),
            handler: async () => ({ success: true }),
          }),
        ],
      },
    ];

    const result = validateEndpointForOpenapi(services);

    expect(result.problemEndpoints).toHaveLength(1);
    expect(result.problemEndpoints[0].path).toBe('/recursive');
    expect(result.problemEndpoints[0].error).toContain('Unknown zod object type');
  });

  it('should identify multiple problematic endpoints across services', () => {
    interface Node {
      id: string;
      children?: Node[];
    }

    const NodeSchema: z.ZodType<Node> = z.lazy(() =>
      z.object({
        id: z.string(),
        children: z.array(NodeSchema).optional(),
      })
    );

    const services: ServiceDefinition[] = [
      {
        name: 'service-a',
        endpoints: [
          createEndpoint({
            method: 'GET',
            path: '/valid',
            responseSchema: z.object({ ok: z.boolean() }),
            handler: async () => ({ ok: true }),
          }),
          createEndpoint({
            method: 'GET',
            path: '/problematic-a',
            responseSchema: z.object({ node: NodeSchema }),
            handler: async () => ({ node: { id: '1' } }),
          }),
        ],
      },
      {
        name: 'service-b',
        endpoints: [
          createEndpoint({
            method: 'POST',
            path: '/problematic-b',
            requestSchema: NodeSchema,
            responseSchema: z.object({ saved: z.boolean() }),
            handler: async () => ({ saved: true }),
          }),
        ],
      },
    ];

    const result = validateEndpointForOpenapi(services);

    expect(result.problemEndpoints).toHaveLength(2);
    expect(result.problemEndpoints.map((p) => p.path)).toContain('/problematic-a');
    expect(result.problemEndpoints.map((p) => p.path)).toContain('/problematic-b');
  });

  it('should handle services with no endpoints', () => {
    const services: ServiceDefinition[] = [
      {
        name: 'empty-service',
        endpoints: [],
      },
    ];

    const result = validateEndpointForOpenapi(services);

    expect(result.problemEndpoints).toEqual([]);
  });

  it('should handle undefined endpoints array', () => {
    const services: ServiceDefinition[] = [
      {
        name: 'no-endpoints-service',
      } as ServiceDefinition,
    ];

    const result = validateEndpointForOpenapi(services);

    expect(result.problemEndpoints).toEqual([]);
  });
});

describe('generateOpenAPISchema with invalid schemas', () => {
  it('should throw when encountering z.lazy() without .openapi() metadata', () => {
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
                email: z.string().email(),
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
              email: z.string().email(),
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
