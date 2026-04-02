import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  title: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, confirmLabel = 'Confirm', onConfirm, onClose, children }: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    const input = contentRef.current?.querySelector('input');
    input?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 bg-bg-secondary border border-border rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        </div>
        <div className="px-5 py-4" ref={contentRef}>
          {children}
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary rounded border border-border hover:border-text-dim transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-hover rounded transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
