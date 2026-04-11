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
  onSelectTicket: (id: number) => void;
}

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'positive'];
type StatusTab = 'active' | 'closed';
const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'closed', label: 'Closed' },
];

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-[#7f1d1d] text-[#fca5a5] border border-[#991b1b]',
  high: 'bg-[#78350f] text-[#fcd34d] border border-[#92400e]',
  medium: 'bg-[#164e63] text-[#67e8f9] border border-[#155e75]',
  low: 'bg-[#374151] text-[#d1d5db] border border-[#4b5563]',
  positive: 'bg-[#064e3b] text-[#6ee7b7] border border-[#065f46]',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-[#374151] text-[#d1d5db]',
  accepted: 'bg-[#064e3b] text-[#6ee7b7]',
  completed: 'bg-[#1e3a5f] text-[#93c5fd]',
  rejected: 'bg-[#7f1d1d] text-[#fca5a5]',
};

const BTN_BASE = 'rounded-md border cursor-pointer transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed font-medium';
const BTN_ACCEPT = `text-xs py-1.5 px-4 ${BTN_BASE} bg-[#0a3d24] border-[#166534] text-[#4ade80] hover:bg-[#0d4f2e]`;
const BTN_COMPLETE = `text-xs py-1.5 px-4 ${BTN_BASE} bg-[#1a2f4d] border-[#1e3a5f] text-[#93c5fd] hover:bg-[#1e3a5f]`;
const BTN_REJECT = `text-xs py-1.5 px-4 ${BTN_BASE} bg-[#3a0a0a] border-[#7f1d1d] text-[#f87171] hover:bg-[#450a0a]`;
const BTN_DELETE = `text-xs py-1.5 px-4 ${BTN_BASE} bg-[#3a0a0a] border-[#7f1d1d] text-[#f87171] hover:bg-[#450a0a]`;
const BTN_PAGE = `text-sm py-1.5 px-4 ${BTN_BASE} bg-bg-primary border-[#333] text-[#ccc] hover:border-[#555] hover:bg-[#222]`;

function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString().replace('T', ' ').substring(0, 19);
}

export function FeedbackList({ library, refreshKey, onRefresh, onDeleteLibrary, onSelectTicket }: FeedbackListProps) {
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

      const data: FeedbackListResponse = await webFetch('/api/feedback', { params });
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
      await webFetch('PATCH /api/feedback/:id/status', {
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

  const handleDeleteTicket = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm(`Delete ticket #${id}? This cannot be undone.`)) return;
    setActionInProgress(id);
    try {
      await webFetch('DELETE /api/feedback/:id', { params: { id } });
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
      await webFetch('DELETE /api/feedback/libraries/:name', {
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

      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between gap-4">
        <div className="flex gap-1 bg-bg-primary rounded-lg p-1 border border-[#333]">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              className={`text-sm font-medium py-2 px-5 rounded-md border-none cursor-pointer transition-all duration-150 ${
                activeTab === tab.key
                  ? 'bg-accent text-white'
                  : 'bg-transparent text-text-secondary hover:text-text-primary'
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3 items-center">
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="bg-bg-primary text-text-primary border border-[#333] py-2 px-3 rounded-md text-sm cursor-pointer hover:border-[#555] focus:outline-none focus:border-accent"
          >
            <option value="">All Severities</option>
            {SEVERITIES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <span className="text-sm text-text-secondary font-medium">
            {total} item{total !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
        {loading ? (
          <div className="text-text-muted p-8 text-center text-base">Loading feedback...</div>
        ) : items.length === 0 ? (
          <div className="text-text-muted p-8 text-center text-base">No feedback items found</div>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              className="bg-bg-card border border-border rounded-lg px-5 py-4 hover:border-[#1a4a7a] transition-colors duration-150 cursor-pointer"
              onClick={() => onSelectTicket(item.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className={`text-[11px] font-bold uppercase py-1 px-2.5 rounded tracking-wider ${SEVERITY_STYLES[item.severity] ?? ''}`}>
                    {item.severity}
                  </span>
                  <span className="text-[15px] font-semibold text-text-primary">{item.library}</span>
                  <span className="text-sm text-text-muted">#{item.id}</span>
                </div>
                <span className={`text-xs py-1 px-3 rounded-full font-semibold ${STATUS_STYLES[item.status] ?? ''}`}>
                  {item.status}
                </span>
              </div>
              <div className="text-[15px] leading-relaxed text-text-primary mb-2">{item.description}</div>
              {item.context && (
                <div className="text-sm text-text-secondary bg-bg-input py-2.5 px-3 rounded-md mb-3 font-mono whitespace-pre-wrap break-all border border-border-light">
                  {item.context}
                </div>
              )}
              <div className="flex items-center justify-between mt-1">
                <div className="flex gap-4 text-sm text-text-muted">
                  {item.user && <span className="text-text-link font-medium">{item.user}</span>}
                  <span>{formatDate(item.created_at)}</span>
                </div>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  {item.status === 'pending' && (
                    <button
                      className={BTN_ACCEPT}
                      disabled={actionInProgress === item.id}
                      onClick={() => handleStatusUpdate(item.id, 'accepted')}
                    >
                      {actionInProgress === item.id ? '...' : 'Accept'}
                    </button>
                  )}
                  {(item.status === 'pending' || item.status === 'accepted') && (
                    <button
                      className={BTN_COMPLETE}
                      disabled={actionInProgress === item.id}
                      onClick={() => handleStatusUpdate(item.id, 'completed')}
                    >
                      {actionInProgress === item.id ? '...' : 'Resolve'}
                    </button>
                  )}
                  {(item.status === 'pending' || item.status === 'accepted') && (
                    <button
                      className={BTN_REJECT}
                      disabled={actionInProgress === item.id}
                      onClick={() => handleStatusUpdate(item.id, 'rejected')}
                    >
                      {actionInProgress === item.id ? '...' : 'Reject'}
                    </button>
                  )}
                  <button
                    className={BTN_DELETE}
                    disabled={actionInProgress === item.id}
                    onClick={e => handleDeleteTicket(e, item.id)}
                  >
                    {actionInProgress === item.id ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 p-4 border-t border-border">
          <button
            className={BTN_PAGE}
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </button>
          <span className="text-sm text-text-secondary font-medium">Page {page} of {totalPages}</span>
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
