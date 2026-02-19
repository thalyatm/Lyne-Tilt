import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE, resolveImageUrl } from '../config/api';
import {
  ShoppingCart,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Search,
  Loader2,
  Mail,
  MailX,
  ChevronDown,
  ChevronRight,
  Trash2,
  Clock,
  X,
  Package,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CartStatus = 'abandoned' | 'recovered' | 'expired';

interface CartItem {
  productName: string;
  price: string;
  quantity: number;
  image: string;
}

interface AbandonedCart {
  id: string;
  email: string | null;
  customerName: string | null;
  status: CartStatus;
  totalValue: string;
  itemCount: number;
  lastActivityAt: string;
  emailSentAt: string | null;
  emailCount: number;
  recoveryToken: string;
  items: CartItem[];
}

interface CartStats {
  totalAbandoned: number;
  totalRecovered: number;
  recoveryRate: number;
  totalLostRevenue: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '$0.00';
  return `$${num.toFixed(2)}`;
}

function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return `${weeks}w ago`;
}

function wasEmailedRecently(emailSentAt: string | null): boolean {
  if (!emailSentAt) return false;
  const sentTime = new Date(emailSentAt).getTime();
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  return sentTime > oneHourAgo;
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
      className="bg-white rounded-xl border border-stone-200 px-4 py-2.5 flex items-center gap-3"
      style={{ borderLeftWidth: '4px', borderLeftColor: borderColor }}
    >
      <div className={`w-7 h-7 rounded-md flex items-center justify-center ${accent}`}>
        <Icon size={14} />
      </div>
      <div>
        <p className="text-xl font-semibold text-stone-900 leading-tight">{value}</p>
        <p className="text-[11px] text-stone-500">{label}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: CartStatus }) {
  const styles: Record<CartStatus, string> = {
    abandoned: 'bg-amber-100 text-amber-700',
    recovered: 'bg-green-100 text-green-700',
    expired: 'bg-stone-100 text-stone-600',
  };
  const labels: Record<CartStatus, string> = {
    abandoned: 'Abandoned',
    recovered: 'Recovered',
    expired: 'Expired',
  };
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function EmailStatus({ cart }: { cart: AbandonedCart }) {
  if (!cart.email) {
    return (
      <span className="text-xs text-stone-400 flex items-center gap-1">
        <MailX size={12} />
        No email available
      </span>
    );
  }
  if (cart.emailCount === 0) {
    return (
      <span className="text-xs text-stone-400 flex items-center gap-1">
        <Mail size={12} />
        No email sent
      </span>
    );
  }
  if (cart.emailCount === 1 && cart.emailSentAt) {
    return (
      <span className="text-xs text-stone-500 flex items-center gap-1">
        <Mail size={12} className="text-green-600" />
        Recovery email sent {timeAgo(cart.emailSentAt)}
      </span>
    );
  }
  return (
    <span className="text-xs text-stone-500 flex items-center gap-1">
      <Mail size={12} className="text-green-600" />
      {cart.emailCount} emails sent
    </span>
  );
}

function CartItemRow({ item }: { item: CartItem }) {
  const lineTotal = parseFloat(item.price) * item.quantity;
  return (
    <div className="flex items-center gap-3 py-2">
      <img
        src={resolveImageUrl(item.image)}
        alt={item.productName}
        className="w-8 h-8 rounded object-cover bg-stone-100"
        onError={(e) => {
          (e.target as HTMLImageElement).src = '';
          (e.target as HTMLImageElement).className =
            'w-8 h-8 rounded bg-stone-100 flex items-center justify-center';
        }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-700 truncate">{item.productName}</p>
      </div>
      <span className="text-xs text-stone-500 shrink-0">
        {formatCurrency(item.price)} x {item.quantity}
      </span>
      <span className="text-sm font-medium text-stone-700 w-20 text-right shrink-0">
        {formatCurrency(lineTotal)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AbandonedCartsManager() {
  const { accessToken } = useAuth();
  const toast = useToast();

  // Data
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [stats, setStats] = useState<CartStats>({
    totalAbandoned: 0,
    totalRecovered: 0,
    recoveryRate: 0,
    totalLostRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // UI state
  const [expandedCarts, setExpandedCarts] = useState<Set<string>>(new Set());
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [deletingCart, setDeletingCart] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const fetchCarts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await fetch(`${API_BASE}/abandoned-carts?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) throw new Error('Failed to load abandoned carts');

      const data = await res.json();
      setCarts(data.carts || []);
      setStats(
        data.stats || {
          totalAbandoned: 0,
          totalRecovered: 0,
          recoveryRate: 0,
          totalLostRevenue: 0,
        }
      );
    } catch {
      toast.error('Failed to load abandoned carts');
    } finally {
      setLoading(false);
    }
  }, [accessToken, statusFilter, debouncedSearch, toast]);

  useEffect(() => {
    fetchCarts();
  }, [fetchCarts]);

  // ---------- Actions ----------

  const toggleExpand = (cartId: string) => {
    setExpandedCarts((prev) => {
      const next = new Set(prev);
      if (next.has(cartId)) {
        next.delete(cartId);
      } else {
        next.add(cartId);
      }
      return next;
    });
  };

  const handleSendReminder = async (cartId: string) => {
    setSendingReminder(cartId);
    try {
      const res = await fetch(`${API_BASE}/abandoned-carts/${cartId}/send-reminder`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const errorMsg = data?.error || 'Failed to send recovery email';
        toast.error(errorMsg);
        return;
      }

      toast.success(data?.message || 'Recovery email sent successfully');
      fetchCarts();
    } catch {
      toast.error('Failed to send recovery email — check your network connection');
    } finally {
      setSendingReminder(null);
    }
  };

  const handleDelete = async (cartId: string) => {
    setDeletingCart(cartId);
    try {
      const res = await fetch(`${API_BASE}/abandoned-carts/${cartId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) throw new Error('Failed to delete cart');

      toast.success('Cart deleted');
      setConfirmDeleteId(null);
      fetchCarts();
    } catch {
      toast.error('Failed to delete cart');
    } finally {
      setDeletingCart(null);
    }
  };

  // ---------- Computed ----------

  const recoveryRateDisplay = `${Math.round(stats.recoveryRate)}%`;

  // ---------- Render ----------

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-serif font-semibold text-stone-900">Abandoned Carts</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          {loading
            ? 'Loading...'
            : `${carts.length} cart${carts.length !== 1 ? 's' : ''} found`}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={ShoppingCart}
          label="Total Abandoned"
          value={stats.totalAbandoned}
          borderColor="#78716c"
          accent="bg-stone-100 text-stone-600"
        />
        <StatCard
          icon={RefreshCw}
          label="Recovered"
          value={stats.totalRecovered}
          borderColor="#16a34a"
          accent="bg-green-100 text-green-700"
        />
        <StatCard
          icon={TrendingUp}
          label="Recovery Rate"
          value={recoveryRateDisplay}
          borderColor="#2563eb"
          accent="bg-blue-100 text-blue-700"
        />
        <StatCard
          icon={DollarSign}
          label="Lost Revenue"
          value={formatCurrency(stats.totalLostRevenue)}
          borderColor="#dc2626"
          accent="bg-red-100 text-red-700"
        />
      </div>

      {/* Toolbar: Search + Filter */}
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

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
        >
          <option value="all">All statuses</option>
          <option value="abandoned">Abandoned</option>
          <option value="recovered">Recovered</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Cart list */}
      {loading ? (
        <div className="bg-white rounded-lg border border-stone-200 p-12 text-center">
          <Loader2 size={24} className="text-stone-400 animate-spin mx-auto mb-3" />
          <p className="text-stone-500 text-sm">Loading abandoned carts...</p>
        </div>
      ) : carts.length === 0 ? (
        <div className="bg-white rounded-lg border border-stone-200 p-12 text-center">
          <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <ShoppingCart size={24} className="text-stone-400" />
          </div>
          <p className="text-stone-600 font-medium">No abandoned carts</p>
          <p className="text-sm text-stone-400 mt-1">
            {debouncedSearch || statusFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Abandoned carts will appear here when customers leave items behind.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {carts.map((cart) => {
            const isExpanded = expandedCarts.has(cart.id);
            const isSending = sendingReminder === cart.id;
            const isDeleting = deletingCart === cart.id;
            const canSendReminder =
              !!cart.email &&
              cart.status === 'abandoned' &&
              !wasEmailedRecently(cart.emailSentAt);

            return (
              <div
                key={cart.id}
                className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden"
              >
                {/* Cart card header */}
                <div className="p-4">
                  {/* Top row: Customer info + time + status */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-stone-900">
                          {cart.email || (
                            <span className="text-stone-400 italic">(no email)</span>
                          )}
                        </span>
                        {cart.customerName ? (
                          <span className="text-sm text-stone-500">
                            {cart.customerName}
                          </span>
                        ) : (
                          <span className="text-sm text-stone-400">Anonymous</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-stone-400 flex items-center gap-1">
                        <Clock size={12} />
                        {timeAgo(cart.lastActivityAt)}
                      </span>
                      <StatusBadge status={cart.status} />
                    </div>
                  </div>

                  {/* Cart value + email status */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-sm text-stone-700 font-medium">
                      {formatCurrency(cart.totalValue)}{' '}
                      <span className="text-stone-400 font-normal">
                        ({cart.itemCount} item{cart.itemCount !== 1 ? 's' : ''})
                      </span>
                    </span>
                    <EmailStatus cart={cart} />
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center gap-2">
                    {/* Expand / collapse items */}
                    <button
                      onClick={() => toggleExpand(cart.id)}
                      className="text-xs text-stone-500 hover:text-stone-700 flex items-center gap-1 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                      <Package size={12} />
                      {cart.itemCount} item{cart.itemCount !== 1 ? 's' : ''}
                    </button>

                    <div className="flex-1" />

                    {/* Send Reminder */}
                    <button
                      onClick={() => handleSendReminder(cart.id)}
                      disabled={!canSendReminder || isSending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor:
                          canSendReminder && !isSending ? '#8d3038' : undefined,
                      }}
                      onMouseEnter={(e) => {
                        if (canSendReminder && !isSending)
                          (e.target as HTMLButtonElement).style.backgroundColor =
                            '#6b2228';
                      }}
                      onMouseLeave={(e) => {
                        if (canSendReminder && !isSending)
                          (e.target as HTMLButtonElement).style.backgroundColor =
                            '#8d3038';
                      }}
                      title={
                        !cart.email
                          ? 'No email address available'
                          : cart.status !== 'abandoned'
                            ? 'Only abandoned carts can receive reminders'
                            : wasEmailedRecently(cart.emailSentAt)
                              ? 'Recently emailed — wait before sending again'
                              : 'Send recovery email'
                      }
                    >
                      {isSending ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Mail size={12} />
                      )}
                      Send Reminder
                    </button>

                    {/* Delete */}
                    {confirmDeleteId === cart.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(cart.id)}
                          disabled={isDeleting}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            'Confirm'
                          )}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1.5 text-xs text-stone-500 hover:text-stone-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(cart.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete cart"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded items section */}
                {isExpanded && cart.items && cart.items.length > 0 && (
                  <div className="border-t border-stone-100 bg-stone-50/50 px-4 py-2">
                    <div className="divide-y divide-stone-100">
                      {cart.items.map((item, idx) => (
                        <CartItemRow key={idx} item={item} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
