import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE, resolveImageUrl } from '../config/api';
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
  Calendar,
  Users as UsersIcon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorkshopItem {
  id: string;
  title: string;
  slug: string;
  type: 'ONLINE' | 'WORKSHOP';
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  summary: string | null;
  price: string;
  priceAmount: string | null;
  currency: string;
  deliveryMode: 'online' | 'in_person' | 'hybrid';
  coverImageUrl: string | null;
  image: string;
  capacity: number | null;
  startAt: string | null;
  endAt: string | null;
  evergreen: boolean;
  publishedAt: string | null;
  scheduledAt: string | null;
  updatedAt: string;
  createdAt: string;
  enrolledCount: number;
}

type StatusFilter = '' | 'draft' | 'scheduled' | 'published' | 'archived';
type TypeFilter = '' | 'ONLINE' | 'WORKSHOP';
type SortOption = 'updated' | 'newest' | 'title' | 'next_date';

interface FetchResult {
  items: WorkshopItem[];
  total: number;
  page: number;
  pageSize: number;
}

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

function formatDate(date: string | null): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const statusConfig: Record<
  WorkshopItem['status'],
  { label: string; className: string }
> = {
  draft: { label: 'Draft', className: 'bg-stone-100 text-stone-600' },
  published: { label: 'Published', className: 'bg-green-100 text-green-700' },
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700' },
  archived: { label: 'Archived', className: 'bg-amber-100 text-amber-700' },
};

function StatusBadge({ status }: { status: WorkshopItem['status'] }) {
  const { label, className } = statusConfig[status] ?? statusConfig.draft;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${className}`}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Type badge
// ---------------------------------------------------------------------------

function TypeBadge({ type }: { type: WorkshopItem['type'] }) {
  if (type === 'WORKSHOP') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 text-purple-700">
        Workshop
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-sky-100 text-sky-700">
      Course
    </span>
  );
}

// ---------------------------------------------------------------------------
// Row actions dropdown
// ---------------------------------------------------------------------------

function RowActions({
  item,
  onEdit,
  onPublish,
  onUnpublish,
  onArchive,
  onDelete,
}: {
  item: WorkshopItem;
  onEdit: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="p-1.5 rounded-md text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-stone-200 rounded-lg shadow-lg z-30 py-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onEdit();
            }}
            className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
          >
            <Eye size={14} />
            Edit
          </button>

          {item.status === 'published' ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onUnpublish();
              }}
              className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
            >
              <EyeOff size={14} />
              Unpublish
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onPublish();
              }}
              className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
            >
              <Eye size={14} />
              Publish
            </button>
          )}

          {item.status !== 'archived' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onArchive();
              }}
              className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
            >
              <Archive size={14} />
              Archive
            </button>
          )}

          <div className="border-t border-stone-100 my-1" />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onDelete();
            }}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
      <div className="divide-y divide-stone-100">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
            <div className="w-10 h-10 bg-stone-100 rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-stone-100 rounded w-1/3" />
              <div className="h-2.5 bg-stone-50 rounded w-1/5" />
            </div>
            <div className="h-5 bg-stone-100 rounded w-16" />
            <div className="h-3 bg-stone-50 rounded w-14" />
            <div className="h-3 bg-stone-50 rounded w-20" />
            <div className="h-3 bg-stone-50 rounded w-12" />
            <div className="h-3 bg-stone-50 rounded w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg py-16 text-center">
      <Calendar size={36} className="mx-auto text-stone-300 mb-3" />
      {hasFilters ? (
        <>
          <p className="text-sm font-medium text-stone-700 mb-1">No workshops match your filters</p>
          <p className="text-xs text-stone-400 mb-4">Try adjusting the search or status filters.</p>
          <button
            type="button"
            onClick={onClear}
            className="text-sm text-stone-600 hover:text-stone-900 underline"
          >
            Clear filters
          </button>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-stone-700 mb-1">No workshops or courses yet</p>
          <p className="text-xs text-stone-400">Create your first one to get started.</p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function WorkshopsManager() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const { success, error: showError } = useToast();

  // Data
  const [items, setItems] = useState<WorkshopItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<SortOption>('updated');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  // ---------------------------------------------------------------------------
  // Fetch data
  // ---------------------------------------------------------------------------

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        all: 'true',
        status: statusFilter,
        q: searchQuery,
        page: String(page),
        pageSize: String(pageSize),
        sort,
        type: typeFilter,
      });
      const res = await fetch(`${API_BASE}/learn?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data: FetchResult = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } catch {
      showError('Could not load workshops. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, statusFilter, typeFilter, searchQuery, sort, page]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ---------------------------------------------------------------------------
  // Status counts (computed from all items at current filter minus status)
  // We approximate counts from the currently loaded set. For exact counts the
  // API could provide them; for now we show counts when viewing "All".
  // ---------------------------------------------------------------------------

  const [allCounts, setAllCounts] = useState<Record<string, number>>({
    '': 0,
    draft: 0,
    published: 0,
    scheduled: 0,
    archived: 0,
  });

  // Fetch counts once on mount and when non-status filters change
  const fetchCounts = useCallback(async () => {
    try {
      const statuses = ['', 'draft', 'published', 'scheduled', 'archived'] as const;
      const counts: Record<string, number> = {};
      await Promise.all(
        statuses.map(async (s) => {
          const params = new URLSearchParams({
            all: 'true',
            status: s,
            q: searchQuery,
            page: '1',
            pageSize: '1',
            sort: 'updated',
            type: typeFilter,
          });
          const res = await fetch(`${API_BASE}/learn?${params.toString()}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            counts[s] = data.total ?? 0;
          }
        }),
      );
      setAllCounts(counts);
    } catch {
      // Silent — counts are non-critical
    }
  }, [accessToken, searchQuery, typeFilter]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handlePublish = async (item: WorkshopItem) => {
    try {
      const res = await fetch(`${API_BASE}/learn/${item.id}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error();
      success(`"${item.title}" has been published.`);
      fetchItems();
      fetchCounts();
    } catch {
      showError(`Could not publish "${item.title}". Please try again.`);
    }
  };

  const handleUnpublish = async (item: WorkshopItem) => {
    try {
      const res = await fetch(`${API_BASE}/learn/${item.id}/unpublish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error();
      success(`"${item.title}" has been unpublished.`);
      fetchItems();
      fetchCounts();
    } catch {
      showError(`Could not unpublish "${item.title}". Please try again.`);
    }
  };

  const handleArchive = async (item: WorkshopItem) => {
    try {
      const res = await fetch(`${API_BASE}/learn/${item.id}/archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error();
      success(`"${item.title}" has been archived.`);
      fetchItems();
      fetchCounts();
    } catch {
      showError(`Could not archive "${item.title}". Please try again.`);
    }
  };

  const handleDelete = async (item: WorkshopItem) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${item.title}"? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/learn/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error();
      success(`"${item.title}" has been deleted.`);
      fetchItems();
      fetchCounts();
    } catch {
      showError(`Could not delete "${item.title}". Please try again.`);
    }
  };

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = statusFilter !== '' || typeFilter !== '' || searchQuery !== '';

  const clearFilters = () => {
    setStatusFilter('');
    setTypeFilter('');
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  };

  // ---------------------------------------------------------------------------
  // Sort label
  // ---------------------------------------------------------------------------

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'updated', label: 'Recently updated' },
    { value: 'newest', label: 'Newest' },
    { value: 'title', label: 'Title A\u2013Z' },
    { value: 'next_date', label: 'Next date' },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Workshops & Courses</h1>
          <p className="text-sm text-stone-500 mt-1">
            Manage your workshops, online courses, and learn offerings.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/workshops/new')}
          className="flex items-center gap-1.5 bg-stone-900 text-white hover:bg-stone-800 rounded-md px-4 h-9 text-sm font-medium transition"
        >
          <Plus size={16} />
          New Workshop
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1 bg-stone-100 p-0.5 rounded-lg">
          {(
            [
              { key: '' as StatusFilter, label: 'All' },
              { key: 'draft' as StatusFilter, label: 'Draft' },
              { key: 'published' as StatusFilter, label: 'Published' },
              { key: 'scheduled' as StatusFilter, label: 'Scheduled' },
              { key: 'archived' as StatusFilter, label: 'Archived' },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setStatusFilter(key);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                statusFilter === key
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {label}
              {(allCounts[key] ?? 0) > 0 && (
                <span className="ml-1.5 text-[10px] text-stone-400">
                  {allCounts[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as TypeFilter);
            setPage(1);
          }}
          className="text-xs border border-stone-200 rounded-md px-2.5 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
        >
          <option value="">All Types</option>
          <option value="WORKSHOP">Workshop</option>
          <option value="ONLINE">Online Course</option>
        </select>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search workshops..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 bg-white"
          />
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as SortOption);
            setPage(1);
          }}
          className="text-xs border border-stone-200 rounded-md px-2.5 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 ml-auto"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table / loading / empty */}
      {loading ? (
        <TableSkeleton />
      ) : items.length === 0 ? (
        <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
      ) : (
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[40px_1fr_100px_90px_120px_80px_90px_40px] gap-3 items-center px-4 py-2.5 border-b border-stone-100 bg-stone-50/60 text-[11px] font-medium text-stone-500 uppercase tracking-wider">
            <span />
            <span>Title</span>
            <span>Status</span>
            <span>Price</span>
            <span>Next Date</span>
            <span>Capacity</span>
            <span>Updated</span>
            <span />
          </div>

          {/* Rows */}
          <div className="divide-y divide-stone-100">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/admin/workshops/${item.id}`)}
                className="grid grid-cols-1 md:grid-cols-[40px_1fr_100px_90px_120px_80px_90px_40px] gap-3 items-center px-4 py-3 hover:bg-stone-50 cursor-pointer transition group"
              >
                {/* Thumbnail */}
                <div className="hidden md:block">
                  {item.coverImageUrl || item.image ? (
                    <img
                      src={resolveImageUrl(item.coverImageUrl || item.image)}
                      alt=""
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-stone-100 rounded flex items-center justify-center">
                      <Calendar size={14} className="text-stone-300" />
                    </div>
                  )}
                </div>

                {/* Title + type badge */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-stone-900 truncate">
                      {item.title}
                    </p>
                    <TypeBadge type={item.type} />
                  </div>
                  {item.summary && (
                    <p className="text-xs text-stone-400 mt-0.5 truncate">
                      {item.summary}
                    </p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <StatusBadge status={item.status} />
                </div>

                {/* Price */}
                <div className="text-sm text-stone-700">{item.price || '\u2014'}</div>

                {/* Next date */}
                <div className="text-xs text-stone-500">
                  {item.evergreen ? (
                    <span className="inline-flex items-center gap-1 text-green-600">
                      <Calendar size={12} />
                      Evergreen
                    </span>
                  ) : item.startAt ? (
                    formatDate(item.startAt)
                  ) : (
                    '\u2014'
                  )}
                </div>

                {/* Capacity */}
                <div className="text-xs text-stone-500">
                  {item.capacity ? (
                    <span className="inline-flex items-center gap-1">
                      <UsersIcon size={12} />
                      {item.enrolledCount}/{item.capacity}
                    </span>
                  ) : (
                    '\u2014'
                  )}
                </div>

                {/* Updated */}
                <div className="text-xs text-stone-400">{timeAgo(item.updatedAt)}</div>

                {/* Actions */}
                <div onClick={(e) => e.stopPropagation()}>
                  <RowActions
                    item={item}
                    onEdit={() => navigate(`/admin/workshops/${item.id}`)}
                    onPublish={() => handlePublish(item)}
                    onUnpublish={() => handleUnpublish(item)}
                    onArchive={() => handleArchive(item)}
                    onDelete={() => handleDelete(item)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-stone-500">
          <span>
            Showing {(page - 1) * pageSize + 1}
            {'\u2013'}
            {Math.min(page * pageSize, total)} of {total}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-md border border-stone-200 text-stone-500 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="px-3 py-1 text-xs text-stone-600">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-md border border-stone-200 text-stone-500 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
