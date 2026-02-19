import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';
import {
  Users,
  Search,
  Download,
  CheckCircle,
  TrendingUp,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserX,
  MoreHorizontal,
  KeyRound,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  authProvider: 'email' | 'google' | 'none';
  source: string;
  createdAt: string;
  lastLoginAt: string | null;
  orderCount: number;
  totalSpend: number;
}

interface CustomerStats {
  totalCustomers: number;
  verifiedCustomers: number;
  newThisMonth: number;
  totalRevenue: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type StatusFilter = 'all' | 'verified' | 'unverified';
type SourceFilter = 'all' | 'website' | 'squarespace_migration';
type SortOption = 'newest' | 'oldest' | 'most-orders' | 'highest-spend';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_LIMIT = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  if (amount === 0) return '$0';
  if (amount >= 5000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(dateString: string): string {
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function timeAgo(dateString: string | null): string {
  if (!dateString) return 'Never';
  const now = new Date();
  const then = new Date(dateString);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  icon: Icon,
  label,
  value,
  borderColor,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  borderColor: string;
  accent: string;
}) {
  return (
    <div
      className="bg-white rounded-lg border border-stone-200 shadow-sm p-4 flex items-center gap-4"
      style={{ borderLeftWidth: '4px', borderLeftColor: borderColor }}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-semibold text-stone-900">{value}</p>
        <p className="text-xs text-stone-500">{label}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CustomersManager() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  // Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    totalCustomers: 0,
    verifiedCustomers: 0,
    newThisMonth: 0,
    totalRevenue: 0,
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 0,
  });

  // UI state
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [page, setPage] = useState(1);

  // Actions dropdown
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [sendingReset, setSendingReset] = useState<string | null>(null);

  // ---------- Debounced search ----------

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ---------- Data fetching ----------

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(PAGE_LIMIT));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      params.set('sort', sortOption);

      const res = await fetch(`${API_BASE}/customers?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) throw new Error('Failed to load customers');

      const data = await res.json();
      setCustomers(data.customers || []);
      setStats(data.stats || {
        totalCustomers: 0,
        verifiedCustomers: 0,
        newThisMonth: 0,
        totalRevenue: 0,
      });
      setPagination(data.pagination || {
        page: 1,
        limit: PAGE_LIMIT,
        total: 0,
        totalPages: 0,
      });
    } catch {
      // Silently handle fetch errors
    } finally {
      setLoading(false);
    }
  }, [accessToken, page, debouncedSearch, statusFilter, sourceFilter, sortOption]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // ---------- Export CSV ----------

  const handleExport = async () => {
    try {
      const res = await fetch(`${API_BASE}/customers/export`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // Silently handle export errors
    }
  };

  // ---------- Send password reset ----------

  const handleSendReset = async (customerId: string) => {
    setSendingReset(customerId);
    try {
      const res = await fetch(`${API_BASE}/customers/${customerId}/send-reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to send reset link');
      } else {
        alert(data.message || 'Reset link sent');
      }
    } catch {
      alert('Failed to send reset link');
    } finally {
      setSendingReset(null);
      setOpenDropdownId(null);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!openDropdownId) return;
    const handler = () => setOpenDropdownId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openDropdownId]);

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-serif text-stone-800"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Site Members
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {stats.totalCustomers} total member{stats.totalCustomers !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Customers"
          value={stats.totalCustomers}
          borderColor="#78716c"
          accent="bg-stone-100 text-stone-600"
        />
        <StatCard
          icon={CheckCircle}
          label="Verified"
          value={stats.verifiedCustomers}
          borderColor="#16a34a"
          accent="bg-green-100 text-green-700"
        />
        <StatCard
          icon={TrendingUp}
          label="New This Month"
          value={stats.newThisMonth}
          borderColor="#2563eb"
          accent="bg-blue-100 text-blue-700"
        />
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          borderColor="#8d3038"
          accent="bg-red-50 text-[#8d3038]"
        />
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-200 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#8d3038]/20 focus:border-[#8d3038]"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#8d3038]/20 focus:border-[#8d3038]"
          >
            <option value="all">All Status</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>

          {/* Source filter */}
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value as SourceFilter);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#8d3038]/20 focus:border-[#8d3038]"
          >
            <option value="all">All Sources</option>
            <option value="website">Website</option>
            <option value="squarespace_migration">SquareSpace Migration</option>
          </select>

          {/* Sort */}
          <select
            value={sortOption}
            onChange={(e) => {
              setSortOption(e.target.value as SortOption);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#8d3038]/20 focus:border-[#8d3038]"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="most-orders">Most Orders</option>
            <option value="highest-spend">Highest Spend</option>
          </select>
        </div>
      </div>

      {/* Customer table */}
      <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-stone-400 mb-3" />
            <p className="text-sm text-stone-500">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-4">
              <UserX className="w-7 h-7 text-stone-400" />
            </div>
            <h3 className="text-lg font-semibold text-stone-800 mb-1">No customers yet</h3>
            <p className="text-sm text-stone-500">
              {debouncedSearch || statusFilter !== 'all'
                ? 'No customers match your filters. Try adjusting your search.'
                : 'Customers will appear here once they create an account.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-stone-50/80">
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Orders
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Total Spend
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                      Last Active
                    </th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-medium text-stone-500 uppercase tracking-wider w-12">
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      onClick={() => navigate(`/admin/customers/${customer.id}`)}
                      className="hover:bg-stone-50/60 transition-colors cursor-pointer"
                    >
                      {/* Customer (avatar + name + email) */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium text-stone-600">
                              {customer.firstName ? customer.firstName.charAt(0).toUpperCase() : '?'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-stone-800 truncate">
                              {customer.firstName} {customer.lastName}
                            </p>
                            <p className="text-xs text-stone-500 truncate">
                              {customer.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {customer.emailVerified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-medium">
                            <CheckCircle className="w-3 h-3" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 text-[11px] font-medium">
                            Unverified
                          </span>
                        )}
                      </td>

                      {/* Account type */}
                      <td className="px-4 py-3">
                        {customer.source === 'squarespace_migration' ? (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-medium">
                            SQ Migration
                          </span>
                        ) : customer.authProvider === 'google' ? (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-medium">
                            Google
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[11px] font-medium">
                            Email
                          </span>
                        )}
                      </td>

                      {/* Orders */}
                      <td className="px-4 py-3 text-sm text-stone-600">
                        {customer.orderCount}
                      </td>

                      {/* Total Spend */}
                      <td className="px-4 py-3 text-sm font-medium text-stone-800">
                        {formatCurrency(customer.totalSpend)}
                      </td>

                      {/* Joined */}
                      <td className="px-4 py-3 text-sm text-stone-500 whitespace-nowrap">
                        {formatDate(customer.createdAt)}
                      </td>

                      {/* Last Active */}
                      <td className="px-4 py-3 text-sm text-stone-500 whitespace-nowrap">
                        {timeAgo(customer.lastLoginAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {customer.authProvider === 'email' && (
                          <div className="relative inline-block">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(openDropdownId === customer.id ? null : customer.id);
                              }}
                              className="p-1 rounded-md hover:bg-stone-100 transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4 text-stone-400" />
                            </button>
                            {openDropdownId === customer.id && (
                              <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border border-stone-200 py-1 z-20">
                                <button
                                  onClick={() => handleSendReset(customer.id)}
                                  disabled={sendingReset === customer.id}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
                                >
                                  <KeyRound className="w-4 h-4 text-stone-400" />
                                  {sendingReset === customer.id ? 'Sending...' : 'Send Password Reset'}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100">
                <span className="text-sm text-stone-500">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page >= pagination.totalPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
