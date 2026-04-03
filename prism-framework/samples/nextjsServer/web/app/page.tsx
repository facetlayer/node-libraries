'use client';

import { useState, useEffect, useCallback } from 'react';

interface Task {
  id: string;
  text: string;
  done: boolean;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newText, setNewText] = useState('');
  const [error, setError] = useState('');

  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data);
      setError('');
    } catch {
      setError('Failed to load tasks. Is the API server running?');
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const addTask = async () => {
    if (!newText.trim()) return;
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newText }),
    });
    setNewText('');
    loadTasks();
  };

  const toggleTask = async (id: string) => {
    await fetch(`/api/tasks/${id}/toggle`, { method: 'PUT' });
    loadTasks();
  };

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ marginBottom: 24 }}>Prism + Next.js Tasks</h1>

      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          placeholder="New task..."
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
          style={{ flex: 1, padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
        />
        <button
          onClick={addTask}
          data-testid="add-task"
          style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          Add
        </button>
      </div>

      <div data-testid="tasks-list">
        {tasks.map(task => (
          <div
            key={task.id}
            onClick={() => toggleTask(task.id)}
            style={{
              background: 'white', borderRadius: 8, padding: 12, marginBottom: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)', cursor: 'pointer',
              textDecoration: task.done ? 'line-through' : 'none',
              opacity: task.done ? 0.6 : 1,
            }}
          >
            {task.text}
          </div>
        ))}
      </div>
    </div>
  );
}
