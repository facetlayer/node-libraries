import { useState, useEffect, useCallback, useRef } from 'react';
import { webFetch } from '@facetlayer/prism-framework-ui';

interface LibrarySummary {
  library: string;
  count: number;
}

interface SidebarProps {
  selectedLibrary: string | null;
  onSelectLibrary: (library: string | null) => void;
  refreshKey: number;
}

function AutoSizeText({ text }: { text: string }) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(15);

  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    let size = 15;
    textEl.style.fontSize = `${size}px`;

    while (textEl.scrollWidth > container.clientWidth && size > 10) {
      size -= 0.5;
      textEl.style.fontSize = `${size}px`;
    }

    setFontSize(size);
  }, [text]);

  return (
    <span ref={containerRef} className="overflow-hidden flex-1 min-w-0">
      <span
        ref={textRef}
        className="font-medium whitespace-nowrap block"
        style={{ fontSize: `${fontSize}px` }}
      >
        {text}
      </span>
    </span>
  );
}

export function Sidebar({ selectedLibrary, onSelectLibrary, refreshKey }: SidebarProps) {
  const [libraries, setLibraries] = useState<LibrarySummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLibraries = useCallback(async () => {
    try {
      const data = await webFetch('/api/feedback/libraries');
      setLibraries(data.libraries);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLibraries();
  }, [fetchLibraries, refreshKey]);

  const totalCount = libraries.reduce((sum, l) => sum + l.count, 0);

  const itemClass = (isSelected: boolean) =>
    `flex items-center justify-between py-3 px-4 cursor-pointer border-b border-border-light transition-colors duration-150 hover:bg-bg-hover ${
      isSelected ? 'bg-bg-hover border-l-3 border-l-accent pl-[13px]' : ''
    }`;

  const countClass = (isSelected: boolean) =>
    `text-xs py-0.5 px-2.5 rounded-full min-w-7 text-center shrink-0 font-medium ${
      isSelected ? 'bg-accent text-white' : 'bg-bg-hover text-text-secondary'
    }`;

  return (
    <div className="w-64 min-w-64 border-r border-border flex flex-col bg-bg-secondary">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-xs uppercase tracking-widest text-text-secondary font-semibold">
          Libraries
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-text-muted p-5 text-center text-sm">Loading...</div>
        ) : (
          <>
            <div
              className={itemClass(selectedLibrary === null)}
              onClick={() => onSelectLibrary(null)}
            >
              <span className="text-[15px] font-medium">All</span>
              <span className={countClass(selectedLibrary === null)}>{totalCount}</span>
            </div>
            {libraries.map(lib => (
              <div
                key={lib.library}
                className={itemClass(selectedLibrary === lib.library)}
                onClick={() => onSelectLibrary(lib.library)}
              >
                <AutoSizeText text={lib.library} />
                <span className={countClass(selectedLibrary === lib.library)}>{lib.count}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
