import { useState, useEffect, useRef } from 'react';
import { SkillInfo, skillKey } from '../types';
import { SkillItem } from './SkillItem';
import { FilterChips } from './FilterChips';
import { NewSkillModal } from './NewSkillModal';
import { RenameModal } from './RenameModal';

interface SidebarProps {
  skills: SkillInfo[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  loading: boolean;
  error: string | null;
  onLoad: () => void;
  onSkillCreated: (skill: SkillInfo) => void;
  onSkillUpdated: (skill: SkillInfo) => void;
}

interface Filters {
  search: string;
  discoverable: boolean;
  userInvocable: boolean;
}

function filterSkills(skills: SkillInfo[], filters: Filters): SkillInfo[] {
  return skills.filter(s => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const match = (s.name || '').toLowerCase().includes(q)
        || (s.dirName || '').toLowerCase().includes(q)
        || (s.frontmatter?.description || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filters.discoverable && s.frontmatter?.['disable-model-invocation']) return false;
    if (filters.userInvocable && s.frontmatter?.['user-invocable'] === false) return false;
    return true;
  });
}

export function Sidebar({ skills, selectedKey, onSelect, loading, error, onLoad, onSkillCreated, onSkillUpdated }: SidebarProps) {
  const [filters, setFilters] = useState<Filters>({ search: '', discoverable: false, userInvocable: false });
  const [showNewModal, setShowNewModal] = useState(false);
  const [renameSkill, setRenameSkill] = useState<SkillInfo | null>(null);
  const didLoad = useRef(false);

  useEffect(() => {
    if (!didLoad.current) {
      didLoad.current = true;
      onLoad();
    }
  }, [onLoad]);

  const filtered = filterSkills(skills, filters);
  const personal = filtered.filter(s => s.location === 'personal');
  const project = filtered.filter(s => s.location === 'project');

  return (
    <div className="w-[260px] min-w-[260px] bg-bg-secondary border-r border-border flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <input
            type="text"
            placeholder="Search skills..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="flex-1 bg-bg-input border border-border rounded px-2.5 py-1.5 text-xs text-text-primary placeholder-text-dim outline-none focus:border-border-focus transition-colors"
          />
          <button
            onClick={() => setShowNewModal(true)}
            title="New Skill"
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded bg-accent hover:bg-accent-hover text-white transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 010-2h4V3a1 1 0 011-1z" />
            </svg>
          </button>
        </div>
        <FilterChips
          discoverable={filters.discoverable}
          userInvocable={filters.userInvocable}
          onToggleDiscoverable={() => setFilters(f => ({ ...f, discoverable: !f.discoverable }))}
          onToggleUserInvocable={() => setFilters(f => ({ ...f, userInvocable: !f.userInvocable }))}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-text-dim text-[13px]">Loading skills...</div>
        ) : error ? (
          <div className="p-4 text-red-400 text-[13px]">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-text-dim text-[13px]">
            {skills.length === 0 ? 'No skills found' : 'No skills match filters'}
          </div>
        ) : (
          <>
            {personal.length > 0 && (
              <div className="py-3">
                <h3 className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Personal Skills</h3>
                {personal.map(s => (
                  <SkillItem
                    key={skillKey(s)}
                    skill={s}
                    isActive={skillKey(s) === selectedKey}
                    onSelect={() => onSelect(skillKey(s))}
                    onRename={() => setRenameSkill(s)}
                  />
                ))}
              </div>
            )}
            {project.length > 0 && (
              <div className={`py-3${personal.length > 0 ? ' border-t border-border' : ''}`}>
                <h3 className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Project Skills</h3>
                {project.map(s => (
                  <SkillItem
                    key={skillKey(s)}
                    skill={s}
                    isActive={skillKey(s) === selectedKey}
                    onSelect={() => onSelect(skillKey(s))}
                    onRename={() => setRenameSkill(s)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showNewModal && (
        <NewSkillModal
          onClose={() => setShowNewModal(false)}
          onCreated={onSkillCreated}
        />
      )}

      {renameSkill && (
        <RenameModal
          skill={renameSkill}
          onClose={() => setRenameSkill(null)}
          onRenamed={onSkillUpdated}
        />
      )}
    </div>
  );
}
