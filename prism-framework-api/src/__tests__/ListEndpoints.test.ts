import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runShellCommand } from '@facetlayer/subprocess-wrapper';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Server } from 'http';
import { App, createEndpoint, createExpressApp, startServer } from '../index.ts';

describe('prism list-endpoints', () => {
  let server: Server;
  const port = 19876;
  const tempDir = join(__dirname, '../../test/temp');

  beforeAll(async () => {
    // Create temp directory with .env file for prism CLI
    console.log('Creating temp directory:', tempDir);
    mkdirSync(tempDir, { recursive: true });
    writeFileSync(join(tempDir, '.env'), `PRISM_API_PORT=${port}`);

    // Create a simple test app with some endpoints
    const testService = {
      name: 'test-service',
      endpoints: [
        createEndpoint({
          method: 'GET',
          path: '/users',
          description: 'List all users',
          handler: () => ({ users: [] }),
        }),
        createEndpoint({
          method: 'POST',
          path: '/users',
          description: 'Create a new user',
          handler: () => ({ id: '123', name: 'Test User' }),
        }),
        createEndpoint({
          method: 'GET',
          path: '/users/:id',
          description: 'Get user by ID',
          handler: () => ({ id: '123', name: 'Test User' }),
        }),
        createEndpoint({
          method: 'DELETE',
          path: '/users/:id',
          description: 'Delete user by ID',
          handler: () => ({ success: true }),
        }),
      ],
    };

    const app = new App({ name: 'Test App', services: [testService] });
    console.log('Starting server');
    server = await startServer({
      port,
      app,
    });
    console.log('Server started');
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  it('should list endpoints from the running server', async () => {
    // Run the prism list-endpoints command from the temp directory
    const result = await runShellCommand('prism', ['list-endpoints'], {
      cwd: tempDir,
    });

    const output = result.stdout!.join('\n');

    // Verify the output contains our endpoints
    expect(output).toContain('Available endpoints');
    expect(output).toContain('GET');
    expect(output).toContain('/users');
    expect(output).toContain('POST');
    expect(output).toContain('DELETE');
    expect(output).toContain('/users/:id');
  });

  it('should return endpoints via /endpoints.json', async () => {
    const response = await fetch(`http://localhost:${port}/endpoints.json`);
    const data = await response.json();

    expect(data.endpoints).toBeDefined();
    expect(Array.isArray(data.endpoints)).toBe(true);
    expect(data.endpoints.length).toBeGreaterThan(0);

    // Check that our test endpoints are included
    const paths = data.endpoints.map((e: { path: string }) => e.path);
    expect(paths).toContain('/users');
    expect(paths).toContain('/users/:id');
  });
});
