import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE } from '../config/api';
import {
  Search, Filter, Users, Plus, Download, Upload, Tag, X,
  ChevronLeft, ChevronRight, Trash2, UserMinus, MoreHorizontal,
  AlertCircle, Loader2, Mail, TrendingUp, CheckSquare, Square
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Subscriber {
  _id: string;
  email: string;
  name?: string;
  tags: string[];
  source?: string;
  status: 'active' | 'unsubscribed';
  engagement?: 'highly_engaged' | 'engaged' | 'cold' | 'at_risk' | 'churned' | 'new';
  subscribedAt: string;
}

interface FetchResult {
  subscribers: Subscriber[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type BulkAction = 'add_tag' | 'remove_tag' | 'unsubscribe' | 'delete';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const ENGAGEMENT_LABELS: Record<string, string> = {
  highly_engaged: 'Highly Engaged',
  engaged: 'Engaged',
  cold: 'Cold',
  at_risk: 'At-Risk',
  churned: 'Churned',
  new: 'New',
};

const ENGAGEMENT_COLORS: Record<string, string> = {
  highly_engaged: 'bg-green-100 text-green-700',
  engaged: 'bg-blue-100 text-blue-700',
  cold: 'bg-stone-100 text-stone-600',
  at_risk: 'bg-amber-100 text-amber-700',
  churned: 'bg-red-100 text-red-700',
  new: 'bg-purple-100 text-purple-700',
};

const ENGAGEMENT_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'highly_engaged', label: 'Highly Engaged' },
  { value: 'engaged', label: 'Engaged' },
  { value: 'cold', label: 'Cold' },
  { value: 'at_risk', label: 'At-Risk' },
  { value: 'churned', label: 'Churned' },
  { value: 'new', label: 'New' },
];

const PAGE_LIMIT = 25;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SubscriberList() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const toast = useToast();

  // Data
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [tags, setTags] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [stats, setStats] = useState<{ total: number; active: number; unsubscribed: number; newThisMonth: number } | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [source, setSource] = useState('');
  const [tag, setTag] = useState('');
  const [engagement, setEngagement] = useState('');
  const [page, setPage] = useState(1);
  const [sort] = useState('subscribedAt');
  const [order] = useState<'asc' | 'desc'>('desc');

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Bulk action modals / dropdowns
  const [showAddTagDropdown, setShowAddTagDropdown] = useState(false);
  const [showRemoveTagDropdown, setShowRemoveTagDropdown] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'unsubscribe' | 'delete' | null>(null);

  // Add subscriber modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addName, setAddName] = useState('');
  const [addSource, setAddSource] = useState('manual');
  const [addLoading, setAddLoading] = useState(false);

  // ------------------------------------------------------------------
  // Debounce search
  // ------------------------------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ------------------------------------------------------------------
  // Fetch tags & sources once
  // ------------------------------------------------------------------
  useEffect(() => {
    async function loadMeta() {
      try {
        const headers: HeadersInit = { Authorization: `Bearer ${token}` };
        const [tagsRes, sourcesRes, statsRes] = await Promise.all([
          fetch(`${API_BASE}/subscribers/tags`, { headers }),
          fetch(`${API_BASE}/subscribers/sources`, { headers }),
          fetch(`${API_BASE}/subscribers/stats`, { headers }),
        ]);
        if (tagsRes.ok) setTags(await tagsRes.json());
        if (sourcesRes.ok) setSources(await sourcesRes.json());
        if (statsRes.ok) setStats(await statsRes.json());
      } catch {
        // Silently fail — filters simply won't be populated
      }
    }
    loadMeta();
  }, [token]);

  // ------------------------------------------------------------------
  // Fetch subscribers
  // ------------------------------------------------------------------
  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_LIMIT),
        search: debouncedSearch,
        status,
        source,
        tag,
        engagement,
        sort,
        order,
      });
      const res = await fetch(`${API_BASE}/subscribers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch subscribers (${res.status})`);
      const data: FetchResult = await res.json();
      setSubscribers(data.subscribers);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load subscribers');
    } finally {
      setLoading(false);
    }
  }, [token, page, debouncedSearch, status, source, tag, engagement, sort, order]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  // Clear selection when data changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [subscribers]);

  // ------------------------------------------------------------------
  // Selection helpers
  // ------------------------------------------------------------------
  const allSelected = subscribers.length > 0 && subscribers.every((s) => selectedIds.has(s._id));

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(subscribers.map((s) => s._id)));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ------------------------------------------------------------------
  // Bulk actions
  // ------------------------------------------------------------------
  async function executeBulkAction(action: BulkAction, tagName?: string) {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const body: Record<string, any> = { ids: Array.from(selectedIds), action };
      if (tagName) body.tag = tagName;

      const res = await fetch(`${API_BASE}/subscribers/bulk-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Bulk action failed');
      const data = await res.json();
      toast.success(`${data.affected} subscriber${data.affected === 1 ? '' : 's'} updated`);
      setSelectedIds(new Set());
      setConfirmAction(null);
      setShowAddTagDropdown(false);
      setShowRemoveTagDropdown(false);
      fetchSubscribers();
    } catch (err: any) {
      toast.error(err.message ?? 'Bulk action failed');
    } finally {
      setBulkLoading(false);
    }
  }

  // ------------------------------------------------------------------
  // Export
  // ------------------------------------------------------------------
  async function handleExport() {
    try {
      const res = await fetch(`${API_BASE}/subscribers/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch (err: any) {
      toast.error(err.message ?? 'Export failed');
    }
  }

  // ------------------------------------------------------------------
  // Add subscriber manually
  // ------------------------------------------------------------------
  async function handleAddSubscriber() {
    if (!addEmail.trim()) { toast.error('Email is required'); return; }
    setAddLoading(true);
    try {
      const res = await fetch(`${API_BASE}/subscribers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: addEmail.trim(),
          name: addName.trim() || undefined,
          source: addSource || 'manual',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to add subscriber');
      }
      toast.success(`${addEmail.trim()} added`);
      setShowAddModal(false);
      setAddEmail('');
      setAddName('');
      setAddSource('manual');
      fetchSubscribers();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to add subscriber');
    } finally {
      setAddLoading(false);
    }
  }

  // ------------------------------------------------------------------
  // Filter helpers
  // ------------------------------------------------------------------
  const hasActiveFilters = debouncedSearch || status !== 'all' || source || tag || engagement;

  function clearFilters() {
    setSearch('');
    setDebouncedSearch('');
    setStatus('all');
    setSource('');
    setTag('');
    setEngagement('');
    setPage(1);
  }

  // Pagination display
  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_LIMIT + 1;
  const showingTo = Math.min(page * PAGE_LIMIT, total);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* ---- Page Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-serif text-stone-800" style={{ fontFamily: 'Georgia, serif' }}>
          Subscribers
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
          <button
            onClick={() => navigate('/admin/subscribers/import')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: '#8d3038' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#7a2930')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#8d3038')}
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* ---- Stats Cards ---- */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Subscribers', value: stats.total, icon: Users, borderColor: '#78716c', accent: 'bg-stone-100 text-stone-600' },
            { label: 'Active', value: stats.active, icon: Mail, borderColor: '#16a34a', accent: 'bg-green-100 text-green-700' },
            { label: 'Unsubscribed', value: stats.unsubscribed, icon: UserMinus, borderColor: '#a8a29e', accent: 'bg-stone-100 text-stone-500' },
            { label: 'New This Month', value: stats.newThisMonth, icon: TrendingUp, borderColor: '#2563eb', accent: 'bg-blue-100 text-blue-700' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-stone-200 px-4 py-2.5 flex items-center gap-3"
              style={{ borderLeftWidth: '4px', borderLeftColor: stat.borderColor }}
            >
              <div className={`w-7 h-7 rounded-md flex items-center justify-center ${stat.accent}`}>
                <stat.icon size={14} />
              </div>
              <div>
                <p className="text-xl font-semibold text-stone-900 leading-tight">{stat.value.toLocaleString()}</p>
                <p className="text-[11px] text-stone-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- Error Banner ---- */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ---- Filter Bar ---- */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email or name..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-200 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#8d3038]/20 focus:border-[#8d3038]"
            />
          </div>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#8d3038]/20 focus:border-[#8d3038]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="unsubscribed">Unsubscribed</option>
          </select>

          {/* Source */}
          <select
            value={source}
            onChange={(e) => { setSource(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#8d3038]/20 focus:border-[#8d3038]"
          >
            <option value="">All Sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Tag */}
          <select
            value={tag}
            onChange={(e) => { setTag(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#8d3038]/20 focus:border-[#8d3038]"
          >
            <option value="">All Tags</option>
            {tags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Engagement */}
          <select
            value={engagement}
            onChange={(e) => { setEngagement(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#8d3038]/20 focus:border-[#8d3038]"
          >
            {ENGAGEMENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.value === '' ? 'All Engagement' : opt.label}
              </option>
            ))}
          </select>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ---- Bulk Action Bar ---- */}
      {selectedIds.size > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-stone-700">
              {selectedIds.size} selected
            </span>

            <div className="h-5 w-px bg-stone-200" />

            {/* Add Tag */}
            <div className="relative">
              <button
                onClick={() => { setShowAddTagDropdown(!showAddTagDropdown); setShowRemoveTagDropdown(false); }}
                disabled={bulkLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                <Tag className="w-3.5 h-3.5" />
                Add Tag
              </button>
              {showAddTagDropdown && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg border border-stone-200 shadow-lg z-20 py-1 max-h-60 overflow-y-auto">
                  {tags.length === 0 && (
                    <div className="px-3 py-2 text-sm text-stone-400">No tags available</div>
                  )}
                  {tags.map((t) => (
                    <button
                      key={t}
                      onClick={() => executeBulkAction('add_tag', t)}
                      className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Remove Tag */}
            <div className="relative">
              <button
                onClick={() => { setShowRemoveTagDropdown(!showRemoveTagDropdown); setShowAddTagDropdown(false); }}
                disabled={bulkLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                <Tag className="w-3.5 h-3.5" />
                Remove Tag
              </button>
              {showRemoveTagDropdown && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg border border-stone-200 shadow-lg z-20 py-1 max-h-60 overflow-y-auto">
                  {tags.length === 0 && (
                    <div className="px-3 py-2 text-sm text-stone-400">No tags available</div>
                  )}
                  {tags.map((t) => (
                    <button
                      key={t}
                      onClick={() => executeBulkAction('remove_tag', t)}
                      className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Unsubscribe */}
            <button
              onClick={() => setConfirmAction('unsubscribe')}
              disabled={bulkLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              <UserMinus className="w-3.5 h-3.5" />
              Unsubscribe
            </button>

            {/* Delete */}
            <button
              onClick={() => setConfirmAction('delete')}
              disabled={bulkLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>

            {bulkLoading && <Loader2 className="w-4 h-4 animate-spin text-stone-400" />}
          </div>
        </div>
      )}

      {/* ---- Confirmation Modal ---- */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-3">
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  confirmAction === 'delete' ? 'bg-red-100' : 'bg-amber-100'
                }`}
              >
                {confirmAction === 'delete' ? (
                  <Trash2 className="w-5 h-5 text-red-600" />
                ) : (
                  <UserMinus className="w-5 h-5 text-amber-600" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-stone-800">
                  {confirmAction === 'delete' ? 'Delete subscribers' : 'Unsubscribe subscribers'}
                </h3>
                <p className="mt-1 text-sm text-stone-500">
                  {confirmAction === 'delete'
                    ? `Are you sure you want to permanently delete ${selectedIds.size} subscriber${selectedIds.size === 1 ? '' : 's'}? This action cannot be undone.`
                    : `Are you sure you want to unsubscribe ${selectedIds.size} subscriber${selectedIds.size === 1 ? '' : 's'}? They will no longer receive emails.`}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={bulkLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => executeBulkAction(confirmAction)}
                disabled={bulkLoading}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                  confirmAction === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {bulkLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {confirmAction === 'delete' ? 'Delete' : 'Unsubscribe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Data Table ---- */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          /* Skeleton rows */
          <div className="divide-y divide-stone-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4 animate-pulse">
                <div className="w-5 h-5 bg-stone-200 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-stone-200 rounded w-1/3" />
                  <div className="h-3 bg-stone-100 rounded w-1/4" />
                </div>
                <div className="h-4 bg-stone-100 rounded w-16" />
                <div className="h-4 bg-stone-100 rounded w-16" />
                <div className="h-4 bg-stone-100 rounded w-20" />
                <div className="h-4 bg-stone-100 rounded w-20" />
              </div>
            ))}
          </div>
        ) : subscribers.length === 0 && !error ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-stone-400" />
            </div>
            <h3 className="text-lg font-semibold text-stone-800 mb-1">No subscribers yet</h3>
            <p className="text-sm text-stone-500 mb-6">
              Import your first list to get started with email campaigns.
            </p>
            <button
              onClick={() => navigate('/admin/subscribers/import')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: '#8d3038' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#7a2930')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#8d3038')}
            >
              <Upload className="w-4 h-4" />
              Import your first list
            </button>
          </div>
        ) : (
          /* Table */
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-stone-50/80">
                  <th className="w-12 px-4 py-3 text-left">
                    <button onClick={toggleAll} className="text-stone-400 hover:text-stone-600">
                      {allSelected ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Engagement
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Subscribed
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {subscribers.map((sub) => (
                  <tr
                    key={sub._id}
                    className={`hover:bg-stone-50/60 transition-colors ${
                      selectedIds.has(sub._id) ? 'bg-stone-50' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleOne(sub._id)}
                        className="text-stone-400 hover:text-stone-600"
                      >
                        {selectedIds.has(sub._id) ? (
                          <CheckSquare className="w-4 h-4 text-[#8d3038]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/admin/subscribers/${sub._id}`)}
                        className="text-sm font-medium text-stone-800 hover:text-[#8d3038] transition-colors text-left"
                      >
                        {sub.email}
                      </button>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3 text-sm text-stone-600">
                      {sub.name || <span className="text-stone-300">&mdash;</span>}
                    </td>

                    {/* Tags */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {sub.tags.length > 0 ? (
                          sub.tags.map((t) => (
                            <span
                              key={t}
                              className="inline-block px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[11px] font-medium"
                            >
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="text-stone-300 text-sm">&mdash;</span>
                        )}
                      </div>
                    </td>

                    {/* Source */}
                    <td className="px-4 py-3 text-sm text-stone-600">
                      {sub.source || <span className="text-stone-300">&mdash;</span>}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                          sub.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {sub.status === 'active' ? 'Active' : 'Unsubscribed'}
                      </span>
                    </td>

                    {/* Engagement */}
                    <td className="px-4 py-3">
                      {sub.engagement ? (
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                            ENGAGEMENT_COLORS[sub.engagement] ?? 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {ENGAGEMENT_LABELS[sub.engagement] ?? sub.engagement}
                        </span>
                      ) : (
                        <span className="text-stone-300 text-sm">&mdash;</span>
                      )}
                    </td>

                    {/* Subscribed */}
                    <td className="px-4 py-3 text-sm text-stone-500 whitespace-nowrap">
                      {formatDate(sub.subscribedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ---- Pagination ---- */}
        {!loading && subscribers.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100">
            <span className="text-sm text-stone-500">
              Showing {showingFrom}-{showingTo} of {total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>
              <span className="text-sm text-stone-500 px-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---- Add Subscriber Modal ---- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-stone-800">Add Subscriber</h3>
              <button onClick={() => setShowAddModal(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#8d3038]/20 focus:border-[#8d3038]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Name</label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Full name (optional)"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#8d3038]/20 focus:border-[#8d3038]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Source</label>
                <input
                  type="text"
                  value={addSource}
                  onChange={(e) => setAddSource(e.target.value)}
                  placeholder="e.g. manual, referral, event"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#8d3038]/20 focus:border-[#8d3038]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                disabled={addLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSubscriber}
                disabled={addLoading || !addEmail.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#8d3038' }}
              >
                {addLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Subscriber
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click-away listener for tag dropdowns */}
      {(showAddTagDropdown || showRemoveTagDropdown) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setShowAddTagDropdown(false);
            setShowRemoveTagDropdown(false);
          }}
        />
      )}
    </div>
  );
}
