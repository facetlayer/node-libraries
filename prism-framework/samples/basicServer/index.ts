/**
 * Basic server sample - verifies that the documented APIs work correctly.
 *
 * This follows the patterns from:
 *  - README.md (Quick Start)
 *  - creating-services.md (endpoint definitions, error handling)
 *  - server-setup.md (App + startServer)
 *  - authorization.md (Authorization, AuthSource, Resource)
 */

import {
  createEndpoint,
  App,
  startServer,
  type ServiceDefinition,
  Authorization,
  getCurrentRequestContext,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '../../src/index.ts';
import { z } from 'zod';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Users service (from creating-services.md) ---

const users = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' },
];

const listUsersEndpoint = createEndpoint({
  method: 'GET',
  path: '/users',
  description: 'List all users',
  responseSchema: z.array(z.object({ id: z.string(), name: z.string(), email: z.string() })),
  handler: async () => {
    return users;
  },
});

const getUserEndpoint = createEndpoint({
  method: 'GET',
  path: '/users/:id',
  description: 'Get a user by ID',
  requestSchema: z.object({ id: z.string() }),
  responseSchema: z.object({ id: z.string(), name: z.string(), email: z.string() }),
  handler: async (input) => {
    const user = users.find(u => u.id === input.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  },
});

const createUserEndpoint = createEndpoint({
  method: 'POST',
  path: '/users',
  description: 'Create a user',
  requestSchema: z.object({
    name: z.string(),
    email: z.string(),
  }),
  responseSchema: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
  handler: async (input) => {
    if (!input.name) {
      throw new BadRequestError('Name is required');
    }
    const newUser = { id: String(users.length + 1), name: input.name, email: input.email };
    users.push(newUser);
    return newUser;
  },
});

const usersService: ServiceDefinition = {
  name: 'users',
  endpoints: [listUsersEndpoint, getUserEndpoint, createUserEndpoint],
};

// --- Hello service (from README.md Quick Start) ---

const helloEndpoint = createEndpoint({
  method: 'GET',
  path: '/hello',
  description: 'Say hello',
  requestSchema: z.object({ name: z.string().optional() }),
  responseSchema: z.object({ message: z.string() }),
  handler: async (input) => {
    return { message: `Hello, ${input.name ?? 'World'}!` };
  },
});

const helloService: ServiceDefinition = {
  name: 'hello',
  endpoints: [helloEndpoint],
};

// --- Authorization verification (from authorization.md) ---

const authTestEndpoint = createEndpoint({
  method: 'GET',
  path: '/auth-test',
  description: 'Test the authorization API',
  responseSchema: z.object({ success: z.boolean(), message: z.string() }),
  handler: async () => {
    // Verify the Authorization class works as documented
    const auth = new Authorization();

    // Add resources (from authorization.md)
    auth.addResource({ type: 'user', id: '123' });
    auth.addResource({ type: 'project', id: 'abc' });

    // Check resources
    if (!auth.hasResource('user')) {
      throw new Error('hasResource failed');
    }
    const user = auth.getResource('user');
    if (user?.id !== '123') {
      throw new Error('getResource failed');
    }

    // Add auth sources (from authorization.md - was "addCredential", now "addAuthSource")
    auth.addAuthSource({
      type: 'cookie',
      sessionId: 'session-xyz',
    });

    const cookieSource = auth.getCookieAuthSource();
    if (cookieSource?.sessionId !== 'session-xyz') {
      throw new Error('getCookieAuthSource failed');
    }

    // Set permissions
    auth.setUserPermissions({
      userId: '123',
      permissions: ['read:projects', 'write:projects'],
    });

    // Check permissions
    if (!auth.hasPermission('write:projects')) {
      throw new Error('hasPermission failed');
    }
    if (auth.hasPermission('delete:projects')) {
      throw new Error('hasPermission should return false for missing permission');
    }

    return { success: true, message: 'All authorization APIs work correctly' };
  },
});

const authTestService: ServiceDefinition = {
  name: 'auth-test',
  endpoints: [authTestEndpoint],
};

// --- Start the server (from server-setup.md) ---

const ALL_SERVICES: ServiceDefinition[] = [usersService, helloService, authTestService];

async function main() {
  const app = new App({ services: ALL_SERVICES });

  await startServer({
    app,
    port: 19999,
    openapiConfig: {
      enable: true,
      enableSwagger: true,
    },
    web: {
      dir: join(__dirname, 'web'),
    },
  });

  console.log('Sample server running at http://localhost:19999');
  console.log('');
  console.log('Try these endpoints:');
  console.log('  GET  http://localhost:19999/api/hello');
  console.log('  GET  http://localhost:19999/api/hello?name=Prism');
  console.log('  GET  http://localhost:19999/api/users');
  console.log('  GET  http://localhost:19999/api/users/1');
  console.log('  POST http://localhost:19999/api/users  (body: {"name":"Charlie","email":"charlie@example.com"})');
  console.log('  GET  http://localhost:19999/api/auth-test');
  console.log('  GET  http://localhost:19999/api/openapi.json');
  console.log('  GET  http://localhost:19999/api/swagger');
  console.log('');
  console.log('Web UI at http://localhost:19999');
}

main().catch(console.error);
