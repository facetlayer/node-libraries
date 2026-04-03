/**
 * Vite server sample - single process serving both API and React frontend via Vite.
 *
 * Demonstrates:
 *  - React + Vite frontend with HMR
 *  - API endpoints on the same server under /api/
 *  - resolveDir helper for clean path resolution
 *  - Port defaulting from PRISM_API_PORT env var
 */

import {
  createEndpoint,
  App,
  startServer,
  resolveDir,
  type ServiceDefinition,
} from '../../src/index.ts';
import { z } from 'zod';

// --- Notes service (simple CRUD for demo) ---

interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

const notes: Note[] = [
  { id: '1', title: 'Welcome', body: 'This is a sample note from the Prism + Vite demo.', createdAt: new Date().toISOString() },
];

const NoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  createdAt: z.string(),
});

const listNotes = createEndpoint({
  method: 'GET',
  path: '/notes',
  description: 'List all notes',
  responseSchema: z.array(NoteSchema),
  handler: async () => notes,
});

const createNote = createEndpoint({
  method: 'POST',
  path: '/notes',
  description: 'Create a note',
  requestSchema: z.object({ title: z.string(), body: z.string() }),
  responseSchema: NoteSchema,
  handler: async (input) => {
    const note: Note = {
      id: String(notes.length + 1),
      title: input.title,
      body: input.body,
      createdAt: new Date().toISOString(),
    };
    notes.push(note);
    return note;
  },
});

const deleteNote = createEndpoint({
  method: 'DELETE',
  path: '/notes/:id',
  description: 'Delete a note',
  requestSchema: z.object({ id: z.string() }),
  responseSchema: z.object({ success: z.boolean() }),
  handler: async (input) => {
    const index = notes.findIndex(n => n.id === input.id);
    if (index >= 0) notes.splice(index, 1);
    return { success: index >= 0 };
  },
});

const notesService: ServiceDefinition = {
  name: 'notes',
  endpoints: [listNotes, createNote, deleteNote],
};

// --- Start server ---

const app = new App({
  name: 'vite-sample',
  description: 'Prism + Vite sample app',
  services: [notesService],
});

await startServer({
  app,
  port: 19998,
  web: resolveDir(import.meta.url, 'web'),
});

console.log('Vite sample running at http://localhost:19998');
