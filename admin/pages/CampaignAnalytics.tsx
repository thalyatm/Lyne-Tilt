import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Eye,
  MousePointerClick,
  AlertTriangle,
  UserMinus,
  Send,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';

// ============================================
// TYPES
// ============================================

interface Campaign {
  id: string;
  subject: string;
  status: string;
  sentAt: string;
  recipientCount: number;
}

interface Summary {
  delivered: number;
  opened: number;
  openRate: number;
  clicked: number;
  clickRate: number;
  bounced: number;
  complained: number;
  unsubscribed: number;
}

interface ClickBreakdownEntry {
  url: string;
  clicks: number;
  uniqueClicks: number;
}

interface TimelineEntry {
  hour: string;
  opens: number;
  clicks: number;
}

interface RecentEvent {
  id: string;
  email: string;
  eventType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface AnalyticsData {
  campaign: Campaign;
  summary: Summary;
  clickBreakdown: ClickBreakdownEntry[];
  timeline: TimelineEntry[];
  recentEvents: RecentEvent[];
}

// ============================================
// HELPERS
// ============================================

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

function truncateUrl(url: string, maxLength = 60): string {
  if (url.length <= maxLength) return url;
  return url.slice(0, maxLength - 3) + '...';
}

function formatHourLabel(isoString: string, sentAt: string): string {
  const sentTime = new Date(sentAt).getTime();
  const pointTime = new Date(isoString).getTime();
  const hoursElapsed = Math.round((pointTime - sentTime) / 3600000);
  if (hoursElapsed <= 0) return '0h';
  return `${hoursElapsed}h`;
}

const statusBadgeColors: Record<string, string> = {
  sent: 'bg-green-100 text-green-700',
  sending: 'bg-blue-100 text-blue-700',
  scheduled: 'bg-amber-100 text-amber-700',
  draft: 'bg-stone-100 text-stone-600',
  failed: 'bg-red-100 text-red-700',
};

const eventTypeBadgeColors: Record<string, string> = {
  delivered: 'bg-green-100 text-green-700',
  opened: 'bg-blue-100 text-blue-700',
  clicked: 'bg-purple-100 text-purple-700',
  bounced: 'bg-amber-100 text-amber-700',
  complained: 'bg-red-100 text-red-700',
  unsubscribed: 'bg-stone-100 text-stone-600',
};

// ============================================
// SKELETON COMPONENTS
// ============================================

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-stone-200" />
        <div className="h-4 w-20 bg-stone-200 rounded" />
      </div>
      <div className="h-8 w-16 bg-stone-200 rounded mb-1" />
      <div className="h-3 w-24 bg-stone-200 rounded" />
    </div>
  );
}

function SkeletonHeader() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-32 bg-stone-200 rounded mb-4" />
      <div className="h-8 w-64 bg-stone-200 rounded mb-2" />
      <div className="h-4 w-48 bg-stone-200 rounded" />
    </div>
  );
}

// ============================================
// SUMMARY CARD
// ============================================

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  rate?: number;
  colorClass: string;
}

function SummaryCard({ icon, label, value, rate, colorClass }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-stone-500">{label}</span>
      </div>
      <div className="text-3xl font-bold text-stone-900">{value.toLocaleString()}</div>
      {rate !== undefined && (
        <div className="text-sm text-stone-500 mt-1">{rate.toFixed(1)}%</div>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function CampaignAnalytics() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !token) return;

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE}/campaigns/${id}/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          if (response.status === 404) {
            setError('Campaign not found.');
            return;
          }
          throw new Error(`Failed to load analytics (${response.status})`);
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [id, token]);

  // Prepare timeline chart data
  const chartData = data?.timeline?.map((entry) => ({
    label: formatHourLabel(entry.hour, data.campaign.sentAt),
    opens: entry.opens,
    clicks: entry.clicks,
  })) ?? [];

  // Sort click breakdown by total clicks descending
  const sortedClickBreakdown = data?.clickBreakdown
    ? [...data.clickBreakdown].sort((a, b) => b.clicks - a.clicks)
    : [];

  // Limit recent events to 20
  const recentEvents = data?.recentEvents?.slice(0, 20) ?? [];

  // ---- ERROR STATE ----
  if (error && !loading) {
    return (
      <div className="p-8">
        <Link
          to="/admin/campaigns"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-6"
        >
          <ArrowLeft size={16} />
          Campaigns
        </Link>
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center shadow-sm">
          <AlertTriangle size={40} className="mx-auto text-amber-500 mb-4" />
          <h2 className="text-lg font-semibold text-stone-900 mb-2">Unable to load analytics</h2>
          <p className="text-stone-500 mb-6">{error}</p>
          <button
            onClick={() => navigate('/admin/campaigns')}
            className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors"
          >
            Back to Campaigns
          </button>
        </div>
      </div>
    );
  }

  // ---- LOADING STATE ----
  if (loading) {
    return (
      <div className="p-8 space-y-8">
        <SkeletonHeader />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm animate-pulse">
          <div className="h-5 w-48 bg-stone-200 rounded mb-4" />
          <div className="h-64 bg-stone-100 rounded" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { campaign, summary } = data;

  return (
    <div className="p-8 space-y-8">
      {/* ---- HEADER ---- */}
      <div>
        <Link
          to="/admin/campaigns"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-4"
        >
          <ArrowLeft size={16} />
          Campaigns
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
              {campaign.subject}
            </h1>
            <p className="text-stone-500 mt-1">
              Sent on {formatDate(campaign.sentAt)}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
              statusBadgeColors[campaign.status] || 'bg-stone-100 text-stone-600'
            }`}
          >
            {campaign.status}
          </span>
        </div>
      </div>

      {/* ---- SUMMARY CARDS ---- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <SummaryCard
          icon={<Mail size={20} className="text-stone-600" />}
          label="Recipients"
          value={campaign.recipientCount}
          colorClass="bg-stone-100"
        />
        <SummaryCard
          icon={<Send size={20} className="text-green-600" />}
          label="Delivered"
          value={summary.delivered}
          colorClass="bg-green-100"
        />
        <SummaryCard
          icon={<Eye size={20} className="text-blue-600" />}
          label="Opened"
          value={summary.opened}
          rate={summary.openRate}
          colorClass="bg-blue-100"
        />
        <SummaryCard
          icon={<MousePointerClick size={20} className="text-blue-600" />}
          label="Clicked"
          value={summary.clicked}
          rate={summary.clickRate}
          colorClass="bg-blue-100"
        />
        <SummaryCard
          icon={<AlertTriangle size={20} className="text-amber-600" />}
          label="Bounced"
          value={summary.bounced}
          colorClass="bg-amber-100"
        />
        <SummaryCard
          icon={<UserMinus size={20} className="text-red-600" />}
          label="Unsubscribed"
          value={summary.unsubscribed}
          colorClass="bg-red-100"
        />
      </div>

      {/* ---- OPEN/CLICK TIMELINE CHART ---- */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Open &amp; Click Timeline</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: '#78716c' }}
                  axisLine={{ stroke: '#d6d3d1' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#78716c' }}
                  axisLine={{ stroke: '#d6d3d1' }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e7e5e4',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="opens"
                  name="Opens"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#3b82f6' }}
                />
                <Line
                  type="monotone"
                  dataKey="clicks"
                  name="Clicks"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ---- LINK CLICK BREAKDOWN ---- */}
      {sortedClickBreakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Link Click Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left py-3 px-4 font-medium text-stone-500">URL</th>
                  <th className="text-right py-3 px-4 font-medium text-stone-500">Total Clicks</th>
                  <th className="text-right py-3 px-4 font-medium text-stone-500">Unique Clicks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {sortedClickBreakdown.map((entry, i) => (
                  <tr key={i} className="hover:bg-stone-50 transition-colors">
                    <td className="py-3 px-4">
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                        title={entry.url}
                      >
                        {truncateUrl(entry.url)}
                      </a>
                    </td>
                    <td className="py-3 px-4 text-right text-stone-700 font-medium">
                      {entry.clicks.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-stone-700 font-medium">
                      {entry.uniqueClicks.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- RECENT ACTIVITY ---- */}
      {recentEvents.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Recent Activity</h2>
          <div className="divide-y divide-stone-100">
            {recentEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between py-3 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm text-stone-700 font-mono truncate">
                    {maskEmail(event.email)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize whitespace-nowrap ${
                      eventTypeBadgeColors[event.eventType] || 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {event.eventType}
                  </span>
                </div>
                <span className="text-xs text-stone-400 whitespace-nowrap">
                  {formatTimeAgo(event.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- EMPTY STATE: No engagement data yet ---- */}
      {summary.delivered === 0 &&
        summary.opened === 0 &&
        summary.clicked === 0 &&
        chartData.length === 0 &&
        recentEvents.length === 0 && (
          <div className="bg-white rounded-xl border border-stone-200 p-12 text-center shadow-sm">
            <Mail size={40} className="mx-auto text-stone-300 mb-4" />
            <h2 className="text-lg font-semibold text-stone-900 mb-2">No engagement data yet</h2>
            <p className="text-stone-500">
              Analytics will appear here as recipients interact with your campaign.
            </p>
          </div>
        )}
    </div>
  );
}
