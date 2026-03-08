import { useState, useEffect, useCallback } from 'react';
import { webFetch } from '@facetlayer/prism-framework-ui';

interface FeedbackItem {
  id: number;
  library: string;
  description: string;
  severity: string;
  status: string;
  context: string | null;
  user: string | null;
  created_at: number;
}

interface FeedbackListResponse {
  items: FeedbackItem[];
  total: number;
  limit: number;
  offset: number;
  page: number;
  totalPages: number;
}

interface FeedbackListProps {
  library: string | null;
  refreshKey: number;
  onRefresh: () => void;
  onDeleteLibrary: () => void;
}

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'positive'];
type StatusTab = 'active' | 'closed';
const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'closed', label: 'Closed' },
];

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-[#7f1d1d] text-[#fca5a5]',
  high: 'bg-[#78350f] text-[#fcd34d]',
  medium: 'bg-[#164e63] text-[#67e8f9]',
  low: 'bg-[#374151] text-[#d1d5db]',
  positive: 'bg-[#064e3b] text-[#6ee7b7]',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-[#374151] text-[#9ca3af]',
  accepted: 'bg-[#064e3b] text-[#6ee7b7]',
  completed: 'bg-[#1e3a5f] text-[#93c5fd]',
  rejected: 'bg-[#7f1d1d] text-[#fca5a5]',
};

const BTN_BASE = 'rounded border bg-bg-primary cursor-pointer transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed';
const BTN_ACCEPT = `text-[11px] py-1 px-3 ${BTN_BASE} border-[#166534] text-[#4ade80] hover:bg-[#0a3d24]`;
const BTN_COMPLETE = `text-[11px] py-1 px-3 ${BTN_BASE} border-[#1e3a5f] text-[#93c5fd] hover:bg-[#1a2f4d]`;
const BTN_REJECT = `text-[11px] py-1 px-3 ${BTN_BASE} border-[#7f1d1d] text-[#f87171] hover:bg-[#450a0a]`;
const BTN_PAGE = `text-xs py-1 px-3 ${BTN_BASE} border-[#333] text-[#ccc] hover:border-[#555] hover:bg-[#222]`;

function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString().replace('T', ' ').substring(0, 19);
}

export function FeedbackList({ library, refreshKey, onRefresh, onDeleteLibrary }: FeedbackListProps) {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [severityFilter, setSeverityFilter] = useState('');
  const [activeTab, setActiveTab] = useState<StatusTab>('active');
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const params: Record<string, string | number> = { page, limit: 30 };
      if (library) params.library = library;
      if (severityFilter) params.severity = severityFilter;
      params.status = activeTab;

      const data: FeedbackListResponse = await webFetch('/feedback', { params });
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [library, severityFilter, activeTab, page]);

  useEffect(() => {
    setPage(1);
  }, [library, severityFilter, activeTab]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems, refreshKey]);

  const handleStatusUpdate = async (id: number, status: string) => {
    setActionInProgress(id);
    try {
      await webFetch('PATCH /feedback/:id/status', {
        params: { id, status },
      });
      await fetchItems();
      onRefresh();
    } catch {
      // silently fail
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteLibrary = async () => {
    if (!library) return;
    if (!confirm(`Delete all feedback for "${library}"? This cannot be undone.`)) return;

    setDeleteInProgress(true);
    try {
      await webFetch('DELETE /feedback/libraries/:name', {
        params: { name: library },
      });
      onDeleteLibrary();
    } catch {
      // silently fail
    } finally {
      setDeleteInProgress(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {library && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-secondary">
          <h2 className="text-2xl font-bold text-text-primary">{library}</h2>
          <button
            onClick={handleDeleteLibrary}
            disabled={deleteInProgress}
            className={`text-xs px-3 py-1.5 ${BTN_BASE} border-[#7f1d1d] text-[#f87171] hover:bg-[#450a0a]`}
          >
            {deleteInProgress ? 'Deleting...' : 'Delete Library'}
          </button>
        </div>
      )}

      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
        <div className="flex gap-0.5 bg-bg-primary rounded-md p-0.5 border border-[#333]">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              className={`text-xs font-medium py-1.5 px-4 rounded border-none cursor-pointer transition-all duration-150 ${
                activeTab === tab.key
                  ? 'bg-border text-text-primary'
                  : 'bg-transparent text-text-secondary hover:text-[#ccc]'
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="bg-bg-primary text-[#ccc] border border-[#333] py-1.5 px-2.5 rounded text-xs cursor-pointer hover:border-[#555] focus:outline-none focus:border-border"
          >
            <option value="">All Severities</option>
            {SEVERITIES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <span className="text-xs text-text-secondary">
          {total} item{total !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {loading ? (
          <div className="text-text-muted p-5 text-center text-[13px]">Loading feedback...</div>
        ) : items.length === 0 ? (
          <div className="text-text-muted p-5 text-center text-[13px]">No feedback items found</div>
        ) : (
          items.map(item => (
            <div key={item.id} className="bg-bg-secondary border border-border rounded-md px-4 py-3.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold uppercase py-0.5 px-2 rounded-sm tracking-wide ${SEVERITY_STYLES[item.severity] ?? ''}`}>
                    {item.severity}
                  </span>
                  <span className="text-[13px] font-medium text-text-primary">{item.library}</span>
                  <span className="text-xs text-text-muted">#{item.id}</span>
                </div>
                <span className={`text-[11px] py-0.5 px-2.5 rounded-full font-medium ${STATUS_STYLES[item.status] ?? ''}`}>
                  {item.status}
                </span>
              </div>
              <div className="text-[13px] leading-relaxed text-[#d4d4d4] mb-1.5">{item.description}</div>
              {item.context && (
                <div className="text-xs text-text-secondary bg-bg-input py-2 px-2.5 rounded mb-2 font-mono whitespace-pre-wrap break-all">
                  {item.context}
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex gap-3 text-[11px] text-text-muted">
                  {item.user && <span className="text-text-link">{item.user}</span>}
                  <span>{formatDate(item.created_at)}</span>
                </div>
                {item.status === 'pending' && (
                  <div className="flex gap-1.5">
                    <button
                      className={BTN_ACCEPT}
                      disabled={actionInProgress === item.id}
                      onClick={() => handleStatusUpdate(item.id, 'accepted')}
                    >
                      {actionInProgress === item.id ? '...' : 'Accept'}
                    </button>
                    <button
                      className={BTN_REJECT}
                      disabled={actionInProgress === item.id}
                      onClick={() => handleStatusUpdate(item.id, 'rejected')}
                    >
                      {actionInProgress === item.id ? '...' : 'Reject'}
                    </button>
                  </div>
                )}
                {item.status === 'accepted' && (
                  <div className="flex gap-1.5">
                    <button
                      className={BTN_COMPLETE}
                      disabled={actionInProgress === item.id}
                      onClick={() => handleStatusUpdate(item.id, 'completed')}
                    >
                      {actionInProgress === item.id ? '...' : 'Complete'}
                    </button>
                    <button
                      className={BTN_REJECT}
                      disabled={actionInProgress === item.id}
                      onClick={() => handleStatusUpdate(item.id, 'rejected')}
                    >
                      {actionInProgress === item.id ? '...' : 'Reject'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 p-3 border-t border-border">
          <button
            className={BTN_PAGE}
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </button>
          <span className="text-xs text-text-secondary">Page {page} of {totalPages}</span>
          <button
            className={BTN_PAGE}
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
