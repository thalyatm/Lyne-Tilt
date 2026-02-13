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
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';

// --- Types ---

interface CampaignPerformance {
  id: string;
  name: string;
  status: string;
  sentAt: string | null;
  recipientCount: number;
  delivered: number;
  opens: number;
  clicks: number;
  bounces: number;
  unsubscribes: number;
}

interface EmailData {
  campaignPerformance: CampaignPerformance[];
  subscriberGrowth: Array<{ date: string; newSubs: number }>;
  engagementDistribution: Array<{ level: string; count: number }>;
  automationStats: Array<{
    id: string;
    name: string;
    status: string;
    totalTriggered: number;
    totalSent: number;
  }>;
}

type DateRange = '7d' | '30d' | '90d' | 'all';
type CampaignSortField = 'name' | 'status' | 'recipientCount' | 'openRate' | 'clickRate' | 'bounceRate' | 'unsubRate' | 'sentAt';
type AutoSortField = 'name' | 'status' | 'totalTriggered' | 'totalSent' | 'successRate';
type SortDir = 'asc' | 'desc';

// --- Formatting helpers ---

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatPercent(rate: number): string {
  if (isNaN(rate) || !isFinite(rate)) return '0.0%';
  return `${rate.toFixed(1)}%`;
}

function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' });
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

// --- Chart tooltip ---

function SubGrowthTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-stone-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="text-stone-500 mb-0.5">{formatChartDate(label)}</p>
      <p className="font-medium text-stone-800">
        {payload[0].value} new subscribers
      </p>
    </div>
  );
}

// --- Status badge styles ---

const CAMPAIGN_STATUS_STYLES: Record<string, string> = {
  sent: 'bg-emerald-50 text-emerald-700',
  draft: 'bg-stone-100 text-stone-600',
  sending: 'bg-blue-50 text-blue-700',
  scheduled: 'bg-indigo-50 text-indigo-700',
  failed: 'bg-red-50 text-red-700',
};

const AUTOMATION_STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  paused: 'bg-stone-100 text-stone-500',
  draft: 'bg-stone-100 text-stone-600',
  failed: 'bg-red-50 text-red-700',
};

const ENGAGEMENT_STYLES: Record<string, { bg: string; bar: string }> = {
  highly_engaged: { bg: 'bg-emerald-50', bar: 'bg-emerald-500' },
  engaged: { bg: 'bg-blue-50', bar: 'bg-blue-500' },
  at_risk: { bg: 'bg-amber-50', bar: 'bg-amber-500' },
  inactive: { bg: 'bg-stone-100', bar: 'bg-stone-400' },
  new: { bg: 'bg-violet-50', bar: 'bg-violet-500' },
};

const ENGAGEMENT_LABELS: Record<string, string> = {
  highly_engaged: 'Highly Engaged',
  engaged: 'Engaged',
  at_risk: 'At Risk',
  inactive: 'Inactive',
  new: 'New',
};

// --- Skeleton loader ---

function EmailSkeleton() {
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
      <div className="bg-stone-100 rounded-lg h-72" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-stone-100 rounded-lg h-64" />
        <div className="bg-stone-100 rounded-lg h-64" />
      </div>
      <div className="bg-stone-100 rounded-lg h-56" />
    </div>
  );
}

// --- Main component ---

export default function AnalyticsEmail() {
  const { token } = useAuth();
  const [data, setData] = useState<EmailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState<DateRange>('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [campaignSort, setCampaignSort] = useState<{ field: CampaignSortField; dir: SortDir }>({ field: 'sentAt', dir: 'desc' });
  const [autoSort, setAutoSort] = useState<{ field: AutoSortField; dir: SortDir }>({ field: 'totalTriggered', dir: 'desc' });

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) return;
      try {
        const { from, to } = getRangeParams(range);
        const res = await fetch(`${API_BASE}/analytics/email?from=${from}&to=${to}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });
        if (!res.ok) throw new Error('Failed to load email data');
        const json: EmailData = await res.json();
        setData(json);
        setError('');
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setError('Could not load email data');
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

  // Campaign rate calculator
  function getRate(numerator: number, denominator: number): number {
    if (!denominator) return 0;
    return (numerator / denominator) * 100;
  }

  // Sorted campaigns
  const sortedCampaigns = useMemo(() => {
    if (!data) return [];
    const items = [...data.campaignPerformance];
    items.sort((a, b) => {
      let aVal: any;
      let bVal: any;
      switch (campaignSort.field) {
        case 'name': aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); break;
        case 'status': aVal = a.status; bVal = b.status; break;
        case 'recipientCount': aVal = a.recipientCount; bVal = b.recipientCount; break;
        case 'openRate': aVal = getRate(a.opens, a.delivered); bVal = getRate(b.opens, b.delivered); break;
        case 'clickRate': aVal = getRate(a.clicks, a.delivered); bVal = getRate(b.clicks, b.delivered); break;
        case 'bounceRate': aVal = getRate(a.bounces, a.recipientCount); bVal = getRate(b.bounces, b.recipientCount); break;
        case 'unsubRate': aVal = getRate(a.unsubscribes, a.delivered); bVal = getRate(b.unsubscribes, b.delivered); break;
        case 'sentAt': aVal = a.sentAt || ''; bVal = b.sentAt || ''; break;
        default: aVal = 0; bVal = 0;
      }
      if (aVal < bVal) return campaignSort.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return campaignSort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return items;
  }, [data, campaignSort]);

  // Sorted automations
  const sortedAutomations = useMemo(() => {
    if (!data) return [];
    const items = [...data.automationStats];
    items.sort((a, b) => {
      let aVal: any;
      let bVal: any;
      switch (autoSort.field) {
        case 'name': aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); break;
        case 'status': aVal = a.status; bVal = b.status; break;
        case 'totalTriggered': aVal = a.totalTriggered; bVal = b.totalTriggered; break;
        case 'totalSent': aVal = a.totalSent; bVal = b.totalSent; break;
        case 'successRate': aVal = getRate(a.totalSent, a.totalTriggered); bVal = getRate(b.totalSent, b.totalTriggered); break;
        default: aVal = 0; bVal = 0;
      }
      if (aVal < bVal) return autoSort.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return autoSort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return items;
  }, [data, autoSort]);

  const handleCampaignSort = (field: CampaignSortField) => {
    setCampaignSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'desc' },
    );
  };

  const handleAutoSort = (field: AutoSortField) => {
    setAutoSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'desc' },
    );
  };

  const rangeOptions: { label: string; value: DateRange }[] = [
    { label: '7d', value: '7d' },
    { label: '30d', value: '30d' },
    { label: '90d', value: '90d' },
    { label: 'All', value: 'all' },
  ];

  function CampaignSortIcon({ field }: { field: CampaignSortField }) {
    if (campaignSort.field !== field) return <ChevronDown size={12} className="text-stone-300" />;
    return campaignSort.dir === 'asc' ? (
      <ChevronUp size={12} className="text-stone-600" />
    ) : (
      <ChevronDown size={12} className="text-stone-600" />
    );
  }

  function AutoSortIcon({ field }: { field: AutoSortField }) {
    if (autoSort.field !== field) return <ChevronDown size={12} className="text-stone-300" />;
    return autoSort.dir === 'asc' ? (
      <ChevronUp size={12} className="text-stone-600" />
    ) : (
      <ChevronDown size={12} className="text-stone-600" />
    );
  }

  // --- Loading state ---

  if (loading) return <EmailSkeleton />;

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

  const maxEngagement = Math.max(...data.engagementDistribution.map((e) => e.count), 1);

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
            <h1 className="text-lg font-semibold text-stone-900">Email & Marketing</h1>
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

      {/* --- Campaign Performance Table --- */}
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
          Campaign Performance
        </h3>
        {sortedCampaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200">
                  {([
                    ['name', 'Campaign', 'text-left'],
                    ['status', 'Status', 'text-left'],
                    ['recipientCount', 'Sent', 'text-right'],
                    ['openRate', 'Open Rate', 'text-right'],
                    ['clickRate', 'Click Rate', 'text-right'],
                    ['bounceRate', 'Bounce', 'text-right'],
                    ['unsubRate', 'Unsub', 'text-right'],
                    ['sentAt', 'Date', 'text-right'],
                  ] as [CampaignSortField, string, string][]).map(([field, label, align]) => (
                    <th
                      key={field}
                      className={`${align} text-xs font-medium text-stone-500 uppercase tracking-wider py-2 px-2 cursor-pointer select-none hover:text-stone-700 transition`}
                      onClick={() => handleCampaignSort(field)}
                    >
                      <span className={`inline-flex items-center gap-1 ${align === 'text-right' ? 'justify-end' : ''}`}>
                        {label} <CampaignSortIcon field={field} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedCampaigns.map((c, index) => {
                  const statusStyle = CAMPAIGN_STATUS_STYLES[c.status] || 'bg-stone-100 text-stone-600';
                  return (
                    <tr
                      key={c.id}
                      className={`border-b border-stone-100 last:border-b-0 hover:bg-stone-50 transition ${
                        index % 2 === 1 ? 'bg-stone-50/50' : ''
                      }`}
                    >
                      <td className="py-2.5 px-2 text-stone-700 max-w-[200px] truncate">{c.name}</td>
                      <td className="py-2.5 px-2">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium capitalize ${statusStyle}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right text-stone-700">{formatNumber(c.recipientCount)}</td>
                      <td className="py-2.5 px-2 text-right text-stone-700">{formatPercent(getRate(c.opens, c.delivered))}</td>
                      <td className="py-2.5 px-2 text-right text-stone-700">{formatPercent(getRate(c.clicks, c.delivered))}</td>
                      <td className="py-2.5 px-2 text-right text-stone-700">{formatPercent(getRate(c.bounces, c.recipientCount))}</td>
                      <td className="py-2.5 px-2 text-right text-stone-700">{formatPercent(getRate(c.unsubscribes, c.delivered))}</td>
                      <td className="py-2.5 px-2 text-right text-stone-500 text-xs">{formatDate(c.sentAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-stone-400 py-4 text-center">No campaign data</p>
        )}
      </div>

      {/* --- Subscriber Growth + Engagement Distribution --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Subscriber growth */}
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
            Subscriber Growth
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.subscriberGrowth} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="subGrowthGrad" x1="0" y1="0" x2="0" y2="1">
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
                  width={30}
                  allowDecimals={false}
                />
                <Tooltip content={<SubGrowthTooltip />} />
                <Area
                  type="monotone"
                  dataKey="newSubs"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#subGrowthGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#059669' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Engagement distribution */}
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
            Engagement Distribution
          </h3>
          <div className="space-y-2.5">
            {data.engagementDistribution.length > 0 ? (
              data.engagementDistribution.map((item) => {
                const style = ENGAGEMENT_STYLES[item.level] || { bg: 'bg-stone-100', bar: 'bg-stone-400' };
                const label = ENGAGEMENT_LABELS[item.level] || item.level;
                return (
                  <div key={item.level} className="flex items-center gap-3">
                    <span className="text-sm text-stone-600 w-32 truncate">{label}</span>
                    <div className="flex-1 h-5 bg-stone-50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${style.bar}`}
                        style={{ width: `${(item.count / maxEngagement) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-stone-700 w-12 text-right">
                      {formatNumber(item.count)}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-stone-400 py-4 text-center">No engagement data</p>
            )}
          </div>
        </div>
      </div>

      {/* --- Automation Stats --- */}
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
          Automation Stats
        </h3>
        {sortedAutomations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200">
                  {([
                    ['name', 'Name', 'text-left'],
                    ['status', 'Status', 'text-left'],
                    ['totalTriggered', 'Triggers', 'text-right'],
                    ['totalSent', 'Sent', 'text-right'],
                    ['successRate', 'Success Rate', 'text-right'],
                  ] as [AutoSortField, string, string][]).map(([field, label, align]) => (
                    <th
                      key={field}
                      className={`${align} text-xs font-medium text-stone-500 uppercase tracking-wider py-2 px-2 cursor-pointer select-none hover:text-stone-700 transition`}
                      onClick={() => handleAutoSort(field)}
                    >
                      <span className={`inline-flex items-center gap-1 ${align === 'text-right' ? 'justify-end' : ''}`}>
                        {label} <AutoSortIcon field={field} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedAutomations.map((a, index) => {
                  const statusStyle = AUTOMATION_STATUS_STYLES[a.status] || 'bg-stone-100 text-stone-600';
                  const successRate = getRate(a.totalSent, a.totalTriggered);
                  return (
                    <tr
                      key={a.id}
                      className={`border-b border-stone-100 last:border-b-0 hover:bg-stone-50 transition ${
                        index % 2 === 1 ? 'bg-stone-50/50' : ''
                      }`}
                    >
                      <td className="py-2.5 px-2 text-stone-700">{a.name}</td>
                      <td className="py-2.5 px-2">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium capitalize ${statusStyle}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right text-stone-700">{formatNumber(a.totalTriggered)}</td>
                      <td className="py-2.5 px-2 text-right text-stone-700">{formatNumber(a.totalSent)}</td>
                      <td className="py-2.5 px-2 text-right font-medium text-stone-900">{formatPercent(successRate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-stone-400 py-4 text-center">No automation data</p>
        )}
      </div>
    </div>
  );
}
