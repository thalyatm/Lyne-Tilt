import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Edit3,
  Trash2,
  Send,
  Eye,
  EyeOff,
  Filter,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';

interface ActivityEntry {
  id: string;
  action: 'create' | 'update' | 'delete' | 'publish' | 'unpublish' | 'send';
  entityType: string;
  entityId: string;
  entityName: string;
  userId: string;
  userName: string;
  details?: string;
  createdAt: string;
}

interface ActivityStats {
  total: number;
  today: number;
  thisWeek: number;
  byAction: Record<string, number>;
  byEntity: Record<string, number>;
}

const actionIcons: Record<string, React.ReactNode> = {
  create: <Plus size={14} className="text-green-500" />,
  update: <Edit3 size={14} className="text-blue-500" />,
  delete: <Trash2 size={14} className="text-red-500" />,
  publish: <Eye size={14} className="text-purple-500" />,
  unpublish: <EyeOff size={14} className="text-amber-500" />,
  send: <Send size={14} className="text-teal-500" />,
};

const actionLabels: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  publish: 'Published',
  unpublish: 'Unpublished',
  send: 'Sent',
};

const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  publish: 'bg-purple-100 text-purple-700',
  unpublish: 'bg-amber-100 text-amber-700',
  send: 'bg-teal-100 text-teal-700',
};

export default function ActivityLog() {
  const { token } = useAuth();
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterEntity, setFilterEntity] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterAction) params.set('action', filterAction);
      if (filterEntity) params.set('entityType', filterEntity);
      params.set('limit', '100');

      const [activitiesRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/activity?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/activity/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (activitiesRes.ok) {
        const data = await activitiesRes.json();
        setActivities(data.activities);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [token, filterAction, filterEntity]);

  const formatTimeAgo = (dateString: string) => {
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
  };

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const entityTypes = stats ? Object.keys(stats.byEntity).sort() : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-stone-800">Activity Log</h1>
          <p className="text-stone-500 mt-1">Track all changes made to your site</p>
        </div>
        <button
          onClick={fetchActivities}
          className="flex items-center gap-2 px-3 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-2xl font-semibold text-stone-800">{stats.today}</p>
            <p className="text-sm text-stone-500">Today</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-2xl font-semibold text-stone-800">{stats.thisWeek}</p>
            <p className="text-sm text-stone-500">This week</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-2xl font-semibold text-stone-800">{stats.total}</p>
            <p className="text-sm text-stone-500">Total logged</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between p-4 text-stone-700 hover:bg-stone-50"
        >
          <div className="flex items-center gap-2">
            <Filter size={18} />
            <span className="font-medium">Filters</span>
            {(filterAction || filterEntity) && (
              <span className="px-2 py-0.5 bg-clay/10 text-clay text-xs rounded-full">
                {[filterAction, filterEntity].filter(Boolean).length} active
              </span>
            )}
          </div>
          <ChevronDown
            size={18}
            className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}
          />
        </button>

        {showFilters && (
          <div className="p-4 border-t border-stone-200 flex flex-wrap gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Action</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="px-3 py-2 border border-stone-200 rounded-lg text-sm"
              >
                <option value="">All actions</option>
                <option value="create">Created</option>
                <option value="update">Updated</option>
                <option value="delete">Deleted</option>
                <option value="publish">Published</option>
                <option value="unpublish">Unpublished</option>
                <option value="send">Sent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Entity Type</label>
              <select
                value={filterEntity}
                onChange={(e) => setFilterEntity(e.target.value)}
                className="px-3 py-2 border border-stone-200 rounded-lg text-sm"
              >
                <option value="">All types</option>
                {entityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {(filterAction || filterEntity) && (
              <button
                onClick={() => {
                  setFilterAction('');
                  setFilterEntity('');
                }}
                className="self-end px-3 py-2 text-sm text-stone-500 hover:text-stone-700"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Activity List */}
      <div className="bg-white rounded-lg shadow-sm">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-stone-300 border-t-clay rounded-full animate-spin mx-auto mb-4" />
            <p className="text-stone-500">Loading activity...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="p-8 text-center">
            <Clock size={32} className="mx-auto text-stone-300 mb-2" />
            <p className="text-stone-500">No activity recorded yet</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="p-4 flex items-start gap-4 hover:bg-stone-50 transition"
              >
                <div
                  className={`p-2 rounded-lg ${
                    actionColors[activity.action] || 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {actionIcons[activity.action] || <Clock size={14} />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-800">
                    <span className="font-medium">{activity.userName}</span>
                    {' '}
                    <span className="text-stone-500">
                      {actionLabels[activity.action] || activity.action}
                    </span>
                    {' '}
                    <span className="font-medium">{activity.entityType}</span>
                    {': '}
                    <span className="text-stone-700">{activity.entityName}</span>
                  </p>
                  {activity.details && (
                    <p className="text-xs text-stone-400 mt-0.5">{activity.details}</p>
                  )}
                </div>

                <div className="text-right whitespace-nowrap">
                  <p className="text-xs text-stone-400">{formatTimeAgo(activity.createdAt)}</p>
                  <p className="text-xs text-stone-300">{formatFullDate(activity.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
