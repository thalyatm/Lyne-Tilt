import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE } from '../config/api';
import {
  Search,
  Loader2,
  X,
  UserPlus,
  Phone,
  Mail,
  FileText,
  Clock,
  CheckCircle2,
  MessageSquare,
  UserCheck,
  Sparkles,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ApplicationStatus = 'new' | 'contacted' | 'scheduled' | 'closed';

interface CoachingApplication {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  reason: string | null;
  preferredPackage: string | null;
  status: ApplicationStatus;
  notes: string | null;
  clientId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'closed', label: 'Closed' },
];

const STATUS_BADGE_STYLES: Record<ApplicationStatus, string> = {
  new: 'bg-amber-100 text-amber-700',
  contacted: 'bg-blue-100 text-blue-700',
  scheduled: 'bg-green-100 text-green-700',
  closed: 'bg-stone-100 text-stone-600',
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  scheduled: 'Scheduled',
  closed: 'Closed',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

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

export default function ApplicationsManager() {
  const { accessToken } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  // Data
  const [applications, setApplications] = useState<CoachingApplication[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Promote state
  const [promotingId, setPromotingId] = useState<string | null>(null);

  // Status update state
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

  // Fetch applications
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`${API_BASE}/coaching/applications?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to load applications');
      const data = await res.json();
      setApplications(Array.isArray(data) ? data : data.items || []);
    } catch {
      error('Could not load coaching applications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, statusFilter, error]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Filter by search locally (the API may not support search)
  const filteredApplications = debouncedSearch
    ? applications.filter(
        (app) =>
          app.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          app.email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          (app.reason && app.reason.toLowerCase().includes(debouncedSearch.toLowerCase()))
      )
    : applications;

  // Compute status counts from all applications (unfiltered)
  const statusCounts = applications.reduce<Record<string, number>>(
    (acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    },
    {}
  );

  // Handle promote to client
  const handlePromote = async (app: CoachingApplication) => {
    setPromotingId(app.id);
    try {
      const res = await fetch(`${API_BASE}/coaching/applications/${app.id}/promote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Promote failed' }));
        throw new Error(errData.error || 'Failed to promote application');
      }
      const client = await res.json();
      success(`${app.name} promoted to client successfully.`);
      fetchApplications();
      // Navigate to the client detail page
      navigate(`/admin/coaching/clients/${client.id}`);
    } catch (err: any) {
      error(err.message || 'Could not promote application to client.');
    } finally {
      setPromotingId(null);
    }
  };

  // Handle status update
  const handleStatusChange = async (app: CoachingApplication, newStatus: ApplicationStatus) => {
    setStatusUpdating(app.id);
    try {
      const res = await fetch(`${API_BASE}/coaching/applications/${app.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      success(`Application status updated to "${STATUS_LABELS[newStatus]}".`);
      fetchApplications();
    } catch {
      error('Could not update application status.');
    } finally {
      setStatusUpdating(null);
    }
  };

  // Stats
  const totalApps = applications.length;
  const newApps = statusCounts['new'] || 0;
  const contactedApps = statusCounts['contacted'] || 0;
  const scheduledApps = statusCounts['scheduled'] || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-serif font-semibold text-stone-900">Applications</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Review coaching applications and promote applicants to clients
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label="Total Applications"
          value={totalApps}
          borderColor="#78716c"
          accent="bg-stone-100 text-stone-600"
        />
        <StatCard
          icon={Sparkles}
          label="New"
          value={newApps}
          borderColor="#d97706"
          accent="bg-amber-100 text-amber-700"
        />
        <StatCard
          icon={MessageSquare}
          label="Contacted"
          value={contactedApps}
          borderColor="#2563eb"
          accent="bg-blue-100 text-blue-700"
        />
        <StatCard
          icon={CheckCircle2}
          label="Scheduled"
          value={scheduledApps}
          borderColor="#16a34a"
          accent="bg-green-100 text-green-700"
        />
      </div>

      {/* Action bar */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or reason..."
            className="w-full bg-white border border-stone-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-stone-100 rounded"
            >
              <X size={14} className="text-stone-400" />
            </button>
          )}
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1 border-b border-stone-200">
          {STATUS_TABS.map((tab) => {
            const count = tab.key === 'all' ? totalApps : (statusCounts[tab.key] || 0);
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  statusFilter === tab.key
                    ? 'text-stone-900'
                    : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
                }`}
                style={statusFilter === tab.key ? { borderBottomColor: '#8d3038', color: '#8d3038' } : {}}
              >
                {tab.label}
                {count > 0 && (
                  <span className="ml-1.5 text-[10px] text-stone-400">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Applications list */}
      <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-stone-400 mb-3" />
            <p className="text-sm text-stone-500">Loading applications...</p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-4">
              <FileText size={28} className="text-stone-400" />
            </div>
            <h3 className="text-lg font-semibold text-stone-800 mb-1">
              {debouncedSearch || statusFilter !== 'all'
                ? 'No applications match your filters'
                : 'No applications yet'}
            </h3>
            <p className="text-sm text-stone-500">
              {debouncedSearch || statusFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Coaching applications will appear here when people apply through your website.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-stone-50/80">
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Applicant
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Package
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Applied
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredApplications.map((app) => (
                  <React.Fragment key={app.id}>
                    <tr
                      className="hover:bg-stone-50/60 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                    >
                      {/* Applicant */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium text-stone-600">
                              {app.name ? app.name.charAt(0).toUpperCase() : '?'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-stone-800 truncate">
                              {app.name}
                            </p>
                            <p className="text-xs text-stone-500 truncate">{app.email}</p>
                          </div>
                          {app.clientId && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 whitespace-nowrap">
                              Client
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={app.status} />
                      </td>

                      {/* Package */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-stone-600">
                          {app.preferredPackage || '\u2014'}
                        </span>
                      </td>

                      {/* Applied date */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-stone-500" title={formatDate(app.createdAt)}>
                          {timeAgo(app.createdAt)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Status dropdown */}
                          <div className="relative">
                            <select
                              value={app.status}
                              disabled={statusUpdating === app.id}
                              onChange={(e) =>
                                handleStatusChange(app, e.target.value as ApplicationStatus)
                              }
                              className="bg-white border border-stone-200 rounded px-2 py-1 text-xs text-stone-700 focus:outline-none focus:ring-1 focus:ring-stone-400 disabled:opacity-50 pr-6 appearance-none cursor-pointer"
                            >
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="scheduled">Scheduled</option>
                              <option value="closed">Closed</option>
                            </select>
                            {statusUpdating === app.id && (
                              <Loader2
                                size={12}
                                className="absolute right-1 top-1/2 -translate-y-1/2 animate-spin text-stone-400"
                              />
                            )}
                          </div>

                          {/* Promote to Client button */}
                          <button
                            onClick={() => handlePromote(app)}
                            disabled={!!app.clientId || promotingId === app.id}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                              app.clientId
                                ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                                : 'text-white hover:opacity-90 disabled:opacity-60'
                            }`}
                            style={
                              app.clientId
                                ? undefined
                                : { backgroundColor: '#8d3038' }
                            }
                            onMouseEnter={(e) => {
                              if (!app.clientId && promotingId !== app.id) {
                                e.currentTarget.style.backgroundColor = '#6b2228';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!app.clientId && promotingId !== app.id) {
                                e.currentTarget.style.backgroundColor = '#8d3038';
                              }
                            }}
                            title={
                              app.clientId
                                ? 'Already promoted to client'
                                : 'Promote this applicant to a coaching client'
                            }
                          >
                            {promotingId === app.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <UserPlus size={12} />
                            )}
                            {app.clientId ? 'Already a client' : 'Promote to Client'}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {expandedId === app.id && (
                      <tr className="bg-stone-50/40">
                        <td colSpan={5} className="px-4 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl ml-11">
                            {/* Contact info */}
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                                Contact Details
                              </h4>
                              <div className="flex items-center gap-2 text-sm text-stone-700">
                                <Mail size={14} className="text-stone-400" />
                                <a
                                  href={`mailto:${app.email}`}
                                  className="hover:text-[#8d3038] transition-colors"
                                >
                                  {app.email}
                                </a>
                              </div>
                              {app.phone && (
                                <div className="flex items-center gap-2 text-sm text-stone-700">
                                  <Phone size={14} className="text-stone-400" />
                                  <a
                                    href={`tel:${app.phone}`}
                                    className="hover:text-[#8d3038] transition-colors"
                                  >
                                    {app.phone}
                                  </a>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm text-stone-500">
                                <Clock size={14} className="text-stone-400" />
                                Applied {formatDate(app.createdAt)}
                              </div>
                            </div>

                            {/* Reason / notes */}
                            <div className="space-y-2">
                              {app.reason && (
                                <div>
                                  <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
                                    Reason / Goals
                                  </h4>
                                  <p className="text-sm text-stone-700 leading-relaxed">
                                    {app.reason}
                                  </p>
                                </div>
                              )}
                              {app.notes && (
                                <div>
                                  <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">
                                    Admin Notes
                                  </h4>
                                  <p className="text-sm text-stone-600 leading-relaxed">
                                    {app.notes}
                                  </p>
                                </div>
                              )}
                              {app.clientId && (
                                <div>
                                  <button
                                    onClick={() => navigate(`/admin/coaching/clients/${app.clientId}`)}
                                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#8d3038] hover:text-[#6b2228] transition-colors"
                                  >
                                    <UserCheck size={14} />
                                    View Client Profile
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
