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

interface ServicesData {
  workshops: Array<{
    id: string;
    title: string;
    enrolledCount: number;
    price: string | null;
    format: string | null;
    status: string;
  }>;
  enrollmentTrend: Array<{ date: string; count: number }>;
  coaching: Array<{
    id: string;
    title: string;
    price: string | null;
    description: string | null;
  }>;
  enrollmentsByStatus: Array<{ status: string; count: number }>;
}

type DateRange = '7d' | '30d' | '90d' | 'all';
type WorkshopSortField = 'title' | 'enrolledCount' | 'price' | 'format' | 'status';
type SortDir = 'asc' | 'desc';

// --- Formatting helpers ---

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatPrice(price: string | null): string {
  if (!price) return '\u2014';
  const num = parseFloat(price);
  if (isNaN(num)) return price;
  if (num === 0) return 'Free';
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

// --- Chart tooltip ---

function EnrollmentTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-stone-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="text-stone-500 mb-0.5">{formatChartDate(label)}</p>
      <p className="font-medium text-stone-800">
        {formatNumber(payload[0].value)} enrollments
      </p>
    </div>
  );
}

// --- Status badge styles ---

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  published: 'bg-emerald-50 text-emerald-700',
  draft: 'bg-stone-100 text-stone-600',
  archived: 'bg-stone-100 text-stone-500',
  paused: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-red-50 text-red-700',
  completed: 'bg-blue-50 text-blue-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
};

const ENROLLMENT_STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-emerald-500',
  active: 'bg-emerald-500',
  pending: 'bg-amber-500',
  cancelled: 'bg-red-500',
  completed: 'bg-blue-500',
  waitlist: 'bg-violet-500',
};

const FORMAT_BADGE_STYLES: Record<string, string> = {
  online: 'bg-blue-50 text-blue-700',
  'in-person': 'bg-amber-50 text-amber-700',
  hybrid: 'bg-violet-50 text-violet-700',
  'Live online workshop': 'bg-blue-50 text-blue-700',
  'Self-paced video + workbook': 'bg-violet-50 text-violet-700',
};

// --- Skeleton loader ---

function ServicesSkeleton() {
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
      <div className="bg-stone-100 rounded-lg h-56" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-stone-100 rounded-lg h-36" />
        ))}
      </div>
      <div className="bg-stone-100 rounded-lg h-40" />
    </div>
  );
}

// --- Main component ---

export default function AnalyticsServices() {
  const { token } = useAuth();
  const [data, setData] = useState<ServicesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState<DateRange>('90d');
  const [refreshing, setRefreshing] = useState(false);
  const [workshopSort, setWorkshopSort] = useState<{ field: WorkshopSortField; dir: SortDir }>({ field: 'enrolledCount', dir: 'desc' });

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) return;
      try {
        const { from, to } = getRangeParams(range);
        const res = await fetch(`${API_BASE}/analytics/services?from=${from}&to=${to}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });
        if (!res.ok) throw new Error('Failed to load services data');
        const json: ServicesData = await res.json();
        setData(json);
        setError('');
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setError('Could not load services data');
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

  const handleWorkshopSort = (field: WorkshopSortField) => {
    setWorkshopSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'desc' },
    );
  };

  const sortedWorkshops = useMemo(() => {
    if (!data) return [];
    const items = [...data.workshops];
    items.sort((a, b) => {
      let aVal: any;
      let bVal: any;
      switch (workshopSort.field) {
        case 'title': aVal = a.title.toLowerCase(); bVal = b.title.toLowerCase(); break;
        case 'enrolledCount': aVal = a.enrolledCount; bVal = b.enrolledCount; break;
        case 'price': aVal = parseFloat(a.price || '0'); bVal = parseFloat(b.price || '0'); break;
        case 'format': aVal = a.format || ''; bVal = b.format || ''; break;
        case 'status': aVal = a.status; bVal = b.status; break;
        default: aVal = 0; bVal = 0;
      }
      if (aVal < bVal) return workshopSort.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return workshopSort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return items;
  }, [data, workshopSort]);

  const rangeOptions: { label: string; value: DateRange }[] = [
    { label: '7d', value: '7d' },
    { label: '30d', value: '30d' },
    { label: '90d', value: '90d' },
    { label: 'All', value: 'all' },
  ];

  function WorkshopSortIcon({ field }: { field: WorkshopSortField }) {
    if (workshopSort.field !== field) return <ChevronDown size={12} className="text-stone-300" />;
    return workshopSort.dir === 'asc' ? (
      <ChevronUp size={12} className="text-stone-600" />
    ) : (
      <ChevronDown size={12} className="text-stone-600" />
    );
  }

  // --- Loading state ---

  if (loading) return <ServicesSkeleton />;

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

  const maxEnrollmentStatus = Math.max(...data.enrollmentsByStatus.map((e) => e.count), 1);

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
            <h1 className="text-lg font-semibold text-stone-900">Services</h1>
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

      {/* --- Enrollment Trend --- */}
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
          Enrollment Trend
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.enrollmentTrend} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
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
              <Tooltip content={<EnrollmentTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#4f46e5"
                strokeWidth={2}
                fill="url(#enrollGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#4f46e5' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* --- Workshops Section --- */}
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
          Workshops
        </h3>
        {sortedWorkshops.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200">
                  {([
                    ['title', 'Title', 'text-left'],
                    ['enrolledCount', 'Enrolled', 'text-right'],
                    ['price', 'Price', 'text-right'],
                    ['format', 'Format', 'text-left'],
                    ['status', 'Status', 'text-left'],
                  ] as [WorkshopSortField, string, string][]).map(([field, label, align]) => (
                    <th
                      key={field}
                      className={`${align} text-xs font-medium text-stone-500 uppercase tracking-wider py-2 px-2 cursor-pointer select-none hover:text-stone-700 transition`}
                      onClick={() => handleWorkshopSort(field)}
                    >
                      <span className={`inline-flex items-center gap-1 ${align === 'text-right' ? 'justify-end' : ''}`}>
                        {label} <WorkshopSortIcon field={field} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedWorkshops.map((w, index) => {
                  const statusStyle = STATUS_STYLES[w.status] || 'bg-stone-100 text-stone-600';
                  const formatStyle = FORMAT_BADGE_STYLES[w.format || ''] || 'bg-stone-100 text-stone-600';
                  return (
                    <tr
                      key={w.id}
                      className={`border-b border-stone-100 last:border-b-0 hover:bg-stone-50 transition ${
                        index % 2 === 1 ? 'bg-stone-50/50' : ''
                      }`}
                    >
                      <td className="py-2.5 px-2 text-stone-700">{w.title}</td>
                      <td className="py-2.5 px-2 text-right font-medium text-stone-900">{formatNumber(w.enrolledCount)}</td>
                      <td className="py-2.5 px-2 text-right text-stone-700">{formatPrice(w.price)}</td>
                      <td className="py-2.5 px-2">
                        {w.format ? (
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium capitalize ${formatStyle}`}>
                            {w.format}
                          </span>
                        ) : (
                          <span className="text-stone-400">&mdash;</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium capitalize ${statusStyle}`}>
                          {w.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-stone-400 py-4 text-center">No workshop data</p>
        )}
      </div>

      {/* --- Coaching Packages --- */}
      <div>
        <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
          Coaching Packages
        </h3>
        {data.coaching.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.coaching.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white border border-stone-200 rounded-lg p-4 hover:border-stone-300 transition"
              >
                <h4 className="text-sm font-medium text-stone-900 mb-1">{pkg.title}</h4>
                <p className="text-lg font-semibold text-stone-900 mb-2">
                  {formatPrice(pkg.price)}
                </p>
                {pkg.description && (
                  <p className="text-xs text-stone-500 line-clamp-3">
                    {pkg.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-stone-200 rounded-lg p-4">
            <p className="text-xs text-stone-400 py-4 text-center">No coaching packages</p>
          </div>
        )}
      </div>

      {/* --- Enrollments by Status --- */}
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
          Enrollments by Status
        </h3>
        <div className="space-y-2.5">
          {data.enrollmentsByStatus.length > 0 ? (
            data.enrollmentsByStatus.map((item) => (
              <div key={item.status} className="flex items-center gap-3">
                <span className="text-sm text-stone-600 w-24 capitalize truncate">{item.status}</span>
                <div className="flex-1 h-5 bg-stone-50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${ENROLLMENT_STATUS_COLORS[item.status] || 'bg-stone-400'}`}
                    style={{ width: `${(item.count / maxEnrollmentStatus) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-stone-700 w-12 text-right">
                  {formatNumber(item.count)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-stone-400 py-4 text-center">No enrollment data</p>
          )}
        </div>
      </div>
    </div>
  );
}
