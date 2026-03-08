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
  const [fontSize, setFontSize] = useState(14);

  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    // Reset to max size and measure
    let size = 14;
    textEl.style.fontSize = `${size}px`;

    // Shrink until text fits or we hit minimum
    while (textEl.scrollWidth > container.clientWidth && size > 9) {
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
      const data = await webFetch('/feedback/libraries');
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
    `flex items-center justify-between py-2.5 px-4 cursor-pointer border-b border-border-light transition-colors duration-150 hover:bg-bg-hover ${
      isSelected ? 'bg-bg-hover border-l-3 border-l-accent pl-[13px]' : ''
    }`;

  const countClass = (isSelected: boolean) =>
    `text-[11px] py-0.5 px-2 rounded-full min-w-6 text-center shrink-0 ${
      isSelected ? 'bg-border text-[#ccc]' : 'bg-bg-hover text-text-secondary'
    }`;

  return (
    <div className="w-60 min-w-60 border-r border-border flex flex-col bg-bg-secondary">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-[13px] uppercase tracking-wide text-text-secondary font-medium">
          Libraries
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-text-muted p-5 text-center text-[13px]">Loading...</div>
        ) : (
          <>
            <div
              className={itemClass(selectedLibrary === null)}
              onClick={() => onSelectLibrary(null)}
            >
              <span className="text-sm font-medium">All</span>
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
