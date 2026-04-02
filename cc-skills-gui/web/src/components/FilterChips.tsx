interface FilterChipsProps {
  discoverable: boolean;
  userInvocable: boolean;
  onToggleDiscoverable: () => void;
  onToggleUserInvocable: () => void;
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] cursor-pointer border transition-all select-none ${
        active
          ? 'bg-bg-active border-accent text-text-primary'
          : 'border-border text-text-muted hover:border-text-dim hover:text-text-secondary'
      }`}
    >
      {label}
    </button>
  );
}

export function FilterChips({ discoverable, userInvocable, onToggleDiscoverable, onToggleUserInvocable }: FilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Chip label="Agent-discoverable" active={discoverable} onClick={onToggleDiscoverable} />
      <Chip label="User-invocable" active={userInvocable} onClick={onToggleUserInvocable} />
    </div>
  );
}
