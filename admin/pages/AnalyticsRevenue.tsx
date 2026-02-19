import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  X,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';

// --- Types ---

interface RevenueData {
  summary: { totalRevenue: number; totalOrders: number; avgOrderValue: number };
  revenueTrend: Array<{ date: string; revenue: number; orderCount: number }>;
  ordersByStatus: Array<{ status: string; count: number }>;
  revenueByType: Array<{ productType: string; revenue: number }>;
  aovTrend: Array<{ date: string; aov: number }>;
  lowStock: Array<{ id: string; name: string; stock: number; productType: string }>;
}

type DateRange = '7d' | '30d' | '90d' | 'all' | 'custom';

// --- Formatting helpers ---

function formatCurrency(amount: number): string {
  if (amount === 0) return '$0';
  if (amount >= 5000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
}

function getRangeParams(range: DateRange, customFrom?: string, customTo?: string): { from: string; to: string } {
  if (range === 'custom' && customFrom && customTo) {
    return { from: customFrom, to: customTo };
  }
  const to = new Date();
  const toStr = to.toISOString().split('T')[0];
  if (range === 'all') {
    return { from: '2020-01-01', to: toStr };
  }
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: from.toISOString().split('T')[0], to: toStr };
}

// --- Chart tooltips ---

function RevenueChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-stone-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-stone-500 mb-0.5">{formatChartDate(label)}</p>
      <p className="font-medium text-stone-800">
        {formatCurrency(payload[0].value)}
      </p>
      {payload[1] && (
        <p className="text-stone-500">{payload[1].value} orders</p>
      )}
    </div>
  );
}

function AovChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-stone-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-stone-500 mb-0.5">{formatChartDate(label)}</p>
      <p className="font-medium text-stone-800">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
}

// --- Status colors ---

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-emerald-500',
  paid: 'bg-emerald-500',
  pending: 'bg-amber-500',
  processing: 'bg-blue-500',
  shipped: 'bg-indigo-500',
  delivered: 'bg-emerald-400',
  confirmed: 'bg-blue-500',
  cancelled: 'bg-red-500',
  refunded: 'bg-stone-400',
  failed: 'bg-red-500',
};

const STATUS_PHASE_ORDER: string[] = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'];

const TYPE_COLORS: Record<string, string> = {
  physical: 'bg-blue-500',
  digital: 'bg-violet-500',
  wearable: 'bg-blue-500',
  'wall-art': 'bg-rose-500',
  workshop: 'bg-indigo-500',
  coaching: 'bg-amber-500',
  service: 'bg-rose-500',
};


const PRODUCT_TYPES = [
  { label: 'All Types', value: '' },
  { label: 'Wearable Art', value: 'wearable' },
  { label: 'Wall Art', value: 'wall-art' },
  { label: 'Digital', value: 'digital' },
  { label: 'Coaching', value: 'coaching' },
  { label: 'Workshop', value: 'workshop' },
  { label: 'Service', value: 'service' },
];

const ORDER_STATUSES = [
  { label: 'All Statuses', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Shipped', value: 'shipped' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Refunded', value: 'refunded' },
];

// --- Skeleton loader ---

function RevenueSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-48 bg-stone-200 rounded-md" />
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-12 bg-stone-200 rounded-full" />
          ))}
        </div>
      </div>
      <div className="bg-stone-200 rounded-lg h-14" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-stone-200 rounded-lg h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-stone-200 rounded-lg h-64" />
        <div className="bg-stone-200 rounded-lg h-64" />
      </div>
    </div>
  );
}

// --- Main component ---

export default function AnalyticsRevenue() {
  const { token } = useAuth();
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState<DateRange>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [productType, setProductType] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const activeFilterCount = [productType, orderStatus].filter(Boolean).length + (range === 'custom' ? 1 : 0);

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) return;
      try {
        const { from, to } = getRangeParams(range, customFrom, customTo);
        const params = new URLSearchParams({ from, to });
        if (productType) params.set('productType', productType);
        if (orderStatus) params.set('status', orderStatus);
        const res = await fetch(`${API_BASE}/analytics/revenue?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });
        if (!res.ok) throw new Error('Failed to load revenue data');
        const json: RevenueData = await res.json();
        setData(json);
        setError('');
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setError('Could not load revenue data');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, range, customFrom, customTo, productType, orderStatus],
  );

  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const clearFilters = () => {
    setProductType('');
    setOrderStatus('');
    setRange('all');
    setCustomFrom('');
    setCustomTo('');
  };

  const chartTickFormatter = useMemo(() => {
    return (value: string, index: number) => {
      const interval = range === '7d' ? 1 : range === '30d' ? 7 : range === '90d' ? 14 : 30;
      if (index % interval === 0) return formatChartDate(value);
      return '';
    };
  }, [range]);

  const rangeOptions: { label: string; value: DateRange }[] = [
    { label: '7d', value: '7d' },
    { label: '30d', value: '30d' },
    { label: '90d', value: '90d' },
    { label: 'All', value: 'all' },
  ];

  // --- Loading state ---

  if (loading) return <RevenueSkeleton />;

  // --- Error state ---

  if (error && !data) {
    return (
      <div className="text-center py-20">
        <AlertCircle size={32} className="mx-auto mb-4 text-stone-300" />
        <p className="text-stone-700 font-medium">{error}</p>
        <p className="text-stone-400 text-sm mt-1 mb-4">
          Check your server connection and try again.
        </p>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 bg-stone-800 text-white text-sm rounded-lg hover:bg-stone-700 transition"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const maxOrderCount = Math.max(...data.ordersByStatus.map((s) => s.count), 1);
  const maxTypeRevenue = Math.max(...data.revenueByType.map((t) => t.revenue), 1);

  return (
    <div className="space-y-6">
      {/* --- Back link + Header --- */}
      <div>
        <Link
          to="/admin/analytics"
          className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 transition mb-3"
        >
          <ArrowLeft size={14} />
          Back to Analytics
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-stone-900">Revenue & Orders</h1>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-md transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
          {/* Date range pills */}
          <div className="flex gap-1">
            {rangeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${
                  range === opt.value
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* --- Filters bar (always visible) --- */}
      <div className="bg-white border border-stone-200 rounded-lg p-3">
        <div className="flex flex-wrap items-end gap-3">
          {/* Category */}
          <div className="min-w-[140px]">
            <label className="block text-[11px] text-stone-400 uppercase tracking-wider mb-1">Category</label>
            <select
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-stone-300"
            >
              {PRODUCT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          {/* Order status */}
          <div className="min-w-[130px]">
            <label className="block text-[11px] text-stone-400 uppercase tracking-wider mb-1">Status</label>
            <select
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-stone-300"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          {/* Date from */}
          <div className="min-w-[140px]">
            <label className="block text-[11px] text-stone-400 uppercase tracking-wider mb-1">From</label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => {
                setCustomFrom(e.target.value);
                if (e.target.value && customTo) setRange('custom');
              }}
              className="w-full px-2.5 py-1.5 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
          </div>
          {/* Date to */}
          <div className="min-w-[140px]">
            <label className="block text-[11px] text-stone-400 uppercase tracking-wider mb-1">To</label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => {
                setCustomTo(e.target.value);
                if (customFrom && e.target.value) setRange('custom');
              }}
              className="w-full px-2.5 py-1.5 text-sm border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
          </div>
          {/* Clear */}
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-stone-400 hover:text-stone-600 transition"
            >
              <X size={12} />
              Clear
            </button>
          )}
        </div>
        {/* Active filter tags */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mt-2.5 pt-2.5 border-t border-stone-100">
            {productType && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                {PRODUCT_TYPES.find(t => t.value === productType)?.label}
                <button onClick={() => setProductType('')} className="hover:text-blue-900"><X size={10} /></button>
              </span>
            )}
            {orderStatus && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-700 rounded-full">
                {ORDER_STATUSES.find(s => s.value === orderStatus)?.label}
                <button onClick={() => setOrderStatus('')} className="hover:text-amber-900"><X size={10} /></button>
              </span>
            )}
            {range === 'custom' && customFrom && customTo && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-stone-100 text-stone-700 rounded-full">
                <Calendar size={10} />
                {customFrom} to {customTo}
                <button onClick={() => { setRange('all'); setCustomFrom(''); setCustomTo(''); }} className="hover:text-stone-900"><X size={10} /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* --- Inline error banner --- */}
      {error && data && (
        <div className="p-3 bg-white border border-red-200 rounded-lg text-sm flex items-start gap-3">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-400" />
          <div>
            <p className="font-medium text-stone-800">{error}</p>
            <p className="text-stone-500 mt-0.5 text-xs">
              Showing previously loaded data. Try refreshing.
            </p>
          </div>
        </div>
      )}

      {/* --- Summary KPI Cards --- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <DollarSign size={16} className="text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">Total Revenue</span>
          </div>
          <p className="text-2xl font-semibold text-stone-900">{formatCurrency(data.summary.totalRevenue)}</p>
          <p className="text-xs text-stone-400 mt-1">AUD</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <ShoppingBag size={16} className="text-blue-600" />
            </div>
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">Total Orders</span>
          </div>
          <p className="text-2xl font-semibold text-stone-900">{formatNumber(data.summary.totalOrders)}</p>
          <p className="text-xs text-stone-400 mt-1">in selected period</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <TrendingUp size={16} className="text-violet-600" />
            </div>
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">Avg Order Value</span>
          </div>
          <p className="text-2xl font-semibold text-stone-900">{formatCurrency(data.summary.avgOrderValue)}</p>
          <p className="text-xs text-stone-400 mt-1">AUD</p>
        </div>
      </div>

      {/* --- Revenue + AOV Charts --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue over time */}
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
            Revenue Over Time
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueTrend} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={chartTickFormatter}
                  tick={{ fontSize: 11, fill: '#a8a29e' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#a8a29e' }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                  tickFormatter={(v) => `$${v.toLocaleString()}`}
                />
                <Tooltip content={<RevenueChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#revenueGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#059669' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Average order value */}
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
            Average Order Value
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.aovTrend} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="aovGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={chartTickFormatter}
                  tick={{ fontSize: 11, fill: '#a8a29e' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#a8a29e' }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                  tickFormatter={(v) => `$${v.toLocaleString()}`}
                />
                <Tooltip content={<AovChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="aov"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fill="url(#aovGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#4f46e5' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- Orders by Status + Revenue by Type --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Orders by status */}
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
            Orders by Status
          </h3>
          <div className="space-y-2.5">
            {data.ordersByStatus.length > 0 ? (
              [...data.ordersByStatus].sort((a, b) => {
                const ai = STATUS_PHASE_ORDER.indexOf(a.status);
                const bi = STATUS_PHASE_ORDER.indexOf(b.status);
                return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
              }).map((item) => (
                <div key={item.status} className="flex items-center gap-3">
                  <span className="text-sm text-stone-600 w-24 capitalize truncate">{item.status}</span>
                  <div className="flex-1 h-5 bg-stone-50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${STATUS_COLORS[item.status] || 'bg-stone-400'}`}
                      style={{ width: `${(item.count / maxOrderCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-stone-700 w-12 text-right">
                    {formatNumber(item.count)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-stone-400 py-4 text-center">No order data</p>
            )}
          </div>
        </div>

        {/* Revenue by type */}
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
            Revenue by Product Type
          </h3>
          <div className="space-y-2.5">
            {data.revenueByType.length > 0 ? (
              data.revenueByType.map((item) => (
                <div key={item.productType} className="flex items-center gap-3">
                  <span className="text-sm text-stone-600 w-24 capitalize truncate">{item.productType}</span>
                  <div className="flex-1 h-5 bg-stone-50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${TYPE_COLORS[item.productType] || 'bg-stone-400'}`}
                      style={{ width: `${(item.revenue / maxTypeRevenue) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-stone-700 w-20 text-right">
                    {formatCurrency(item.revenue)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-stone-400 py-4 text-center">No revenue data</p>
            )}
          </div>
        </div>
      </div>

      {/* --- Low Stock Alert --- */}
      {data.lowStock.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
            Low Stock Alert
          </h3>
          <div className="space-y-2">
            {data.lowStock.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-stone-700">{item.name}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  item.stock === 0 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {item.stock === 0 ? 'Out of stock' : `${item.stock} left`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
