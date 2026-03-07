import { describe, expect, it } from 'vitest';
import { PrismApp } from '../app/PrismApp.ts';
import { ServiceDefinition } from '../ServiceDefinition.ts';
import { EndpointDefinition } from '../web/ExpressEndpointSetup.ts';

describe('PrismApp', () => {
  describe('constructor', () => {
    it('should create app with default values when no config provided', () => {
      const app = new PrismApp();

      expect(app.name).toBe('Prism App');
      expect(app.description).toBe('');
      expect(app.services).toEqual([]);
      expect(app.listAllEndpoints()).toEqual([]);
    });

    it('should create app with empty config object', () => {
      const app = new PrismApp({});

      expect(app.name).toBe('Prism App');
      expect(app.description).toBe('');
      expect(app.services).toEqual([]);
    });

    it('should create app with custom name and description', () => {
      const app = new PrismApp({
        name: 'My API',
        description: 'A test API',
      });

      expect(app.name).toBe('My API');
      expect(app.description).toBe('A test API');
    });

    it('should register initial services from config', () => {
      const endpoint: EndpointDefinition = {
        method: 'GET',
        path: '/test',
        handler: async () => ({}),
      };

      const app = new PrismApp({
        name: 'Test App',
        services: [
          { name: 'test-service', endpoints: [endpoint] },
        ],
      });

      expect(app.services).toHaveLength(1);
      expect(app.services[0].name).toBe('test-service');
      expect(app.listAllEndpoints()).toHaveLength(1);
    });
  });

  describe('addService', () => {
    it('should add a service to the app', () => {
      const app = new PrismApp({ name: 'Test App' });

      const service: ServiceDefinition = {
        name: 'users-service',
        endpoints: [
          { method: 'GET', path: '/users', handler: async () => [] },
        ],
      };

      app.addService(service);

      expect(app.services).toHaveLength(1);
      expect(app.services[0].name).toBe('users-service');
    });

    it('should register endpoints from added service', () => {
      const app = new PrismApp();

      app.addService({
        name: 'api-service',
        endpoints: [
          { method: 'GET', path: '/items', handler: async () => [] },
          { method: 'POST', path: '/items', handler: async () => ({}) },
        ],
      });

      const endpoints = app.listAllEndpoints();
      expect(endpoints).toHaveLength(2);
    });

    it('should allow adding multiple services', () => {
      const app = new PrismApp({ name: 'Multi-Service App' });

      app.addService({ name: 'service-1', endpoints: [{ method: 'GET', path: '/s1', handler: async () => ({}) }] });
      app.addService({ name: 'service-2', endpoints: [{ method: 'GET', path: '/s2', handler: async () => ({}) }] });
      app.addService({ name: 'service-3', endpoints: [{ method: 'GET', path: '/s3', handler: async () => ({}) }] });

      expect(app.services).toHaveLength(3);
      expect(app.listAllEndpoints()).toHaveLength(3);
    });

    it('should allow adding service with no endpoints', () => {
      const app = new PrismApp();

      app.addService({ name: 'empty-service' });

      expect(app.services).toHaveLength(1);
      expect(app.listAllEndpoints()).toHaveLength(0);
    });
  });

  describe('getEndpoint', () => {
    it('should find endpoint by method and path', () => {
      const handler = async () => ({});
      const app = new PrismApp({
        services: [
          {
            name: 'test',
            endpoints: [{ method: 'GET', path: '/users', handler }],
          },
        ],
      });

      const endpoint = app.getEndpoint('GET', '/users');

      expect(endpoint).toBeDefined();
      expect(endpoint?.handler).toBe(handler);
    });

    it('should return undefined for non-existent endpoint', () => {
      const app = new PrismApp();

      const endpoint = app.getEndpoint('GET', '/nonexistent');

      expect(endpoint).toBeUndefined();
    });

    it('should differentiate endpoints by method', () => {
      const getHandler = async () => ({ method: 'get' });
      const postHandler = async () => ({ method: 'post' });

      const app = new PrismApp({
        services: [
          {
            name: 'test',
            endpoints: [
              { method: 'GET', path: '/items', handler: getHandler },
              { method: 'POST', path: '/items', handler: postHandler },
            ],
          },
        ],
      });

      expect(app.getEndpoint('GET', '/items')?.handler).toBe(getHandler);
      expect(app.getEndpoint('POST', '/items')?.handler).toBe(postHandler);
    });
  });

  describe('matchEndpoint', () => {
    it('should match exact paths', () => {
      const app = new PrismApp({
        services: [
          {
            name: 'test',
            endpoints: [{ method: 'GET', path: '/users', handler: async () => ({}) }],
          },
        ],
      });

      const match = app.matchEndpoint('GET', '/users');

      expect(match).toBeDefined();
      expect(match?.params).toEqual({});
    });

    it('should match paths with parameters', () => {
      const app = new PrismApp({
        services: [
          {
            name: 'test',
            endpoints: [{ method: 'GET', path: '/users/:userId', handler: async () => ({}) }],
          },
        ],
      });

      const match = app.matchEndpoint('GET', '/users/123');

      expect(match).toBeDefined();
      expect(match?.params).toEqual({ userId: '123' });
    });

    it('should match paths with multiple parameters', () => {
      const app = new PrismApp({
        services: [
          {
            name: 'test',
            endpoints: [{ method: 'GET', path: '/users/:userId/posts/:postId', handler: async () => ({}) }],
          },
        ],
      });

      const match = app.matchEndpoint('GET', '/users/123/posts/456');

      expect(match).toBeDefined();
      expect(match?.params).toEqual({ userId: '123', postId: '456' });
    });

    it('should return undefined for non-matching paths', () => {
      const app = new PrismApp({
        services: [
          {
            name: 'test',
            endpoints: [{ method: 'GET', path: '/users', handler: async () => ({}) }],
          },
        ],
      });

      const match = app.matchEndpoint('GET', '/posts');

      expect(match).toBeUndefined();
    });

    it('should not match when method differs', () => {
      const app = new PrismApp({
        services: [
          {
            name: 'test',
            endpoints: [{ method: 'GET', path: '/users', handler: async () => ({}) }],
          },
        ],
      });

      const match = app.matchEndpoint('POST', '/users');

      expect(match).toBeUndefined();
    });
  });

  describe('getAllServices', () => {
    it('should return all registered services', () => {
      const app = new PrismApp();
      app.addService({ name: 'service-1' });
      app.addService({ name: 'service-2' });

      const services = app.getAllServices();

      expect(services).toHaveLength(2);
      expect(services[0].name).toBe('service-1');
      expect(services[1].name).toBe('service-2');
    });
  });

  describe('listAllEndpoints', () => {
    it('should return all endpoints from all services', () => {
      const app = new PrismApp();

      app.addService({
        name: 'service-1',
        endpoints: [
          { method: 'GET', path: '/a', handler: async () => ({}) },
          { method: 'GET', path: '/b', handler: async () => ({}) },
        ],
      });

      app.addService({
        name: 'service-2',
        endpoints: [
          { method: 'GET', path: '/c', handler: async () => ({}) },
        ],
      });

      const endpoints = app.listAllEndpoints();

      expect(endpoints).toHaveLength(3);
      expect(endpoints.map(e => e.path).sort()).toEqual(['/a', '/b', '/c']);
    });
  });
});
