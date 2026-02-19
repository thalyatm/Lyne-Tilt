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
  Legend,
} from 'recharts';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Mail,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Eye,
  MousePointerClick,
  BookOpen,
  X,
  Calendar,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';

// ─── Types ─────────────────────────────────────────────────

interface KpiValue {
  value: number;
  change?: number;
}

interface OverviewData {
  kpis: {
    revenue: KpiValue;
    orders: KpiValue;
    aov: KpiValue;
    visitors: KpiValue;
    emailsSent: KpiValue;
    conversionRate: { value: number };
    openRate: { value: number };
    clickRate: { value: number };
  };
  revenueTimeSeries: Array<{ date: string; value: number }>;
  revenueByCategoryTimeSeries: Array<{ date: string; category: string; value: number }>;
  topPosts: Array<{ id: string; title: string; views: number }>;
  subscribers: { total: number; newCount: number };
  services: {
    workshopEnrollments: number;
    coachingBookings: number;
  };
}

type DateRange = '7d' | '30d' | '90d' | 'all' | 'custom';

const PRODUCT_TYPES = [
  { label: 'All Categories', value: '' },
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

// ─── Formatting helpers ────────────────────────────────────

function formatCurrency(amount: number): string {
  if (amount === 0) return '$0';
  if (amount >= 5000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatPercent(rate: number): string {
  return `${rate.toFixed(1)}%`;
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

// ─── Chart tooltip ─────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const isMulti = payload.length > 1;
  return (
    <div className="bg-white border border-stone-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="text-stone-500 mb-0.5">{formatChartDate(label)}</p>
      {isMulti ? (
        <div className="space-y-0.5">
          {payload.filter((p: any) => p.value > 0).map((p: any) => (
            <div key={p.dataKey} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-stone-600">{p.name}:</span>
              <span className="font-medium text-stone-800">${typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="font-medium text-stone-800">
          {'$'}{typeof payload[0].value === 'number' ? payload[0].value.toLocaleString() : payload[0].value}
        </p>
      )}
    </div>
  );
}

// ─── Change badge ──────────────────────────────────────────

function ChangeBadge({ change }: { change: number | undefined }) {
  if (change === undefined || change === null) return null;
  const isPositive = change >= 0;
  return (
    <span
      className={`inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${
        isPositive
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-red-50 text-red-700'
      }`}
    >
      {isPositive ? '\u25b2' : '\u25bc'} {Math.round(Math.abs(change))}%
    </span>
  );
}

// ─── Skeleton loader ───────────────────────────────────────

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-32 bg-stone-100 rounded-md" />
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-12 bg-stone-100 rounded-full" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-stone-100 rounded-lg h-[96px]" />
        ))}
      </div>
      <div className="bg-stone-100 rounded-lg h-64" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-stone-100 rounded-lg h-56" />
        <div className="bg-stone-100 rounded-lg h-56" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-stone-100 rounded-lg h-40" />
        <div className="bg-stone-100 rounded-lg h-40" />
      </div>
    </div>
  );
}

type Granularity = 'daily' | 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually';

function aggregateTimeSeries(
  data: Array<{ date: string; value: number }>,
  gran: Granularity,
): Array<{ date: string; value: number }> {
  if (gran === 'daily' || !data.length) return data;
  const buckets = new Map<string, number>();
  for (const point of data) {
    const d = new Date(point.date + 'T00:00:00');
    let key: string;
    if (gran === 'weekly') {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(d);
      mon.setDate(diff);
      key = mon.toISOString().split('T')[0];
    } else if (gran === 'fortnightly') {
      const epoch = Math.floor(d.getTime() / (14 * 86400000));
      key = new Date(epoch * 14 * 86400000).toISOString().split('T')[0];
    } else if (gran === 'monthly') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    } else if (gran === 'quarterly') {
      const q = Math.floor(d.getMonth() / 3);
      key = `${d.getFullYear()}-${String(q * 3 + 1).padStart(2, '0')}-01`;
    } else {
      key = `${d.getFullYear()}-01-01`;
    }
    buckets.set(key, (buckets.get(key) || 0) + point.value);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
}

// ─── Main component ────────────────────────────────────────

export default function AnalyticsHub() {
  const { token } = useAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState<DateRange>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [productType, setProductType] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [granularity, setGranularity] = useState<Granularity>('weekly');
  const [showCategories, setShowCategories] = useState(false);

  const activeFilterCount = [productType, orderStatus].filter(Boolean).length + (range === 'custom' ? 1 : 0);

  const clearFilters = () => {
    setProductType('');
    setOrderStatus('');
    setRange('30d');
    setCustomFrom('');
    setCustomTo('');
  };

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) return;
      try {
        const { from, to } = getRangeParams(range, customFrom, customTo);
        const params = new URLSearchParams({ from, to });
        if (productType) params.set('productType', productType);
        if (orderStatus) params.set('status', orderStatus);
        const res = await fetch(`${API_BASE}/analytics/overview?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });
        if (!res.ok) throw new Error('Failed to load analytics');
        const json: OverviewData = await res.json();
        setData(json);
        setError('');
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setError('Could not load analytics data');
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

  const chartData = useMemo(() => {
    if (!data) return [];
    const sorted = [...data.revenueTimeSeries].sort((a, b) => a.date.localeCompare(b.date));
    return aggregateTimeSeries(sorted, granularity);
  }, [data, granularity]);

  // Category breakdown chart data
  const CATEGORY_COLORS: Record<string, string> = {
    wearable: '#8b5cf6',
    'wall-art': '#f59e0b',
    digital: '#06b6d4',
    coaching: '#ec4899',
    workshop: '#10b981',
    service: '#6366f1',
    uncategorized: '#78716c',
  };

  const CATEGORY_LABELS: Record<string, string> = {
    wearable: 'Wearable Art',
    'wall-art': 'Wall Art',
    digital: 'Digital',
    coaching: 'Coaching',
    workshop: 'Workshop',
    service: 'Service',
    uncategorized: 'Other',
  };

  const { categoryChartData, activeCategories } = useMemo(() => {
    if (!data?.revenueByCategoryTimeSeries?.length) return { categoryChartData: [], activeCategories: [] as string[] };

    // Pivot: group by date, each category becomes a key
    const byDate = new Map<string, Record<string, number>>();
    const cats = new Set<string>();
    for (const row of data.revenueByCategoryTimeSeries) {
      cats.add(row.category);
      if (!byDate.has(row.date)) byDate.set(row.date, {});
      const entry = byDate.get(row.date)!;
      entry[row.category] = (entry[row.category] || 0) + row.value;
    }

    const sortedCats = Array.from(cats).sort();
    const pivoted = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => {
        const row: Record<string, any> = { date };
        for (const cat of sortedCats) {
          row[cat] = vals[cat] || 0;
        }
        return row;
      });

    // Aggregate by granularity
    if (granularity === 'daily') return { categoryChartData: pivoted, activeCategories: sortedCats };

    const buckets = new Map<string, Record<string, number>>();
    for (const point of pivoted) {
      const d = new Date(point.date + 'T00:00:00');
      let key: string;
      if (granularity === 'weekly') {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const mon = new Date(d);
        mon.setDate(diff);
        key = mon.toISOString().split('T')[0];
      } else if (granularity === 'fortnightly') {
        const epoch = Math.floor(d.getTime() / (14 * 86400000));
        key = new Date(epoch * 14 * 86400000).toISOString().split('T')[0];
      } else if (granularity === 'monthly') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      } else if (granularity === 'quarterly') {
        const q = Math.floor(d.getMonth() / 3);
        key = `${d.getFullYear()}-${String(q * 3 + 1).padStart(2, '0')}-01`;
      } else {
        key = `${d.getFullYear()}-01-01`;
      }
      if (!buckets.has(key)) buckets.set(key, {});
      const bucket = buckets.get(key)!;
      for (const cat of sortedCats) {
        bucket[cat] = (bucket[cat] || 0) + (point[cat] || 0);
      }
    }

    const aggregated = Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals }));

    return { categoryChartData: aggregated, activeCategories: sortedCats };
  }, [data, granularity]);

  const renderAxisTick = useCallback(({ x, y, payload, index }: any) => {
    const value = payload?.value;
    if (!value) return null;
    const d = new Date(value + 'T00:00:00');

    if (granularity === 'annually') {
      return (
        <text x={x} y={y + 12} textAnchor="middle" fill="#a8a29e" fontSize={11}>
          {d.getFullYear()}
        </text>
      );
    }

    if (granularity === 'monthly' || granularity === 'quarterly') {
      const label = granularity === 'quarterly'
        ? `Q${Math.floor(d.getMonth() / 3) + 1}`
        : d.toLocaleDateString('en-AU', { month: 'short' });
      const idx = chartData.findIndex((p: any) => p.date === value);
      const prev = idx > 0 ? new Date(chartData[idx - 1].date + 'T00:00:00') : null;
      const showYear = !prev || prev.getFullYear() !== d.getFullYear();

      return (
        <g>
          <text x={x} y={y + 12} textAnchor="middle" fill="#a8a29e" fontSize={11}>
            {label}
          </text>
          {showYear && (
            <text x={x} y={y + 26} textAnchor="middle" fill="#78716c" fontSize={10}>
              {d.getFullYear()}
            </text>
          )}
        </g>
      );
    }

    const interval = range === '7d' ? 1 : range === '30d' ? 7 : range === '90d' ? 14 : 30;
    if (granularity === 'daily' && index % interval !== 0) return null;

    return (
      <text x={x} y={y + 12} textAnchor="middle" fill="#a8a29e" fontSize={11}>
        {formatChartDate(value)}
      </text>
    );
  }, [range, granularity, chartData]);

  // ─── Loading state ───

  if (loading) return <AnalyticsSkeleton />;

  // ─── Error state (no data) ───

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

  const { kpis, revenueTimeSeries, topPosts, subscribers, services } = data;

  // ─── KPI card definitions ───

  const kpiCards = [
    {
      label: 'Revenue',
      value: formatCurrency(kpis.revenue.value),
      change: kpis.revenue.change,
      icon: DollarSign,
      borderColor: '#16a34a',
      accent: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Orders',
      value: formatNumber(kpis.orders.value),
      change: kpis.orders.change,
      icon: ShoppingCart,
      borderColor: '#2563eb',
      accent: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'AOV',
      value: formatCurrency(kpis.aov.value),
      change: kpis.aov.change,
      icon: DollarSign,
      borderColor: '#0891b2',
      accent: 'bg-cyan-50 text-cyan-600',
    },
    {
      label: 'Visitors',
      value: formatNumber(kpis.visitors.value),
      change: kpis.visitors.change,
      icon: Users,
      borderColor: '#7c3aed',
      accent: 'bg-violet-50 text-violet-600',
    },
    {
      label: 'Emails Sent',
      value: formatNumber(kpis.emailsSent.value),
      change: kpis.emailsSent.change,
      icon: Mail,
      borderColor: '#d97706',
      accent: 'bg-amber-50 text-amber-600',
    },
  ];

  const rangeOptions: { label: string; value: DateRange }[] = [
    { label: '7d', value: '7d' },
    { label: '30d', value: '30d' },
    { label: '90d', value: '90d' },
    { label: 'All', value: 'all' },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Header + Date Range + Refresh ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-stone-900">Site Analytics</h1>
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

      {/* ─── Filters bar ─── */}
      <div className="bg-white border border-stone-200 rounded-lg p-3">
        <div className="flex flex-wrap items-end gap-3">
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
                <button onClick={() => { setRange('30d'); setCustomFrom(''); setCustomTo(''); }} className="hover:text-stone-900"><X size={10} /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ─── Inline error banner ─── */}
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

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-stone-200 px-4 py-2.5 flex items-center gap-3"
            style={{ borderLeftWidth: '4px', borderLeftColor: card.borderColor }}
          >
            <div className={`w-7 h-7 rounded-md flex items-center justify-center ${card.accent}`}>
              <card.icon size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xl font-semibold text-stone-900 leading-tight">{card.value}</p>
                <ChangeBadge change={card.change} />
              </div>
              <p className="text-[11px] text-stone-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Revenue Chart ─── */}
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider">
              Revenue Trend
            </h3>
            <button
              onClick={() => setShowCategories(!showCategories)}
              className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition ${
                showCategories
                  ? 'bg-stone-800 text-white'
                  : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
              }`}
              title="Show category breakdown"
            >
              <Layers size={10} />
              Categories
            </button>
          </div>
          <div className="flex gap-0.5">
            {(['daily', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'annually'] as Granularity[]).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-2 py-1 text-[10px] font-medium rounded transition ${
                  granularity === g
                    ? 'bg-stone-800 text-white'
                    : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
                }`}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={showCategories ? categoryChartData : chartData}
              margin={{ top: 4, right: 4, bottom: (granularity === 'monthly' || granularity === 'quarterly') ? 16 : 0, left: 4 }}
            >
              <defs>
                <linearGradient id="analyticsRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
                {activeCategories.map((cat) => (
                  <linearGradient key={cat} id={`catGrad-${cat}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CATEGORY_COLORS[cat] || '#78716c'} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={CATEGORY_COLORS[cat] || '#78716c'} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
              <XAxis
                dataKey="date"
                tick={renderAxisTick}
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
              <Tooltip content={<ChartTooltip />} />
              {showCategories ? (
                activeCategories.map((cat) => (
                  <Area
                    key={cat}
                    type="monotone"
                    dataKey={cat}
                    name={CATEGORY_LABELS[cat] || cat}
                    stroke={CATEGORY_COLORS[cat] || '#78716c'}
                    strokeWidth={2}
                    fill={`url(#catGrad-${cat})`}
                    dot={false}
                    activeDot={{ r: 3, fill: CATEGORY_COLORS[cat] || '#78716c' }}
                    stackId="categories"
                  />
                ))
              ) : (
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#analyticsRevGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#059669' }}
                />
              )}
              {showCategories && (
                <Legend
                  verticalAlign="bottom"
                  height={24}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '10px', color: '#78716c' }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Top Blog Posts ─── */}
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
          Top Blog Posts
        </h3>
        <div className="space-y-0">
          {topPosts.length > 0 ? (
            topPosts.slice(0, 5).map((post, index) => (
              <div
                key={post.id}
                className="flex items-center gap-3 py-2.5 border-b border-stone-100 last:border-b-0"
              >
                <span className="text-sm text-stone-400 w-5 text-right font-medium">
                  {index + 1}
                </span>
                <span className="flex-1 text-sm text-stone-700 truncate">
                  {post.title}
                </span>
                <span className="text-sm text-stone-900 font-medium">
                  {formatNumber(post.views)} views
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-stone-400 py-4 text-center">No post data</p>
          )}
        </div>
        <Link
          to="/admin/analytics/content"
          className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 transition mt-3"
        >
          View all <ArrowRight size={12} />
        </Link>
      </div>

      {/* ─── Email Performance + Services Summary ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Email Performance */}
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-4">
            Email Performance
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Eye size={14} className="text-violet-500" />
                <span className="text-xs text-stone-500">Open Rate</span>
              </div>
              <p className="text-2xl font-semibold text-stone-900">
                {formatPercent(kpis.openRate.value)}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MousePointerClick size={14} className="text-rose-500" />
                <span className="text-xs text-stone-500">Click Rate</span>
              </div>
              <p className="text-2xl font-semibold text-stone-900">
                {formatPercent(kpis.clickRate.value)}
              </p>
            </div>
          </div>
          <Link
            to="/admin/analytics/email"
            className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 transition mt-4"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {/* Services Summary */}
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-4">
            Services
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BookOpen size={14} className="text-blue-500" />
                <span className="text-xs text-stone-500">Workshop Enrollments</span>
              </div>
              <p className="text-2xl font-semibold text-stone-900">
                {formatNumber(services.workshopEnrollments)}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users size={14} className="text-violet-500" />
                <span className="text-xs text-stone-500">Coaching Bookings</span>
              </div>
              <p className="text-2xl font-semibold text-stone-900">
                {formatNumber(services.coachingBookings)}
              </p>
            </div>
          </div>
          <Link
            to="/admin/analytics/services"
            className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 transition mt-4"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
