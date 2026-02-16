import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';
import {
  Tag,
  Plus,
  Search,
  X,
  MoreHorizontal,
  Percent,
  DollarSign,
  Truck,
  Copy,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Users,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Gift,
  TrendingUp,
  Hash,
  AlertCircle,
  Loader2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DiscountType = 'percentage' | 'fixed_amount' | 'free_shipping';
type ApplicableTo = 'all' | 'specific_products' | 'specific_categories';
type CodeStatus = 'active' | 'scheduled' | 'expired' | 'inactive';

interface DiscountCode {
  id: string;
  code: string;
  name: string;
  type: DiscountType;
  value: number;
  currency: string;
  minOrderAmount: number | null;
  maxDiscountAmount: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  usageLimit: number | null;
  usageCount: number;
  perCustomerLimit: number;
  firstTimeOnly: boolean;
  applicableTo: ApplicableTo;
  productIds: string[];
  categories: string[];
  stripeCouponId: string | null;
  stripePromotionCodeId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Stats {
  totalActive: number;
  totalUsage: number;
  totalCodes: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25;

const EMPTY_FORM: Partial<DiscountCode> = {
  code: '',
  name: '',
  type: 'percentage',
  value: 0,
  currency: 'AUD',
  minOrderAmount: null,
  maxDiscountAmount: null,
  startsAt: null,
  expiresAt: null,
  usageLimit: null,
  usageCount: 0,
  perCustomerLimit: 1,
  firstTimeOnly: false,
  applicableTo: 'all',
  productIds: [],
  categories: [],
};

const CATEGORY_OPTIONS = [
  'Earrings',
  'Brooches',
  'Necklaces',
  'Prints',
  'Originals',
  'Mixed Media',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateForInput(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function deriveStatus(code: DiscountCode): CodeStatus {
  if (!code.active) return 'inactive';
  const now = new Date();
  if (code.startsAt && new Date(code.startsAt) > now) return 'scheduled';
  if (code.expiresAt && new Date(code.expiresAt) < now) return 'expired';
  return 'active';
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: CodeStatus }) {
  const styles: Record<CodeStatus, string> = {
    active: 'bg-green-100 text-green-700',
    scheduled: 'bg-blue-100 text-blue-700',
    expired: 'bg-red-100 text-red-700',
    inactive: 'bg-stone-100 text-stone-500',
  };
  const labels: Record<CodeStatus, string> = {
    active: 'Active',
    scheduled: 'Scheduled',
    expired: 'Expired',
    inactive: 'Inactive',
  };
  return (
    <span
      className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function TypeBadge({ code }: { code: DiscountCode }) {
  if (code.type === 'free_shipping') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
        <Truck size={11} />
        FREE SHIPPING
      </span>
    );
  }
  if (code.type === 'percentage') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
        <Percent size={11} />
        {code.value}% OFF
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
      <DollarSign size={11} />
      ${code.value.toFixed(2)} OFF
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-stone-200 p-4 flex items-center gap-4">
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

function RowActionsMenu({
  code,
  onToggle,
  onDuplicate,
  onEdit,
  onDelete,
}: {
  code: DiscountCode;
  onToggle: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
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
          <button
            onClick={() => {
              onToggle();
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex items-center gap-2"
          >
            {code.active ? (
              <>
                <ToggleLeft size={14} /> Deactivate
              </>
            ) : (
              <>
                <ToggleRight size={14} /> Activate
              </>
            )}
          </button>
          <button
            onClick={() => {
              onDuplicate();
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex items-center gap-2"
          >
            <Copy size={14} /> Duplicate
          </button>
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

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PromotionsManager() {
  const { accessToken } = useAuth();

  // Data
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [stats, setStats] = useState<Stats>({ totalActive: 0, totalUsage: 0, totalCodes: 0 });
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);
  const [form, setForm] = useState<Partial<DiscountCode>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<DiscountCode | null>(null);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
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

  const fetchCodes = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(PAGE_SIZE));
        if (statusFilter) params.set('status', statusFilter);
        if (typeFilter) params.set('type', typeFilter);
        if (debouncedSearch) params.set('search', debouncedSearch);

        const res = await fetch(`${API_BASE}/promotions?${params}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) throw new Error('Failed to load promotions');

        const data = await res.json();
        setCodes(data.codes || []);
        setStats(data.stats || { totalActive: 0, totalUsage: 0, totalCodes: 0 });
        setPagination(
          data.pagination || { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 }
        );
      } catch {
        showToast('error', 'Could not load promotions. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [accessToken, statusFilter, typeFilter, debouncedSearch]
  );

  useEffect(() => {
    fetchCodes(1);
  }, [fetchCodes]);

  // ---------- Form helpers ----------

  const updateForm = (updates: Partial<DiscountCode>) => {
    setForm((prev) => ({ ...prev, ...updates }));
    // Clear relevant errors
    const clearedErrors = { ...formErrors };
    Object.keys(updates).forEach((key) => delete clearedErrors[key]);
    setFormErrors(clearedErrors);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.code?.trim()) {
      errors.code = 'Code is required';
    } else if (!/^[A-Z0-9]+$/.test(form.code.trim())) {
      errors.code = 'Only letters and numbers allowed';
    } else if (form.code.trim().length < 3) {
      errors.code = 'Code must be at least 3 characters';
    }

    if (!form.name?.trim()) {
      errors.name = 'Name is required';
    }

    if (form.type !== 'free_shipping') {
      if (!form.value || form.value <= 0) {
        errors.value = 'Value must be greater than 0';
      }
      if (form.type === 'percentage' && (form.value || 0) > 100) {
        errors.value = 'Percentage cannot exceed 100';
      }
    }

    if (form.startsAt && form.expiresAt && new Date(form.startsAt) >= new Date(form.expiresAt)) {
      errors.expiresAt = 'End date must be after start date';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openCreateModal = () => {
    setEditingCode(null);
    setForm({ ...EMPTY_FORM, code: generateCode() });
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (code: DiscountCode) => {
    setEditingCode(code);
    setForm({
      code: code.code,
      name: code.name,
      type: code.type,
      value: code.value,
      currency: code.currency,
      minOrderAmount: code.minOrderAmount,
      maxDiscountAmount: code.maxDiscountAmount,
      startsAt: code.startsAt,
      expiresAt: code.expiresAt,
      usageLimit: code.usageLimit,
      perCustomerLimit: code.perCustomerLimit,
      firstTimeOnly: code.firstTimeOnly,
      applicableTo: code.applicableTo,
      productIds: code.productIds || [],
      categories: code.categories || [],
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // ---------- CRUD ----------

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = {
        code: form.code?.trim().toUpperCase(),
        name: form.name?.trim(),
        type: form.type,
        value: form.type === 'free_shipping' ? 0 : form.value,
        currency: form.currency || 'AUD',
        minOrderAmount: form.minOrderAmount || null,
        maxDiscountAmount: form.maxDiscountAmount || null,
        startsAt: form.startsAt || null,
        expiresAt: form.expiresAt || null,
        usageLimit: form.usageLimit || null,
        perCustomerLimit: form.perCustomerLimit || 1,
        firstTimeOnly: form.firstTimeOnly || false,
        applicableTo: form.applicableTo || 'all',
        productIds: form.productIds || [],
        categories: form.categories || [],
      };

      const url = editingCode
        ? `${API_BASE}/promotions/${editingCode.id}`
        : `${API_BASE}/promotions`;

      const res = await fetch(url, {
        method: editingCode ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Save failed');
      }

      showToast('success', editingCode ? 'Promotion updated.' : 'Promotion created.');
      setModalOpen(false);
      fetchCodes(pagination.page);
    } catch (err: any) {
      showToast('error', err.message || 'Could not save promotion.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (code: DiscountCode) => {
    try {
      const res = await fetch(`${API_BASE}/promotions/${code.id}/toggle`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error();
      showToast('success', code.active ? `"${code.code}" deactivated.` : `"${code.code}" activated.`);
      fetchCodes(pagination.page);
    } catch {
      showToast('error', 'Could not toggle promotion status.');
    }
  };

  const handleDuplicate = async (code: DiscountCode) => {
    try {
      const res = await fetch(`${API_BASE}/promotions/${code.id}/duplicate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error();
      showToast('success', `"${code.code}" duplicated.`);
      fetchCodes(pagination.page);
    } catch {
      showToast('error', 'Could not duplicate promotion.');
    }
  };

  const handleDelete = async (code: DiscountCode) => {
    try {
      const res = await fetch(`${API_BASE}/promotions/${code.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Delete failed');
      }
      showToast('success', `"${code.code}" deleted.`);
      setConfirmDelete(null);
      fetchCodes(pagination.page);
    } catch (err: any) {
      showToast('error', err.message || 'Could not delete promotion.');
    }
  };

  // ---------- Status tabs ----------

  const statusTabs = [
    { key: '', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'expired', label: 'Expired' },
    { key: 'inactive', label: 'Inactive' },
  ];

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'percentage', label: 'Percentage' },
    { value: 'fixed_amount', label: 'Fixed Amount' },
    { value: 'free_shipping', label: 'Free Shipping' },
  ];

  // ---------- Render ----------

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Promotions</h1>
          <p className="text-sm text-stone-500 mt-0.5">Manage discount codes and promotional offers</p>
        </div>
        <button
          onClick={openCreateModal}
          className="text-white hover:opacity-90 rounded-md px-4 h-9 text-sm font-medium transition-colors inline-flex items-center gap-1.5"
          style={{ backgroundColor: '#8d3038' }}
        >
          <Plus size={16} />
          Create Code
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={ToggleRight}
          label="Active Codes"
          value={stats.totalActive}
          accent="bg-green-100 text-green-700"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Redemptions"
          value={stats.totalUsage}
          accent="bg-blue-100 text-blue-700"
        />
        <StatCard
          icon={Tag}
          label="Total Codes"
          value={stats.totalCodes}
          accent="bg-stone-100 text-stone-600"
        />
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-stone-200">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              statusFilter === tab.key
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + type filter */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by code or name..."
            className="w-full bg-white border border-stone-200 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
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

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-white border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
        >
          {typeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <span className="text-sm text-stone-400 ml-auto">
          {pagination.total} code{pagination.total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-stone-500 text-sm">Loading promotions...</p>
          </div>
        ) : codes.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Gift size={24} className="text-stone-400" />
            </div>
            <p className="text-stone-600 font-medium">
              {debouncedSearch || statusFilter || typeFilter
                ? 'No promotions match your filters'
                : 'Create your first discount code'}
            </p>
            <p className="text-sm text-stone-400 mt-1">
              {debouncedSearch || statusFilter || typeFilter
                ? 'Try adjusting your search or filters.'
                : 'Discount codes help drive sales and reward loyal customers.'}
            </p>
            {!(debouncedSearch || statusFilter || typeFilter) && (
              <button
                onClick={openCreateModal}
                className="mt-4 text-white hover:opacity-90 rounded-md px-4 py-2 text-sm font-medium transition-colors"
                style={{ backgroundColor: '#8d3038' }}
              >
                Create Code
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
                      Code
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Discount
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-2.5 w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {codes.map((code) => {
                    const status = deriveStatus(code);
                    return (
                      <tr
                        key={code.id}
                        className={`hover:bg-stone-50 transition ${
                          !code.active ? 'opacity-60' : ''
                        }`}
                      >
                        {/* Code */}
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-semibold text-stone-900 tracking-wide uppercase">
                            {code.code}
                          </span>
                        </td>

                        {/* Name */}
                        <td className="px-4 py-3">
                          <span className="text-sm text-stone-600 line-clamp-1">
                            {code.name || <span className="text-stone-300">&mdash;</span>}
                          </span>
                        </td>

                        {/* Type + Value */}
                        <td className="px-4 py-3">
                          <TypeBadge code={code} />
                        </td>

                        {/* Usage */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-stone-700 font-medium">
                              {code.usageCount}
                            </span>
                            <span className="text-sm text-stone-400">/</span>
                            <span className="text-sm text-stone-500">
                              {code.usageLimit != null ? code.usageLimit : '\u221E'}
                            </span>
                          </div>
                          {code.usageLimit != null && code.usageLimit > 0 && (
                            <div className="mt-1 w-16 h-1 bg-stone-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, (code.usageCount / code.usageLimit) * 100)}%`,
                                  backgroundColor:
                                    code.usageCount >= code.usageLimit ? '#ef4444' : '#8d3038',
                                }}
                              />
                            </div>
                          )}
                        </td>

                        {/* Dates */}
                        <td className="px-4 py-3">
                          {code.startsAt || code.expiresAt ? (
                            <div className="text-xs text-stone-500 space-y-0.5">
                              {code.startsAt && (
                                <div className="flex items-center gap-1">
                                  <Calendar size={11} className="text-stone-400" />
                                  <span>{formatDate(code.startsAt)}</span>
                                </div>
                              )}
                              {code.expiresAt && (
                                <div className="flex items-center gap-1">
                                  <span className="text-stone-300 ml-3">&rarr;</span>
                                  <span>{formatDate(code.expiresAt)}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-stone-400">No expiry</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <StatusBadge status={status} />
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <RowActionsMenu
                            code={code}
                            onEdit={() => openEditModal(code)}
                            onToggle={() => handleToggle(code)}
                            onDuplicate={() => handleDuplicate(code)}
                            onDelete={() => setConfirmDelete(code)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100">
                <p className="text-sm text-stone-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1}&ndash;
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fetchCodes(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-2 rounded hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from(
                    { length: Math.min(pagination.totalPages, 7) },
                    (_, i) => {
                      let page: number;
                      if (pagination.totalPages <= 7) {
                        page = i + 1;
                      } else if (pagination.page <= 4) {
                        page = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 3) {
                        page = pagination.totalPages - 6 + i;
                      } else {
                        page = pagination.page - 3 + i;
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => fetchCodes(page)}
                          className={`w-8 h-8 rounded text-sm transition ${
                            pagination.page === page
                              ? 'bg-stone-900 text-white'
                              : 'hover:bg-stone-100 text-stone-600'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    }
                  )}
                  <button
                    onClick={() => fetchCodes(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
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

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-stone-800">Delete promotion</h3>
                <p className="mt-1 text-sm text-stone-500">
                  Are you sure you want to permanently delete the code{' '}
                  <span className="font-mono font-semibold text-stone-700">
                    {confirmDelete.code}
                  </span>
                  ? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Slide-over Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !saving && setModalOpen(false)}
          />

          {/* Panel */}
          <div className="relative bg-white w-full max-w-lg shadow-xl overflow-y-auto">
            {/* Panel header */}
            <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-stone-900">
                {editingCode ? 'Edit Promotion' : 'Create Promotion'}
              </h2>
              <button
                onClick={() => !saving && setModalOpen(false)}
                className="p-1.5 hover:bg-stone-100 rounded transition"
              >
                <X size={18} className="text-stone-500" />
              </button>
            </div>

            {/* Panel body */}
            <div className="px-6 py-6 space-y-6">
              {/* Code */}
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                  Discount Code *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.code || ''}
                    onChange={(e) =>
                      updateForm({
                        code: e.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, ''),
                      })
                    }
                    placeholder="e.g. SUMMER20"
                    className={`flex-1 font-mono uppercase tracking-wider bg-white border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 ${
                      formErrors.code ? 'border-red-300' : 'border-stone-200'
                    }`}
                    maxLength={20}
                  />
                  <button
                    type="button"
                    onClick={() => updateForm({ code: generateCode() })}
                    className="px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-md text-sm text-stone-600 font-medium transition whitespace-nowrap"
                  >
                    Generate
                  </button>
                </div>
                {formErrors.code && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {formErrors.code}
                  </p>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                  Name / Description *
                </label>
                <input
                  type="text"
                  value={form.name || ''}
                  onChange={(e) => updateForm({ name: e.target.value })}
                  placeholder="e.g. Summer Sale 20% Off"
                  className={`w-full bg-white border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 ${
                    formErrors.name ? 'border-red-300' : 'border-stone-200'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {formErrors.name}
                  </p>
                )}
              </div>

              {/* Type selector */}
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                  Discount Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      type: 'percentage' as DiscountType,
                      icon: Percent,
                      label: 'Percentage',
                    },
                    {
                      type: 'fixed_amount' as DiscountType,
                      icon: DollarSign,
                      label: 'Fixed Amount',
                    },
                    {
                      type: 'free_shipping' as DiscountType,
                      icon: Truck,
                      label: 'Free Shipping',
                    },
                  ].map(({ type, icon: Icon, label }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateForm({ type })}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition text-sm font-medium ${
                        form.type === type
                          ? 'border-stone-900 bg-stone-50 text-stone-900'
                          : 'border-stone-200 text-stone-500 hover:border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="text-xs">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Value + Currency row */}
              {form.type !== 'free_shipping' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                      {form.type === 'percentage' ? 'Percentage (%)' : 'Amount'}
                    </label>
                    <div className="relative">
                      {form.type === 'percentage' ? (
                        <Percent
                          size={14}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
                        />
                      ) : (
                        <DollarSign
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                        />
                      )}
                      <input
                        type="number"
                        min={0}
                        max={form.type === 'percentage' ? 100 : undefined}
                        step={form.type === 'percentage' ? 1 : 0.01}
                        value={form.value || ''}
                        onChange={(e) =>
                          updateForm({ value: parseFloat(e.target.value) || 0 })
                        }
                        className={`w-full bg-white border rounded-md py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 ${
                          form.type === 'percentage' ? 'px-3 pr-8' : 'pl-8 pr-3'
                        } ${formErrors.value ? 'border-red-300' : 'border-stone-200'}`}
                      />
                    </div>
                    {formErrors.value && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {formErrors.value}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                      Currency
                    </label>
                    <select
                      value={form.currency || 'AUD'}
                      onChange={(e) => updateForm({ currency: e.target.value })}
                      className="w-full bg-white border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                    >
                      <option value="AUD">AUD</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Minimum order + Max discount row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                    Min. Order Amount
                  </label>
                  <div className="relative">
                    <DollarSign
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.minOrderAmount ?? ''}
                      onChange={(e) =>
                        updateForm({
                          minOrderAmount: e.target.value
                            ? parseFloat(e.target.value)
                            : null,
                        })
                      }
                      placeholder="No minimum"
                      className="w-full bg-white border border-stone-200 rounded-md pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                    />
                  </div>
                </div>
                {form.type === 'percentage' && (
                  <div>
                    <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                      Max Discount Cap
                    </label>
                    <div className="relative">
                      <DollarSign
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                      />
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={form.maxDiscountAmount ?? ''}
                        onChange={(e) =>
                          updateForm({
                            maxDiscountAmount: e.target.value
                              ? parseFloat(e.target.value)
                              : null,
                          })
                        }
                        placeholder="No cap"
                        className="w-full bg-white border border-stone-200 rounded-md pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formatDateForInput(form.startsAt || null)}
                    onChange={(e) =>
                      updateForm({
                        startsAt: e.target.value
                          ? new Date(e.target.value + 'T00:00:00').toISOString()
                          : null,
                      })
                    }
                    className="w-full bg-white border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formatDateForInput(form.expiresAt || null)}
                    onChange={(e) =>
                      updateForm({
                        expiresAt: e.target.value
                          ? new Date(e.target.value + 'T23:59:59').toISOString()
                          : null,
                      })
                    }
                    className={`w-full bg-white border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 ${
                      formErrors.expiresAt ? 'border-red-300' : 'border-stone-200'
                    }`}
                  />
                  {formErrors.expiresAt && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {formErrors.expiresAt}
                    </p>
                  )}
                </div>
              </div>

              {/* Usage limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                    Total Usage Limit
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={form.usageLimit ?? ''}
                    onChange={(e) =>
                      updateForm({
                        usageLimit: e.target.value
                          ? parseInt(e.target.value, 10)
                          : null,
                      })
                    }
                    placeholder="Unlimited"
                    className="w-full bg-white border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                    Per Customer Limit
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={form.perCustomerLimit ?? 1}
                    onChange={(e) =>
                      updateForm({
                        perCustomerLimit: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full bg-white border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                  />
                </div>
              </div>

              {/* First-time only toggle */}
              <div className="flex items-center justify-between py-3 px-4 bg-stone-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-stone-700">
                    First-time customers only
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Only allow customers who have never purchased before
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateForm({ firstTimeOnly: !form.firstTimeOnly })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    form.firstTimeOnly ? 'bg-stone-900' : 'bg-stone-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      form.firstTimeOnly ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Applicable to */}
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                  Applies To
                </label>
                <select
                  value={form.applicableTo || 'all'}
                  onChange={(e) =>
                    updateForm({ applicableTo: e.target.value as ApplicableTo })
                  }
                  className="w-full bg-white border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                >
                  <option value="all">All Products</option>
                  <option value="specific_categories">Specific Categories</option>
                  <option value="specific_products">Specific Products</option>
                </select>
              </div>

              {/* Category multi-select */}
              {form.applicableTo === 'specific_categories' && (
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                    Select Categories
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_OPTIONS.map((cat) => {
                      const selected = (form.categories || []).includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            const current = form.categories || [];
                            updateForm({
                              categories: selected
                                ? current.filter((c) => c !== cat)
                                : [...current, cat],
                            });
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                            selected
                              ? 'border-stone-900 bg-stone-900 text-white'
                              : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                  {(form.categories || []).length === 0 && (
                    <p className="text-xs text-stone-400 mt-1.5">
                      Select at least one category
                    </p>
                  )}
                </div>
              )}

              {/* Product IDs for specific_products */}
              {form.applicableTo === 'specific_products' && (
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                    Product IDs
                  </label>
                  <textarea
                    value={(form.productIds || []).join(', ')}
                    onChange={(e) =>
                      updateForm({
                        productIds: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="Enter product IDs separated by commas"
                    rows={3}
                    className="w-full bg-white border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 resize-none"
                  />
                  <p className="text-xs text-stone-400 mt-1">
                    Comma-separated list of product IDs
                  </p>
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div className="sticky bottom-0 bg-white border-t border-stone-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => !saving && setModalOpen(false)}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#8d3038' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = '#6b2228')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = '#8d3038')
                }
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editingCode ? 'Save Changes' : 'Create Code'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-2">
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
    </div>
  );
}
