import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';
import {
  Users,
  UserPlus,
  Search,
  Loader2,
  X,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ClientStatus = 'prospect' | 'discovery' | 'active' | 'paused' | 'completed';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: ClientStatus;
  source: string | null;
  currentPackageId: string | null;
  packageName: string | null;
  goals: string | null;
  startDate: string | null;
  sessionCount: number;
  nextSessionDate: string | null;
  lastSessionDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ClientStats {
  total: number;
  prospect: number;
  discovery: number;
  active: number;
  paused: number;
  completed: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

const STATUS_BADGE_STYLES: Record<ClientStatus, string> = {
  prospect: 'bg-amber-100 text-amber-700',
  discovery: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-stone-100 text-stone-600',
  completed: 'bg-emerald-100 text-emerald-700',
};

const STATUS_LABELS: Record<ClientStatus, string> = {
  prospect: 'Prospect',
  discovery: 'Discovery',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
};

const STATUS_TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'prospect', label: 'Prospect' },
  { key: 'discovery', label: 'Discovery' },
  { key: 'active', label: 'Active' },
  { key: 'paused', label: 'Paused' },
  { key: 'completed', label: 'Completed' },
];

const SOURCE_OPTIONS = [
  { value: 'social_dm', label: 'Social DM' },
  { value: 'website_form', label: 'Website Form' },
  { value: 'referral', label: 'Referral' },
  { value: 'other', label: 'Other' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateNice(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  icon: Icon,
  label,
  value,
  borderColor,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  borderColor: string;
  accent: string;
}) {
  return (
    <div
      className="bg-white rounded-lg border border-stone-200 shadow-sm p-4 flex items-center gap-4"
      style={{ borderLeftWidth: '4px', borderLeftColor: borderColor }}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-semibold text-stone-900">{value}</p>
        <p className="text-xs text-stone-500">{label}</p>
      </div>
    </div>
  );
}

function ClientStatusBadge({ status }: { status: ClientStatus }) {
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Modal Overlay
// ---------------------------------------------------------------------------

function ModalOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-stone-100 rounded-lg transition-colors"
        >
          <X size={16} className="text-stone-400" />
        </button>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ClientsManager() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  // Data
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<ClientStats>({
    total: 0,
    prospect: 0,
    discovery: 0,
    active: 0,
    paused: 0,
    completed: 0,
  });
  const [total, setTotal] = useState(0);

  // UI state
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Create modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'social_dm',
    notes: '',
  });
  const [createSaving, setCreateSaving] = useState(false);

  // =========================================================================
  // DEBOUNCED SEARCH
  // =========================================================================
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

  // =========================================================================
  // FETCH CLIENTS
  // =========================================================================
  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (debouncedSearch) params.set('q', debouncedSearch);
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));

      const res = await fetch(`${API_BASE}/clients?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to load clients');
      const data = await res.json();
      setClients(data.clients || []);
      setTotal(data.total ?? 0);
      setStats(data.stats || {
        total: 0,
        prospect: 0,
        discovery: 0,
        active: 0,
        paused: 0,
        completed: 0,
      });
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [accessToken, statusFilter, debouncedSearch, page]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // =========================================================================
  // CREATE CLIENT
  // =========================================================================
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSaving(true);
    try {
      const res = await fetch(`${API_BASE}/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: createForm.name,
          email: createForm.email,
          phone: createForm.phone || undefined,
          source: createForm.source,
          notes: createForm.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to create client');
      setCreateModalOpen(false);
      setCreateForm({
        name: '',
        email: '',
        phone: '',
        source: 'social_dm',
        notes: '',
      });
      fetchClients();
    } catch {
      // silently handle
    } finally {
      setCreateSaving(false);
    }
  };

  // =========================================================================
  // DELETE CLIENT
  // =========================================================================
  const handleDeleteClient = async (id: string, clientName: string) => {
    if (!window.confirm(`Delete client "${clientName}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`${API_BASE}/clients/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to delete client');
      fetchClients();
    } catch {
      // silently handle
    } finally {
      setDeleting(null);
    }
  };

  // =========================================================================
  // PAGINATION COMPUTED
  // =========================================================================
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, total);

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-serif font-semibold text-stone-900">Clients</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Manage your coaching clients and prospects
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="text-white rounded-lg px-4 h-9 text-sm font-medium transition-colors inline-flex items-center gap-1.5 hover:opacity-90"
          style={{ backgroundColor: '#8d3038' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#6b2228')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#8d3038')}
        >
          <UserPlus size={16} />
          Add Client
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Clients"
          value={stats.total}
          borderColor="#78716c"
          accent="bg-stone-100 text-stone-600"
        />
        <StatCard
          icon={UserCheck}
          label="Active"
          value={stats.active}
          borderColor="#16a34a"
          accent="bg-green-100 text-green-700"
        />
        <StatCard
          icon={Sparkles}
          label="Prospects"
          value={stats.prospect}
          borderColor="#d97706"
          accent="bg-amber-100 text-amber-700"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={stats.completed}
          borderColor="#059669"
          accent="bg-emerald-100 text-emerald-700"
        />
      </div>

      {/* Action bar: search + status filter tabs */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full bg-white border border-stone-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
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

        {/* Status filter tabs */}
        <div className="flex items-center gap-1 border-b border-stone-200">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setStatusFilter(tab.key);
                setPage(1);
              }}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                statusFilter === tab.key
                  ? 'text-stone-900'
                  : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
              }`}
              style={statusFilter === tab.key ? { borderBottomColor: '#8d3038', color: '#8d3038' } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Client list table */}
      <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-stone-400 mb-3" />
            <p className="text-sm text-stone-500">Loading clients...</p>
          </div>
        ) : clients.length === 0 && !debouncedSearch && statusFilter === 'all' ? (
          /* Empty state — no clients at all */
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-4">
              <Users size={28} className="text-stone-400" />
            </div>
            <h3 className="text-lg font-semibold text-stone-800 mb-1">No clients yet</h3>
            <p className="text-sm text-stone-500 mb-4">
              Start building your coaching practice by adding your first client.
            </p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors inline-flex items-center gap-1.5"
              style={{ backgroundColor: '#8d3038' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#6b2228')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#8d3038')}
            >
              <UserPlus size={16} />
              Add your first client
            </button>
          </div>
        ) : clients.length === 0 ? (
          /* Empty state — filters returned nothing */
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-4">
              <Search size={28} className="text-stone-400" />
            </div>
            <h3 className="text-lg font-semibold text-stone-800 mb-1">No clients match your filters</h3>
            <p className="text-sm text-stone-500">
              Try adjusting your search or status filter.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-stone-50/80">
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Package
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Sessions
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Next Session
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {clients.map((client) => (
                    <tr
                      key={client.id}
                      onClick={() => navigate(`/admin/coaching/clients/${client.id}`)}
                      className="hover:bg-stone-50/60 transition-colors cursor-pointer"
                    >
                      {/* Name + email */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium text-stone-600">
                              {client.name ? client.name.charAt(0).toUpperCase() : '?'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-stone-800 truncate">
                              {client.name}
                            </p>
                            <p className="text-xs text-stone-500 truncate">
                              {client.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3">
                        <ClientStatusBadge status={client.status} />
                      </td>

                      {/* Package */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-stone-600">
                          {client.packageName || '\u2014'}
                        </span>
                      </td>

                      {/* Sessions */}
                      <td className="px-4 py-3 text-sm text-stone-600">
                        {client.sessionCount}
                      </td>

                      {/* Next session */}
                      <td className="px-4 py-3">
                        {client.nextSessionDate ? (
                          <span className="text-sm text-stone-700">
                            {formatDateNice(client.nextSessionDate)}
                          </span>
                        ) : (
                          <span className="text-sm text-stone-400">None scheduled</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => navigate(`/admin/coaching/clients/${client.id}`)}
                            className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors"
                            title="View client"
                          >
                            <Eye size={14} className="text-stone-500" />
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id, client.name)}
                            disabled={deleting === client.id}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete client"
                          >
                            {deleting === client.id ? (
                              <Loader2 size={14} className="animate-spin text-stone-400" />
                            ) : (
                              <Trash2 size={14} className="text-red-400" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100">
                <span className="text-sm text-stone-500">
                  Showing {showingFrom}&ndash;{showingTo} of {total}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
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
          </>
        )}
      </div>

      {/* Add Client Modal */}
      {createModalOpen && (
        <ModalOverlay onClose={() => setCreateModalOpen(false)}>
          <form onSubmit={handleCreateClient} className="space-y-4">
            <h2 className="text-lg font-serif font-semibold text-stone-900 mb-4">Add Client</h2>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="client@email.com"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={createForm.phone}
                onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Optional"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Source
              </label>
              <select
                value={createForm.source}
                onChange={(e) => setCreateForm((f) => ({ ...f, source: e.target.value }))}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 bg-white"
              >
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Notes
              </label>
              <textarea
                value={createForm.notes}
                onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                placeholder="Any initial notes about this client..."
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createSaving}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors inline-flex items-center gap-1.5 disabled:opacity-60"
                style={{ backgroundColor: '#8d3038' }}
                onMouseEnter={(e) => !createSaving && (e.currentTarget.style.backgroundColor = '#6b2228')}
                onMouseLeave={(e) => !createSaving && (e.currentTarget.style.backgroundColor = '#8d3038')}
              >
                {createSaving && <Loader2 size={14} className="animate-spin" />}
                Save
              </button>
            </div>
          </form>
        </ModalOverlay>
      )}
    </div>
  );
}
