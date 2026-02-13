import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE } from '../config/api';
import {
  Search,
  Plus,
  MoreHorizontal,
  Archive,
  Trash2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Sparkles,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CoachingStatus = 'draft' | 'scheduled' | 'published' | 'archived';

interface CoachingOffer {
  id: string;
  title: string;
  slug: string;
  status: CoachingStatus;
  summary: string | null;
  price: string | null;
  priceType: 'fixed' | 'from' | 'free' | 'inquiry';
  priceAmount: string | null;
  currency: string;
  deliveryMode: 'online' | 'in_person' | 'hybrid';
  coverImageUrl: string | null;
  publishedAt: string | null;
  scheduledAt: string | null;
  updatedAt: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

const STATUS_TABS: { key: string; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'published', label: 'Published' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'archived', label: 'Archived' },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'updatedAt_desc', label: 'Recently updated' },
  { value: 'createdAt_desc', label: 'Newest' },
  { value: 'title_asc', label: 'Title A-Z' },
  { value: 'title_desc', label: 'Title Z-A' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

function formatPrice(offer: CoachingOffer): string {
  switch (offer.priceType) {
    case 'free':
      return 'Free';
    case 'inquiry':
      return 'Inquiry';
    case 'from':
      return `From ${offer.currency === 'USD' ? '$' : offer.currency + ' '}${offer.priceAmount ?? ''}`;
    case 'fixed':
    default:
      return `${offer.currency === 'USD' ? '$' : offer.currency + ' '}${offer.priceAmount ?? ''}`;
  }
}

function formatDeliveryMode(mode: string): string {
  switch (mode) {
    case 'online':
      return 'Online';
    case 'in_person':
      return 'In Person';
    case 'hybrid':
      return 'Hybrid';
    default:
      return mode;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: CoachingStatus }) {
  const styles: Record<CoachingStatus, string> = {
    draft: 'bg-gray-100 text-gray-700',
    published: 'bg-green-100 text-green-700',
    scheduled: 'bg-blue-100 text-blue-700',
    archived: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${styles[status] || styles.draft}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function DeliveryBadge({ mode }: { mode: string }) {
  return (
    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
      {formatDeliveryMode(mode)}
    </span>
  );
}

function RowActionsMenu({
  offer,
  onEdit,
  onPublish,
  onUnpublish,
  onArchive,
  onDelete,
}: {
  offer: CoachingOffer;
  onEdit: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="p-1.5 hover:bg-stone-100 rounded transition"
      >
        <MoreHorizontal size={16} className="text-stone-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg shadow-lg border border-stone-200 py-1 w-44">
          <button
            onClick={() => {
              onEdit();
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex items-center gap-2"
          >
            <Pencil size={14} /> Edit
          </button>
          {(offer.status === 'draft' || offer.status === 'scheduled') && (
            <button
              onClick={() => {
                onPublish();
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex items-center gap-2"
            >
              <Eye size={14} /> Publish
            </button>
          )}
          {offer.status === 'published' && (
            <button
              onClick={() => {
                onUnpublish();
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex items-center gap-2"
            >
              <EyeOff size={14} /> Unpublish
            </button>
          )}
          {offer.status !== 'archived' && (
            <button
              onClick={() => {
                onArchive();
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex items-center gap-2"
            >
              <Archive size={14} /> Archive
            </button>
          )}
          <div className="border-t border-stone-100 my-1" />
          <button
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3, 4].map((i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="h-4 bg-stone-200 rounded w-36" />
              <div className="h-4 bg-stone-100 rounded w-12" />
            </div>
          </td>
          <td className="px-4 py-4">
            <div className="h-4 bg-stone-100 rounded w-16" />
          </td>
          <td className="px-4 py-4">
            <div className="h-4 bg-stone-100 rounded w-14" />
          </td>
          <td className="px-4 py-4">
            <div className="h-4 bg-stone-100 rounded w-12" />
          </td>
          <td className="px-4 py-4">
            <div className="h-4 bg-stone-100 rounded w-16" />
          </td>
          <td className="px-4 py-4">
            <div className="h-4 bg-stone-100 rounded w-4" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CoachingManager() {
  const { accessToken } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  // Data
  const [items, setItems] = useState<CoachingOffer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortValue, setSortValue] = useState('updatedAt_desc');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Status counts
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({
    '': 0,
    draft: 0,
    published: 0,
    scheduled: 0,
    archived: 0,
  });

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch, sortValue]);

  // Fetch data
  const fetchItems = useCallback(
    async (currentPage: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('all', 'true');
        params.set('page', String(currentPage));
        params.set('pageSize', String(PAGE_SIZE));
        params.set('sort', sortValue);
        if (statusFilter) params.set('status', statusFilter);
        if (debouncedSearch) params.set('q', debouncedSearch);

        const res = await fetch(`${API_BASE}/coaching?${params}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) throw new Error('Failed to load coaching offers');

        const data = await res.json();
        setItems(data.items || []);
        setTotal(data.total || 0);

        // Also fetch counts for all statuses (for the tab badges)
        const countParams = new URLSearchParams();
        countParams.set('all', 'true');
        countParams.set('pageSize', '0');
        if (debouncedSearch) countParams.set('q', debouncedSearch);

        const countRes = await fetch(`${API_BASE}/coaching?${countParams}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (countRes.ok) {
          const countData = await countRes.json();
          const allItems: CoachingOffer[] = countData.items || [];
          const counts: Record<string, number> = {
            '': allItems.length,
            draft: 0,
            published: 0,
            scheduled: 0,
            archived: 0,
          };
          allItems.forEach((item) => {
            if (counts[item.status] !== undefined) {
              counts[item.status]++;
            }
          });
          setStatusCounts(counts);
        }
      } catch {
        error('Could not load coaching offers. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [accessToken, statusFilter, debouncedSearch, sortValue, error],
  );

  useEffect(() => {
    fetchItems(page);
  }, [fetchItems, page]);

  // Actions
  const handlePublish = async (offer: CoachingOffer) => {
    try {
      const res = await fetch(`${API_BASE}/coaching/${offer.id}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error();
      success(`"${offer.title}" published.`);
      fetchItems(page);
    } catch {
      error('Could not publish offer.');
    }
  };

  const handleUnpublish = async (offer: CoachingOffer) => {
    try {
      const res = await fetch(`${API_BASE}/coaching/${offer.id}/unpublish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error();
      success(`"${offer.title}" unpublished.`);
      fetchItems(page);
    } catch {
      error('Could not unpublish offer.');
    }
  };

  const handleArchive = async (offer: CoachingOffer) => {
    try {
      const res = await fetch(`${API_BASE}/coaching/${offer.id}/archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error();
      success(`"${offer.title}" archived.`);
      fetchItems(page);
    } catch {
      error('Could not archive offer.');
    }
  };

  const handleDelete = async (offer: CoachingOffer) => {
    if (!window.confirm(`Are you sure you want to delete "${offer.title}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/coaching/${offer.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error();
      success(`"${offer.title}" deleted.`);
      fetchItems(page);
    } catch {
      error('Could not delete offer.');
    }
  };

  // Pagination
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const startItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, total);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Coaching</h1>
          <p className="text-sm text-stone-500 mt-1">Manage your coaching offers and packages.</p>
        </div>
        <button
          onClick={() => navigate('/admin/coaching/new')}
          className="bg-stone-900 text-white hover:bg-stone-800 rounded-md px-4 h-9 text-sm font-medium transition-colors inline-flex items-center gap-1.5"
        >
          <Plus size={16} />
          New Offer
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 mb-4">
        <div className="flex gap-1 bg-stone-100 p-0.5 rounded-lg">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                statusFilter === tab.key
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {tab.label}
              {statusCounts[tab.key] > 0 && (
                <span className="ml-1.5 text-[10px] text-stone-400">{statusCounts[tab.key]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search and sort row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search coaching offers..."
            className="w-full bg-white border border-stone-200 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-stone-100 rounded text-stone-400 hover:text-stone-600"
            >
              <span className="sr-only">Clear</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Sort */}
        <select
          value={sortValue}
          onChange={(e) => setSortValue(e.target.value)}
          className="bg-white border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Count */}
        <span className="text-sm text-stone-400 ml-auto">
          {total} offer{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-stone-50/80">
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Delivery
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Published
                  </th>
                  <th className="px-4 py-2.5 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                <SkeletonRows />
              </tbody>
            </table>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Sparkles size={24} className="text-stone-400" />
            </div>
            <p className="text-stone-600 font-medium">
              {debouncedSearch || statusFilter
                ? 'No coaching offers match your filters'
                : 'Create your first coaching offer'}
            </p>
            <p className="text-sm text-stone-400 mt-1">
              {debouncedSearch || statusFilter
                ? 'Try adjusting your search or filters.'
                : 'Add a coaching offer to start connecting with clients.'}
            </p>
            {!(debouncedSearch || statusFilter) && (
              <button
                onClick={() => navigate('/admin/coaching/new')}
                className="mt-4 bg-stone-900 text-white hover:bg-stone-800 rounded-md px-4 py-2 text-sm font-medium transition-colors inline-flex items-center gap-1.5"
              >
                <Plus size={16} />
                New Offer
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-stone-50/80">
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Delivery
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Updated
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Published
                    </th>
                    <th className="px-4 py-2.5 w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {items.map((offer) => (
                    <tr
                      key={offer.id}
                      className={`hover:bg-stone-50 cursor-pointer transition ${
                        offer.status === 'archived' ? 'opacity-60' : ''
                      }`}
                      onClick={() => navigate(`/admin/coaching/${offer.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-stone-900 truncate max-w-[240px]">
                            {offer.title || 'Untitled'}
                          </span>
                          <StatusBadge status={offer.status} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-600">{formatPrice(offer)}</td>
                      <td className="px-4 py-3">
                        <DeliveryBadge mode={offer.deliveryMode} />
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-500">{timeAgo(offer.updatedAt)}</td>
                      <td className="px-4 py-3 text-sm text-stone-500">
                        {offer.publishedAt
                          ? new Date(offer.publishedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '\u2014'}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <RowActionsMenu
                          offer={offer}
                          onEdit={() => navigate(`/admin/coaching/${offer.id}`)}
                          onPublish={() => handlePublish(offer)}
                          onUnpublish={() => handleUnpublish(offer)}
                          onArchive={() => handleArchive(offer)}
                          onDelete={() => handleDelete(offer)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100">
                <p className="text-sm text-stone-500">
                  Showing {startItem}&ndash;{endItem} of {total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-2 rounded hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (page <= 4) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = page - 3 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 rounded text-sm transition ${
                          page === pageNum
                            ? 'bg-stone-900 text-white'
                            : 'hover:bg-stone-100 text-stone-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-2 rounded hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
