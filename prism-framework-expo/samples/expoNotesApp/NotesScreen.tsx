/**
 * Sample screen showing how to use apiFetch in a React Native component.
 *
 * This code is platform-agnostic — the same component works on web and mobile
 * because apiFetch() delegates to whatever transport is active.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList } from 'react-native';
// import { apiFetch } from '@facetlayer/prism-framework-ui';

interface Note {
    id: number;
    title: string;
    body: string;
}

// Placeholder for apiFetch — in a real app, import from prism-framework-ui
async function apiFetch(_endpoint: string, _options?: any): Promise<any> {
    return [];
}

export default function NotesScreen() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');

    async function loadNotes() {
        const data = await apiFetch('GET /notes');
        setNotes(data);
    }

    async function addNote() {
        if (!title.trim()) return;
        await apiFetch('POST /notes', { params: { title, body } });
        setTitle('');
        setBody('');
        await loadNotes();
    }

    async function deleteNote(id: number) {
        await apiFetch('DELETE /notes/:id', { params: { id: String(id) } });
        await loadNotes();
    }

    useEffect(() => {
        loadNotes();
    }, []);

    return (
        <View style={{ flex: 1, padding: 16 }}>
            <TextInput
                placeholder="Title"
                value={title}
                onChangeText={setTitle}
                style={{ borderWidth: 1, padding: 8, marginBottom: 8 }}
            />
            <TextInput
                placeholder="Body"
                value={body}
                onChangeText={setBody}
                style={{ borderWidth: 1, padding: 8, marginBottom: 8 }}
            />
            <Button title="Add Note" onPress={addNote} />

            <FlatList
                data={notes}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                    <View style={{ flexDirection: 'row', padding: 8, borderBottomWidth: 1 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: 'bold' }}>{item.title}</Text>
                            <Text>{item.body}</Text>
                        </View>
                        <Button title="Delete" onPress={() => deleteNote(item.id)} />
                    </View>
                )}
            />
        </View>
    );
}
