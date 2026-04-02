import { useState } from 'react';
import { webFetch } from '@facetlayer/prism-framework-ui';
import { Modal } from './Modal';
import { SkillInfo } from '../types';

interface RenameModalProps {
  skill: SkillInfo;
  onClose: () => void;
  onRenamed: (skill: SkillInfo) => void;
}

export function RenameModal({ skill, onClose, onRenamed }: RenameModalProps) {
  const currentName = skill.frontmatter.name || skill.dirName;
  const [name, setName] = useState(currentName);
  const [error, setError] = useState(false);

  const handleConfirm = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === currentName) {
      onClose();
      return;
    }

    try {
      const fm = { ...skill.frontmatter, name: trimmed };
      await webFetch(`PUT /api/skills/${skill.location}/${skill.dirName}`, {
        params: { frontmatter: fm, content: skill.content },
      });
      onRenamed({ ...skill, frontmatter: fm, name: trimmed });
      onClose();
    } catch {
      setError(true);
    }
  };

  return (
    <Modal title="Rename Skill" confirmLabel="Rename" onConfirm={handleConfirm} onClose={onClose}>
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-1">Name</label>
      <input
        type="text"
        value={name}
        onChange={e => { setName(e.target.value); setError(false); }}
        onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
        className={`w-full bg-bg-input border rounded px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-border-focus transition-colors ${
          error ? 'border-red-400' : 'border-border'
        }`}
      />
    </Modal>
  );
}
