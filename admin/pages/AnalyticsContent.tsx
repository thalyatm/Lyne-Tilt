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

interface ContentData {
  blogPerformance: Array<{
    id: string;
    title: string;
    publishedAt: string | null;
    views: number;
    uniqueVisitors: number;
  }>;
  viewsTrend: Array<{ date: string; views: number; uniqueVisitors: number }>;
  trafficSources: Array<{ referrer: string; count: number }>;
  topPages: Array<{ pathname: string; views: number; uniqueVisitors: number }>;
}

type DateRange = '7d' | '30d' | '90d' | 'all';
type BlogSortField = 'title' | 'publishedAt' | 'views' | 'uniqueVisitors';
type SortDir = 'asc' | 'desc';

// --- Formatting helpers ---

function formatNumber(n: number): string {
  return n.toLocaleString();
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

function ViewsChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-stone-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="text-stone-500 mb-0.5">{formatChartDate(label)}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="font-medium text-stone-800">
          {entry.dataKey === 'views' ? 'Views' : 'Unique'}: {formatNumber(entry.value)}
        </p>
      ))}
    </div>
  );
}

// --- Skeleton loader ---

function ContentSkeleton() {
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
      <div className="bg-stone-100 rounded-lg h-64" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-stone-100 rounded-lg h-56" />
        <div className="bg-stone-100 rounded-lg h-56" />
      </div>
      <div className="bg-stone-100 rounded-lg h-72" />
    </div>
  );
}

// --- Main component ---

export default function AnalyticsContent() {
  const { token } = useAuth();
  const [data, setData] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState<DateRange>('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [blogSort, setBlogSort] = useState<{ field: BlogSortField; dir: SortDir }>({ field: 'views', dir: 'desc' });

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) return;
      try {
        const { from, to } = getRangeParams(range);
        const res = await fetch(`${API_BASE}/analytics/content?from=${from}&to=${to}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });
        if (!res.ok) throw new Error('Failed to load content data');
        const json: ContentData = await res.json();
        setData(json);
        setError('');
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setError('Could not load content data');
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

  const handleBlogSort = (field: BlogSortField) => {
    setBlogSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'desc' },
    );
  };

  const sortedBlogs = useMemo(() => {
    if (!data) return [];
    const items = [...data.blogPerformance];
    items.sort((a, b) => {
      let aVal: any;
      let bVal: any;
      switch (blogSort.field) {
        case 'title': aVal = a.title.toLowerCase(); bVal = b.title.toLowerCase(); break;
        case 'publishedAt': aVal = a.publishedAt || ''; bVal = b.publishedAt || ''; break;
        case 'views': aVal = a.views; bVal = b.views; break;
        case 'uniqueVisitors': aVal = a.uniqueVisitors; bVal = b.uniqueVisitors; break;
        default: aVal = 0; bVal = 0;
      }
      if (aVal < bVal) return blogSort.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return blogSort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return items;
  }, [data, blogSort]);

  const rangeOptions: { label: string; value: DateRange }[] = [
    { label: '7d', value: '7d' },
    { label: '30d', value: '30d' },
    { label: '90d', value: '90d' },
    { label: 'All', value: 'all' },
  ];

  function BlogSortIcon({ field }: { field: BlogSortField }) {
    if (blogSort.field !== field) return <ChevronDown size={12} className="text-stone-300" />;
    return blogSort.dir === 'asc' ? (
      <ChevronUp size={12} className="text-stone-600" />
    ) : (
      <ChevronDown size={12} className="text-stone-600" />
    );
  }

  // --- Loading state ---

  if (loading) return <ContentSkeleton />;

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

  const topTrafficSources = data.trafficSources.slice(0, 10);
  const maxTraffic = Math.max(...topTrafficSources.map((s) => s.count), 1);

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
            <h1 className="text-lg font-semibold text-stone-900">Content & Traffic</h1>
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

      {/* --- Page Views Trend --- */}
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
          Page Views
        </h3>
        <div className="flex items-center gap-4 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-500 rounded-full" />
            <span className="text-[11px] text-stone-500">Views</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-500 rounded-full border-dashed" style={{ borderBottom: '2px dashed #3b82f6', height: 0 }} />
            <span className="text-[11px] text-stone-500">Unique Visitors</span>
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.viewsTrend} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="uniqueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
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
                width={40}
                allowDecimals={false}
              />
              <Tooltip content={<ViewsChartTooltip />} />
              <Area
                type="monotone"
                dataKey="views"
                stroke="#059669"
                strokeWidth={2}
                fill="url(#viewsGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#059669' }}
              />
              <Area
                type="monotone"
                dataKey="uniqueVisitors"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 3"
                fill="url(#uniqueGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#3b82f6' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* --- Traffic Sources + Top Pages --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Traffic sources */}
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
            Traffic Sources
          </h3>
          <div className="space-y-2.5">
            {topTrafficSources.length > 0 ? (
              topTrafficSources.map((source) => (
                <div key={source.referrer} className="flex items-center gap-3">
                  <span className="text-sm text-stone-600 w-32 truncate" title={source.referrer}>
                    {source.referrer || 'Direct'}
                  </span>
                  <div className="flex-1 h-5 bg-stone-50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${(source.count / maxTraffic) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-stone-700 w-12 text-right">
                    {formatNumber(source.count)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-stone-400 py-4 text-center">No traffic data</p>
            )}
          </div>
        </div>

        {/* Top pages */}
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
            Top Pages
          </h3>
          <div className="space-y-0">
            {data.topPages.length > 0 ? (
              data.topPages.slice(0, 10).map((page, index) => (
                <div
                  key={page.pathname}
                  className="flex items-center gap-3 py-2.5 border-b border-stone-100 last:border-b-0"
                >
                  <span className="text-sm text-stone-400 w-5 text-right font-medium">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-sm text-stone-700 truncate font-mono text-xs" title={page.pathname}>
                    {page.pathname}
                  </span>
                  <span className="text-xs text-stone-500 w-16 text-right">
                    {formatNumber(page.views)} views
                  </span>
                  <span className="text-xs text-stone-400 w-16 text-right">
                    {formatNumber(page.uniqueVisitors)} uniq
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-stone-400 py-4 text-center">No page data</p>
            )}
          </div>
        </div>
      </div>

      {/* --- Blog Performance Table --- */}
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
          Blog Performance
        </h3>
        {sortedBlogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider py-2 px-2 w-8">
                    #
                  </th>
                  <th
                    className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider py-2 px-2 cursor-pointer select-none hover:text-stone-700 transition"
                    onClick={() => handleBlogSort('title')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Title <BlogSortIcon field="title" />
                    </span>
                  </th>
                  <th
                    className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider py-2 px-2 cursor-pointer select-none hover:text-stone-700 transition"
                    onClick={() => handleBlogSort('publishedAt')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Published <BlogSortIcon field="publishedAt" />
                    </span>
                  </th>
                  <th
                    className="text-right text-xs font-medium text-stone-500 uppercase tracking-wider py-2 px-2 cursor-pointer select-none hover:text-stone-700 transition"
                    onClick={() => handleBlogSort('views')}
                  >
                    <span className="inline-flex items-center gap-1 justify-end">
                      Views <BlogSortIcon field="views" />
                    </span>
                  </th>
                  <th
                    className="text-right text-xs font-medium text-stone-500 uppercase tracking-wider py-2 px-2 cursor-pointer select-none hover:text-stone-700 transition"
                    onClick={() => handleBlogSort('uniqueVisitors')}
                  >
                    <span className="inline-flex items-center gap-1 justify-end">
                      Unique Visitors <BlogSortIcon field="uniqueVisitors" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedBlogs.map((post, index) => (
                  <tr
                    key={post.id}
                    className={`border-b border-stone-100 last:border-b-0 hover:bg-stone-50 transition ${
                      index % 2 === 1 ? 'bg-stone-50/50' : ''
                    }`}
                  >
                    <td className="py-2.5 px-2 text-stone-400 font-medium">{index + 1}</td>
                    <td className="py-2.5 px-2 text-stone-700 max-w-[300px] truncate">{post.title}</td>
                    <td className="py-2.5 px-2 text-stone-500 text-xs">{formatDate(post.publishedAt)}</td>
                    <td className="py-2.5 px-2 text-right text-stone-700">{formatNumber(post.views)}</td>
                    <td className="py-2.5 px-2 text-right text-stone-700">{formatNumber(post.uniqueVisitors)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-stone-400 py-4 text-center">No blog data</p>
        )}
      </div>
    </div>
  );
}
