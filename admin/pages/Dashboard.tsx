import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
  Eye,
  MousePointerClick,
  ShoppingBag,
  FileText,
  Megaphone,
  Contact,
  Filter,
  Zap,
  AlertTriangle,
  AlertCircle,
  Info,
  ArrowRight,
  RefreshCw,
  Plus,
  Package,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';

// ─── Types ─────────────────────────────────────────────────

interface TimeSeriesPoint {
  date: string;
  value: number;
}

interface RecentEntity {
  type: 'blog' | 'product' | 'campaign' | 'coaching' | 'workshop';
  id: string;
  title: string;
  updated_at: string;
  status: string;
  href: string;
}

interface ActiveCampaign {
  id: string;
  name: string;
  status: string;
  updated_at: string;
  href: string;
}

interface Warning {
  id: string;
  kind: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  href: string;
}

interface DashboardOverview {
  kpis: {
    revenue_30d: number;
    orders_30d: number;
    subscribers_total: number;
    subscribers_30d_net: number;
    emails_sent_30d: number;
    open_rate_30d: number;
    click_rate_30d: number;
  };
  timeSeries: {
    revenue_daily_30d: TimeSeriesPoint[];
    subscribers_daily_30d: TimeSeriesPoint[];
    email_sends_daily_30d: TimeSeriesPoint[];
  };
  content: {
    drafts_count_by_type: {
      blog: number;
      coaching: number;
      workshops: number;
      products: number;
    };
    recently_updated: RecentEntity[];
  };
  marketing: {
    active_campaigns: ActiveCampaign[];
    automations_health: {
      active: number;
      paused: number;
      failing: number;
    };
  };
  ops: {
    warnings: Warning[];
  };
}

// ─── Formatting helpers ────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`;
  }
  return `$${amount.toFixed(0)}`;
}

function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  if (n >= 1000) return n.toLocaleString();
  return String(n);
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
}

const ENTITY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  blog: FileText,
  product: ShoppingBag,
  campaign: Megaphone,
  coaching: Users,
  workshop: BookOpen,
};

const STATUS_STYLES: Record<string, string> = {
  published: 'bg-emerald-50 text-emerald-700',
  active: 'bg-emerald-50 text-emerald-700',
  draft: 'bg-amber-50 text-amber-700',
  scheduled: 'bg-indigo-50 text-indigo-700',
  sending: 'bg-blue-50 text-blue-700',
  sent: 'bg-stone-100 text-stone-600',
  archived: 'bg-stone-100 text-stone-500',
  paused: 'bg-stone-100 text-stone-500',
  failed: 'bg-red-50 text-red-700',
};

const SEVERITY_STYLES: Record<string, { border: string; icon: React.ComponentType<{ size?: number; className?: string }>; iconColor: string }> = {
  high: { border: 'border-l-red-400', icon: AlertTriangle, iconColor: 'text-red-400' },
  medium: { border: 'border-l-amber-400', icon: AlertCircle, iconColor: 'text-amber-400' },
  low: { border: 'border-l-blue-300', icon: Info, iconColor: 'text-blue-400' },
};

// ─── Chart tooltip ─────────────────────────────────────────

function ChartTooltip({ active, payload, label, prefix = '', suffix = '' }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-stone-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="text-stone-500 mb-0.5">{formatChartDate(label)}</p>
      <p className="font-medium text-stone-800">
        {prefix}{typeof payload[0].value === 'number' ? payload[0].value.toLocaleString() : payload[0].value}{suffix}
      </p>
    </div>
  );
}

// ─── Skeleton loader ───────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-56 bg-stone-100 rounded-md" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-stone-100 rounded-lg h-[88px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-stone-100 rounded-lg h-56" />
        <div className="bg-stone-100 rounded-lg h-56" />
      </div>
      <div className="bg-stone-100 rounded-lg h-48" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-stone-100 rounded-lg h-56" />
        <div className="lg:col-span-3 bg-stone-100 rounded-lg h-56" />
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────

export default function Dashboard() {
  const { user, token } = useAuth();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/dashboard/overview`, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });
        if (!res.ok) throw new Error('Failed to load dashboard');
        const json: DashboardOverview = await res.json();
        setData(json);
        setError('');
        setLastFetched(new Date());
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setError('Could not connect to the server');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchDashboard(controller.signal);
    return () => controller.abort();
  }, [fetchDashboard]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  // Memoize chart tick formatter to show every ~5th label
  const chartTickFormatter = useMemo(() => {
    return (value: string, index: number) => {
      if (index % 7 === 0) return formatChartDate(value);
      return '';
    };
  }, []);

  // ─── Loading state ───

  if (loading) return <DashboardSkeleton />;

  // ─── Error state (no data at all) ───

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

  const kpis = data.kpis;
  const ts = data.timeSeries;
  const content = data.content;
  const marketing = data.marketing;
  const ops = data.ops;

  // ─── KPI card definitions ───

  const kpiCards = [
    {
      label: 'Revenue',
      value: formatCurrency(kpis.revenue_30d),
      subtitle: '30 days',
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Orders',
      value: formatNumber(kpis.orders_30d),
      subtitle: '30 days',
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Subscribers',
      value: formatNumber(kpis.subscribers_total),
      subtitle: kpis.subscribers_30d_net >= 0
        ? `+${kpis.subscribers_30d_net} this month`
        : `${kpis.subscribers_30d_net} this month`,
      icon: Users,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Emails sent',
      value: formatNumber(kpis.emails_sent_30d),
      subtitle: '30 days',
      icon: Mail,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Open rate',
      value: formatPercent(kpis.open_rate_30d),
      subtitle: '30 days',
      icon: Eye,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: 'Click rate',
      value: formatPercent(kpis.click_rate_30d),
      subtitle: '30 days',
      icon: MousePointerClick,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
  ];

  // ─── Quick actions ───

  const quickActions = [
    { label: 'New Product', icon: ShoppingBag, to: '/admin/products/new' },
    { label: 'New Blog Post', icon: FileText, to: '/admin/blog' },
    { label: 'New Campaign', icon: Megaphone, to: '/admin/campaigns/new' },
    { label: 'Import Subscribers', icon: Contact, to: '/admin/subscribers/import' },
    { label: 'Create Segment', icon: Filter, to: '/admin/segments/new' },
    { label: 'Create Automation', icon: Zap, to: '/admin/automations' },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Greeting + Refresh ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          {lastFetched && (
            <p className="text-xs text-stone-400 mt-0.5">
              Updated {timeAgo(lastFetched.toISOString())}
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-md transition-colors disabled:opacity-50"
          title="Refresh dashboard"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
            <p className="text-xs text-stone-400 mt-1.5">{card.subtitle}</p>
          </div>
        ))}
      </div>

      {/* ─── Charts ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue chart */}
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
            Revenue (30 days)
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ts.revenue_daily_30d} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
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
                  width={45}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip content={<ChartTooltip prefix="$" />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#revGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#059669' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subscribers chart */}
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
            New Subscribers (30 days)
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ts.subscribers_daily_30d} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
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
                  width={30}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fill="url(#subGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#4f46e5' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Email sends bar chart (full width) */}
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
          Email Activity (30 days)
        </h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ts.email_sends_daily_30d} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
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
                width={30}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip suffix=" emails" />} />
              <Bar dataKey="value" fill="#d97706" radius={[2, 2, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Attention Needed ─── */}
      {ops.warnings.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wider">
            Attention needed
          </h2>
          {ops.warnings
            .sort((a, b) => {
              const order = { high: 0, medium: 1, low: 2 };
              return order[a.severity] - order[b.severity];
            })
            .map((w) => {
              const style = SEVERITY_STYLES[w.severity];
              return (
                <Link
                  key={w.id}
                  to={w.href}
                  className={`flex items-center gap-3 p-3 bg-white border border-stone-200 border-l-2 ${style.border} rounded-lg hover:border-stone-300 transition`}
                >
                  <style.icon size={16} className={`flex-shrink-0 ${style.iconColor}`} />
                  <span className="flex-1 text-sm text-stone-700">{w.message}</span>
                  <ArrowRight size={14} className="text-stone-400 flex-shrink-0" />
                </Link>
              );
            })}
        </div>
      )}

      {/* ─── Quick Actions + Recent Activity ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
            Quick actions
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className="bg-white border border-stone-200 rounded-lg px-3 py-3 hover:border-stone-300 transition group flex items-center gap-2.5"
              >
                <div className="bg-stone-50 p-1.5 rounded-md group-hover:bg-stone-100 transition-colors">
                  <action.icon size={14} className="text-stone-400 group-hover:text-stone-600 transition-colors" />
                </div>
                <span className="text-sm text-stone-700 group-hover:text-stone-900 transition-colors">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-3">
          <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
            Recently updated
          </h2>
          <div className="bg-white border border-stone-200 rounded-lg divide-y divide-stone-100">
            {content.recently_updated.length > 0 ? (
              content.recently_updated.map((item) => {
                const Icon = ENTITY_ICONS[item.type] || Package;
                const statusStyle = STATUS_STYLES[item.status] || 'bg-stone-100 text-stone-600';
                return (
                  <Link
                    key={`${item.type}-${item.id}`}
                    to={item.href}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 transition"
                  >
                    <Icon size={14} className="text-stone-400 flex-shrink-0" />
                    <span className="flex-1 text-sm text-stone-700 truncate">
                      {item.title}
                    </span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium capitalize ${statusStyle}`}
                    >
                      {item.status}
                    </span>
                    <span className="text-[11px] text-stone-400 flex-shrink-0 w-16 text-right">
                      {timeAgo(item.updated_at)}
                    </span>
                  </Link>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center">
                <Sparkles size={18} className="mx-auto mb-2 text-stone-300" />
                <p className="text-xs text-stone-400">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Marketing Overview ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Campaigns */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wider">
              Active campaigns
            </h2>
            <Link
              to="/admin/campaigns"
              className="text-xs text-stone-400 hover:text-stone-600 transition"
            >
              View all <ArrowRight size={12} className="inline ml-0.5" />
            </Link>
          </div>
          <div className="bg-white border border-stone-200 rounded-lg divide-y divide-stone-100">
            {marketing.active_campaigns.length > 0 ? (
              marketing.active_campaigns.map((c) => {
                const statusStyle = STATUS_STYLES[c.status] || 'bg-stone-100 text-stone-600';
                return (
                  <Link
                    key={c.id}
                    to={c.href}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 transition"
                  >
                    <Megaphone size={14} className="text-stone-400 flex-shrink-0" />
                    <span className="flex-1 text-sm text-stone-700 truncate">
                      {c.name}
                    </span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-medium capitalize ${statusStyle}`}
                    >
                      {c.status}
                    </span>
                    <span className="text-[11px] text-stone-400 flex-shrink-0">
                      {timeAgo(c.updated_at)}
                    </span>
                  </Link>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center">
                <Megaphone size={18} className="mx-auto mb-2 text-stone-300" />
                <p className="text-xs text-stone-400 mb-2">No active campaigns</p>
                <Link
                  to="/admin/campaigns/new"
                  className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-700 transition"
                >
                  <Plus size={12} />
                  Create one
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Automations Health */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wider">
              Automations
            </h2>
            <Link
              to="/admin/automations"
              className="text-xs text-stone-400 hover:text-stone-600 transition"
            >
              Manage <ArrowRight size={12} className="inline ml-0.5" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-stone-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-semibold text-emerald-600">
                {marketing.automations_health.active}
              </p>
              <p className="text-xs text-stone-500 mt-1">Active</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-semibold text-stone-500">
                {marketing.automations_health.paused}
              </p>
              <p className="text-xs text-stone-500 mt-1">Paused</p>
            </div>
            <div
              className={`bg-white border rounded-lg p-4 text-center ${
                marketing.automations_health.failing > 0
                  ? 'border-red-200'
                  : 'border-stone-200'
              }`}
            >
              <p
                className={`text-2xl font-semibold ${
                  marketing.automations_health.failing > 0
                    ? 'text-red-600'
                    : 'text-stone-400'
                }`}
              >
                {marketing.automations_health.failing}
              </p>
              <p className="text-xs text-stone-500 mt-1">Failing</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
