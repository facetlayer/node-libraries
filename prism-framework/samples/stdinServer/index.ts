/**
 * Sample server that supports both web (default) and stdin protocol modes.
 *
 * Usage:
 *   npx tsx index.ts              # Start as HTTP server on port 19998
 *   npx tsx index.ts --stdin      # Start in stdin/stdout protocol mode
 */

import {
  createEndpoint,
  App,
  startServer,
  startStdinServer,
  type ServiceDefinition,
  NotFoundError,
  BadRequestError,
} from '../../src/index.ts';
import { z } from 'zod';

// --- Data store ---

const items = [
  { id: '1', title: 'First item', done: false },
  { id: '2', title: 'Second item', done: true },
];

// --- Endpoints ---

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

const itemsService: ServiceDefinition = {
  name: 'items',
  endpoints: [listItems, getItem, createItem],
};

// --- Start the app ---

const app = new App({ services: [itemsService] });

if (process.argv.includes('--stdin')) {
  // Stdin protocol mode: communicate via JSON over stdin/stdout
  startStdinServer({ app });
} else {
  // Default: start HTTP server
  await startServer({ app, port: 19998 });
  console.log('Sample server running at http://localhost:19998');
}
