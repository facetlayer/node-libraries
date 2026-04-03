import { useState, useEffect, useCallback } from 'react';

interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  const loadNotes = useCallback(async () => {
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      setNotes(data);
      setError('');
    } catch {
      setError('Failed to load notes');
    }
  }, []);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const addNote = async () => {
    if (!title.trim()) return;
    try {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body }),
      });
      setTitle('');
      setBody('');
      loadNotes();
    } catch {
      setError('Failed to create note');
    }
  };

  const deleteNote = async (id: string) => {
    await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    loadNotes();
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ marginBottom: 24 }}>Prism + Vite Notes</h1>

      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}

      <div style={{ background: 'white', borderRadius: 8, padding: 20, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <input
          placeholder="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ display: 'block', width: '100%', padding: 8, marginBottom: 8, border: '1px solid #ddd', borderRadius: 4 }}
        />
        <textarea
          placeholder="Body"
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={3}
          style={{ display: 'block', width: '100%', padding: 8, marginBottom: 8, border: '1px solid #ddd', borderRadius: 4, resize: 'vertical' }}
        />
        <button
          onClick={addNote}
          data-testid="add-note"
          style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          Add Note
        </button>
      </div>

      <div data-testid="notes-list">
        {notes.map(note => (
          <div key={note.id} style={{ background: 'white', borderRadius: 8, padding: 16, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{note.title}</h3>
              <button onClick={() => deleteNote(note.id)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer' }}>Delete</button>
            </div>
            <p style={{ marginTop: 8, color: '#666' }}>{note.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
