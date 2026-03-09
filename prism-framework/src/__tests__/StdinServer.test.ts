import { describe, expect, it, vi } from 'vitest';
import { PassThrough } from 'stream';
import { createEndpoint } from '../endpoints/createEndpoint.ts';
import { PrismApp } from '../app/PrismApp.ts';
import { NotFoundError, BadRequestError } from '../Errors.ts';
import { z } from 'zod';
import { startStdinServer, type StdinResponse } from '../stdin/StdinServer.ts';

/**
 * Create a test app with sample endpoints for testing the stdin protocol.
 */
function createTestApp(): PrismApp {
  const items = [
    { id: '1', title: 'First item', done: false },
    { id: '2', title: 'Second item', done: true },
  ];

  const listItems = createEndpoint({
    method: 'GET',
    path: '/items',
    description: 'List all items',
    responseSchema: z.array(z.object({ id: z.string(), title: z.string(), done: z.boolean() })),
    handler: async () => items,
  });

  const getItem = createEndpoint({
    method: 'GET',
    path: '/items/:id',
    description: 'Get an item by ID',
    requestSchema: z.object({ id: z.string() }),
    responseSchema: z.object({ id: z.string(), title: z.string(), done: z.boolean() }),
    handler: async (input) => {
      const item = items.find(i => i.id === input.id);
      if (!item) throw new NotFoundError('Item not found');
      return item;
    },
  });

  const createItem = createEndpoint({
    method: 'POST',
    path: '/items',
    description: 'Create a new item',
    requestSchema: z.object({ title: z.string() }),
    responseSchema: z.object({ id: z.string(), title: z.string(), done: z.boolean() }),
    handler: async (input) => {
      if (!input.title) throw new BadRequestError('Title is required');
      const newItem = { id: String(items.length + 1), title: input.title, done: false };
      items.push(newItem);
      return newItem;
    },
  });

  return new PrismApp({
    services: [{ name: 'items', endpoints: [listItems, getItem, createItem] }],
  });
}

/**
 * Helper to set up a stdin server with mocked stdin/stdout streams.
 */
function setupStdinServer() {
  const fakeStdin = new PassThrough();
  const fakeStdout = new PassThrough();

  // Replace process.stdin and process.stdout temporarily
  const origStdin = process.stdin;
  const origStdout = process.stdout;
  const origExit = process.exit;

  // Monkey-patch process.stdin/stdout
  Object.defineProperty(process, 'stdin', { value: fakeStdin, writable: true, configurable: true });

  const writtenData: string[] = [];
  const origWrite = process.stdout.write;
  // Override stdout.write to capture output
  const stdoutWrite = vi.fn((chunk: any, ...args: any[]) => {
    const str = typeof chunk === 'string' ? chunk : chunk.toString();
    writtenData.push(str);
    fakeStdout.write(chunk);
    return true;
  });
  (process.stdout as any).write = stdoutWrite;

  // Prevent process.exit from actually exiting
  let exitCalled = false;
  (process as any).exit = vi.fn((code?: number) => {
    exitCalled = true;
  });

  const app = createTestApp();
  startStdinServer({ app });

  const responses: StdinResponse[] = [];
  const waiters = new Map<string, (resp: StdinResponse) => void>();

  // Collect all written data and parse responses
  function processWrittenData() {
    for (const data of writtenData) {
      const lines = data.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const resp = JSON.parse(line) as StdinResponse;
          responses.push(resp);
          const waiter = waiters.get(resp.id);
          if (waiter) {
            waiters.delete(resp.id);
            waiter(resp);
          }
        } catch {
          // ignore
        }
      }
    }
    writtenData.length = 0;
  }

  // Process data on each write
  const origStdoutWriteFn = stdoutWrite;
  (process.stdout as any).write = vi.fn((chunk: any, ...args: any[]) => {
    const str = typeof chunk === 'string' ? chunk : chunk.toString();
    writtenData.push(str);
    fakeStdout.write(chunk);
    processWrittenData();
    return true;
  });

  function send(msg: any) {
    fakeStdin.write(JSON.stringify(msg) + '\n');
  }

  function waitForResponse(id: string, timeoutMs = 5000): Promise<StdinResponse> {
    processWrittenData();
    const existing = responses.find(r => r.id === id);
    if (existing) return Promise.resolve(existing);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        waiters.delete(id);
        reject(new Error(`Timeout waiting for response id="${id}"`));
      }, timeoutMs);

      waiters.set(id, (resp) => {
        clearTimeout(timer);
        resolve(resp);
      });
    });
  }

  function cleanup() {
    Object.defineProperty(process, 'stdin', { value: origStdin, writable: true, configurable: true });
    (process.stdout as any).write = origWrite;
    (process as any).exit = origExit;
    fakeStdin.destroy();
    fakeStdout.destroy();
  }

  return { send, waitForResponse, cleanup, responses, fakeStdin };
}

describe('StdinServer', () => {
  it('should send a ready message on startup', async () => {
    const ctx = setupStdinServer();

    try {
      const ready = await ctx.waitForResponse('_ready');
      expect(ready.status).toBe(200);
      expect(ready.body.message).toBe('stdin server ready');
    } finally {
      ctx.cleanup();
    }
  });

  it('should handle GET requests', async () => {
    const ctx = setupStdinServer();

    try {
      await ctx.waitForResponse('_ready');

      ctx.send({ id: 'req-1', method: 'GET', path: '/items' });
      const resp = await ctx.waitForResponse('req-1');

      expect(resp.status).toBe(200);
      expect(resp.body).toBeInstanceOf(Array);
      expect(resp.body.length).toBe(2);
      expect(resp.body[0]).toHaveProperty('id');
      expect(resp.body[0]).toHaveProperty('title');
    } finally {
      ctx.cleanup();
    }
  });

  it('should handle GET with path parameters', async () => {
    const ctx = setupStdinServer();

    try {
      await ctx.waitForResponse('_ready');

      ctx.send({ id: 'req-2', method: 'GET', path: '/items/1' });
      const resp = await ctx.waitForResponse('req-2');

      expect(resp.status).toBe(200);
      expect(resp.body.id).toBe('1');
      expect(resp.body.title).toBe('First item');
    } finally {
      ctx.cleanup();
    }
  });

  it('should handle POST requests with body', async () => {
    const ctx = setupStdinServer();

    try {
      await ctx.waitForResponse('_ready');

      ctx.send({ id: 'req-3', method: 'POST', path: '/items', body: { title: 'New item' } });
      const resp = await ctx.waitForResponse('req-3');

      expect(resp.status).toBe(200);
      expect(resp.body.title).toBe('New item');
      expect(resp.body.done).toBe(false);
      expect(resp.body.id).toBeDefined();
    } finally {
      ctx.cleanup();
    }
  });

  it('should return error for non-existent endpoints', async () => {
    const ctx = setupStdinServer();

    try {
      await ctx.waitForResponse('_ready');

      ctx.send({ id: 'req-4', method: 'GET', path: '/nonexistent' });
      const resp = await ctx.waitForResponse('req-4');

      expect(resp.status).toBe(500);
      expect(resp.body.message).toContain('not found');
    } finally {
      ctx.cleanup();
    }
  });

  it('should return 404 HttpError for non-existent item', async () => {
    const ctx = setupStdinServer();

    try {
      await ctx.waitForResponse('_ready');

      ctx.send({ id: 'req-5', method: 'GET', path: '/items/999' });
      const resp = await ctx.waitForResponse('req-5');

      expect(resp.status).toBe(404);
      expect(resp.body.message).toBe('Item not found');
    } finally {
      ctx.cleanup();
    }
  });

  it('should handle multiple concurrent requests', async () => {
    const ctx = setupStdinServer();

    try {
      await ctx.waitForResponse('_ready');

      ctx.send({ id: 'c-1', method: 'GET', path: '/items' });
      ctx.send({ id: 'c-2', method: 'GET', path: '/items/1' });
      ctx.send({ id: 'c-3', method: 'GET', path: '/items/2' });

      const [r1, r2, r3] = await Promise.all([
        ctx.waitForResponse('c-1'),
        ctx.waitForResponse('c-2'),
        ctx.waitForResponse('c-3'),
      ]);

      expect(r1.status).toBe(200);
      expect(r1.body).toBeInstanceOf(Array);

      expect(r2.status).toBe(200);
      expect(r2.body.id).toBe('1');

      expect(r3.status).toBe(200);
      expect(r3.body.id).toBe('2');
    } finally {
      ctx.cleanup();
    }
  });

  it('should handle missing required fields', async () => {
    const ctx = setupStdinServer();

    try {
      await ctx.waitForResponse('_ready');

      ctx.send({ id: 'bad-req', path: '/items' });
      const resp = await ctx.waitForResponse('bad-req');

      expect(resp.status).toBe(400);
      expect(resp.body.message).toContain('Missing required fields');
    } finally {
      ctx.cleanup();
    }
  });
});
