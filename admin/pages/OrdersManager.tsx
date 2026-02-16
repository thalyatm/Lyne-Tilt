import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';
import {
  DollarSign,
  Package,
  Clock,
  Truck,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  ShoppingBag,
  Loader2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
type PaymentStatus = 'paid' | 'pending';

interface Order {
  id: string;
  orderNumber: string;
  shippingFirstName: string;
  shippingLastName: string;
  shippingCity: string | null;
  shippingState: string | null;
  total: string;
  currency: string;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface OrderStats {
  totalRevenue: number;
  totalOrders: number;
  pendingConfirmed: number;
  shippedDelivered: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(amount: number, currency = 'AUD'): string {
  return `$${amount.toFixed(2)} ${currency}`;
}

function truncateOrderNumber(orderNumber: string, maxLen = 12): string {
  if (orderNumber.length <= maxLen) return orderNumber;
  return orderNumber.slice(0, maxLen) + '...';
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
      className={`bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-4`}
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

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const styles: Record<OrderStatus, string> = {
    pending: 'bg-stone-100 text-stone-600',
    confirmed: 'bg-blue-100 text-blue-700',
    shipped: 'bg-amber-100 text-amber-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  const labels: Record<OrderStatus, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const styles: Record<PaymentStatus, string> = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
  };
  const labels: Record<PaymentStatus, string> = {
    paid: 'Paid',
    pending: 'Pending',
  };
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function OrdersManager() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  // Data
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats>({
    totalRevenue: 0,
    totalOrders: 0,
    pendingConfirmed: 0,
    shippedDelivered: 0,
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

  const fetchOrders = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(PAGE_SIZE));
        if (statusFilter) params.set('status', statusFilter);
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo) params.set('dateTo', dateTo);

        const res = await fetch(`${API_BASE}/orders?${params}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) throw new Error('Failed to load orders');

        const data = await res.json();
        setOrders(data.orders || []);
        const s = data.stats || {};
        setStats({
          totalRevenue: s.totalRevenue || 0,
          totalOrders: s.totalOrders || 0,
          pendingConfirmed: (s.pendingOrders || 0) + (s.confirmedOrders || 0),
          shippedDelivered: (s.shippedOrders || 0) + (s.deliveredOrders || 0),
        });
        setPagination(
          data.pagination || { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 }
        );
      } catch {
        // Silently handle — could add toast in the future
      } finally {
        setLoading(false);
      }
    },
    [accessToken, statusFilter, debouncedSearch, dateFrom, dateTo]
  );

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  // ---------- Export CSV ----------

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      params.set('format', 'csv');

      const res = await fetch(`${API_BASE}/orders/export?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // Could add toast error handling
    }
  };

  // ---------- Status tabs ----------

  const statusTabs = [
    { key: '', label: 'All' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  // ---------- Render ----------

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Orders</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Manage and fulfill customer orders
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 rounded-md px-4 h-9 text-sm font-medium transition-colors inline-flex items-center gap-1.5"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          borderColor="#16a34a"
          accent="bg-green-100 text-green-700"
        />
        <StatCard
          icon={Package}
          label="Total Orders"
          value={stats.totalOrders}
          borderColor="#2563eb"
          accent="bg-blue-100 text-blue-700"
        />
        <StatCard
          icon={Clock}
          label="Pending / Confirmed"
          value={stats.pendingConfirmed}
          borderColor="#d97706"
          accent="bg-amber-100 text-amber-700"
        />
        <StatCard
          icon={Truck}
          label="Shipped / Delivered"
          value={stats.shippedDelivered}
          borderColor="#059669"
          accent="bg-emerald-100 text-emerald-700"
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

      {/* Search + date filters */}
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
            placeholder="Search by order number or customer..."
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

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-white border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
            placeholder="From"
          />
          <span className="text-stone-400 text-sm">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-white border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
            placeholder="To"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className="p-1.5 hover:bg-stone-100 rounded transition"
              title="Clear dates"
            >
              <X size={14} className="text-stone-400" />
            </button>
          )}
        </div>

        <span className="text-sm text-stone-400 ml-auto">
          Showing {pagination.total} order{pagination.total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-stone-500 text-sm">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <ShoppingBag size={24} className="text-stone-400" />
            </div>
            <p className="text-stone-600 font-medium">
              {debouncedSearch || statusFilter || dateFrom || dateTo
                ? 'No orders match your filters'
                : 'No orders yet'}
            </p>
            <p className="text-sm text-stone-400 mt-1">
              {debouncedSearch || statusFilter || dateFrom || dateTo
                ? 'Try adjusting your search or filters.'
                : 'Orders will appear here once customers start purchasing.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-stone-50/80">
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {orders.map((order) => {
                    return (
                      <tr
                        key={order.id}
                        onClick={() => navigate(`/admin/orders/${order.id}`)}
                        className="hover:bg-stone-50/50 transition cursor-pointer"
                      >
                        {/* Order */}
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-semibold text-stone-900 tracking-wide">
                            {truncateOrderNumber(order.orderNumber)}
                          </span>
                          <p className="text-xs text-stone-400 mt-0.5">
                            {formatDate(order.createdAt)}
                          </p>
                        </td>

                        {/* Customer */}
                        <td className="px-4 py-3">
                          <span className="text-sm text-stone-700 font-medium">
                            {order.shippingFirstName} {order.shippingLastName}
                          </span>
                          {(order.shippingCity || order.shippingState) && (
                            <p className="text-xs text-stone-400 mt-0.5">
                              {[order.shippingCity, order.shippingState]
                                .filter(Boolean)
                                .join(', ')}
                            </p>
                          )}
                        </td>

                        {/* Items */}
                        <td className="px-4 py-3">
                          <span className="text-sm text-stone-600">
                            View details
                          </span>
                        </td>

                        {/* Total */}
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-stone-900">
                            {formatCurrency(parseFloat(order.total) || 0, order.currency || 'AUD')}
                          </span>
                        </td>

                        {/* Payment */}
                        <td className="px-4 py-3">
                          <PaymentBadge status={order.paymentStatus} />
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <OrderStatusBadge status={order.status} />
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/orders/${order.id}`);
                            }}
                            className="text-sm font-medium hover:underline"
                            style={{ color: '#8d3038' }}
                          >
                            View
                          </button>
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
                    onClick={() => fetchOrders(pagination.page - 1)}
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
                          onClick={() => fetchOrders(page)}
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
                    onClick={() => fetchOrders(pagination.page + 1)}
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
    </div>
  );
}
