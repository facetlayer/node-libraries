import { createEndpoint, type ServiceDefinition, NotFoundError } from '@facetlayer/prism-framework/core';
import { z } from 'zod';

interface Note {
    id: string;
    title: string;
    body: string;
    createdAt: number;
}

const notes: Note[] = [
    {
        id: '1',
        title: 'Welcome',
        body: 'This desktop app is running on Prism Framework + Electron.',
        createdAt: Date.now(),
    },
    {
        id: '2',
        title: 'How it works',
        body: 'The UI calls window.electron.apiCall which forwards to app.callEndpoint in the main process.',
        createdAt: Date.now(),
    },
];

const noteSchema = z.object({
    id: z.string(),
    title: z.string(),
    body: z.string(),
    createdAt: z.number(),
});

const listNotes = createEndpoint({
    method: 'GET',
    path: '/notes',
    description: 'List all notes',
    responseSchema: z.array(noteSchema),
    handler: async () => notes.slice().sort((a, b) => b.createdAt - a.createdAt),
});

const getNote = createEndpoint({
    method: 'GET',
    path: '/notes/:id',
    description: 'Get a note by id',
    requestSchema: z.object({ id: z.string() }),
    responseSchema: noteSchema,
    handler: async (input) => {
        const found = notes.find((n) => n.id === input.id);
        if (!found) throw new NotFoundError(`Note ${input.id} not found`);
        return found;
    },
});

const createNote = createEndpoint({
    method: 'POST',
    path: '/notes',
    description: 'Create a new note',
    requestSchema: z.object({ title: z.string(), body: z.string() }),
    responseSchema: noteSchema,
    handler: async (input) => {
        const note: Note = {
            id: String(notes.length + 1),
            title: input.title,
            body: input.body,
            createdAt: Date.now(),
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
    responseSchema: z.object({ ok: z.boolean() }),
    handler: async (input) => {
        const idx = notes.findIndex((n) => n.id === input.id);
        if (idx === -1) throw new NotFoundError(`Note ${input.id} not found`);
        notes.splice(idx, 1);
        return { ok: true };
    },
});

export const notesService: ServiceDefinition = {
    name: 'notes',
    endpoints: [listNotes, getNote, createNote, deleteNote],
};
