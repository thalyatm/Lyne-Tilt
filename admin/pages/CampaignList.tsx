import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Send,
  Clock,
  FileText,
  AlertCircle,
  Trash2,
  BarChart3,
  Edit2,
  Mail,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';

// ============================================
// TYPES
// ============================================

type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';

interface Campaign {
  id: string;
  subject: string;
  status: CampaignStatus;
  audience: 'all' | 'segment';
  segmentFilters?: { sources?: string[]; tags?: string[] };
  recipientCount?: number;
  createdAt: string;
  scheduledFor?: string;
  sentAt?: string;
}

type FilterTab = 'all' | 'draft' | 'scheduled' | 'sent' | 'failed';

// ============================================
// STATUS BADGE (exported for reuse)
// ============================================

const statusConfig: Record<
  CampaignStatus,
  { label: string; className: string }
> = {
  draft: {
    label: 'Draft',
    className: 'bg-stone-100 text-stone-600',
  },
  scheduled: {
    label: 'Scheduled',
    className: 'bg-blue-100 text-blue-700',
  },
  sending: {
    label: 'Sending',
    className: 'bg-amber-100 text-amber-700',
  },
  sent: {
    label: 'Sent',
    className: 'bg-green-100 text-green-700',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-100 text-red-700',
  },
};

export function StatusBadge({ status }: { status: CampaignStatus }) {
  const config = statusConfig[status] ?? statusConfig.draft;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {status === 'draft' && <FileText size={12} />}
      {status === 'scheduled' && <Clock size={12} />}
      {status === 'sending' && <Send size={12} />}
      {status === 'sent' && <Send size={12} />}
      {status === 'failed' && <AlertCircle size={12} />}
      {config.label}
    </span>
  );
}

// ============================================
// FILTER TABS
// ============================================

const tabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'sent', label: 'Sent' },
  { key: 'failed', label: 'Failed' },
];

// ============================================
// HELPERS
// ============================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function audienceLabel(campaign: Campaign): string {
  if (campaign.audience === 'all') return 'All subscribers';
  const parts: string[] = [];
  if (campaign.segmentFilters?.tags?.length) {
    parts.push(`Tags: ${campaign.segmentFilters.tags.join(', ')}`);
  }
  if (campaign.segmentFilters?.sources?.length) {
    parts.push(`Sources: ${campaign.segmentFilters.sources.join(', ')}`);
  }
  return parts.length > 0 ? parts.join(' | ') : 'Segment';
}

function displayDate(campaign: Campaign): string {
  if (campaign.status === 'sent' && campaign.sentAt) {
    return formatDateTime(campaign.sentAt);
  }
  if (campaign.status === 'scheduled' && campaign.scheduledFor) {
    return formatDateTime(campaign.scheduledFor);
  }
  return formatDate(campaign.createdAt);
}

function displayDateLabel(campaign: Campaign): string {
  if (campaign.status === 'sent') return 'Sent';
  if (campaign.status === 'scheduled') return 'Scheduled';
  return 'Created';
}

// ============================================
// DELETE CONFIRMATION MODAL
// ============================================

function DeleteModal({
  campaign,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  campaign: Campaign;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3
          className="text-lg font-medium text-stone-800"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Delete campaign?
        </h3>
        <p className="mt-2 text-sm text-stone-600">
          Are you sure you want to delete{' '}
          <span className="font-medium text-stone-800">
            &ldquo;{campaign.subject}&rdquo;
          </span>
          ? This action cannot be undone.
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-100 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={14} />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SKELETON ROWS
// ============================================

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-4 py-4">
            <div className="h-4 bg-stone-200 rounded w-3/4" />
          </td>
          <td className="px-4 py-4">
            <div className="h-5 bg-stone-200 rounded-full w-20" />
          </td>
          <td className="px-4 py-4">
            <div className="h-4 bg-stone-200 rounded w-28" />
          </td>
          <td className="px-4 py-4">
            <div className="h-4 bg-stone-200 rounded w-12" />
          </td>
          <td className="px-4 py-4">
            <div className="h-4 bg-stone-200 rounded w-24" />
          </td>
          <td className="px-4 py-4">
            <div className="h-4 bg-stone-200 rounded w-16" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function CampaignList() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ------------------------------------------
  // Fetch campaigns
  // ------------------------------------------

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (activeFilter !== 'all') {
        params.set('status', activeFilter);
      }

      const res = await fetch(`${API_BASE}/campaigns?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch campaigns');
      }

      const data = await res.json();
      setCampaigns(data.campaigns ?? data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load campaigns'
      );
    } finally {
      setLoading(false);
    }
  }, [token, activeFilter]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // ------------------------------------------
  // Delete campaign
  // ------------------------------------------

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`${API_BASE}/campaigns/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to delete campaign');
      }

      setCampaigns((prev) =>
        prev.filter((c) => c.id !== deleteTarget.id)
      );
      setDeleteTarget(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete campaign'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // ------------------------------------------
  // Navigation helpers
  // ------------------------------------------

  function handleRowClick(campaign: Campaign) {
    if (campaign.status === 'sent' || campaign.status === 'sending') {
      navigate(`/admin/campaigns/${campaign.id}/analytics`);
    } else {
      navigate(`/admin/campaigns/${campaign.id}`);
    }
  }

  // ------------------------------------------
  // Empty state per filter
  // ------------------------------------------

  const emptyMessages: Record<FilterTab, { title: string; description: string }> = {
    all: {
      title: 'No campaigns yet',
      description: 'Create your first email campaign to engage your audience.',
    },
    draft: {
      title: 'No drafts',
      description: 'Start a new campaign and it will appear here as a draft.',
    },
    scheduled: {
      title: 'No scheduled campaigns',
      description: 'Schedule a campaign to send it at the perfect time.',
    },
    sent: {
      title: 'No sent campaigns',
      description: 'Once you send a campaign, it will appear here with analytics.',
    },
    failed: {
      title: 'No failed campaigns',
      description: 'Good news -- none of your campaigns have failed.',
    },
  };

  // ------------------------------------------
  // Render
  // ------------------------------------------

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1
          className="text-2xl font-bold text-stone-800"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Campaigns
        </h1>
        <button
          onClick={() => navigate('/admin/campaigns/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition hover:opacity-90"
          style={{ backgroundColor: '#8d3038' }}
        >
          <Plus size={18} />
          New Campaign
        </button>
      </div>

      {/* Filter tabs */}
      <div className="border-b border-stone-200">
        <nav className="flex gap-6 -mb-px" aria-label="Campaign status filter">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`pb-3 text-sm transition ${
                activeFilter === tab.key
                  ? 'border-b-2 font-bold text-stone-800'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
              style={
                activeFilter === tab.key
                  ? { borderBottomColor: '#8d3038' }
                  : undefined
              }
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertCircle size={16} />
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700 text-xs font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Campaign table */}
      <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50/80">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                  Audience
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                  Recipients
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <SkeletonRows />
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-4">
                        <Mail size={24} className="text-stone-400" />
                      </div>
                      <p className="text-stone-700 font-medium">
                        {emptyMessages[activeFilter].title}
                      </p>
                      <p className="text-sm text-stone-500 mt-1 max-w-sm">
                        {emptyMessages[activeFilter].description}
                      </p>
                      <button
                        onClick={() => navigate('/admin/campaigns/new')}
                        className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition hover:opacity-90"
                        style={{ backgroundColor: '#8d3038' }}
                      >
                        <Plus size={16} />
                        Create Campaign
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="hover:bg-stone-50 transition"
                  >
                    {/* Subject */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRowClick(campaign)}
                        className="text-sm font-medium text-stone-800 hover:underline text-left"
                      >
                        {campaign.subject || '(No subject)'}
                      </button>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={campaign.status} />
                    </td>

                    {/* Audience */}
                    <td className="px-4 py-3 text-sm text-stone-600">
                      {audienceLabel(campaign)}
                    </td>

                    {/* Recipients */}
                    <td className="px-4 py-3 text-sm text-stone-600">
                      {campaign.status === 'sent' || campaign.status === 'sending'
                        ? (campaign.recipientCount?.toLocaleString() ?? '--')
                        : '--'}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3">
                      <div className="text-sm text-stone-600">
                        {displayDate(campaign)}
                      </div>
                      <div className="text-[11px] text-stone-400">
                        {displayDateLabel(campaign)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {campaign.status === 'draft' && (
                          <>
                            <button
                              onClick={() =>
                                navigate(`/admin/campaigns/${campaign.id}`)
                              }
                              className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded transition"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(campaign)}
                              className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                        {(campaign.status === 'sent' ||
                          campaign.status === 'sending') && (
                          <button
                            onClick={() =>
                              navigate(
                                `/admin/campaigns/${campaign.id}/analytics`
                              )
                            }
                            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded transition"
                            title="View Analytics"
                          >
                            <BarChart3 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteModal
          campaign={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
