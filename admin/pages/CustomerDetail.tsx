import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';
import {
  ArrowLeft,
  ShoppingBag,
  DollarSign,
  MapPin,
  GraduationCap,
  Mail,
  Copy,
  Check,
  Phone,
  CreditCard,
  Clock,
  Calendar,
  Loader2,
  Package,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  stripeCustomerId: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  orderCount: number;
  totalSpend: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
  itemCount: number;
}

interface Address {
  id: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  return `$${num.toFixed(2)}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  if (diffDay < 365) {
    const months = Math.floor(diffDay / 30);
    return `${months}mo ago`;
  }
  const years = Math.floor(diffDay / 365);
  return `${years}y ago`;
}

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending:    { label: 'Pending',    bg: 'bg-amber-50',  text: 'text-amber-700' },
  confirmed:  { label: 'Confirmed',  bg: 'bg-blue-50',   text: 'text-blue-700' },
  shipped:    { label: 'Shipped',    bg: 'bg-purple-50', text: 'text-purple-700' },
  delivered:  { label: 'Delivered',  bg: 'bg-green-50',  text: 'text-green-700' },
  cancelled:  { label: 'Cancelled',  bg: 'bg-red-50',    text: 'text-red-700' },
};

function statusCfg(status: string) {
  return STATUS_CONFIG[status] ?? { label: status, bg: 'bg-stone-100', text: 'text-stone-600' };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  // -- fetch customer -------------------------------------------------------
  const fetchCustomer = useCallback(async () => {
    if (!id || !accessToken) return;
    try {
      setLoading(true);
      setNotFound(false);
      const res = await fetch(`${API_BASE}/customers/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) throw new Error('Failed to load customer');
      const data = await res.json();
      setCustomer(data.customer);
      setOrders(data.orders || []);
      setAddresses(data.addresses || []);
      setEnrollmentCount(data.enrollmentCount ?? 0);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id, accessToken]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  // -- copy email -----------------------------------------------------------
  const handleCopyEmail = async () => {
    if (!customer) return;
    try {
      await navigator.clipboard.writeText(customer.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: silent fail
    }
  };

  // =========================================================================
  // Render
  // =========================================================================

  // -- loading state --------------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
        <span className="ml-2 text-sm text-stone-500">Loading customer...</span>
      </div>
    );
  }

  // -- not found state ------------------------------------------------------
  if (notFound || !customer) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <button
          onClick={() => navigate('/admin/customers')}
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Customers
        </button>
        <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-12 text-center">
          <Package className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500">Customer not found.</p>
        </div>
      </div>
    );
  }

  // -- derived data ---------------------------------------------------------
  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || 'Unknown';
  const initial = (customer.firstName?.[0] || customer.email[0] || '?').toUpperCase();
  const primaryPhone = addresses.find(a => a.phone)?.phone ?? null;

  // -- main render ----------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Back link */}
      <button
        onClick={() => navigate('/admin/customers')}
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Customers
      </button>

      {/* ================================================================= */}
      {/* Header section                                                    */}
      {/* ================================================================= */}
      <div className="flex items-start gap-5 mb-8">
        {/* Avatar */}
        <div className="flex-shrink-0 w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center">
          <span className="text-2xl font-semibold text-stone-600">{initial}</span>
        </div>

        <div className="min-w-0">
          <h1
            className="text-2xl font-bold text-stone-900 truncate"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {fullName}
          </h1>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-sm text-stone-500 truncate">{customer.email}</span>
            <span
              className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                customer.emailVerified
                  ? 'bg-green-50 text-green-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {customer.emailVerified ? 'Verified' : 'Unverified'}
            </span>
          </div>

          <p className="text-xs text-stone-400 mt-1">
            Member since {formatDate(customer.createdAt)}
          </p>
        </div>
      </div>

      {/* ================================================================= */}
      {/* Stats row                                                         */}
      {/* ================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-4 text-center">
          <ShoppingBag className="w-5 h-5 text-stone-400 mx-auto mb-1.5" />
          <p className="text-xl font-semibold text-stone-800">{customer.orderCount}</p>
          <p className="text-xs text-stone-500">Total Orders</p>
        </div>
        <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-4 text-center">
          <DollarSign className="w-5 h-5 text-stone-400 mx-auto mb-1.5" />
          <p className="text-xl font-semibold text-stone-800">{formatCurrency(customer.totalSpend)}</p>
          <p className="text-xs text-stone-500">Total Spend</p>
        </div>
        <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-4 text-center">
          <MapPin className="w-5 h-5 text-stone-400 mx-auto mb-1.5" />
          <p className="text-xl font-semibold text-stone-800">{addresses.length}</p>
          <p className="text-xs text-stone-500">Addresses</p>
        </div>
        <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-4 text-center">
          <GraduationCap className="w-5 h-5 text-stone-400 mx-auto mb-1.5" />
          <p className="text-xl font-semibold text-stone-800">{enrollmentCount}</p>
          <p className="text-xs text-stone-500">Enrollments</p>
        </div>
      </div>

      {/* ================================================================= */}
      {/* Two-column layout                                                 */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* =============================================================== */}
        {/* LEFT COLUMN (2/3) - Order History                               */}
        {/* =============================================================== */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-stone-200 shadow-sm">
            <div className="px-6 py-4 border-b border-stone-100">
              <h2
                className="text-lg font-bold text-stone-900 flex items-center gap-2"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                <ShoppingBag className="w-5 h-5 text-stone-400" />
                Order History
              </h2>
            </div>

            {orders.length === 0 ? (
              <div className="p-8 text-center">
                <Package className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-sm text-stone-400">No orders yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stone-100">
                      <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-6 py-3">
                        Order #
                      </th>
                      <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-6 py-3">
                        Status
                      </th>
                      <th className="text-right text-xs font-medium text-stone-500 uppercase tracking-wider px-6 py-3">
                        Total
                      </th>
                      <th className="text-right text-xs font-medium text-stone-500 uppercase tracking-wider px-6 py-3">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const cfg = statusCfg(order.status);
                      return (
                        <tr
                          key={order.id}
                          onClick={() => navigate(`/admin/orders/${order.id}`)}
                          className="border-b border-stone-50 hover:bg-stone-50 cursor-pointer transition-colors last:border-0"
                        >
                          <td className="px-6 py-3">
                            <span className="text-sm font-medium text-stone-800" style={{ fontFamily: 'ui-monospace, monospace' }}>
                              {order.orderNumber}
                            </span>
                            <span className="text-xs text-stone-400 ml-2">
                              {order.itemCount} item{order.itemCount !== 1 ? 's' : ''}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <span
                              className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}
                            >
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <span className="text-sm font-medium text-stone-800">
                              {formatCurrency(order.total)}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <span className="text-sm text-stone-500">
                              {formatDate(order.createdAt)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* =============================================================== */}
        {/* RIGHT COLUMN (1/3)                                              */}
        {/* =============================================================== */}
        <div className="space-y-6">
          {/* ----- Customer Info card -------------------------------------- */}
          <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-6">
            <h3
              className="text-sm font-bold text-stone-800 mb-4"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Customer Info
            </h3>

            <dl className="space-y-3">
              {/* Email */}
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-stone-400 mb-0.5">
                  <Mail className="w-3.5 h-3.5" />
                  Email
                </dt>
                <dd className="flex items-center gap-2">
                  <span className="text-sm text-stone-700 truncate">{customer.email}</span>
                  <button
                    onClick={handleCopyEmail}
                    className="flex-shrink-0 text-stone-400 hover:text-stone-600 transition-colors"
                    title="Copy email"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </dd>
              </div>

              {/* Phone */}
              {primaryPhone && (
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-stone-400 mb-0.5">
                    <Phone className="w-3.5 h-3.5" />
                    Phone
                  </dt>
                  <dd className="text-sm text-stone-700">{primaryPhone}</dd>
                </div>
              )}

              {/* Stripe ID */}
              {customer.stripeCustomerId && (
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-stone-400 mb-0.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    Stripe ID
                  </dt>
                  <dd className="text-xs text-stone-500" style={{ fontFamily: 'ui-monospace, monospace' }}>
                    {customer.stripeCustomerId}
                  </dd>
                </div>
              )}

              {/* Last Login */}
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-stone-400 mb-0.5">
                  <Clock className="w-3.5 h-3.5" />
                  Last Login
                </dt>
                <dd className="text-sm text-stone-700">
                  {timeAgo(customer.lastLoginAt)}
                </dd>
              </div>

              {/* Account Created */}
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-stone-400 mb-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Account Created
                </dt>
                <dd className="text-sm text-stone-700">
                  {formatDate(customer.createdAt)}
                </dd>
              </div>
            </dl>
          </div>

          {/* ----- Shipping Addresses card -------------------------------- */}
          <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-6">
            <h3
              className="text-sm font-bold text-stone-800 mb-4"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Shipping Addresses
            </h3>

            {addresses.length === 0 ? (
              <div className="text-center py-4">
                <MapPin className="w-6 h-6 text-stone-300 mx-auto mb-1.5" />
                <p className="text-xs text-stone-400">No addresses on file</p>
              </div>
            ) : (
              <div className="space-y-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="border border-stone-100 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-stone-800">
                        {addr.firstName} {addr.lastName}
                      </p>
                      {addr.isDefault && (
                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-stone-500 leading-relaxed">
                      <p>{addr.address}</p>
                      <p>
                        {addr.city}
                        {addr.state ? `, ${addr.state}` : ''} {addr.postcode}
                      </p>
                      <p>{addr.country}</p>
                    </div>
                    {addr.phone && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-stone-400">
                        <Phone className="w-3 h-3" />
                        {addr.phone}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
