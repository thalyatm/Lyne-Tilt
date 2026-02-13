import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE } from '../config/api';
import {
  Search,
  Plus,
  MoreHorizontal,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Users as UsersIcon,
  Pencil,
  DoorOpen,
  DoorClosed,
  Play,
  CheckCircle2,
  XCircle,
  Copy,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CohortStatus = 'draft' | 'open' | 'closed' | 'in_progress' | 'completed' | 'cancelled';

interface CohortItem {
  id: string;
  title: string;
  learnItemId: string | null;
  workshopTitle: string | null;
  status: CohortStatus;
  startAt: string | null;
  endAt: string | null;
  capacity: number | null;
  enrolledCount: number;
  waitlistCount: number;
  price: string | null;
  priceAmount: string | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

interface LearnItem {
  id: string;
  title: string;
}

type SortOption = '-startAt' | 'startAt' | '-createdAt' | 'title';

interface FetchResult {
  items: CohortItem[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

const STATUS_TABS: { key: string; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'open', label: 'Open' },
  { key: 'closed', label: 'Closed' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: '-startAt', label: 'Newest First' },
  { value: 'startAt', label: 'Oldest First' },
  { value: '-createdAt', label: 'Recently Updated' },
  { value: 'title', label: 'Title A\u2013Z' },
];

const STATUS_BADGE_STYLES: Record<CohortStatus, string> = {
  draft: 'bg-stone-100 text-stone-600',
  open: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-amber-50 text-amber-700',
  in_progress: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-600',
};

const STATUS_LABELS: Record<CohortStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  closed: 'Closed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

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

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatDate(date: string | null): string {
  if (!date) return '';
  return dateFmt.format(new Date(date));
}

function formatDateRange(startAt: string | null, endAt: string | null): string {
  if (!startAt) return 'Not scheduled';
  const start = formatDate(startAt);
  if (!endAt) return start;
  const end = formatDate(endAt);
  return `${start} \u2192 ${end}`;
}

function formatPrice(item: CohortItem): string {
  if (!item.priceAmount && !item.price) return '\u2014';
  if (item.price) return item.price;
  const symbol = item.currency === 'USD' ? '$' : item.currency + ' ';
  return `${symbol}${item.priceAmount}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: CohortStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${
        STATUS_BADGE_STYLES[status] || STATUS_BADGE_STYLES.draft
      }`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Row actions dropdown
// ---------------------------------------------------------------------------

function RowActions({
  item,
  onEdit,
  onOpen,
  onClose,
  onStart,
  onComplete,
  onCancel,
  onDuplicate,
  onDelete,
}: {
  item: CohortItem;
  onEdit: () => void;
  onOpen: () => void;
  onClose: () => void;
  onStart: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onDuplicate: () => void;
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

  const s = item.status;

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
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-stone-200 rounded-lg shadow-lg z-30 py-1">
          {/* Edit */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onEdit();
            }}
            className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
          >
            <Pencil size={14} />
            Edit
          </button>

          {/* Open Registration — available when draft or closed */}
          {(s === 'draft' || s === 'closed') && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onOpen();
              }}
              className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
            >
              <DoorOpen size={14} />
              Open Registration
            </button>
          )}

          {/* Close Registration — available when open */}
          {s === 'open' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onClose();
              }}
              className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
            >
              <DoorClosed size={14} />
              Close
            </button>
          )}

          {/* Start — available when open or closed */}
          {(s === 'open' || s === 'closed') && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onStart();
              }}
              className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
            >
              <Play size={14} />
              Start
            </button>
          )}

          {/* Complete — available when in_progress */}
          {s === 'in_progress' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onComplete();
              }}
              className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
            >
              <CheckCircle2 size={14} />
              Complete
            </button>
          )}

          {/* Cancel — available when not already completed or cancelled */}
          {s !== 'completed' && s !== 'cancelled' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onCancel();
              }}
              className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
            >
              <XCircle size={14} />
              Cancel
            </button>
          )}

          <div className="border-t border-stone-100 my-1" />

          {/* Duplicate */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onDuplicate();
            }}
            className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
          >
            <Copy size={14} />
            Duplicate
          </button>

          <div className="border-t border-stone-100 my-1" />

          {/* Delete */}
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
      {/* Header */}
      <div className="hidden md:grid grid-cols-[1fr_160px_140px_80px_90px_40px] gap-3 items-center px-4 py-2.5 border-b border-stone-100 bg-stone-50/60 text-[11px] font-medium text-stone-500 uppercase tracking-wider">
        <span>Title</span>
        <span>Dates</span>
        <span>Capacity</span>
        <span>Price</span>
        <span>Status</span>
        <span />
      </div>
      <div className="divide-y divide-stone-100">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_160px_140px_80px_90px_40px] gap-3 items-center px-4 py-3 animate-pulse"
          >
            <div className="space-y-2">
              <div className="h-3.5 bg-stone-100 rounded w-2/3" />
              <div className="h-2.5 bg-stone-50 rounded w-1/3" />
            </div>
            <div className="h-3 bg-stone-50 rounded w-24" />
            <div className="h-3 bg-stone-50 rounded w-20" />
            <div className="h-3 bg-stone-50 rounded w-12" />
            <div className="h-5 bg-stone-100 rounded w-16" />
            <div className="h-3 bg-stone-50 rounded w-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({
  hasFilters,
  onClear,
  onCreate,
}: {
  hasFilters: boolean;
  onClear: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg py-16 text-center">
      <CalendarDays size={36} className="mx-auto text-stone-300 mb-3" />
      {hasFilters ? (
        <>
          <p className="text-sm font-medium text-stone-700 mb-1">
            No cohorts match your filters
          </p>
          <p className="text-xs text-stone-400 mb-4">
            Try adjusting the search or status filters.
          </p>
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
          <p className="text-sm font-medium text-stone-700 mb-1">No cohorts yet</p>
          <p className="text-xs text-stone-400 mb-4">
            Create your first cohort to schedule a workshop or course instance.
          </p>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 bg-stone-900 text-white hover:bg-stone-800 rounded-md px-4 py-2 text-sm font-medium transition"
          >
            <Plus size={16} />
            New Cohort
          </button>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CohortsManager() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const { success, error: showError } = useToast();

  // Data
  const [items, setItems] = useState<CohortItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Workshop list for filter dropdown
  const [workshops, setWorkshops] = useState<LearnItem[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [workshopFilter, setWorkshopFilter] = useState<string>('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<SortOption>('-startAt');
  const [page, setPage] = useState(1);

  // Status counts
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

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

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, workshopFilter, sort]);

  // ---------------------------------------------------------------------------
  // Fetch workshop list for filter dropdown
  // ---------------------------------------------------------------------------

  useEffect(() => {
    async function fetchWorkshops() {
      try {
        const params = new URLSearchParams({
          all: 'true',
          pageSize: '100',
        });
        const res = await fetch(`${API_BASE}/learn?${params.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setWorkshops(
            (data.items || []).map((w: { id: string; title: string }) => ({
              id: w.id,
              title: w.title,
            }))
          );
        }
      } catch {
        // Non-critical — workshop filter just won't have options
      }
    }
    if (accessToken) fetchWorkshops();
  }, [accessToken]);

  // ---------------------------------------------------------------------------
  // Fetch cohorts
  // ---------------------------------------------------------------------------

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        sort,
      });
      if (statusFilter) params.set('status', statusFilter);
      if (workshopFilter) params.set('learnItemId', workshopFilter);
      if (searchQuery) params.set('q', searchQuery);

      const res = await fetch(`${API_BASE}/cohorts?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch cohorts');
      const data: FetchResult = await res.json();
      setItems(data.items || []);
      setTotal(data.total ?? 0);
    } catch {
      showError('Could not load cohorts. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, statusFilter, workshopFilter, searchQuery, sort, page, showError]);

  useEffect(() => {
    if (accessToken) fetchItems();
  }, [fetchItems, accessToken]);

  // ---------------------------------------------------------------------------
  // Fetch status counts
  // ---------------------------------------------------------------------------

  const fetchCounts = useCallback(async () => {
    try {
      const statuses = ['', 'draft', 'open', 'closed', 'in_progress', 'completed', 'cancelled'];
      const counts: Record<string, number> = {};
      await Promise.all(
        statuses.map(async (s) => {
          const params = new URLSearchParams({
            page: '1',
            pageSize: '1',
            sort: '-createdAt',
          });
          if (s) params.set('status', s);
          if (workshopFilter) params.set('learnItemId', workshopFilter);
          if (searchQuery) params.set('q', searchQuery);

          const res = await fetch(`${API_BASE}/cohorts?${params.toString()}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            counts[s] = data.total ?? 0;
          }
        })
      );
      setStatusCounts(counts);
    } catch {
      // Silent — counts are non-critical
    }
  }, [accessToken, workshopFilter, searchQuery]);

  useEffect(() => {
    if (accessToken) fetchCounts();
  }, [fetchCounts, accessToken]);

  // ---------------------------------------------------------------------------
  // Status transition actions
  // ---------------------------------------------------------------------------

  const handleStatusAction = async (
    item: CohortItem,
    action: string,
    label: string
  ) => {
    try {
      const res = await fetch(`${API_BASE}/cohorts/${item.id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to ${label.toLowerCase()}`);
      }
      success(`"${item.title}" has been ${label.toLowerCase()}.`);
      fetchItems();
      fetchCounts();
    } catch (err: any) {
      showError(err?.message || `Could not ${label.toLowerCase()} "${item.title}". Please try again.`);
    }
  };

  const handleOpen = (item: CohortItem) => handleStatusAction(item, 'open', 'Opened');
  const handleClose = (item: CohortItem) => handleStatusAction(item, 'close', 'Closed');
  const handleStart = (item: CohortItem) => handleStatusAction(item, 'start', 'Started');
  const handleComplete = (item: CohortItem) => handleStatusAction(item, 'complete', 'Completed');
  const handleCancel = (item: CohortItem) => handleStatusAction(item, 'cancel', 'Cancelled');

  // ---------------------------------------------------------------------------
  // Duplicate
  // ---------------------------------------------------------------------------

  const handleDuplicate = async (item: CohortItem) => {
    try {
      const res = await fetch(`${API_BASE}/cohorts/${item.id}/duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to duplicate');
      const data = await res.json();
      success(`"${item.title}" has been duplicated.`);
      if (data.id) {
        navigate(`/admin/cohorts/${data.id}`);
      } else {
        fetchItems();
        fetchCounts();
      }
    } catch {
      showError(`Could not duplicate "${item.title}". Please try again.`);
    }
  };

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  const handleDelete = async (item: CohortItem) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete "${item.title}"? This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/cohorts/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = statusFilter !== '' || workshopFilter !== '' || searchQuery !== '';

  const clearFilters = () => {
    setStatusFilter('');
    setWorkshopFilter('');
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Cohorts</h1>
          <p className="text-sm text-stone-500 mt-1">
            Manage scheduled instances of workshops and courses
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/cohorts/new')}
          className="flex items-center gap-1.5 bg-stone-900 text-white hover:bg-stone-800 rounded-md px-4 h-9 text-sm font-medium transition"
        >
          <Plus size={16} />
          New Cohort
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1 bg-stone-100 p-0.5 rounded-lg">
          {STATUS_TABS.map(({ key, label }) => (
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
              {(statusCounts[key] ?? 0) > 0 && (
                <span className="ml-1.5 text-[10px] text-stone-400">
                  {statusCounts[key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search, workshop filter, and sort row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
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
            placeholder="Search cohorts..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 bg-white"
          />
        </div>

        {/* Workshop filter */}
        <select
          value={workshopFilter}
          onChange={(e) => {
            setWorkshopFilter(e.target.value);
            setPage(1);
          }}
          className="text-xs border border-stone-200 rounded-md px-2.5 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 max-w-[220px] truncate"
        >
          <option value="">All Workshops</option>
          {workshops.map((w) => (
            <option key={w.id} value={w.id}>
              {w.title}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as SortOption);
            setPage(1);
          }}
          className="text-xs border border-stone-200 rounded-md px-2.5 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 ml-auto"
        >
          {SORT_OPTIONS.map((opt) => (
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
        <EmptyState
          hasFilters={hasFilters}
          onClear={clearFilters}
          onCreate={() => navigate('/admin/cohorts/new')}
        />
      ) : (
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[1fr_160px_140px_80px_90px_40px] gap-3 items-center px-4 py-2.5 border-b border-stone-100 bg-stone-50/60 text-[11px] font-medium text-stone-500 uppercase tracking-wider">
            <span>Title</span>
            <span>Dates</span>
            <span>Capacity</span>
            <span>Price</span>
            <span>Status</span>
            <span />
          </div>

          {/* Rows */}
          <div className="divide-y divide-stone-100">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/admin/cohorts/${item.id}`)}
                className="grid grid-cols-1 md:grid-cols-[1fr_160px_140px_80px_90px_40px] gap-3 items-center px-4 py-3 hover:bg-stone-50 cursor-pointer transition group"
              >
                {/* Title + workshop name + status badge (mobile) */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-stone-900 truncate">
                      {item.title || 'Untitled'}
                    </p>
                    <span className="md:hidden">
                      <StatusBadge status={item.status} />
                    </span>
                  </div>
                  {item.workshopTitle && (
                    <p className="text-xs text-stone-400 mt-0.5 truncate">
                      {item.workshopTitle}
                    </p>
                  )}
                </div>

                {/* Dates */}
                <div className="text-xs text-stone-500 hidden md:block">
                  {formatDateRange(item.startAt, item.endAt)}
                </div>

                {/* Capacity */}
                <div className="text-xs text-stone-500 hidden md:block">
                  {item.capacity ? (
                    <div>
                      <span className="inline-flex items-center gap-1">
                        <UsersIcon size={12} />
                        {item.enrolledCount} / {item.capacity} enrolled
                      </span>
                      {item.waitlistCount > 0 && (
                        <span className="block text-[10px] text-amber-600 mt-0.5">
                          {item.waitlistCount} on waitlist
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <UsersIcon size={12} />
                      {item.enrolledCount > 0
                        ? `${item.enrolledCount} enrolled`
                        : 'Unlimited'}
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="text-sm text-stone-700 hidden md:block">
                  {formatPrice(item)}
                </div>

                {/* Status */}
                <div className="hidden md:block">
                  <StatusBadge status={item.status} />
                </div>

                {/* Actions */}
                <div
                  className="hidden md:block"
                  onClick={(e) => e.stopPropagation()}
                >
                  <RowActions
                    item={item}
                    onEdit={() => navigate(`/admin/cohorts/${item.id}`)}
                    onOpen={() => handleOpen(item)}
                    onClose={() => handleClose(item)}
                    onStart={() => handleStart(item)}
                    onComplete={() => handleComplete(item)}
                    onCancel={() => handleCancel(item)}
                    onDuplicate={() => handleDuplicate(item)}
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
            Showing {(page - 1) * PAGE_SIZE + 1}
            {'\u2013'}
            {Math.min(page * PAGE_SIZE, total)} of {total}
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
