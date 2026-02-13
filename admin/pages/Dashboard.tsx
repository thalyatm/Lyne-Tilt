import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  FileText,
  Send,
  Inbox,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Mail,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';

interface DashboardStats {
  products: number;
  blogPosts: number;
  publishedPosts: number;
  draftPosts: number;
  coachingPackages: number;
  learnItems: number;
  testimonials: number;
  faqs: number;
  subscribers: number;
  unreadMessages: number;
  totalMessages: number;
  productsInStock?: number;
  subscribersThisMonth?: number;
}

interface NeedsAttentionItem {
  type: string;
  title: string;
  description: string;
  link: string;
  priority: 'high' | 'medium' | 'low';
}

interface DashboardData {
  stats: DashboardStats;
  needsAttention: NeedsAttentionItem[];
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityName: string;
    userName: string;
    createdAt: string;
    details?: string;
  }>;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'archived';
  createdAt: string;
  readAt?: string;
}

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
  return date.toLocaleDateString();
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const [dashboardRes, messagesRes] = await Promise.all([
          fetch(`${API_BASE}/dashboard`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/contact`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (dashboardRes.ok) {
          const dashboardData = await dashboardRes.json();
          setData(dashboardData);
        } else {
          setError('Could not load dashboard data');
        }

        if (messagesRes.ok) {
          const allMessages: ContactMessage[] = await messagesRes.json();
          setMessages(allMessages.slice(0, 5));
        }
      } catch {
        setError('Could not connect to the server');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const stats = data?.stats || {
    products: 0,
    blogPosts: 0,
    publishedPosts: 0,
    draftPosts: 0,
    coachingPackages: 0,
    learnItems: 0,
    testimonials: 0,
    faqs: 0,
    subscribers: 0,
    unreadMessages: 0,
    totalMessages: 0,
  };

  const statCards = [
    {
      label: 'Products',
      value: stats.products,
      subtitle: stats.productsInStock !== undefined
        ? `${stats.productsInStock} in stock`
        : `${stats.products} listed`,
      to: '/admin/products',
    },
    {
      label: 'Posts',
      value: stats.blogPosts,
      subtitle: stats.draftPosts > 0
        ? `${stats.draftPosts} draft${stats.draftPosts !== 1 ? 's' : ''}`
        : 'All published',
      to: '/admin/blog',
    },
    {
      label: 'Subscribers',
      value: stats.subscribers,
      subtitle: stats.subscribersThisMonth !== undefined
        ? `+${stats.subscribersThisMonth} this month`
        : `${stats.subscribers} active`,
      to: '/admin/newsletter',
    },
    {
      label: 'Unread',
      value: stats.unreadMessages,
      subtitle: `of ${stats.totalMessages} total`,
      to: '/admin/inbox',
    },
  ];

  const quickActions = [
    {
      label: 'Add product',
      icon: ShoppingBag,
      to: '/admin/products',
    },
    {
      label: 'Write blog post',
      icon: FileText,
      to: '/admin/blog',
    },
    {
      label: 'Send newsletter',
      icon: Send,
      to: '/admin/newsletter',
    },
    {
      label: 'Read messages',
      icon: Inbox,
      to: '/admin/inbox',
    },
  ];

  // -- Loading state --
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 w-56 bg-stone-100 animate-pulse rounded-md" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-stone-100 animate-pulse rounded-lg h-24"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <div className="h-4 w-28 bg-stone-100 animate-pulse rounded mb-3" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-stone-100 animate-pulse rounded-lg h-20"
                />
              ))}
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="h-4 w-32 bg-stone-100 animate-pulse rounded mb-3" />
            <div className="bg-stone-100 animate-pulse rounded-lg h-64" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-semibold text-stone-900">
          {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}
        </h1>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-3 bg-white border border-red-200 rounded-lg text-sm flex items-start gap-3">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-400" />
          <div>
            <p className="font-medium text-stone-800">{error}</p>
            <p className="text-stone-500 mt-0.5 text-xs">
              Some data might not be up to date. Try refreshing the page.
            </p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="bg-white border border-stone-200 rounded-lg p-4 hover:border-stone-300 transition"
          >
            <p className="text-2xl font-semibold text-stone-900">{card.value}</p>
            <p className="text-xs text-stone-500 mt-0.5">{card.label}</p>
            <p className="text-xs text-stone-400 mt-1">{card.subtitle}</p>
          </Link>
        ))}
      </div>

      {/* Needs attention */}
      {data?.needsAttention && data.needsAttention.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wider">
            Needs attention
          </h2>
          {data.needsAttention.map((item, idx) => (
            <Link
              key={idx}
              to={item.link.startsWith('/admin') ? item.link : `/admin${item.link}`}
              className={`flex items-center gap-3 p-3 bg-white border border-stone-200 rounded-lg hover:border-stone-300 transition ${
                item.priority === 'high' ? 'border-l-2 border-l-red-400' : ''
              }`}
            >
              <AlertCircle size={16} className="text-stone-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-800">{item.title}</p>
                <p className="text-xs text-stone-500 mt-0.5">{item.description}</p>
              </div>
              <ArrowRight size={14} className="text-stone-400 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {/* All caught up */}
      {!error && (!data?.needsAttention || data.needsAttention.length === 0) && (
        <div className="text-center py-12 bg-white border border-stone-200 rounded-lg">
          <CheckCircle2 size={28} className="mx-auto mb-3 text-emerald-400" />
          <p className="text-stone-700 font-medium">All caught up</p>
          <p className="text-stone-400 text-sm mt-1">
            Nothing needs your attention right now.
          </p>
        </div>
      )}

      {/* Two-column: Quick Actions + Recent Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-3">
          <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
            Quick actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className="bg-white border border-stone-200 rounded-lg p-4 hover:border-stone-300 transition group"
              >
                <action.icon
                  size={18}
                  className="text-stone-400 group-hover:text-stone-600 transition-colors"
                />
                <p className="text-sm font-medium text-stone-700 mt-2">
                  {action.label}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Messages */}
        <div className="lg:col-span-2">
          <h2 className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-3">
            Recent messages
          </h2>
          <div className="bg-white border border-stone-200 rounded-lg divide-y divide-stone-100">
            {messages.length > 0 ? (
              <>
                {messages.map((msg) => (
                  <Link
                    key={msg.id}
                    to={`/admin/inbox`}
                    className="block px-4 py-3 hover:bg-stone-50 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-stone-800 truncate">
                        {msg.name}
                      </p>
                      <span className="text-[11px] text-stone-400 flex-shrink-0">
                        {timeAgo(msg.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 truncate mt-0.5">
                      {msg.subject}
                    </p>
                  </Link>
                ))}
                <div className="px-4 py-2.5 border-t border-stone-100">
                  <Link
                    to="/admin/inbox"
                    className="text-xs text-stone-500 hover:text-stone-700 transition"
                  >
                    View all messages
                    <ArrowRight size={12} className="inline ml-1" />
                  </Link>
                </div>
              </>
            ) : (
              <div className="px-4 py-8 text-center">
                <Mail size={18} className="mx-auto mb-2 text-stone-300" />
                <p className="text-xs text-stone-400">No messages yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
