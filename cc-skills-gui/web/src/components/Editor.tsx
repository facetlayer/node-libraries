import { useState, useEffect } from 'react';
import { webFetch } from '@facetlayer/prism-framework-ui';
import { SkillInfo } from '../types';

interface EditorProps {
  skill: SkillInfo | null;
  onSkillUpdated: (skill: SkillInfo) => void;
}

export function Editor({ skill, onSkillUpdated }: EditorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [discoverable, setDiscoverable] = useState(true);
  const [userInvocable, setUserInvocable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Sync form state when selected skill changes
  useEffect(() => {
    if (!skill) return;
    const fm = skill.frontmatter || {};
    setName(fm.name || skill.dirName);
    setDescription(fm.description || '');
    setContent(skill.content);
    setDiscoverable(!fm['disable-model-invocation']);
    setUserInvocable(fm['user-invocable'] !== false);
    setStatus(null);
  }, [skill]);

  if (!skill) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-dim">
        Select a skill from the sidebar to edit
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);

    const fm: Record<string, any> = { ...skill.frontmatter, name, description };
    if (discoverable) {
      delete fm['disable-model-invocation'];
    } else {
      fm['disable-model-invocation'] = true;
    }
    if (userInvocable) {
      delete fm['user-invocable'];
    } else {
      fm['user-invocable'] = false;
    }

    try {
      await webFetch(`PUT /api/skills/${skill.location}/${skill.dirName}`, {
        params: { frontmatter: fm, content },
      });
      onSkillUpdated({ ...skill, frontmatter: fm, content, name: fm.name || skill.dirName });
      setStatus({ text: 'Saved', type: 'success' });
      setTimeout(() => setStatus(null), 3000);
    } catch (err: any) {
      setStatus({ text: 'Error: ' + (err.message || 'Save failed'), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleContentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = ta.value;
      setContent(val.substring(0, start) + '  ' + val.substring(end));
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      <div className="p-6 flex flex-col flex-1">
        <div className="mb-4">
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-bg-input border border-border rounded-md px-3 py-2 text-sm text-text-primary outline-none focus:border-border-focus transition-colors"
          />
        </div>

        <div className="mb-4">
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-1">Description</label>
          <textarea
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full bg-bg-input border border-border rounded-md px-3 py-2 text-sm text-text-primary outline-none focus:border-border-focus transition-colors resize-y"
          />
        </div>

        <div className="flex gap-6 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={discoverable}
              onChange={e => setDiscoverable(e.target.checked)}
              className="w-4 h-4 accent-accent cursor-pointer"
            />
            <span className="text-[13px] text-text-secondary">Agent-discoverable</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={userInvocable}
              onChange={e => setUserInvocable(e.target.checked)}
              className="w-4 h-4 accent-accent cursor-pointer"
            />
            <span className="text-[13px] text-text-secondary">User-invocable</span>
          </label>
        </div>

        <div className="flex-1 flex flex-col mb-4">
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-1">Content</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={handleContentKeyDown}
            className="flex-1 min-h-[300px] w-full bg-bg-input border border-border rounded-md px-3 py-2 text-[13px] leading-relaxed text-text-primary outline-none focus:border-border-focus transition-colors resize-y font-mono"
            style={{ tabSize: 2 }}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-[13px] font-semibold text-white bg-accent hover:bg-accent-hover rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
          {status && (
            <span className={`text-xs ${status.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
              {status.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
