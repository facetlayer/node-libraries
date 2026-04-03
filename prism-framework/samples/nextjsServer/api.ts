/**
 * Next.js sample - API server (process 1 of 2).
 *
 * This runs the prism-framework API server on port 19997.
 * A separate Next.js dev server (process 2) runs on port 19996
 * and proxies /api requests to this server.
 */

import {
  createEndpoint,
  App,
  startServer,
  type ServiceDefinition,
} from '../../src/index.ts';
import { z } from 'zod';

// --- Tasks service ---

interface Task {
  id: string;
  text: string;
  done: boolean;
}

const tasks: Task[] = [
  { id: '1', text: 'Try the Prism + Next.js sample', done: false },
];

const TaskSchema = z.object({
  id: z.string(),
  text: z.string(),
  done: z.boolean(),
});

const listTasks = createEndpoint({
  method: 'GET',
  path: '/tasks',
  description: 'List all tasks',
  responseSchema: z.array(TaskSchema),
  handler: async () => tasks,
});

const createTask = createEndpoint({
  method: 'POST',
  path: '/tasks',
  description: 'Create a task',
  requestSchema: z.object({ text: z.string() }),
  responseSchema: TaskSchema,
  handler: async (input) => {
    const task: Task = { id: String(tasks.length + 1), text: input.text, done: false };
    tasks.push(task);
    return task;
  },
});

const toggleTask = createEndpoint({
  method: 'PUT',
  path: '/tasks/:id/toggle',
  description: 'Toggle a task done/undone',
  requestSchema: z.object({ id: z.string() }),
  responseSchema: TaskSchema,
  handler: async (input) => {
    const task = tasks.find(t => t.id === input.id);
    if (!task) throw new Error('Not found');
    task.done = !task.done;
    return task;
  },
});

const tasksService: ServiceDefinition = {
  name: 'tasks',
  endpoints: [listTasks, createTask, toggleTask],
};

// --- Start server ---

const app = new App({
  name: 'nextjs-sample-api',
  description: 'Prism + Next.js sample API',
  services: [tasksService],
});

await startServer({
  app,
  port: 19997,
  corsConfig: { allowLocalhost: true },
});

console.log('Next.js sample API running at http://localhost:19997');
