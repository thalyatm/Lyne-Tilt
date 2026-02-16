import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';
import {
  CreditCard,
  CheckCircle,
  DollarSign,
  ArrowDownCircle,
  Wallet,
  Search,
  Plus,
  Loader2,
  Copy,
  Check,
  X,
  Trash2,
  Eye,
  MoreHorizontal,
  Gift,
  Clock,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GiftCardStatus = 'active' | 'depleted' | 'expired' | 'disabled';
type TransactionType = 'purchase' | 'redemption' | 'adjustment' | 'refund';
type SortOption = 'newest' | 'oldest' | 'highest-balance' | 'lowest-balance';

interface GiftCard {
  id: string;
  code: string;
  initialBalance: string;
  currentBalance: string;
  currency: string;
  status: GiftCardStatus;
  purchaserEmail: string | null;
  purchaserName: string | null;
  recipientEmail: string | null;
  recipientName: string | null;
  personalMessage: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface GiftCardStats {
  totalCards: number;
  activeCards: number;
  totalValueIssued: number;
  totalValueRedeemed: number;
  totalBalanceRemaining: number;
}

interface Transaction {
  id: string;
  type: TransactionType;
  amount: string;
  balanceAfter: string;
  orderId?: string | null;
  note?: string | null;
  createdAt: string;
}

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

function formatDateTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `$${num.toFixed(2)}`;
}

function balancePercent(current: string, initial: string): number {
  const c = parseFloat(current);
  const i = parseFloat(initial);
  if (i <= 0) return 0;
  return Math.min(100, Math.max(0, (c / i) * 100));
}

function balanceBarColor(percent: number): string {
  if (percent <= 0) return 'bg-red-500';
  if (percent < 25) return 'bg-amber-500';
  return 'bg-green-500';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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
    <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-4 flex items-center gap-4">
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

function StatusBadge({ status }: { status: GiftCardStatus }) {
  const styles: Record<GiftCardStatus, string> = {
    active: 'bg-green-100 text-green-700',
    depleted: 'bg-stone-100 text-stone-500',
    expired: 'bg-amber-100 text-amber-700',
    disabled: 'bg-red-100 text-red-700',
  };
  const labels: Record<GiftCardStatus, string> = {
    active: 'Active',
    depleted: 'Depleted',
    expired: 'Expired',
    disabled: 'Disabled',
  };
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function TransactionTypeBadge({ type }: { type: TransactionType }) {
  const styles: Record<TransactionType, string> = {
    purchase: 'bg-green-100 text-green-700',
    redemption: 'bg-blue-100 text-blue-700',
    adjustment: 'bg-amber-100 text-amber-700',
    refund: 'bg-purple-100 text-purple-700',
  };
  const labels: Record<TransactionType, string> = {
    purchase: 'Purchase',
    redemption: 'Redemption',
    adjustment: 'Adjustment',
    refund: 'Refund',
  };
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${styles[type]}`}>
      {labels[type]}
    </span>
  );
}

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback silently
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 hover:bg-stone-100 rounded transition"
      title="Copy code"
    >
      {copied ? (
        <Check size={13} className="text-green-600" />
      ) : (
        <Copy size={13} className="text-stone-400" />
      )}
    </button>
  );
}

function RowActionsMenu({
  card,
  onViewDetails,
  onAdjustBalance,
  onToggleStatus,
  onDelete,
}: {
  card: GiftCard;
  onViewDetails: () => void;
  onAdjustBalance: () => void;
  onToggleStatus: () => void;
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
              onViewDetails();
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex items-center gap-2"
          >
            <Eye size={14} /> View Details
          </button>
          <button
            onClick={() => {
              onAdjustBalance();
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex items-center gap-2"
          >
            <DollarSign size={14} /> Adjust Balance
          </button>
          <button
            onClick={() => {
              onToggleStatus();
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex items-center gap-2"
          >
            {card.status === 'disabled' ? (
              <>
                <CheckCircle size={14} /> Enable
              </>
            ) : (
              <>
                <X size={14} /> Disable
              </>
            )}
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

export default function GiftCardsManager() {
  const { accessToken } = useAuth();

  // Data
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [stats, setStats] = useState<GiftCardStats>({
    totalCards: 0,
    activeCards: 0,
    totalValueIssued: 0,
    totalValueRedeemed: 0,
    totalBalanceRemaining: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Create modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    initialBalance: '',
    recipientName: '',
    recipientEmail: '',
    personalMessage: '',
    expiresAt: '',
  });
  const [createSaving, setCreateSaving] = useState(false);

  // Bulk create modal
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    count: '',
    initialBalance: '',
    expiresAt: '',
  });
  const [bulkSaving, setBulkSaving] = useState(false);

  // Detail modal
  const [detailCard, setDetailCard] = useState<GiftCard | null>(null);
  const [detailTransactions, setDetailTransactions] = useState<Transaction[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Adjust balance (inline in detail modal)
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    amount: '',
    type: 'adjustment' as 'adjustment' | 'refund',
    note: '',
  });
  const [adjustSaving, setAdjustSaving] = useState(false);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<GiftCard | null>(null);

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

  const fetchGiftCards = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (sortOption) params.set('sort', sortOption);

      const res = await fetch(`${API_BASE}/gift-cards?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) throw new Error('Failed to load gift cards');

      const data = await res.json();
      setGiftCards(data.giftCards || []);
      setStats(data.stats || {
        totalCards: 0,
        activeCards: 0,
        totalValueIssued: 0,
        totalValueRedeemed: 0,
        totalBalanceRemaining: 0,
      });
    } catch {
      showToast('error', 'Could not load gift cards. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, statusFilter, debouncedSearch, sortOption]);

  useEffect(() => {
    fetchGiftCards();
  }, [fetchGiftCards]);

  // ---------- Fetch detail ----------

  const fetchDetail = async (cardId: string) => {
    setDetailLoading(true);
    setDetailModalOpen(true);
    setAdjustOpen(false);
    setAdjustForm({ amount: '', type: 'adjustment', note: '' });
    try {
      const res = await fetch(`${API_BASE}/gift-cards/${cardId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to load gift card details');
      const data = await res.json();
      setDetailCard(data.giftCard);
      setDetailTransactions(data.transactions || []);
    } catch {
      showToast('error', 'Could not load gift card details.');
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // ---------- Create gift card ----------

  const handleCreate = async () => {
    if (!createForm.initialBalance || parseFloat(createForm.initialBalance) <= 0) {
      showToast('error', 'Please enter a valid amount.');
      return;
    }

    setCreateSaving(true);
    try {
      const payload: Record<string, unknown> = {
        initialBalance: parseFloat(createForm.initialBalance),
      };
      if (createForm.recipientEmail) payload.recipientEmail = createForm.recipientEmail;
      if (createForm.recipientName) payload.recipientName = createForm.recipientName;
      if (createForm.personalMessage) payload.personalMessage = createForm.personalMessage;
      if (createForm.expiresAt) payload.expiresAt = new Date(createForm.expiresAt + 'T23:59:59').toISOString();

      const res = await fetch(`${API_BASE}/gift-cards`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create gift card');
      }

      showToast('success', 'Gift card created successfully.');
      setCreateModalOpen(false);
      setCreateForm({ initialBalance: '', recipientName: '', recipientEmail: '', personalMessage: '', expiresAt: '' });
      fetchGiftCards();
    } catch (err: any) {
      showToast('error', err.message || 'Could not create gift card.');
    } finally {
      setCreateSaving(false);
    }
  };

  // ---------- Bulk create ----------

  const handleBulkCreate = async () => {
    if (!bulkForm.count || parseInt(bulkForm.count, 10) <= 0) {
      showToast('error', 'Please enter a valid quantity.');
      return;
    }
    if (!bulkForm.initialBalance || parseFloat(bulkForm.initialBalance) <= 0) {
      showToast('error', 'Please enter a valid amount per card.');
      return;
    }

    setBulkSaving(true);
    try {
      const payload: Record<string, unknown> = {
        count: parseInt(bulkForm.count, 10),
        initialBalance: parseFloat(bulkForm.initialBalance),
      };
      if (bulkForm.expiresAt) payload.expiresAt = new Date(bulkForm.expiresAt + 'T23:59:59').toISOString();

      const res = await fetch(`${API_BASE}/gift-cards/bulk`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create gift cards');
      }

      showToast('success', `${bulkForm.count} gift cards created successfully.`);
      setBulkModalOpen(false);
      setBulkForm({ count: '', initialBalance: '', expiresAt: '' });
      fetchGiftCards();
    } catch (err: any) {
      showToast('error', err.message || 'Could not create gift cards.');
    } finally {
      setBulkSaving(false);
    }
  };

  // ---------- Toggle status (disable/enable) ----------

  const handleToggleStatus = async (card: GiftCard) => {
    try {
      const newStatus = card.status === 'disabled' ? 'active' : 'disabled';
      const res = await fetch(`${API_BASE}/gift-cards/${card.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      showToast('success', newStatus === 'disabled' ? 'Gift card disabled.' : 'Gift card enabled.');
      fetchGiftCards();
    } catch {
      showToast('error', 'Could not update gift card status.');
    }
  };

  // ---------- Delete ----------

  const handleDelete = async (card: GiftCard) => {
    try {
      const res = await fetch(`${API_BASE}/gift-cards/${card.id}`, {
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
      showToast('success', 'Gift card deleted.');
      setConfirmDelete(null);
      fetchGiftCards();
    } catch (err: any) {
      showToast('error', err.message || 'Could not delete gift card.');
    }
  };

  // ---------- Adjust balance ----------

  const handleAdjustBalance = async () => {
    if (!detailCard) return;
    if (!adjustForm.amount || parseFloat(adjustForm.amount) === 0) {
      showToast('error', 'Please enter a valid amount.');
      return;
    }

    setAdjustSaving(true);
    try {
      const payload: Record<string, unknown> = {
        amount: parseFloat(adjustForm.amount),
        type: adjustForm.type,
      };
      if (adjustForm.note) payload.note = adjustForm.note;

      const res = await fetch(`${API_BASE}/gift-cards/${detailCard.id}/adjust`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Adjustment failed');
      }

      showToast('success', 'Balance adjusted successfully.');
      setAdjustOpen(false);
      setAdjustForm({ amount: '', type: 'adjustment', note: '' });
      // Refresh the detail view
      fetchDetail(detailCard.id);
      fetchGiftCards();
    } catch (err: any) {
      showToast('error', err.message || 'Could not adjust balance.');
    } finally {
      setAdjustSaving(false);
    }
  };

  // ---------- Render ----------

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-serif font-semibold text-stone-900">Gift Cards</h1>
          <p className="text-sm text-stone-500 mt-0.5">Create and manage gift cards</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setBulkForm({ count: '', initialBalance: '', expiresAt: '' });
              setBulkModalOpen(true);
            }}
            className="border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 rounded-md px-4 h-9 text-sm font-medium transition-colors inline-flex items-center gap-1.5"
          >
            <Plus size={16} />
            Bulk Create
          </button>
          <button
            onClick={() => {
              setCreateForm({ initialBalance: '', recipientName: '', recipientEmail: '', personalMessage: '', expiresAt: '' });
              setCreateModalOpen(true);
            }}
            className="text-white hover:opacity-90 rounded-md px-4 h-9 text-sm font-medium transition-colors inline-flex items-center gap-1.5"
            style={{ backgroundColor: '#8d3038' }}
          >
            <Plus size={16} />
            Create Gift Card
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          icon={CreditCard}
          label="Total Cards"
          value={stats.totalCards}
          accent="bg-stone-100 text-stone-600"
        />
        <StatCard
          icon={CheckCircle}
          label="Active"
          value={stats.activeCards}
          accent="bg-green-100 text-green-700"
        />
        <StatCard
          icon={DollarSign}
          label="Value Issued"
          value={formatCurrency(stats.totalValueIssued)}
          accent="bg-blue-100 text-blue-700"
        />
        <StatCard
          icon={ArrowDownCircle}
          label="Value Redeemed"
          value={formatCurrency(stats.totalValueRedeemed)}
          accent="bg-amber-100 text-amber-700"
        />
        <StatCard
          icon={Wallet}
          label="Balance Remaining"
          value={formatCurrency(stats.totalBalanceRemaining)}
          accent="bg-red-50 text-[#8d3038]"
        />
      </div>

      {/* Toolbar: search, status filter, sort */}
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
            placeholder="Search by code, email, or name..."
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="depleted">Depleted</option>
          <option value="expired">Expired</option>
          <option value="disabled">Disabled</option>
        </select>

        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value as SortOption)}
          className="bg-white border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest-balance">Highest Balance</option>
          <option value="lowest-balance">Lowest Balance</option>
        </select>

        <span className="text-sm text-stone-400 ml-auto">
          {giftCards.length} card{giftCards.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Gift cards table */}
      <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 size={24} className="animate-spin mx-auto mb-3 text-stone-400" />
            <p className="text-stone-500 text-sm">Loading gift cards...</p>
          </div>
        ) : giftCards.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Gift size={24} className="text-stone-400" />
            </div>
            <p className="text-stone-600 font-medium">
              {debouncedSearch || statusFilter !== 'all'
                ? 'No gift cards match your filters'
                : 'No gift cards yet'}
            </p>
            <p className="text-sm text-stone-400 mt-1">
              {debouncedSearch || statusFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Create your first gift card to get started.'}
            </p>
            {!(debouncedSearch || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setCreateForm({ initialBalance: '', recipientName: '', recipientEmail: '', personalMessage: '', expiresAt: '' });
                  setCreateModalOpen(true);
                }}
                className="mt-4 text-white hover:opacity-90 rounded-md px-4 py-2 text-sm font-medium transition-colors"
                style={{ backgroundColor: '#8d3038' }}
              >
                Create Gift Card
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-stone-50/80">
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-2.5 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {giftCards.map((card) => {
                  const pct = balancePercent(card.currentBalance, card.initialBalance);
                  const currentNum = parseFloat(card.currentBalance);
                  const isDepleted = currentNum <= 0;

                  return (
                    <tr
                      key={card.id}
                      className={`hover:bg-stone-50 transition ${
                        card.status === 'disabled' ? 'opacity-60' : ''
                      }`}
                    >
                      {/* Code */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-sm font-medium text-stone-900 tracking-wide">
                            {card.code}
                          </span>
                          <CopyCodeButton code={card.code} />
                        </div>
                      </td>

                      {/* Balance */}
                      <td className="px-4 py-3">
                        <div className="flex items-baseline gap-1.5">
                          <span className={`text-sm font-medium ${isDepleted ? 'text-red-600' : 'text-stone-900'}`}>
                            {formatCurrency(card.currentBalance)}
                          </span>
                          <span className="text-xs text-stone-400">
                            / {formatCurrency(card.initialBalance)}
                          </span>
                        </div>
                        <div className="mt-1 w-20 h-1 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${balanceBarColor(pct)}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={card.status} />
                      </td>

                      {/* Recipient */}
                      <td className="px-4 py-3">
                        {card.recipientName || card.recipientEmail ? (
                          <div>
                            {card.recipientName && (
                              <span className="text-sm text-stone-700 font-medium">
                                {card.recipientName}
                              </span>
                            )}
                            {card.recipientEmail && (
                              <p className="text-xs text-stone-400 mt-0.5">
                                {card.recipientEmail}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-stone-300">&mdash;</span>
                        )}
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-stone-500">
                          {formatDate(card.createdAt)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <RowActionsMenu
                          card={card}
                          onViewDetails={() => fetchDetail(card.id)}
                          onAdjustBalance={() => {
                            fetchDetail(card.id);
                            // We open adjust after detail loads via a slight delay
                            setTimeout(() => setAdjustOpen(true), 300);
                          }}
                          onToggleStatus={() => handleToggleStatus(card)}
                          onDelete={() => setConfirmDelete(card)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* Create Gift Card Modal */}
      {/* ================================================================= */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 max-w-md w-full mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <h2 className="text-lg font-serif font-semibold text-stone-900">Create Gift Card</h2>
              <button
                onClick={() => !createSaving && setCreateModalOpen(false)}
                className="p-1.5 hover:bg-stone-100 rounded transition"
              >
                <X size={18} className="text-stone-500" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                  Amount *
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
                    value={createForm.initialBalance}
                    onChange={(e) => setCreateForm({ ...createForm, initialBalance: e.target.value })}
                    placeholder="50.00"
                    className="w-full bg-white border border-stone-200 rounded-md pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                  />
                </div>
              </div>

              {/* Recipient Name */}
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={createForm.recipientName}
                  onChange={(e) => setCreateForm({ ...createForm, recipientName: e.target.value })}
                  placeholder="Optional"
                  className="w-full bg-white border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                />
              </div>

              {/* Recipient Email */}
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={createForm.recipientEmail}
                  onChange={(e) => setCreateForm({ ...createForm, recipientEmail: e.target.value })}
                  placeholder="Optional"
                  className="w-full bg-white border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                />
              </div>

              {/* Personal Message */}
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                  Personal Message
                </label>
                <textarea
                  value={createForm.personalMessage}
                  onChange={(e) => setCreateForm({ ...createForm, personalMessage: e.target.value })}
                  placeholder="Optional message for the recipient"
                  rows={3}
                  className="w-full bg-white border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 resize-none"
                />
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={createForm.expiresAt}
                  onChange={(e) => setCreateForm({ ...createForm, expiresAt: e.target.value })}
                  className="w-full bg-white border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stone-200">
              <button
                onClick={() => !createSaving && setCreateModalOpen(false)}
                disabled={createSaving}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#8d3038' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#6b2228')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#8d3038')}
              >
                {createSaving && <Loader2 size={14} className="animate-spin" />}
                Create Gift Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Bulk Create Modal */}
      {/* ================================================================= */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 max-w-md w-full mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <h2 className="text-lg font-serif font-semibold text-stone-900">Bulk Create Gift Cards</h2>
              <button
                onClick={() => !bulkSaving && setBulkModalOpen(false)}
                className="p-1.5 hover:bg-stone-100 rounded transition"
              >
                <X size={18} className="text-stone-500" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Quantity */}
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                  Quantity *
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={bulkForm.count}
                  onChange={(e) => setBulkForm({ ...bulkForm, count: e.target.value })}
                  placeholder="How many cards to create"
                  className="w-full bg-white border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                />
              </div>

              {/* Amount per card */}
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                  Amount Per Card *
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
                    value={bulkForm.initialBalance}
                    onChange={(e) => setBulkForm({ ...bulkForm, initialBalance: e.target.value })}
                    placeholder="50.00"
                    className="w-full bg-white border border-stone-200 rounded-md pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                  />
                </div>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={bulkForm.expiresAt}
                  onChange={(e) => setBulkForm({ ...bulkForm, expiresAt: e.target.value })}
                  className="w-full bg-white border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                />
              </div>

              {/* Preview */}
              {bulkForm.count && bulkForm.initialBalance && (
                <div className="bg-stone-50 rounded-lg px-4 py-3">
                  <p className="text-sm text-stone-600">
                    This will create <span className="font-semibold text-stone-900">{bulkForm.count}</span> gift cards
                    at <span className="font-semibold text-stone-900">{formatCurrency(bulkForm.initialBalance)}</span> each,
                    totalling <span className="font-semibold text-stone-900">{formatCurrency(parseInt(bulkForm.count, 10) * parseFloat(bulkForm.initialBalance))}</span>.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-stone-200">
              <button
                onClick={() => !bulkSaving && setBulkModalOpen(false)}
                disabled={bulkSaving}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkCreate}
                disabled={bulkSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#8d3038' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#6b2228')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#8d3038')}
              >
                {bulkSaving && <Loader2 size={14} className="animate-spin" />}
                Create {bulkForm.count || ''} Cards
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Gift Card Detail Slide-over */}
      {/* ================================================================= */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDetailModalOpen(false)}
          />

          {/* Panel */}
          <div className="relative bg-white w-full max-w-lg shadow-xl overflow-y-auto">
            {/* Panel header */}
            <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-serif font-semibold text-stone-900">Gift Card Details</h2>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1.5 hover:bg-stone-100 rounded transition"
              >
                <X size={18} className="text-stone-500" />
              </button>
            </div>

            {detailLoading ? (
              <div className="p-12 text-center">
                <Loader2 size={24} className="animate-spin mx-auto mb-3 text-stone-400" />
                <p className="text-stone-500 text-sm">Loading details...</p>
              </div>
            ) : detailCard ? (
              <div className="px-6 py-6 space-y-6">
                {/* Code + Status */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="font-mono text-2xl font-semibold text-stone-900 tracking-wider">
                      {detailCard.code}
                    </span>
                    <CopyCodeButton code={detailCard.code} />
                  </div>
                  <StatusBadge status={detailCard.status} />
                </div>

                {/* Balance visualization */}
                <div className="bg-stone-50 rounded-lg p-4">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-sm text-stone-500">Balance</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-xl font-semibold ${parseFloat(detailCard.currentBalance) <= 0 ? 'text-red-600' : 'text-stone-900'}`}>
                        {formatCurrency(detailCard.currentBalance)}
                      </span>
                      <span className="text-sm text-stone-400">
                        / {formatCurrency(detailCard.initialBalance)}
                      </span>
                    </div>
                  </div>
                  {(() => {
                    const pct = balancePercent(detailCard.currentBalance, detailCard.initialBalance);
                    return (
                      <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${balanceBarColor(pct)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    );
                  })()}
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-wider mb-0.5">Created</p>
                    <p className="text-sm text-stone-700">{formatDateTime(detailCard.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-wider mb-0.5">Expires</p>
                    <p className="text-sm text-stone-700">
                      {detailCard.expiresAt ? formatDate(detailCard.expiresAt) : 'No expiry'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-wider mb-0.5">Currency</p>
                    <p className="text-sm text-stone-700">{detailCard.currency || 'AUD'}</p>
                  </div>
                </div>

                {/* Purchaser info */}
                {(detailCard.purchaserName || detailCard.purchaserEmail) && (
                  <div>
                    <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Purchaser</p>
                    <div className="bg-stone-50 rounded-lg px-4 py-3">
                      {detailCard.purchaserName && (
                        <p className="text-sm font-medium text-stone-700">{detailCard.purchaserName}</p>
                      )}
                      {detailCard.purchaserEmail && (
                        <p className="text-sm text-stone-500">{detailCard.purchaserEmail}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Recipient info */}
                {(detailCard.recipientName || detailCard.recipientEmail) && (
                  <div>
                    <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Recipient</p>
                    <div className="bg-stone-50 rounded-lg px-4 py-3">
                      {detailCard.recipientName && (
                        <p className="text-sm font-medium text-stone-700">{detailCard.recipientName}</p>
                      )}
                      {detailCard.recipientEmail && (
                        <p className="text-sm text-stone-500">{detailCard.recipientEmail}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Personal message */}
                {detailCard.personalMessage && (
                  <div>
                    <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Personal Message</p>
                    <div className="bg-stone-50 rounded-lg px-4 py-3">
                      <p className="text-sm text-stone-700 italic">&ldquo;{detailCard.personalMessage}&rdquo;</p>
                    </div>
                  </div>
                )}

                {/* Adjust Balance */}
                <div>
                  {!adjustOpen ? (
                    <button
                      onClick={() => setAdjustOpen(true)}
                      className="text-sm font-medium transition-colors"
                      style={{ color: '#8d3038' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#6b2228')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#8d3038')}
                    >
                      + Adjust Balance
                    </button>
                  ) : (
                    <div className="bg-stone-50 rounded-lg p-4 space-y-3">
                      <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Adjust Balance</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-stone-500 mb-1">Amount</label>
                          <div className="relative">
                            <DollarSign
                              size={14}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                            />
                            <input
                              type="number"
                              step={0.01}
                              value={adjustForm.amount}
                              onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                              placeholder="0.00"
                              className="w-full bg-white border border-stone-200 rounded-md pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-stone-500 mb-1">Type</label>
                          <select
                            value={adjustForm.type}
                            onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value as 'adjustment' | 'refund' })}
                            className="w-full bg-white border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                          >
                            <option value="adjustment">Adjustment</option>
                            <option value="refund">Refund</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">Note (optional)</label>
                        <input
                          type="text"
                          value={adjustForm.note}
                          onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })}
                          placeholder="Reason for adjustment"
                          className="w-full bg-white border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleAdjustBalance}
                          disabled={adjustSaving}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-50"
                          style={{ backgroundColor: '#8d3038' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#6b2228')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#8d3038')}
                        >
                          {adjustSaving && <Loader2 size={14} className="animate-spin" />}
                          Apply
                        </button>
                        <button
                          onClick={() => {
                            setAdjustOpen(false);
                            setAdjustForm({ amount: '', type: 'adjustment', note: '' });
                          }}
                          className="px-3 py-1.5 rounded-md text-sm font-medium text-stone-600 hover:bg-stone-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Transaction history */}
                <div>
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">Transaction History</p>
                  {detailTransactions.length === 0 ? (
                    <div className="text-center py-6">
                      <Clock size={20} className="mx-auto text-stone-300 mb-2" />
                      <p className="text-sm text-stone-400">No transactions yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {detailTransactions.map((txn) => {
                        const amt = parseFloat(txn.amount);
                        const isPositive = amt > 0;
                        return (
                          <div
                            key={txn.id}
                            className="flex items-center justify-between bg-stone-50 rounded-lg px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <TransactionTypeBadge type={txn.type} />
                              <div>
                                <p className={`text-sm font-medium ${isPositive ? 'text-green-700' : 'text-red-600'}`}>
                                  {isPositive ? '+' : ''}{formatCurrency(txn.amount)}
                                </p>
                                {(txn.note || txn.orderId) && (
                                  <p className="text-xs text-stone-400 mt-0.5">
                                    {txn.note || `Order: ${txn.orderId}`}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-stone-600">
                                {formatCurrency(txn.balanceAfter)}
                              </p>
                              <p className="text-xs text-stone-400 mt-0.5">
                                {formatDateTime(txn.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Delete Confirmation Modal */}
      {/* ================================================================= */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-stone-800">Delete gift card</h3>
                <p className="mt-1 text-sm text-stone-500">
                  Are you sure you want to permanently delete the gift card{' '}
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

      {/* ================================================================= */}
      {/* Toast */}
      {/* ================================================================= */}
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
