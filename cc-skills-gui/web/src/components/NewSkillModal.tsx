import { useState } from 'react';
import { webFetch } from '@facetlayer/prism-framework-ui';
import { Modal } from './Modal';
import { SkillInfo } from '../types';

interface NewSkillModalProps {
  onClose: () => void;
  onCreated: (skill: SkillInfo) => void;
}

export function NewSkillModal({ onClose, onCreated }: NewSkillModalProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState<'personal' | 'project'>('personal');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      const skill = await webFetch('POST /api/skills', {
        params: { name: trimmed, location },
      });
      onCreated(skill);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create skill');
    }
  };

  return (
    <Modal title="New Skill" confirmLabel="Create" onConfirm={handleConfirm} onClose={onClose}>
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-1">Name</label>
      <input
        type="text"
        value={name}
        onChange={e => { setName(e.target.value); setError(null); }}
        onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
        placeholder="my-skill"
        className={`w-full bg-bg-input border rounded px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-border-focus transition-colors mb-3 ${
          error ? 'border-red-400' : 'border-border'
        }`}
      />

      <label className="block text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-1">Location</label>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="location"
            value="personal"
            checked={location === 'personal'}
            onChange={() => setLocation('personal')}
            className="accent-accent cursor-pointer"
          />
          <span className="text-[13px] text-text-secondary">Personal</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="location"
            value="project"
            checked={location === 'project'}
            onChange={() => setLocation('project')}
            className="accent-accent cursor-pointer"
          />
          <span className="text-[13px] text-text-secondary">Project</span>
        </label>
      </div>

      {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
    </Modal>
  );
}
