/**
 * Notes service — platform-agnostic.
 *
 * This file works identically on web (Express), desktop (Electron), and mobile (Expo).
 * Database access is captured via closure when the service is created.
 */

import { createEndpoint, type PrismDatabase, type ServiceDefinition } from '@facetlayer/prism-framework/core';
import { z } from 'zod';

const NoteSchema = z.object({
    id: z.number(),
    title: z.string(),
    body: z.string(),
});

export function createNotesService(db: PrismDatabase): ServiceDefinition {
    const listNotes = createEndpoint({
        method: 'GET',
        path: '/notes',
        description: 'List all notes',
        responseSchema: z.array(NoteSchema),
        handler: async () => {
            return db.list('SELECT id, title, body FROM notes');
        },
    });

    const createNote = createEndpoint({
        method: 'POST',
        path: '/notes',
        description: 'Create a new note',
        requestSchema: z.object({ title: z.string(), body: z.string() }),
        responseSchema: NoteSchema,
        handler: async (input) => {
            const result = db.run(
                'INSERT INTO notes (title, body) VALUES (?, ?)',
                [input.title, input.body],
            );
            return { id: Number(result.lastInsertRowid), title: input.title, body: input.body };
        },
    });

    const deleteNote = createEndpoint({
        method: 'DELETE',
        path: '/notes/:id',
        description: 'Delete a note by ID',
        requestSchema: z.object({ id: z.string() }),
        responseSchema: z.object({ success: z.boolean() }),
        handler: async (input) => {
            const result = db.run('DELETE FROM notes WHERE id = ?', [input.id]);
            return { success: result.changes > 0 };
        },
    });

    return {
        name: 'notes',
        endpoints: [listNotes, createNote, deleteNote],
        databases: {
            main: {
                statements: [
                    'CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, body TEXT NOT NULL)',
                ],
            },
        },
    };
}
