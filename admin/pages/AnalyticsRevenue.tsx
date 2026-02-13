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
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Star,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';

// --- Types ---

interface RevenueData {
  revenueTrend: Array<{ date: string; revenue: number; orderCount: number }>;
  ordersByStatus: Array<{ status: string; count: number }>;
  revenueByType: Array<{ productType: string; revenue: number }>;
  productLeaderboard: Array<{
    id: string;
    name: string;
    productType: string;
    unitsSold: number;
    revenue: number;
    avgRating: number | null;
  }>;
  aovTrend: Array<{ date: string; aov: number }>;
  lowStock: Array<{ id: string; name: string; quantity: number; productType: string }>;
}

type DateRange = '7d' | '30d' | '90d' | 'all';
type SortField = 'name' | 'productType' | 'unitsSold' | 'revenue' | 'avgRating';
type SortDir = 'asc' | 'desc';

// --- Formatting helpers ---

function formatCurrency(amount: number): string {
  if (amount === 0) return '\u00a30';
  if (Number.isInteger(amount)) {
    return `\u00a3${amount.toLocaleString()}`;
  }
  return `\u00a3${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
}

function getRangeParams(range: DateRange): { from: string; to: string } {
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
    <div className="bg-white border border-stone-200 rounded-lg shadow-sm px-3 py-2 text-xs">
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
    <div className="bg-white border border-stone-200 rounded-lg shadow-sm px-3 py-2 text-xs">
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
  cancelled: 'bg-red-500',
  refunded: 'bg-stone-400',
  failed: 'bg-red-500',
};

const TYPE_COLORS: Record<string, string> = {
  physical: 'bg-blue-500',
  digital: 'bg-violet-500',
  workshop: 'bg-indigo-500',
  coaching: 'bg-amber-500',
  service: 'bg-rose-500',
};

const TYPE_BADGE_STYLES: Record<string, string> = {
  physical: 'bg-blue-50 text-blue-700',
  digital: 'bg-violet-50 text-violet-700',
  workshop: 'bg-indigo-50 text-indigo-700',
  coaching: 'bg-amber-50 text-amber-700',
  service: 'bg-rose-50 text-rose-700',
};

// --- Skeleton loader ---

function RevenueSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-48 bg-stone-100 rounded-md" />
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-12 bg-stone-100 rounded-full" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-stone-100 rounded-lg h-64" />
        <div className="bg-stone-100 rounded-lg h-64" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-stone-100 rounded-lg h-48" />
        <div className="bg-stone-100 rounded-lg h-48" />
      </div>
      <div className="bg-stone-100 rounded-lg h-72" />
    </div>
  );
}

// --- Main component ---

export default function AnalyticsRevenue() {
  const { token } = useAuth();
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState<DateRange>('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [sortField, setSortField] = useState<SortField>('revenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) return;
      try {
        const { from, to } = getRangeParams(range);
        const res = await fetch(`${API_BASE}/analytics/revenue?from=${from}&to=${to}`, {
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
    [token, range],
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

  const chartTickFormatter = useMemo(() => {
    return (value: string, index: number) => {
      const interval = range === '7d' ? 1 : range === '30d' ? 7 : range === '90d' ? 14 : 30;
      if (index % interval === 0) return formatChartDate(value);
      return '';
    };
  }, [range]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortedLeaderboard = useMemo(() => {
    if (!data) return [];
    const items = [...data.productLeaderboard];
    items.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      if (sortField === 'avgRating') {
        aVal = aVal ?? -1;
        bVal = bVal ?? -1;
      }
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return items;
  }, [data, sortField, sortDir]);

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

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronDown size={12} className="text-stone-300" />;
    return sortDir === 'asc' ? (
      <ChevronUp size={12} className="text-stone-600" />
    ) : (
      <ChevronDown size={12} className="text-stone-600" />
    );
  }

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-stone-900">Revenue & Products</h1>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-md transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
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
                  tickFormatter={(v) => `\u00a3${v.toLocaleString()}`}
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
                  tickFormatter={(v) => `\u00a3${v.toLocaleString()}`}
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
              data.ordersByStatus.map((item) => (
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

      {/* --- Product Leaderboard --- */}
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
          Product Leaderboard
        </h3>
        {sortedLeaderboard.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider py-2 px-2 w-8">
                    #
                  </th>
                  <th
                    className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider py-2 px-2 cursor-pointer select-none hover:text-stone-700 transition"
                    onClick={() => handleSort('name')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Product <SortIcon field="name" />
                    </span>
                  </th>
                  <th
                    className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider py-2 px-2 cursor-pointer select-none hover:text-stone-700 transition"
                    onClick={() => handleSort('productType')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Type <SortIcon field="productType" />
                    </span>
                  </th>
                  <th
                    className="text-right text-xs font-medium text-stone-500 uppercase tracking-wider py-2 px-2 cursor-pointer select-none hover:text-stone-700 transition"
                    onClick={() => handleSort('unitsSold')}
                  >
                    <span className="inline-flex items-center gap-1 justify-end">
                      Units Sold <SortIcon field="unitsSold" />
                    </span>
                  </th>
                  <th
                    className="text-right text-xs font-medium text-stone-500 uppercase tracking-wider py-2 px-2 cursor-pointer select-none hover:text-stone-700 transition"
                    onClick={() => handleSort('revenue')}
                  >
                    <span className="inline-flex items-center gap-1 justify-end">
                      Revenue <SortIcon field="revenue" />
                    </span>
                  </th>
                  <th
                    className="text-right text-xs font-medium text-stone-500 uppercase tracking-wider py-2 px-2 cursor-pointer select-none hover:text-stone-700 transition"
                    onClick={() => handleSort('avgRating')}
                  >
                    <span className="inline-flex items-center gap-1 justify-end">
                      Rating <SortIcon field="avgRating" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedLeaderboard.map((product, index) => {
                  const badgeStyle = TYPE_BADGE_STYLES[product.productType] || 'bg-stone-100 text-stone-600';
                  return (
                    <tr
                      key={product.id}
                      className={`border-b border-stone-100 last:border-b-0 hover:bg-stone-50 transition ${
                        index % 2 === 1 ? 'bg-stone-50/50' : ''
                      }`}
                    >
                      <td className="py-2.5 px-2 text-stone-400 font-medium">{index + 1}</td>
                      <td className="py-2.5 px-2 text-stone-700">{product.name}</td>
                      <td className="py-2.5 px-2">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium capitalize ${badgeStyle}`}>
                          {product.productType}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right text-stone-700">{formatNumber(product.unitsSold)}</td>
                      <td className="py-2.5 px-2 text-right font-medium text-stone-900">{formatCurrency(product.revenue)}</td>
                      <td className="py-2.5 px-2 text-right">
                        {product.avgRating !== null ? (
                          <span className="inline-flex items-center gap-1 text-stone-700">
                            <Star size={12} className="text-amber-400 fill-amber-400" />
                            {product.avgRating.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-stone-400">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-stone-400 py-4 text-center">No product data</p>
        )}
      </div>

      {/* --- Low Stock Alerts --- */}
      {data.lowStock.length > 0 && (
        <div className="bg-white border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-500" />
            <h3 className="text-xs font-medium text-amber-700 uppercase tracking-wider">
              Low Stock Alerts
            </h3>
          </div>
          <div className="space-y-0">
            {data.lowStock.map((item) => {
              const badgeStyle = TYPE_BADGE_STYLES[item.productType] || 'bg-stone-100 text-stone-600';
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2 border-b border-amber-100 last:border-b-0"
                >
                  <span className="flex-1 text-sm text-stone-700">{item.name}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium capitalize ${badgeStyle}`}>
                    {item.productType}
                  </span>
                  <span className="text-sm font-medium text-amber-700">
                    {item.quantity} left
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
