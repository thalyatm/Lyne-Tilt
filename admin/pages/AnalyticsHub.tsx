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
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  Mail,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Eye,
  MousePointerClick,
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
    visitors: KpiValue;
    emailsSent: KpiValue;
    conversionRate: { value: number };
    openRate: { value: number };
    clickRate: { value: number };
  };
  revenueTimeSeries: Array<{ date: string; value: number }>;
  topProducts: Array<{ id: string; name: string; revenue: number; unitsSold: number }>;
  topPosts: Array<{ id: string; title: string; views: number }>;
  subscribers: { total: number; newCount: number };
}

type DateRange = '7d' | '30d' | '90d' | 'all';

// ─── Formatting helpers ────────────────────────────────────

function formatCurrency(amount: number): string {
  if (amount === 0) return '$0';
  if (Number.isInteger(amount)) {
    return `$${amount.toLocaleString()}`;
  }
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

// ─── Chart tooltip ─────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-stone-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="text-stone-500 mb-0.5">{formatChartDate(label)}</p>
      <p className="font-medium text-stone-800">
        {'$'}{typeof payload[0].value === 'number' ? payload[0].value.toLocaleString() : payload[0].value}
      </p>
    </div>
  );
}

// ─── Change badge ──────────────────────────────────────────

function ChangeBadge({ change }: { change: number | undefined }) {
  if (change === undefined || change === null) return null;
  const isPositive = change >= 0;
  return (
    <span
      className={`inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
        isPositive
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-red-50 text-red-700'
      }`}
    >
      {isPositive ? '\u25b2' : '\u25bc'} {Math.abs(change).toFixed(1)}%
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
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

// ─── Main component ────────────────────────────────────────

export default function AnalyticsHub() {
  const { token } = useAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState<DateRange>('30d');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) return;
      try {
        const { from, to } = getRangeParams(range);
        const res = await fetch(`${API_BASE}/analytics/overview?from=${from}&to=${to}`, {
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

  const { kpis, revenueTimeSeries, topProducts, topPosts, subscribers } = data;

  // ─── KPI card definitions ───

  const kpiCards = [
    {
      label: 'Revenue',
      value: formatCurrency(kpis.revenue.value),
      change: kpis.revenue.change,
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Orders',
      value: formatNumber(kpis.orders.value),
      change: kpis.orders.change,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Visitors',
      value: formatNumber(kpis.visitors.value),
      change: kpis.visitors.change,
      icon: Users,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: 'Emails Sent',
      value: formatNumber(kpis.emailsSent.value),
      change: kpis.emailsSent.change,
      icon: Mail,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Conversion',
      value: formatPercent(kpis.conversionRate.value),
      change: undefined,
      icon: TrendingUp,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
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
          <h1 className="text-lg font-semibold text-stone-900">Analytics</h1>
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
            className="bg-white border border-stone-200 rounded-lg p-4 hover:border-stone-300 transition"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                {card.label}
              </span>
              <div className={`${card.bg} p-1.5 rounded-md`}>
                <card.icon size={14} className={card.color} />
              </div>
            </div>
            <p className="text-2xl font-semibold text-stone-900 leading-none">
              {card.value}
            </p>
            <div className="mt-1.5">
              <ChangeBadge change={card.change} />
            </div>
          </div>
        ))}
      </div>

      {/* ─── Revenue Chart ─── */}
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
          Revenue Trend
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueTimeSeries} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="analyticsRevGrad" x1="0" y1="0" x2="0" y2="1">
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
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#059669"
                strokeWidth={2}
                fill="url(#analyticsRevGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#059669' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Top Products + Top Blog Posts ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
            Top Products
          </h3>
          <div className="space-y-0">
            {topProducts.length > 0 ? (
              topProducts.slice(0, 5).map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 py-2.5 border-b border-stone-100 last:border-b-0"
                >
                  <span className="text-sm text-stone-400 w-5 text-right font-medium">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-sm text-stone-700 truncate">
                    {product.name}
                  </span>
                  <span className="text-sm text-stone-900 font-medium">
                    {formatCurrency(product.revenue)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-stone-400 py-4 text-center">No product data</p>
            )}
          </div>
          <Link
            to="/admin/analytics/revenue"
            className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 transition mt-3"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {/* Top Blog Posts */}
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
      </div>

      {/* ─── Email Performance + Subscriber Overview ─── */}
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

        {/* Subscriber Overview */}
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-4">
            Subscriber Overview
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users size={14} className="text-indigo-500" />
                <span className="text-xs text-stone-500">Total</span>
              </div>
              <p className="text-2xl font-semibold text-stone-900">
                {formatNumber(subscribers.total)}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} className="text-emerald-500" />
                <span className="text-xs text-stone-500">New in Period</span>
              </div>
              <p className="text-2xl font-semibold text-stone-900">
                {subscribers.newCount >= 0 ? '+' : ''}{formatNumber(subscribers.newCount)}
              </p>
            </div>
          </div>
          <Link
            to="/admin/analytics/customers"
            className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 transition mt-4"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
