import { useState, useEffect } from 'react';
import { webFetch } from '@facetlayer/prism-framework-ui';

interface FeedbackItem {
  id: number;
  ticket_id: string;
  library: string;
  description: string;
  severity: string;
  status: string;
  context: string | null;
  user: string | null;
  created_at: number;
}

interface Comment {
  id: number;
  ticket_id: string;
  comment: string;
  user: string | null;
  type: 'comment' | 'status_change' | 'completion';
  created_at: number;
}

interface TicketDetailProps {
  ticketId: number;
  onBack: () => void;
  onRefresh: () => void;
}

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

const COMMENT_TYPE_STYLES: Record<string, string> = {
  comment: 'border-[#333] bg-bg-card',
  status_change: 'border-[#1e3a5f] bg-[#0d1f33]',
  completion: 'border-[#065f46] bg-[#042f25]',
};

const COMMENT_TYPE_LABEL: Record<string, string> = {
  comment: 'Comment',
  status_change: 'Status Change',
  completion: 'Resolved',
};

const BTN_BASE = 'rounded-md border cursor-pointer transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed font-medium';
const BTN_ACCEPT = `text-sm py-2 px-5 ${BTN_BASE} bg-[#0a3d24] border-[#166534] text-[#4ade80] hover:bg-[#0d4f2e]`;
const BTN_RESOLVE = `text-sm py-2 px-5 ${BTN_BASE} bg-[#1a2f4d] border-[#1e3a5f] text-[#93c5fd] hover:bg-[#1e3a5f]`;
const BTN_REJECT = `text-sm py-2 px-5 ${BTN_BASE} bg-[#3a0a0a] border-[#7f1d1d] text-[#f87171] hover:bg-[#450a0a]`;
const BTN_DELETE = `text-sm py-2 px-5 ${BTN_BASE} bg-[#3a0a0a] border-[#7f1d1d] text-[#f87171] hover:bg-[#450a0a]`;
const BTN_BACK = `text-sm py-2 px-4 ${BTN_BASE} bg-bg-primary border-[#333] text-[#ccc] hover:border-[#555] hover:bg-[#222]`;

function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString().replace('T', ' ').substring(0, 19);
}

export function TicketDetail({ ticketId, onBack, onRefresh }: TicketDetailProps) {
  const [item, setItem] = useState<FeedbackItem | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchDetail = async () => {
    try {
      const data = await webFetch('/api/feedback/:id/comments', { params: { id: ticketId } });
      setItem((data as any).item);
      setComments((data as any).comments);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [ticketId]);

  const handleStatusUpdate = async (status: string) => {
    if (!item) return;
    setActionInProgress(status);
    try {
      await webFetch('PATCH /api/feedback/:id/status', {
        params: { id: item.id, status },
      });
      await fetchDetail();
      onRefresh();
    } catch {
      // silently fail
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    if (!confirm(`Delete ticket #${item.id}? This cannot be undone.`)) return;
    setActionInProgress('delete');
    try {
      await webFetch('DELETE /api/feedback/:id', { params: { id: item.id } });
      onRefresh();
      onBack();
    } catch {
      // silently fail
    } finally {
      setActionInProgress(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted">
        Loading ticket...
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="text-text-muted">Ticket not found</div>
        <button className={BTN_BACK} onClick={onBack}>Back</button>
      </div>
    );
  }

  const isActive = item.status === 'pending' || item.status === 'accepted';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-bg-secondary">
        <button className={BTN_BACK} onClick={onBack}>← Back</button>
        <div className="flex items-center gap-3 flex-1">
          <span className={`text-[11px] font-bold uppercase py-1 px-2.5 rounded tracking-wider ${SEVERITY_STYLES[item.severity] ?? ''}`}>
            {item.severity}
          </span>
          <span className="text-lg font-semibold text-text-primary">{item.library}</span>
          <span className="text-sm text-text-muted font-mono">#{item.id}</span>
          <span className="text-xs text-text-muted font-mono">{item.ticket_id}</span>
        </div>
        <span className={`text-xs py-1 px-3 rounded-full font-semibold ${STATUS_STYLES[item.status] ?? ''}`}>
          {item.status}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        <div className="bg-bg-card border border-border rounded-lg p-5">
          <div className="text-base leading-relaxed text-text-primary mb-4 whitespace-pre-wrap">{item.description}</div>
          {item.context && (
            <div className="text-sm text-text-secondary bg-bg-input py-2.5 px-3 rounded-md mb-4 font-mono whitespace-pre-wrap break-all border border-border-light">
              {item.context}
            </div>
          )}
          <div className="flex items-center gap-4 text-sm text-text-muted">
            {item.user && <span className="text-text-link font-medium">{item.user}</span>}
            <span>Reported {formatDate(item.created_at)}</span>
          </div>
        </div>

        {isActive && (
          <div className="flex gap-2 flex-wrap">
            {item.status === 'pending' && (
              <button
                className={BTN_ACCEPT}
                disabled={actionInProgress !== null}
                onClick={() => handleStatusUpdate('accepted')}
              >
                {actionInProgress === 'accepted' ? '...' : 'Accept'}
              </button>
            )}
            <button
              className={BTN_RESOLVE}
              disabled={actionInProgress !== null}
              onClick={() => handleStatusUpdate('completed')}
            >
              {actionInProgress === 'completed' ? '...' : 'Resolve'}
            </button>
            <button
              className={BTN_REJECT}
              disabled={actionInProgress !== null}
              onClick={() => handleStatusUpdate('rejected')}
            >
              {actionInProgress === 'rejected' ? '...' : 'Reject'}
            </button>
            <button
              className={BTN_DELETE}
              disabled={actionInProgress !== null}
              onClick={handleDelete}
            >
              {actionInProgress === 'delete' ? '...' : 'Delete'}
            </button>
          </div>
        )}

        {!isActive && (
          <div className="flex gap-2">
            <button
              className={BTN_DELETE}
              disabled={actionInProgress !== null}
              onClick={handleDelete}
            >
              {actionInProgress === 'delete' ? '...' : 'Delete'}
            </button>
          </div>
        )}

        {comments.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
              History ({comments.length})
            </h3>
            {comments.map(comment => (
              <div
                key={comment.id}
                className={`border rounded-lg px-4 py-3 ${COMMENT_TYPE_STYLES[comment.type] ?? 'border-[#333] bg-bg-card'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    {COMMENT_TYPE_LABEL[comment.type] ?? comment.type}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    {comment.user && <span className="text-text-link">{comment.user}</span>}
                    <span>{formatDate(comment.created_at)}</span>
                  </div>
                </div>
                <div className="text-sm text-text-primary whitespace-pre-wrap">{comment.comment}</div>
              </div>
            ))}
          </div>
        )}

        {comments.length === 0 && (
          <div className="text-sm text-text-muted">No history yet.</div>
        )}
      </div>
    </div>
  );
}
