import { describe, expect, it } from 'vitest';
import { PrismApp } from '../app/PrismApp.ts';
import { validateApp, validateAppOrThrow } from '../app/validateApp.ts';

describe('validateApp', () => {
  describe('duplicate operationId detection', () => {
    it('should pass when all operationIds are unique', () => {
      const app = new PrismApp({
        services: [
          {
            name: 'test-service',
            endpoints: [
              {
                method: 'GET',
                path: '/users',
                operationId: 'getUsers',
                handler: async () => [],
              },
              {
                method: 'POST',
                path: '/users',
                operationId: 'createUser',
                handler: async () => ({}),
              },
              {
                method: 'GET',
                path: '/users/:id',
                operationId: 'getUserById',
                handler: async () => ({}),
              },
            ],
          },
        ],
      });

      const result = validateApp(app);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when endpoints have duplicate explicit operationIds', () => {
      const app = new PrismApp({
        services: [
          {
            name: 'test-service',
            endpoints: [
              {
                method: 'GET',
                path: '/users',
                operationId: 'getUsers',
                handler: async () => [],
              },
              {
                method: 'GET',
                path: '/customers',
                operationId: 'getUsers', // Duplicate!
                handler: async () => [],
              },
            ],
          },
        ],
      });

      const result = validateApp(app);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Duplicate operationIds');
      expect(result.errors[0].message).toContain('getUsers');
    });

    it('should detect duplicates across multiple services', () => {
      const app = new PrismApp({
        services: [
          {
            name: 'service-a',
            endpoints: [
              {
                method: 'GET',
                path: '/items',
                operationId: 'listItems',
                handler: async () => [],
              },
            ],
          },
          {
            name: 'service-b',
            endpoints: [
              {
                method: 'GET',
                path: '/products',
                operationId: 'listItems', // Duplicate from service-a
                handler: async () => [],
              },
            ],
          },
        ],
      });

      const result = validateApp(app);

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('listItems');
    });

    it('should pass when auto-generated operationIds are unique', () => {
      const app = new PrismApp({
        services: [
          {
            name: 'test-service',
            endpoints: [
              {
                method: 'GET',
                path: '/users',
                handler: async () => [], // Will auto-generate "getUsers"
              },
              {
                method: 'POST',
                path: '/users',
                handler: async () => ({}), // Will auto-generate "postUsers"
              },
            ],
          },
        ],
      });

      const result = validateApp(app);

      expect(result.valid).toBe(true);
    });

    it('should pass for empty app', () => {
      const app = new PrismApp();

      const result = validateApp(app);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass for app with services but no endpoints', () => {
      const app = new PrismApp({
        services: [
          {
            name: 'empty-service',
            endpoints: [],
          },
        ],
      });

      const result = validateApp(app);

      expect(result.valid).toBe(true);
    });
  });
});

describe('validateAppOrThrow', () => {
  it('should not throw for valid app', () => {
    const app = new PrismApp({
      services: [
        {
          name: 'test-service',
          endpoints: [
            {
              method: 'GET',
              path: '/users',
              operationId: 'getUsers',
              handler: async () => [],
            },
          ],
        },
      ],
    });

    expect(() => validateAppOrThrow(app)).not.toThrow();
  });

  it('should throw for app with duplicate operationIds', () => {
    const app = new PrismApp({
      services: [
        {
          name: 'test-service',
          endpoints: [
            {
              method: 'GET',
              path: '/users',
              operationId: 'duplicateId',
              handler: async () => [],
            },
            {
              method: 'GET',
              path: '/items',
              operationId: 'duplicateId',
              handler: async () => [],
            },
          ],
        },
      ],
    });

    expect(() => validateAppOrThrow(app)).toThrow('PrismApp validation failed');
    expect(() => validateAppOrThrow(app)).toThrow('Duplicate operationIds');
  });
});
