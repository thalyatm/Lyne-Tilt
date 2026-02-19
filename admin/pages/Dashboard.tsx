import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  Users,
  AlertTriangle,
  AlertCircle,
  Info,
  ArrowRight,
  RefreshCw,
  Package,
  CalendarDays,
  CheckCircle,
  ClipboardList,
  MessageSquare,
  Mail,
  Clock,
  Phone,
  Plus,
  Trash2,
  ListChecks,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';

// ─── Types ─────────────────────────────────────────────────

interface Warning {
  id: string;
  kind: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  href: string;
}

interface UpcomingBooking {
  id: string;
  customer_name: string;
  session_date: string;
  start_time: string;
  status: string;
  type?: 'booking' | 'call';
  href: string;
}

interface PendingOrder {
  id: string;
  order_number: string;
  customer_name: string;
  total: string;
  status: string;
  created_at: string;
  href: string;
}

interface DashboardTask {
  id: string;
  text: string;
  done: boolean;
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
    revenue_daily_30d: { date: string; value: number }[];
    subscribers_daily_30d: { date: string; value: number }[];
    email_sends_daily_30d: { date: string; value: number }[];
  };
  content: {
    drafts_count_by_type: {
      blog: number;
      coaching: number;
      workshops: number;
      products: number;
    };
    recently_updated: unknown[];
  };
  marketing: {
    active_campaigns: { id: string; name: string; status: string; updated_at: string; href: string }[];
    automations_health: {
      active: number;
      paused: number;
      failing: number;
    };
  };
  actions: {
    new_applications: number;
    pending_reviews: number;
    orders_to_fulfill: number;
    unread_messages: number;
    pending_bookings: number;
  };
  ops: {
    warnings: Warning[];
  };
  schedule: {
    upcoming_bookings: UpcomingBooking[];
  };
  pendingOrders: PendingOrder[];
}

// ─── Formatting helpers ────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
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

function formatSessionDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AU', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

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
  confirmed: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-red-50 text-red-700',
  outcome_required: 'bg-red-50 text-red-700',
};

const SEVERITY_STYLES: Record<string, { border: string; icon: React.ComponentType<{ size?: number; className?: string }>; iconColor: string }> = {
  high: { border: 'border-l-red-400', icon: AlertTriangle, iconColor: 'text-red-400' },
  medium: { border: 'border-l-amber-400', icon: AlertCircle, iconColor: 'text-amber-400' },
  low: { border: 'border-l-blue-300', icon: Info, iconColor: 'text-blue-400' },
};

// ─── Task list helpers ────────────────────────────────────

const TASKS_KEY = 'admin-dashboard-tasks';

function loadTasks(): DashboardTask[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks: DashboardTask[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

// ─── Skeleton loader ───────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-56 bg-stone-100 rounded-md" />
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-stone-100 rounded-lg h-10 flex-1" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-stone-100 rounded-lg h-16" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-stone-100 rounded-lg h-56" />
        <div className="bg-stone-100 rounded-lg h-56" />
        <div className="bg-stone-100 rounded-lg h-56" />
      </div>
    </div>
  );
}

// ─── Action card (StatCard format) ────────────────────────

interface ActionItem {
  label: string;
  count: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  href: string;
  color: string;
  bg: string;
  borderColor: string;
}

// ─── Main component ────────────────────────────────────────

export default function Dashboard() {
  const { user, token } = useAuth();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Task list state
  const [tasks, setTasks] = useState<DashboardTask[]>(loadTasks);
  const [newTaskText, setNewTaskText] = useState('');

  const updateTasks = (next: DashboardTask[]) => {
    setTasks(next);
    saveTasks(next);
  };

  const addTask = () => {
    const text = newTaskText.trim();
    if (!text) return;
    updateTasks([...tasks, { id: crypto.randomUUID(), text, done: false }]);
    setNewTaskText('');
  };

  const toggleTask = (id: string) => {
    updateTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const deleteTask = (id: string) => {
    updateTasks(tasks.filter(t => t.id !== id));
  };

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

  const actions = data.actions;
  const ops = data.ops;
  const upcomingBookings = data.schedule?.upcoming_bookings ?? [];
  const pendingOrders = data.pendingOrders ?? [];

  // ─── Action items that need attention ───

  const actionItems: ActionItem[] = [
    {
      label: 'Orders to fulfill',
      count: actions.orders_to_fulfill,
      icon: Package,
      href: '/admin/orders',
      color: 'text-blue-600',
      bg: 'bg-blue-100 text-blue-700',
      borderColor: '#2563eb',
    },
    {
      label: 'New applications',
      count: actions.new_applications,
      icon: ClipboardList,
      href: '/admin/coaching/applications',
      color: 'text-violet-600',
      bg: 'bg-violet-100 text-violet-700',
      borderColor: '#7c3aed',
    },
    {
      label: 'Reviews to moderate',
      count: actions.pending_reviews,
      icon: MessageSquare,
      href: '/admin/reviews',
      color: 'text-amber-600',
      bg: 'bg-amber-100 text-amber-700',
      borderColor: '#d97706',
    },
    {
      label: 'Unread messages',
      count: actions.unread_messages,
      icon: Mail,
      href: '/admin/inbox',
      color: 'text-red-600',
      bg: 'bg-red-100 text-red-700',
      borderColor: '#dc2626',
    },
    {
      label: 'Bookings to confirm',
      count: actions.pending_bookings,
      icon: Clock,
      href: '/admin/bookings',
      color: 'text-emerald-600',
      bg: 'bg-emerald-100 text-emerald-700',
      borderColor: '#059669',
    },
  ];

  const activeActions = actionItems.filter(a => a.count > 0);
  const totalActions = activeActions.reduce((sum, a) => sum + a.count, 0);

  // ─── Quick actions ───

  const quickActions = [
    { label: 'Fulfill Orders', icon: Package, to: '/admin/orders' },
    { label: 'Review Applications', icon: ClipboardList, to: '/admin/coaching/applications' },
    { label: 'Moderate Reviews', icon: MessageSquare, to: '/admin/reviews' },
    { label: 'Check Messages', icon: Mail, to: '/admin/inbox' },
    { label: 'Confirm Bookings', icon: Clock, to: '/admin/bookings' },
  ];

  const pendingTaskCount = tasks.filter(t => !t.done).length;

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

      {/* ─── Quick Actions (horizontal row) ─── */}
      <div>
        <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
          Quick Actions
        </h2>
      <div className="flex flex-wrap gap-2">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            className="bg-white border border-stone-200 rounded-lg px-3 py-2 hover:border-stone-300 transition group flex items-center gap-2"
          >
            <div className="bg-stone-50 p-1 rounded group-hover:bg-stone-100 transition-colors">
              <action.icon size={13} className="text-stone-400 group-hover:text-stone-600 transition-colors" />
            </div>
            <span className="text-sm text-stone-600 group-hover:text-stone-900 transition-colors whitespace-nowrap">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
      </div>

      {/* ─── Action Centre ─── */}
      {activeActions.length > 0 ? (
        <div className="bg-red-100 border border-red-200 rounded-xl p-4">
          <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
            {totalActions} {totalActions === 1 ? 'item' : 'items'} needing attention
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {actionItems.map((action) => (
              <Link
                key={action.label}
                to={action.href}
                className={`bg-white rounded-xl border border-stone-200 px-4 py-2.5 flex items-center gap-3 transition hover:border-stone-300 ${
                  action.count === 0 ? 'opacity-40' : ''
                }`}
                style={{ borderLeftWidth: '4px', borderLeftColor: action.count > 0 ? action.borderColor : '#d6d3d1' }}
              >
                <div className={`w-7 h-7 rounded-md flex items-center justify-center ${action.bg}`}>
                  <action.icon size={14} />
                </div>
                <div>
                  <p className="text-xl font-semibold text-stone-900 leading-tight">
                    {action.count > 0 ? action.count : '\u2014'}
                  </p>
                  <p className="text-[11px] text-stone-500">{action.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-red-100 border border-red-200 rounded-xl p-4">
          <div className="bg-white border border-stone-200 rounded-lg p-6 text-center">
            <CheckCircle size={24} className="mx-auto mb-2 text-emerald-400" />
            <p className="text-sm font-medium text-stone-700">All caught up</p>
            <p className="text-xs text-stone-400 mt-1">No outstanding actions right now</p>
          </div>
        </div>
      )}

      {/* ─── Attention Needed (warnings) ─── */}
      {ops.warnings.length > 0 && (
        <div className="space-y-2">
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

      {/* ─── Upcoming Schedule + Orders to Fulfill + Task List (3 columns) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Schedule */}
        <div>
          <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
            Upcoming schedule
          </h2>
          <div className="bg-white border border-stone-200 rounded-lg divide-y divide-stone-100">
            {upcomingBookings.length > 0 ? (
              upcomingBookings.map((booking) => {
                const isCall = booking.type === 'call';
                const statusLabel = booking.status === 'outcome_required' ? 'Outcome Required' : booking.status;
                const statusStyle = STATUS_STYLES[booking.status] || 'bg-stone-100 text-stone-600';
                const IconComp = isCall ? Phone : CalendarDays;
                return (
                  <Link
                    key={booking.id}
                    to={booking.href}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition"
                  >
                    <IconComp size={14} className={`flex-shrink-0 ${isCall ? 'text-violet-400' : 'text-stone-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-stone-700 truncate">
                          {booking.customer_name}
                        </p>
                        {isCall && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 font-medium">
                            Call
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400">
                        {formatSessionDate(booking.session_date)}
                        {booking.start_time ? ` at ${booking.start_time}` : ''}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusStyle}`}
                    >
                      {statusLabel}
                    </span>
                  </Link>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center">
                <CheckCircle size={18} className="mx-auto mb-2 text-emerald-300" />
                <p className="text-xs text-stone-400">No upcoming sessions</p>
              </div>
            )}
          </div>
        </div>

        {/* Orders to Fulfill */}
        <div>
          <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
            Orders to fulfill
          </h2>
          <div className="bg-white border border-stone-200 rounded-lg divide-y divide-stone-100">
            {pendingOrders.length > 0 ? (
              pendingOrders.map((order) => (
                <Link
                  key={order.id}
                  to={order.href}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition"
                >
                  <ShoppingCart size={14} className="text-stone-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-stone-700">
                        #{order.order_number}
                      </span>
                      <span className="text-sm text-stone-500 truncate">
                        {order.customer_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-400">
                        {timeAgo(order.created_at)}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[order.status] || 'bg-stone-100 text-stone-600'}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-stone-700 flex-shrink-0">
                    ${order.total}
                  </span>
                </Link>
              ))
            ) : (
              <div className="px-4 py-8 text-center">
                <CheckCircle size={18} className="mx-auto mb-2 text-emerald-300" />
                <p className="text-xs text-stone-400">All orders fulfilled</p>
              </div>
            )}
          </div>
        </div>

        {/* Task List */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wider">
              Task List
            </h2>
            {pendingTaskCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded-full font-medium">
                {pendingTaskCount}
              </span>
            )}
          </div>
          <div className="bg-white border border-stone-200 rounded-lg">
            {/* Add task */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-stone-100">
              <input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                placeholder="Add a task..."
                className="flex-1 text-sm bg-transparent outline-none text-stone-700 placeholder-stone-400"
              />
              <button
                onClick={addTask}
                disabled={!newTaskText.trim()}
                className="p-1 text-stone-400 hover:text-stone-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <Plus size={16} />
              </button>
            </div>
            {/* Task items */}
            {tasks.length > 0 ? (
              <div className="divide-y divide-stone-100">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-4 py-2.5 group"
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition ${
                        task.done
                          ? 'bg-stone-900 border-stone-900'
                          : 'border-stone-300 hover:border-stone-400'
                      }`}
                    >
                      {task.done && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                    <span
                      className={`flex-1 text-sm ${
                        task.done
                          ? 'text-stone-400 line-through'
                          : 'text-stone-700'
                      }`}
                    >
                      {task.text}
                    </span>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-red-500 transition"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <ListChecks size={18} className="mx-auto mb-2 text-stone-300" />
                <p className="text-xs text-stone-400">No tasks yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
