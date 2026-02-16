import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';
import {
  Package,
  Users,
  Mail,
  ShoppingBag,
  MessageSquare,
  Gift,
  BellRing,
  Calendar,
  ShoppingCart,
  Download,
  Loader2,
  X,
  CheckCircle,
  Database,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExportCard {
  key: string;
  title: string;
  description: string;
  icon: React.ElementType;
  endpoint: string;
  filename: string;
  countKey: string;
}

interface ExportSummary {
  orders: number | null;
  customers: number | null;
  subscribers: number | null;
  products: number | null;
  reviews: number | null;
  giftCards: number | null;
  waitlist: number | null;
  bookings: number | null;
  abandonedCarts: number | null;
}

// ---------------------------------------------------------------------------
// Card definitions
// ---------------------------------------------------------------------------

const EXPORT_CARDS: ExportCard[] = [
  {
    key: 'orders',
    title: 'Orders',
    description: 'Order history with customer details, amounts, and status',
    icon: Package,
    endpoint: '/orders/export',
    filename: 'orders.csv',
    countKey: 'orders',
  },
  {
    key: 'customers',
    title: 'Customers',
    description: 'Customer accounts with registration dates',
    icon: Users,
    endpoint: '/customers/export',
    filename: 'customers.csv',
    countKey: 'customers',
  },
  {
    key: 'subscribers',
    title: 'Subscribers',
    description: 'Newsletter subscribers with tags and engagement',
    icon: Mail,
    endpoint: '/subscribers/export',
    filename: 'subscribers.csv',
    countKey: 'subscribers',
  },
  {
    key: 'products',
    title: 'Products',
    description: 'Product catalog with pricing, inventory, and ratings',
    icon: ShoppingBag,
    endpoint: '/data-export/products',
    filename: 'products.csv',
    countKey: 'products',
  },
  {
    key: 'reviews',
    title: 'Reviews',
    description: 'Product reviews with ratings and moderation status',
    icon: MessageSquare,
    endpoint: '/data-export/reviews',
    filename: 'reviews.csv',
    countKey: 'reviews',
  },
  {
    key: 'giftCards',
    title: 'Gift Cards',
    description: 'Gift cards with balances and transaction history',
    icon: Gift,
    endpoint: '/data-export/gift-cards',
    filename: 'gift-cards.csv',
    countKey: 'giftCards',
  },
  {
    key: 'waitlist',
    title: 'Waitlist',
    description: 'Waitlist entries for out-of-stock products',
    icon: BellRing,
    endpoint: '/data-export/waitlist',
    filename: 'waitlist.csv',
    countKey: 'waitlist',
  },
  {
    key: 'bookings',
    title: 'Bookings',
    description: 'Coaching session bookings and scheduling',
    icon: Calendar,
    endpoint: '/data-export/bookings',
    filename: 'bookings.csv',
    countKey: 'bookings',
  },
  {
    key: 'abandonedCarts',
    title: 'Abandoned Carts',
    description: 'Abandoned cart data for recovery analysis',
    icon: ShoppingCart,
    endpoint: '/data-export/abandoned-carts',
    filename: 'abandoned-carts.csv',
    countKey: 'abandonedCarts',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DataExport() {
  const { accessToken } = useAuth();

  // Record counts
  const [counts, setCounts] = useState<ExportSummary>({
    orders: null,
    customers: null,
    subscribers: null,
    products: null,
    reviews: null,
    giftCards: null,
    waitlist: null,
    bookings: null,
    abandonedCarts: null,
  });
  const [countsLoading, setCountsLoading] = useState(true);

  // Per-card download state
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // ---------- Fetch counts ----------

  const fetchCounts = useCallback(async () => {
    if (!accessToken) return;
    setCountsLoading(true);
    try {
      // Fetch the data-export summary (products, reviews, giftCards, waitlist, bookings, abandonedCarts)
      const summaryRes = await fetch(`${API_BASE}/data-export/summary`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      let summaryData: Partial<ExportSummary> = {};
      if (summaryRes.ok) {
        summaryData = await summaryRes.json();
      }

      // Fetch counts for orders, customers, subscribers from their list endpoints
      const [ordersRes, customersRes, subscribersRes] = await Promise.allSettled([
        fetch(`${API_BASE}/orders?limit=1`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${API_BASE}/customers?limit=1`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${API_BASE}/subscribers?limit=1`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);

      let ordersCount: number | null = null;
      let customersCount: number | null = null;
      let subscribersCount: number | null = null;

      if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
        const data = await ordersRes.value.json();
        ordersCount = data.pagination?.total ?? data.total ?? null;
      }
      if (customersRes.status === 'fulfilled' && customersRes.value.ok) {
        const data = await customersRes.value.json();
        customersCount = data.pagination?.total ?? data.total ?? null;
      }
      if (subscribersRes.status === 'fulfilled' && subscribersRes.value.ok) {
        const data = await subscribersRes.value.json();
        subscribersCount = data.pagination?.total ?? data.total ?? null;
      }

      setCounts({
        orders: ordersCount,
        customers: customersCount,
        subscribers: subscribersCount,
        products: summaryData.products ?? null,
        reviews: summaryData.reviews ?? null,
        giftCards: summaryData.giftCards ?? null,
        waitlist: summaryData.waitlist ?? null,
        bookings: summaryData.bookings ?? null,
        abandonedCarts: summaryData.abandonedCarts ?? null,
      });
    } catch {
      // Silently handle — counts will show as "—"
    } finally {
      setCountsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // ---------- Download handler ----------

  const handleDownload = async (endpoint: string, filename: string) => {
    setDownloading((prev) => ({ ...prev, [filename]: true }));
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      showToast('success', `${filename} downloaded successfully.`);
    } catch (err) {
      console.error('Export error:', err);
      showToast('error', `Failed to export ${filename}. Please try again.`);
    } finally {
      setDownloading((prev) => ({ ...prev, [filename]: false }));
    }
  };

  // ---------- Helpers ----------

  const formatCount = (key: string): string => {
    const value = counts[key as keyof ExportSummary];
    if (value === null || value === undefined) return '\u2014';
    return value.toLocaleString();
  };

  // ---------- Render ----------

  return (
    <div className="min-h-screen bg-stone-50 p-6 md:p-10">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Database className="text-[#8d3038]" size={28} />
          <h1 className="text-2xl font-serif font-bold text-stone-800">Data Export</h1>
        </div>
        <p className="text-stone-500">Download your data as CSV files</p>
      </div>

      {/* Export cards grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
        {EXPORT_CARDS.map((card) => {
          const Icon = card.icon;
          const isDownloading = downloading[card.filename] || false;
          const count = formatCount(card.countKey);

          return (
            <div
              key={card.key}
              className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 flex flex-col"
            >
              <div className="flex items-start gap-4 mb-4">
                {/* Icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center">
                  <Icon size={20} className="text-stone-600" />
                </div>

                {/* Title + description */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-stone-800">{card.title}</h3>
                  <p className="text-sm text-stone-500 mt-0.5 leading-snug">
                    {card.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-auto pt-3 border-t border-stone-100">
                {/* Record count */}
                <div className="text-sm text-stone-500">
                  {countsLoading ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={14} className="animate-spin text-stone-400" />
                      Loading...
                    </span>
                  ) : (
                    <span>
                      <span className="font-medium text-stone-700">{count}</span> records
                    </span>
                  )}
                </div>

                {/* Download button */}
                <button
                  onClick={() => handleDownload(card.endpoint, card.filename)}
                  disabled={isDownloading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white bg-[#8d3038] hover:bg-[#6b2228] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      Download CSV
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-2">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {toast.type === 'success' && <CheckCircle size={16} className="text-green-600" />}
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
