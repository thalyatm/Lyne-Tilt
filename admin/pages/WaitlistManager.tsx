import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE, resolveImageUrl } from '../config/api';
import {
  Clock,
  Bell,
  Package,
  Search,
  Loader2,
  Mail,
  Trash2,
  ChevronDown,
  ChevronRight,
  X,
  BellRing,
  Users,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WaitlistStatus = 'waiting' | 'notified' | 'purchased' | 'cancelled';

interface WaitlistEntry {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  email: string;
  customerName: string | null;
  status: WaitlistStatus;
  notifiedAt: string | null;
  createdAt: string;
}

interface WaitlistStats {
  totalWaiting: number;
  totalNotified: number;
  totalProducts: number;
}

interface ProductGroup {
  productId: string;
  productName: string;
  productImage: string | null;
  entries: WaitlistEntry[];
  waitingCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  if (diffWeek < 5) return `${diffWeek} week${diffWeek === 1 ? '' : 's'} ago`;
  return `${diffMonth} month${diffMonth === 1 ? '' : 's'} ago`;
}

function groupByProduct(entries: WaitlistEntry[]): ProductGroup[] {
  const map = new Map<string, ProductGroup>();

  for (const entry of entries) {
    let group = map.get(entry.productId);
    if (!group) {
      group = {
        productId: entry.productId,
        productName: entry.productName,
        productImage: entry.productImage,
        entries: [],
        waitingCount: 0,
      };
      map.set(entry.productId, group);
    }
    group.entries.push(entry);
    if (entry.status === 'waiting') {
      group.waitingCount++;
    }
  }

  // Sort groups by waiting count descending, then alphabetically
  return Array.from(map.values()).sort((a, b) => {
    if (b.waitingCount !== a.waitingCount) return b.waitingCount - a.waitingCount;
    return a.productName.localeCompare(b.productName);
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  accent: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon size={18} className={iconColor} />
      </div>
      <div>
        <p className="text-2xl font-semibold text-stone-900">{value}</p>
        <p className="text-xs text-stone-500">{label}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: WaitlistStatus }) {
  const styles: Record<WaitlistStatus, string> = {
    waiting: 'bg-amber-50 text-amber-700',
    notified: 'bg-green-50 text-green-700',
    purchased: 'bg-blue-50 text-blue-700',
    cancelled: 'bg-stone-100 text-stone-600',
  };
  const labels: Record<WaitlistStatus, string> = {
    waiting: 'Waiting',
    notified: 'Notified',
    purchased: 'Purchased',
    cancelled: 'Cancelled',
  };
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// ProductGroupCard
// ---------------------------------------------------------------------------

function ProductGroupCard({
  group,
  expanded,
  onToggle,
  onNotify,
  onNotifyAll,
  onRemove,
  actionLoading,
}: {
  group: ProductGroup;
  expanded: boolean;
  onToggle: () => void;
  onNotify: (entryId: string) => void;
  onNotifyAll: (productId: string) => void;
  onRemove: (entryId: string) => void;
  actionLoading: string | null;
}) {
  return (
    <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
      {/* Group header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50/60 transition text-left"
      >
        <span className="text-stone-400">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>

        {group.productImage ? (
          <img
            src={resolveImageUrl(group.productImage)}
            alt={group.productName}
            className="w-10 h-10 object-cover rounded"
          />
        ) : (
          <div className="w-10 h-10 bg-stone-100 rounded flex items-center justify-center flex-shrink-0">
            <Package size={16} className="text-stone-400" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-900 truncate">
            {group.productName}
          </p>
          <p className="text-xs text-stone-500">
            {group.entries.length} entr{group.entries.length === 1 ? 'y' : 'ies'}
          </p>
        </div>

        {group.waitingCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 text-[11px] font-semibold rounded-full bg-amber-100 text-amber-700">
            {group.waitingCount} waiting
          </span>
        )}

        {group.waitingCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNotifyAll(group.productId);
            }}
            disabled={actionLoading !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50 flex-shrink-0"
            style={{ backgroundColor: '#8d3038' }}
            onMouseEnter={(e) => {
              if (actionLoading === null) e.currentTarget.style.backgroundColor = '#6b2228';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#8d3038';
            }}
          >
            <BellRing size={14} />
            Notify All
          </button>
        )}
      </button>

      {/* Expanded entries */}
      {expanded && (
        <div className="border-t border-stone-100">
          {group.entries.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-stone-400">
              No entries in this group.
            </div>
          ) : (
            <div className="divide-y divide-stone-50">
              {group.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-stone-50/40 transition"
                >
                  {/* Customer info */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail size={14} className="text-stone-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">
                        {entry.email}
                      </p>
                      {entry.customerName && (
                        <p className="text-xs text-stone-500 truncate">
                          {entry.customerName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <StatusBadge status={entry.status} />

                  {/* Notified date */}
                  {entry.notifiedAt && (
                    <span className="text-xs text-stone-400">
                      Notified {relativeTime(entry.notifiedAt)}
                    </span>
                  )}

                  {/* Signed up date */}
                  <span className="text-xs text-stone-400">
                    Signed up {relativeTime(entry.createdAt)}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {entry.status === 'waiting' && (
                      <button
                        onClick={() => onNotify(entry.id)}
                        disabled={actionLoading === entry.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white rounded-md transition-colors disabled:opacity-50"
                        style={{ backgroundColor: '#8d3038' }}
                        onMouseEnter={(e) => {
                          if (actionLoading !== entry.id) e.currentTarget.style.backgroundColor = '#6b2228';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#8d3038';
                        }}
                      >
                        {actionLoading === entry.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Bell size={12} />
                        )}
                        Notify
                      </button>
                    )}

                    <button
                      onClick={() => onRemove(entry.id)}
                      disabled={actionLoading === entry.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={12} />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function WaitlistManager() {
  const { accessToken } = useAuth();

  // Data
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [stats, setStats] = useState<WaitlistStats>({
    totalWaiting: 0,
    totalNotified: 0,
    totalProducts: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Expanded groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ---------- Debounced search ----------

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

  // ---------- Data fetching ----------

  const fetchWaitlist = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await fetch(`${API_BASE}/waitlist?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) throw new Error('Failed to load waitlist');

      const data = await res.json();
      setEntries(data.entries || []);
      setStats(
        data.stats || {
          totalWaiting: 0,
          totalNotified: 0,
          totalProducts: 0,
        }
      );
    } catch {
      showToast('Could not load waitlist. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [accessToken, statusFilter, debouncedSearch]);

  useEffect(() => {
    fetchWaitlist();
  }, [fetchWaitlist]);

  // ---------- Toggle group expansion ----------

  const toggleGroup = (productId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // ---------- Actions ----------

  const notifyEntry = async (entryId: string) => {
    setActionLoading(entryId);
    try {
      const res = await fetch(`${API_BASE}/waitlist/${entryId}/notify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) throw new Error('Failed to send notification');

      const now = new Date().toISOString();
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId ? { ...e, status: 'notified' as WaitlistStatus, notifiedAt: now } : e
        )
      );
      setStats((prev) => ({
        ...prev,
        totalWaiting: Math.max(0, prev.totalWaiting - 1),
        totalNotified: prev.totalNotified + 1,
      }));
      showToast('Notification sent successfully.');
    } catch {
      showToast('Could not send notification. Please try again.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const notifyAllForProduct = async (productId: string) => {
    const group = groupByProduct(entries).find((g) => g.productId === productId);
    if (!group) return;

    const waitingCount = group.waitingCount;
    if (
      !window.confirm(
        `Send notifications to all ${waitingCount} waiting customer${waitingCount === 1 ? '' : 's'} for "${group.productName}"?`
      )
    )
      return;

    setActionLoading(`product-${productId}`);
    try {
      const res = await fetch(`${API_BASE}/waitlist/product/${productId}/notify-all`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) throw new Error('Failed to send notifications');

      const now = new Date().toISOString();
      setEntries((prev) =>
        prev.map((e) =>
          e.productId === productId && e.status === 'waiting'
            ? { ...e, status: 'notified' as WaitlistStatus, notifiedAt: now }
            : e
        )
      );
      setStats((prev) => ({
        ...prev,
        totalWaiting: Math.max(0, prev.totalWaiting - waitingCount),
        totalNotified: prev.totalNotified + waitingCount,
      }));
      showToast(`Notified ${waitingCount} customer${waitingCount === 1 ? '' : 's'} for "${group.productName}".`);
    } catch {
      showToast('Could not send notifications. Please try again.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const removeEntry = async (entryId: string) => {
    const entry = entries.find((e) => e.id === entryId);
    if (
      !window.confirm(
        `Remove ${entry?.email || 'this entry'} from the waitlist? This cannot be undone.`
      )
    )
      return;

    setActionLoading(entryId);
    try {
      const res = await fetch(`${API_BASE}/waitlist/${entryId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) throw new Error('Failed to remove entry');

      const wasWaiting = entry?.status === 'waiting';
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      if (wasWaiting) {
        setStats((prev) => ({
          ...prev,
          totalWaiting: Math.max(0, prev.totalWaiting - 1),
        }));
      }
      showToast('Waitlist entry removed.');
    } catch {
      showToast('Could not remove entry. Please try again.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // ---------- Grouped data ----------

  const groups = groupByProduct(entries);

  // Expand all groups by default on first load
  useEffect(() => {
    if (!loading && entries.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set(groups.map((g) => g.productId)));
    }
  }, [loading, entries.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Render ----------

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className={
                toast.type === 'success'
                  ? 'text-green-600 hover:text-green-800'
                  : 'text-red-600 hover:text-red-800'
              }
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-xl font-semibold text-stone-900">Waitlist</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          {stats.totalWaiting} customer{stats.totalWaiting !== 1 ? 's' : ''} waiting across{' '}
          {stats.totalProducts} product{stats.totalProducts !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={Clock}
          label="Waiting"
          value={stats.totalWaiting}
          accent="bg-amber-100"
          iconColor="text-amber-600"
        />
        <StatCard
          icon={Bell}
          label="Notified"
          value={stats.totalNotified}
          accent="bg-green-100"
          iconColor="text-green-600"
        />
        <StatCard
          icon={Package}
          label="Products with Waitlists"
          value={stats.totalProducts}
          accent="bg-stone-100"
          iconColor="text-stone-600"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by email or name..."
            className="w-full bg-white border border-stone-200 rounded-md pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-stone-100 rounded"
            >
              <X size={14} className="text-stone-400" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
        >
          <option value="all">All statuses</option>
          <option value="waiting">Waiting</option>
          <option value="notified">Notified</option>
          <option value="purchased">Purchased</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Waitlist grouped by product */}
      {loading ? (
        <div className="bg-white rounded-lg border border-stone-200 p-12 text-center">
          <Loader2 size={24} className="animate-spin mx-auto mb-3 text-stone-400" />
          <p className="text-stone-500 text-sm">Loading waitlist...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-lg border border-stone-200 p-12 text-center">
          <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Bell size={24} className="text-stone-400" />
          </div>
          <p className="text-stone-600 font-medium">
            {debouncedSearch || statusFilter !== 'all'
              ? 'No waitlist entries match your filters'
              : 'No waitlist entries'}
          </p>
          <p className="text-sm text-stone-400 mt-1">
            {debouncedSearch || statusFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Customers will appear here when they join a product waitlist.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <ProductGroupCard
              key={group.productId}
              group={group}
              expanded={expandedGroups.has(group.productId)}
              onToggle={() => toggleGroup(group.productId)}
              onNotify={notifyEntry}
              onNotifyAll={notifyAllForProduct}
              onRemove={removeEntry}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}
