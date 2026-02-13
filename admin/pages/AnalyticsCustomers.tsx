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
  Users,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';

// --- Types ---

interface CustomerData {
  overview: {
    totalCustomers: number;
    totalOrders: number;
    avgOrders: number;
    avgOrderValue: number;
  };
  topCustomers: Array<{
    email: string;
    name: string;
    totalSpend: number;
    orderCount: number;
  }>;
  customerGrowth: Array<{ date: string; count: number }>;
  cohortData: any[];
}

type DateRange = '7d' | '30d' | '90d' | 'all';
type CustomerSortField = 'name' | 'email' | 'totalSpend' | 'orderCount';
type SortDir = 'asc' | 'desc';

// --- Formatting helpers ---

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

function GrowthChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-stone-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="text-stone-500 mb-0.5">{formatChartDate(label)}</p>
      <p className="font-medium text-stone-800">
        {formatNumber(payload[0].value)} registrations
      </p>
    </div>
  );
}

// --- Skeleton loader ---

function CustomersSkeleton() {
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-stone-100 rounded-lg h-[96px]" />
        ))}
      </div>
      <div className="bg-stone-100 rounded-lg h-64" />
      <div className="bg-stone-100 rounded-lg h-56" />
    </div>
  );
}

// --- Main component ---

export default function AnalyticsCustomers() {
  const { token } = useAuth();
  const [data, setData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState<DateRange>('90d');
  const [refreshing, setRefreshing] = useState(false);
  const [sortField, setSortField] = useState<CustomerSortField>('totalSpend');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) return;
      try {
        const { from, to } = getRangeParams(range);
        const res = await fetch(`${API_BASE}/analytics/customers?from=${from}&to=${to}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });
        if (!res.ok) throw new Error('Failed to load customer data');
        const json: CustomerData = await res.json();
        setData(json);
        setError('');
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setError('Could not load customer data');
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

  const handleSort = (field: CustomerSortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortedCustomers = useMemo(() => {
    if (!data) return [];
    const items = [...data.topCustomers];
    items.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
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

  function SortIcon({ field }: { field: CustomerSortField }) {
    if (sortField !== field) return <ChevronDown size={12} className="text-stone-300" />;
    return sortDir === 'asc' ? (
      <ChevronUp size={12} className="text-stone-600" />
    ) : (
      <ChevronDown size={12} className="text-stone-600" />
    );
  }

  // --- Loading state ---

  if (loading) return <CustomersSkeleton />;

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

  const { overview } = data;

  const kpiCards = [
    {
      label: 'Total Customers',
      value: formatNumber(overview.totalCustomers),
      icon: Users,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: 'Total Orders',
      value: formatNumber(overview.totalOrders),
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Avg Orders/Customer',
      value: overview.avgOrders.toFixed(1),
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Avg Order Value',
      value: formatCurrency(overview.avgOrderValue),
      icon: DollarSign,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ];

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
            <h1 className="text-lg font-semibold text-stone-900">Customer Insights</h1>
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

      {/* --- KPI Cards --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
          </div>
        ))}
      </div>

      {/* --- Customer Growth Chart --- */}
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
          Customer Registration Growth
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.customerGrowth} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="custGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
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
              <Tooltip content={<GrowthChartTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#7c3aed"
                strokeWidth={2}
                fill="url(#custGrowthGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#7c3aed' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* --- Top Customers Table --- */}
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <h3 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
          Top Customers
        </h3>
        {sortedCustomers.length > 0 ? (
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
                      Customer <SortIcon field="name" />
                    </span>
                  </th>
                  <th
                    className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider py-2 px-2 cursor-pointer select-none hover:text-stone-700 transition"
                    onClick={() => handleSort('email')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Email <SortIcon field="email" />
                    </span>
                  </th>
                  <th
                    className="text-right text-xs font-medium text-stone-500 uppercase tracking-wider py-2 px-2 cursor-pointer select-none hover:text-stone-700 transition"
                    onClick={() => handleSort('totalSpend')}
                  >
                    <span className="inline-flex items-center gap-1 justify-end">
                      Total Spend <SortIcon field="totalSpend" />
                    </span>
                  </th>
                  <th
                    className="text-right text-xs font-medium text-stone-500 uppercase tracking-wider py-2 px-2 cursor-pointer select-none hover:text-stone-700 transition"
                    onClick={() => handleSort('orderCount')}
                  >
                    <span className="inline-flex items-center gap-1 justify-end">
                      Orders <SortIcon field="orderCount" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedCustomers.map((customer, index) => (
                  <tr
                    key={customer.email}
                    className={`border-b border-stone-100 last:border-b-0 hover:bg-stone-50 transition ${
                      index % 2 === 1 ? 'bg-stone-50/50' : ''
                    }`}
                  >
                    <td className="py-2.5 px-2 text-stone-400 font-medium">{index + 1}</td>
                    <td className="py-2.5 px-2 text-stone-700">{customer.name || '\u2014'}</td>
                    <td className="py-2.5 px-2 text-stone-500 text-xs">{customer.email}</td>
                    <td className="py-2.5 px-2 text-right font-medium text-stone-900">{formatCurrency(customer.totalSpend)}</td>
                    <td className="py-2.5 px-2 text-right text-stone-700">{formatNumber(customer.orderCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-stone-400 py-4 text-center">No customer data</p>
        )}
      </div>
    </div>
  );
}
