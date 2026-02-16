import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE, resolveImageUrl } from '../config/api';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  MapPin,
  Phone,
  Save,
  Loader2,
  ExternalLink,
  StickyNote,
  CircleDot,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: string;
  shipping: string;
  tax: string;
  total: string;
  currency: string;
  shippingFirstName: string;
  shippingLastName: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingPostcode: string;
  shippingCountry: string;
  shippingPhone: string | null;
  paymentStatus: PaymentStatus;
  stripePaymentIntentId: string | null;
  stripeCheckoutSessionId: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  notes: string | null;
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
}

interface OrderItem {
  id: string;
  productName: string;
  productImage: string | null;
  price: string;
  quantity: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: string | number, currency: string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency || 'AUD',
  }).format(num);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pending', bg: 'bg-stone-100', text: 'text-stone-700' },
  confirmed: { label: 'Confirmed', bg: 'bg-blue-100', text: 'text-blue-700' },
  shipped: { label: 'Shipped', bg: 'bg-amber-100', text: 'text-amber-700' },
  delivered: { label: 'Delivered', bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-700' },
};

const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'Payment Pending', bg: 'bg-stone-100', text: 'text-stone-700' },
  paid: { label: 'Paid', bg: 'bg-green-100', text: 'text-green-700' },
  failed: { label: 'Payment Failed', bg: 'bg-red-100', text: 'text-red-700' },
  refunded: { label: 'Refunded', bg: 'bg-purple-100', text: 'text-purple-700' },
};

// ---------------------------------------------------------------------------
// Toast Component
// ---------------------------------------------------------------------------

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

let toastIdCounter = 0;

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${
            t.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({ status, large }: { status: OrderStatus; large?: boolean }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${cfg.bg} ${cfg.text} ${
        large ? 'px-4 py-1.5 text-sm' : 'px-2.5 py-0.5 text-xs'
      }`}
    >
      {cfg.label}
    </span>
  );
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const cfg = PAYMENT_STATUS_CONFIG[status] || PAYMENT_STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [notes, setNotes] = useState('');

  // Saving states
  const [savingTracking, setSavingTracking] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // -------------------------------------------------------------------------
  // Fetch order
  // -------------------------------------------------------------------------

  const fetchOrder = useCallback(async () => {
    if (!id || !accessToken) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/orders/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to load order (${res.status})`);
      }
      const data = await res.json();
      setOrder(data.order);
      setItems(data.items || []);
      setTrackingNumber(data.order.trackingNumber || '');
      setTrackingUrl(data.order.trackingUrl || '');
      setNotes(data.order.notes || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [id, accessToken]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // -------------------------------------------------------------------------
  // Update status
  // -------------------------------------------------------------------------

  const updateStatus = async (newStatus: OrderStatus) => {
    if (!id || !accessToken || !order) return;
    try {
      setUpdatingStatus(newStatus);
      const res = await fetch(`${API_BASE}/orders/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update status');
      }
      addToast(`Order marked as ${newStatus}`, 'success');
      await fetchOrder();
    } catch (err: any) {
      addToast(err.message || 'Failed to update status', 'error');
    } finally {
      setUpdatingStatus(null);
    }
  };

  // -------------------------------------------------------------------------
  // Save tracking
  // -------------------------------------------------------------------------

  const saveTracking = async () => {
    if (!id || !accessToken) return;
    try {
      setSavingTracking(true);
      const res = await fetch(`${API_BASE}/orders/${id}/tracking`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ trackingNumber, trackingUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save tracking');
      }
      addToast('Tracking information saved', 'success');
      await fetchOrder();
    } catch (err: any) {
      addToast(err.message || 'Failed to save tracking', 'error');
    } finally {
      setSavingTracking(false);
    }
  };

  // -------------------------------------------------------------------------
  // Save notes
  // -------------------------------------------------------------------------

  const saveNotes = async () => {
    if (!id || !accessToken) return;
    try {
      setSavingNotes(true);
      const res = await fetch(`${API_BASE}/orders/${id}/notes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save notes');
      }
      addToast('Notes saved', 'success');
      await fetchOrder();
    } catch (err: any) {
      addToast(err.message || 'Failed to save notes', 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  // -------------------------------------------------------------------------
  // Loading / Error states
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
        <span className="ml-2 text-sm text-stone-500">Loading order...</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-stone-700 font-medium mb-1">Failed to load order</p>
        <p className="text-sm text-stone-500 mb-4">{error}</p>
        <button
          onClick={() => navigate('/admin/orders')}
          className="text-sm font-medium underline"
          style={{ color: '#8d3038' }}
        >
          Back to Orders
        </button>
      </div>
    );
  }

  const currency = order.currency || 'AUD';

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <ToastContainer toasts={toasts} />

      {/* Back navigation */}
      <button
        onClick={() => navigate('/admin/orders')}
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </button>

      {/* Order header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: 'ui-monospace, monospace' }}>
            {order.orderNumber}
          </h1>
          <StatusBadge status={order.status} />
          <PaymentBadge status={order.paymentStatus} />
        </div>
        <p className="text-sm text-stone-500">
          Placed on {formatDateTime(order.createdAt)}
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ============================================================= */}
        {/* LEFT COLUMN (2/3) */}
        {/* ============================================================= */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <h2 className="text-sm font-semibold text-stone-800 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Order Items
            </h2>

            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-3 border-b border-stone-100 last:border-0">
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                    {item.productImage ? (
                      <img
                        src={resolveImageUrl(item.productImage)}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-stone-300" />
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{item.productName}</p>
                    <p className="text-xs text-stone-500">
                      {formatCurrency(item.price, currency)} x {item.quantity}
                    </p>
                  </div>

                  {/* Line total */}
                  <p className="text-sm font-medium text-stone-800">
                    {formatCurrency((parseFloat(item.price) || 0) * item.quantity, currency)}
                  </p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 pt-4 border-t border-stone-200 space-y-2">
              <div className="flex justify-between text-sm text-stone-600">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-sm text-stone-600">
                <span>Shipping</span>
                <span>{formatCurrency(order.shipping, currency)}</span>
              </div>
              <div className="flex justify-between text-sm text-stone-600">
                <span>Tax</span>
                <span>{formatCurrency(order.tax, currency)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-stone-900 pt-2 border-t border-stone-100">
                <span>Total</span>
                <span>{formatCurrency(order.total, currency)}</span>
              </div>
            </div>
          </div>

          {/* Tracking Information */}
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <h2 className="text-sm font-semibold text-stone-800 mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Tracking Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Tracking Number</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. 1Z999AA10123456784"
                  className="w-full bg-white border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Tracking URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 bg-white border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                  {trackingUrl && (
                    <a
                      href={trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-2 border border-stone-200 rounded-md text-stone-500 hover:text-stone-700 hover:bg-stone-50 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {trackingNumber && order.status === 'confirmed' && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-md px-3 py-2">
                  Adding tracking will automatically mark this order as shipped.
                </p>
              )}

              <button
                onClick={saveTracking}
                disabled={savingTracking}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: savingTracking ? '#a0a0a0' : '#8d3038' }}
                onMouseEnter={(e) => {
                  if (!savingTracking) (e.currentTarget.style.backgroundColor = '#6b2228');
                }}
                onMouseLeave={(e) => {
                  if (!savingTracking) (e.currentTarget.style.backgroundColor = '#8d3038');
                }}
              >
                {savingTracking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Tracking
              </button>
            </div>
          </div>

          {/* Internal Notes */}
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <h2 className="text-sm font-semibold text-stone-800 mb-4 flex items-center gap-2">
              <StickyNote className="w-4 h-4" />
              Internal Notes
            </h2>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Private notes about this order (not visible to customer)..."
              className="w-full bg-white border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 resize-y"
            />

            <button
              onClick={saveNotes}
              disabled={savingNotes}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: savingNotes ? '#a0a0a0' : '#8d3038' }}
              onMouseEnter={(e) => {
                if (!savingNotes) (e.currentTarget.style.backgroundColor = '#6b2228');
              }}
              onMouseLeave={(e) => {
                if (!savingNotes) (e.currentTarget.style.backgroundColor = '#8d3038');
              }}
            >
              {savingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Notes
            </button>
          </div>
        </div>

        {/* ============================================================= */}
        {/* RIGHT COLUMN (1/3) */}
        {/* ============================================================= */}
        <div className="space-y-6">
          {/* Status Actions */}
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <h2 className="text-sm font-semibold text-stone-800 mb-4">Status Actions</h2>

            <div className="flex justify-center mb-5">
              <StatusBadge status={order.status} large />
            </div>

            <div className="space-y-2">
              {order.status === 'pending' && (
                <>
                  <button
                    onClick={() => updateStatus('confirmed')}
                    disabled={!!updatingStatus}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {updatingStatus === 'confirmed' && <Loader2 className="w-4 h-4 animate-spin" />}
                    <CheckCircle className="w-4 h-4" />
                    Confirm Order
                  </button>
                  <button
                    onClick={() => updateStatus('cancelled')}
                    disabled={!!updatingStatus}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium text-red-600 border border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {updatingStatus === 'cancelled' && <Loader2 className="w-4 h-4 animate-spin" />}
                    <XCircle className="w-4 h-4" />
                    Cancel Order
                  </button>
                </>
              )}

              {order.status === 'confirmed' && (
                <>
                  <button
                    onClick={() => updateStatus('shipped')}
                    disabled={!!updatingStatus}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 transition-colors disabled:opacity-50"
                  >
                    {updatingStatus === 'shipped' && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Truck className="w-4 h-4" />
                    Mark as Shipped
                  </button>
                  <button
                    onClick={() => updateStatus('cancelled')}
                    disabled={!!updatingStatus}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium text-red-600 border border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {updatingStatus === 'cancelled' && <Loader2 className="w-4 h-4 animate-spin" />}
                    <XCircle className="w-4 h-4" />
                    Cancel Order
                  </button>
                </>
              )}

              {order.status === 'shipped' && (
                <>
                  <button
                    onClick={() => updateStatus('delivered')}
                    disabled={!!updatingStatus}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {updatingStatus === 'delivered' && <Loader2 className="w-4 h-4 animate-spin" />}
                    <CheckCircle className="w-4 h-4" />
                    Mark as Delivered
                  </button>
                  <button
                    onClick={() => updateStatus('cancelled')}
                    disabled={!!updatingStatus}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium text-red-600 border border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {updatingStatus === 'cancelled' && <Loader2 className="w-4 h-4 animate-spin" />}
                    <XCircle className="w-4 h-4" />
                    Cancel Order
                  </button>
                </>
              )}

              {(order.status === 'delivered' || order.status === 'cancelled') && (
                <p className="text-xs text-center text-stone-400 py-2">
                  No further status changes available.
                </p>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <h2 className="text-sm font-semibold text-stone-800 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Customer Information
            </h2>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-stone-800">
                  {order.shippingFirstName} {order.shippingLastName}
                </p>
              </div>

              <div className="text-sm text-stone-600 leading-relaxed">
                <p>{order.shippingAddress}</p>
                <p>
                  {order.shippingCity}
                  {order.shippingState ? `, ${order.shippingState}` : ''} {order.shippingPostcode}
                </p>
                <p>{order.shippingCountry}</p>
              </div>

              {order.shippingPhone && (
                <div className="flex items-center gap-2 text-sm text-stone-600 pt-1">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  <span>{order.shippingPhone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Timeline */}
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <h2 className="text-sm font-semibold text-stone-800 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Order Timeline
            </h2>

            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-stone-200" />

              <div className="space-y-4">
                {/* Order placed — always shown */}
                <TimelineEntry
                  label="Order placed"
                  date={order.createdAt}
                  color="bg-stone-400"
                  active
                />

                {/* Payment received */}
                <TimelineEntry
                  label="Payment received"
                  date={order.paidAt}
                  color="bg-green-500"
                  active={!!order.paidAt}
                />

                {/* Shipped */}
                <TimelineEntry
                  label="Shipped"
                  date={order.shippedAt}
                  color="bg-amber-500"
                  active={!!order.shippedAt}
                />

                {/* Delivered */}
                <TimelineEntry
                  label="Delivered"
                  date={order.deliveredAt}
                  color="bg-green-600"
                  active={!!order.deliveredAt}
                />

                {/* Cancelled */}
                {order.cancelledAt && (
                  <TimelineEntry
                    label="Cancelled"
                    date={order.cancelledAt}
                    color="bg-red-500"
                    active
                    isRed
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline Entry
// ---------------------------------------------------------------------------

function TimelineEntry({
  label,
  date,
  color,
  active,
  isRed,
}: {
  label: string;
  date: string | null;
  color: string;
  active: boolean;
  isRed?: boolean;
}) {
  return (
    <div className="relative flex items-start gap-3 pl-0">
      {/* Dot */}
      <div
        className={`relative z-10 w-[15px] h-[15px] rounded-full border-2 flex-shrink-0 mt-0.5 ${
          active
            ? `${color} border-white shadow-sm`
            : 'bg-white border-stone-200'
        }`}
      />

      {/* Content */}
      <div className="min-w-0">
        <p className={`text-sm font-medium ${isRed ? 'text-red-600' : active ? 'text-stone-800' : 'text-stone-400'}`}>
          {label}
        </p>
        {date && active ? (
          <p className={`text-xs mt-0.5 ${isRed ? 'text-red-400' : 'text-stone-500'}`}>
            {formatDateTime(date)}
          </p>
        ) : !active ? (
          <p className="text-xs text-stone-300 mt-0.5">--</p>
        ) : null}
      </div>
    </div>
  );
}
