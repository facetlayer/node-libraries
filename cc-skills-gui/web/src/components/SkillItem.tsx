import { useState, useRef } from 'react';
import { SkillInfo } from '../types';

interface SkillItemProps {
  skill: SkillInfo;
  isActive: boolean;
  onSelect: () => void;
  onRename: () => void;
}

export function SkillItem({ skill, isActive, onSelect, onRename }: SkillItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={`group flex items-center justify-between px-4 py-2 cursor-pointer text-[13px] transition-colors ${
        isActive
          ? 'bg-bg-active text-white border-l-[3px] border-accent pl-[13px]'
          : 'text-text-secondary hover:bg-bg-hover'
      }`}
      onClick={onSelect}
    >
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{skill.name}</div>
        <div className="text-[11px] text-text-dim truncate mt-0.5">{skill.dirName}</div>
      </div>
      <div className="relative">
        <button
          ref={menuBtnRef}
          className="skill-menu-btn opacity-0 group-hover:opacity-100 shrink-0 ml-2 p-1 rounded hover:bg-border text-text-dim hover:text-text-secondary transition-all"
          title="Actions"
          onClick={e => {
            e.stopPropagation();
            setMenuOpen(prev => !prev);
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="3" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="13" r="1.5" />
          </svg>
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={e => { e.stopPropagation(); setMenuOpen(false); }} />
            <div
              ref={menuRef}
              className="absolute right-0 top-full z-50 bg-bg-secondary border border-border rounded-md shadow-lg py-1 min-w-[140px]"
            >
              <button
                className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-active hover:text-white transition-colors"
                onClick={e => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onRename();
                }}
              >
                Rename
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
