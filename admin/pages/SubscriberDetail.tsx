import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE } from '../config/api';
import {
  ArrowLeft, Mail, Calendar, Tag, TrendingUp, Edit3, Trash2,
  UserMinus, UserPlus, X, Plus, AlertCircle, Loader2,
  MailOpen, MousePointerClick, AlertTriangle, XCircle, Bell
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Subscriber {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  source: string;
  tags: string[];
  subscribed: boolean;
  subscribedAt: string | null;
  unsubscribedAt: string | null;
  lastEmailedAt: string | null;
  emailsReceived: number;
  engagementScore: number;
  engagementLevel: string;
  lastOpenedAt: string | null;
  lastClickedAt: string | null;
  bounceCount: number;
  lastBounceAt: string | null;
  createdAt: string;
}

interface SubscriberEvent {
  id: string;
  campaignId: string;
  campaignSubject: string;
  eventType: string;
  metadata: Record<string, any>;
  createdAt: string;
}

interface EventsResponse {
  events: SubscriberEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return formatDate(dateStr);
}

// ---------------------------------------------------------------------------
// Engagement helpers
// ---------------------------------------------------------------------------

const ENGAGEMENT_CONFIG: Record<string, { label: string; bg: string; text: string; bar: string }> = {
  highly_engaged: { label: 'Highly Engaged', bg: 'bg-green-50', text: 'text-green-700', bar: 'bg-green-500' },
  engaged:        { label: 'Engaged',        bg: 'bg-blue-50',  text: 'text-blue-700',  bar: 'bg-blue-500' },
  cold:           { label: 'Cold',           bg: 'bg-stone-50', text: 'text-stone-600',  bar: 'bg-stone-400' },
  at_risk:        { label: 'At Risk',        bg: 'bg-amber-50', text: 'text-amber-700',  bar: 'bg-amber-500' },
  churned:        { label: 'Churned',        bg: 'bg-red-50',   text: 'text-red-700',    bar: 'bg-red-500' },
  new:            { label: 'New',            bg: 'bg-purple-50', text: 'text-purple-700', bar: 'bg-purple-500' },
};

function engagementCfg(level: string) {
  return ENGAGEMENT_CONFIG[level] ?? ENGAGEMENT_CONFIG.new;
}

// ---------------------------------------------------------------------------
// Event type helpers
// ---------------------------------------------------------------------------

const EVENT_ICON: Record<string, React.FC<{ className?: string }>> = {
  delivered:    Mail,
  opened:       MailOpen,
  clicked:      MousePointerClick,
  bounced:      AlertTriangle,
  complained:   XCircle,
  unsubscribed: Bell,
};

const EVENT_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  delivered:    { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  opened:       { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  clicked:      { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  bounced:      { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  complained:   { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500' },
  unsubscribed: { bg: 'bg-stone-100', text: 'text-stone-600',  dot: 'bg-stone-400' },
};

function eventColor(type: string) {
  return EVENT_COLOR[type] ?? { bg: 'bg-stone-50', text: 'text-stone-600', dot: 'bg-stone-400' };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SubscriberDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const toast = useToast();

  // -- state ----------------------------------------------------------------
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [loading, setLoading] = useState(true);

  const [events, setEvents] = useState<SubscriberEvent[]>([]);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsTotalPages, setEventsTotalPages] = useState(1);
  const [eventsLoading, setEventsLoading] = useState(true);

  const [allTags, setAllTags] = useState<string[]>([]);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');

  const [editingName, setEditingName] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [saving, setSaving] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingSubscription, setTogglingSubscription] = useState(false);

  // -- fetch subscriber -----------------------------------------------------
  const fetchSubscriber = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/subscribers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load subscriber');
      const data: Subscriber = await res.json();
      setSubscriber(data);
      setEditFirstName(data.firstName ?? '');
      setEditLastName(data.lastName ?? '');
    } catch (err: any) {
      toast.error(err.message ?? 'Error loading subscriber');
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  // -- fetch events ---------------------------------------------------------
  const fetchEvents = useCallback(async (page: number, append = false) => {
    if (!id) return;
    try {
      setEventsLoading(true);
      const res = await fetch(
        `${API_BASE}/subscribers/${id}/events?page=${page}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error('Failed to load events');
      const data: EventsResponse = await res.json();
      setEvents(prev => (append ? [...prev, ...data.events] : data.events));
      setEventsTotal(data.total);
      setEventsPage(data.page);
      setEventsTotalPages(data.totalPages);
    } catch (err: any) {
      toast.error(err.message ?? 'Error loading events');
    } finally {
      setEventsLoading(false);
    }
  }, [id, token]);

  // -- fetch all tags -------------------------------------------------------
  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/subscribers/tags`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data: string[] = await res.json();
      setAllTags(data);
    } catch {
      // silent
    }
  }, [token]);

  // -- initial load ---------------------------------------------------------
  useEffect(() => {
    fetchSubscriber();
    fetchEvents(1);
    fetchTags();
  }, [fetchSubscriber, fetchEvents, fetchTags]);

  // -- update subscriber helper ---------------------------------------------
  const updateSubscriber = async (body: Record<string, any>) => {
    if (!id) return;
    const res = await fetch(`${API_BASE}/subscribers/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message ?? 'Update failed');
    }
    return res.json();
  };

  // -- save name ------------------------------------------------------------
  const handleSaveName = async () => {
    try {
      setSaving(true);
      const updated = await updateSubscriber({
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        name: [editFirstName.trim(), editLastName.trim()].filter(Boolean).join(' '),
      });
      setSubscriber(updated);
      setEditingName(false);
      toast.success('Name updated');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // -- tags -----------------------------------------------------------------
  const handleAddTag = async (tag: string) => {
    if (!subscriber || !tag.trim()) return;
    const trimmed = tag.trim().toLowerCase();
    if (subscriber.tags.includes(trimmed)) return;
    try {
      const updated = await updateSubscriber({ tags: [...subscriber.tags, trimmed] });
      setSubscriber(updated);
      setNewTagValue('');
      setTagDropdownOpen(false);
      toast.success(`Tag "${trimmed}" added`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!subscriber) return;
    try {
      const updated = await updateSubscriber({
        tags: subscriber.tags.filter(t => t !== tag),
      });
      setSubscriber(updated);
      toast.success(`Tag "${tag}" removed`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // -- subscription toggle --------------------------------------------------
  const handleToggleSubscription = async () => {
    if (!subscriber || !id) return;
    const action = subscriber.subscribed ? 'unsubscribe' : 'resubscribe';
    try {
      setTogglingSubscription(true);
      const res = await fetch(`${API_BASE}/subscribers/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscribed: !subscriber.subscribed }),
      });
      if (!res.ok) throw new Error(`Failed to ${action}`);
      const updated = await res.json();
      setSubscriber(updated);
      toast.success(subscriber.subscribed ? 'Subscriber unsubscribed' : 'Subscriber resubscribed');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTogglingSubscription(false);
    }
  };

  // -- delete ---------------------------------------------------------------
  const handleDelete = async () => {
    if (!id) return;
    try {
      setDeleting(true);
      const res = await fetch(`${API_BASE}/subscribers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete subscriber');
      toast.success('Subscriber deleted');
      navigate('/admin/subscribers');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // -- load more events -----------------------------------------------------
  const handleLoadMore = () => {
    if (eventsPage < eventsTotalPages) {
      fetchEvents(eventsPage + 1, true);
    }
  };

  // -- available tags for dropdown ------------------------------------------
  const availableTags = allTags.filter(
    t => !subscriber?.tags.includes(t) && t.toLowerCase().includes(newTagValue.toLowerCase()),
  );

  // =========================================================================
  // Render
  // =========================================================================

  // -- skeleton loaders -----------------------------------------------------
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 animate-pulse">
        {/* Back link skeleton */}
        <div className="h-5 w-40 bg-stone-200 rounded mb-8" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column skeleton */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 space-y-4">
              <div className="h-7 w-72 bg-stone-200 rounded" />
              <div className="h-5 w-48 bg-stone-100 rounded" />
              <div className="flex gap-2">
                <div className="h-6 w-20 bg-stone-100 rounded-full" />
                <div className="h-6 w-24 bg-stone-100 rounded-full" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 bg-stone-50 rounded-lg" />
                ))}
              </div>
              <div className="h-12 bg-stone-50 rounded-lg" />
              <div className="flex gap-2 flex-wrap pt-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-6 w-16 bg-stone-100 rounded" />
                ))}
              </div>
              <div className="space-y-2 pt-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-4 w-56 bg-stone-100 rounded" />
                ))}
              </div>
            </div>
          </div>

          {/* Right column skeleton */}
          <div className="space-y-4">
            <div className="h-6 w-32 bg-stone-200 rounded" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 space-y-2">
                <div className="h-4 w-48 bg-stone-100 rounded" />
                <div className="h-3 w-32 bg-stone-50 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -- not found ------------------------------------------------------------
  if (!subscriber) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <button
          onClick={() => navigate('/admin/subscribers')}
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Subscribers
        </button>
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-12 text-center">
          <AlertCircle className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500">Subscriber not found.</p>
        </div>
      </div>
    );
  }

  // -- main render ----------------------------------------------------------
  const eng = engagementCfg(subscriber.engagementLevel);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Back link */}
      <button
        onClick={() => navigate('/admin/subscribers')}
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Subscribers
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ================================================================= */}
        {/* LEFT COLUMN - Profile Card                                        */}
        {/* ================================================================= */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">

            {/* --- Profile header ----------------------------------------- */}
            <div className="mb-6">
              <h1
                className="text-2xl font-bold text-stone-900 break-all"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {subscriber.email}
              </h1>

              {/* Name (inline editable) */}
              {editingName ? (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={e => setEditFirstName(e.target.value)}
                    placeholder="First name"
                    className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8d3038]/30 focus:border-[#8d3038] w-36"
                  />
                  <input
                    type="text"
                    value={editLastName}
                    onChange={e => setEditLastName(e.target.value)}
                    placeholder="Last name"
                    className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8d3038]/30 focus:border-[#8d3038] w-36"
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={saving}
                    className="px-3 py-1.5 text-sm rounded-lg text-white bg-[#8d3038] hover:bg-[#7a2930] disabled:opacity-50 transition-colors"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false);
                      setEditFirstName(subscriber.firstName ?? '');
                      setEditLastName(subscriber.lastName ?? '');
                    }}
                    className="px-3 py-1.5 text-sm rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-stone-500 text-sm">
                    {subscriber.name || 'No name'}
                  </p>
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-stone-400 hover:text-stone-600 transition-colors"
                    title="Edit name"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Badges */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {subscriber.source && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full">
                    {subscriber.source}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                    subscriber.subscribed
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-600'
                  }`}
                >
                  {subscriber.subscribed ? 'Subscribed' : 'Unsubscribed'}
                </span>
              </div>
            </div>

            {/* --- Quick stats -------------------------------------------- */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-stone-50 rounded-lg p-3 text-center">
                <Mail className="w-4 h-4 text-stone-400 mx-auto mb-1" />
                <p className="text-lg font-semibold text-stone-800">{subscriber.emailsReceived}</p>
                <p className="text-xs text-stone-500">Emails Received</p>
              </div>
              <div className="bg-stone-50 rounded-lg p-3 text-center">
                <TrendingUp className="w-4 h-4 text-stone-400 mx-auto mb-1" />
                <p className="text-lg font-semibold text-stone-800">{subscriber.engagementScore}</p>
                <p className="text-xs text-stone-500">Engagement Score</p>
                <div className="w-full bg-stone-200 rounded-full h-1.5 mt-1.5">
                  <div
                    className={`h-1.5 rounded-full ${eng.bar}`}
                    style={{ width: `${Math.min(subscriber.engagementScore, 100)}%` }}
                  />
                </div>
              </div>
              <div className="bg-stone-50 rounded-lg p-3 text-center">
                <Calendar className="w-4 h-4 text-stone-400 mx-auto mb-1" />
                <p className="text-sm font-semibold text-stone-800">{formatDate(subscriber.lastEmailedAt)}</p>
                <p className="text-xs text-stone-500">Last Emailed</p>
              </div>
              <div className="bg-stone-50 rounded-lg p-3 text-center">
                <AlertTriangle className="w-4 h-4 text-stone-400 mx-auto mb-1" />
                <p className="text-lg font-semibold text-stone-800">{subscriber.bounceCount}</p>
                <p className="text-xs text-stone-500">Bounces</p>
              </div>
            </div>

            {/* --- Engagement level badge --------------------------------- */}
            <div className={`flex items-center gap-3 rounded-lg px-4 py-3 mb-6 ${eng.bg}`}>
              <span className={`text-sm font-medium ${eng.text}`}>{eng.label}</span>
              <div className="flex-1 bg-white/60 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${eng.bar}`}
                  style={{ width: `${Math.min(subscriber.engagementScore, 100)}%` }}
                />
              </div>
              <span className={`text-xs font-medium ${eng.text}`}>{subscriber.engagementScore}/100</span>
            </div>

            {/* --- Tags --------------------------------------------------- */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-stone-400" />
                <h3 className="text-sm font-semibold text-stone-700">Tags</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {subscriber.tags.length === 0 && (
                  <span className="text-xs text-stone-400 italic">No tags</span>
                )}
                {subscriber.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 px-2 py-0.5 rounded text-xs"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="text-stone-400 hover:text-red-500 transition-colors"
                      title={`Remove tag "${tag}"`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {/* Add tag button / dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setTagDropdownOpen(!tagDropdownOpen)}
                    className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-[#8d3038] transition-colors px-2 py-0.5 rounded border border-dashed border-stone-300 hover:border-[#8d3038]"
                  >
                    <Plus className="w-3 h-3" />
                    Add tag
                  </button>

                  {tagDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1 w-56 bg-white rounded-lg border border-stone-200 shadow-lg z-20">
                      <div className="p-2">
                        <input
                          type="text"
                          value={newTagValue}
                          onChange={e => setNewTagValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newTagValue.trim()) {
                              handleAddTag(newTagValue);
                            }
                            if (e.key === 'Escape') {
                              setTagDropdownOpen(false);
                              setNewTagValue('');
                            }
                          }}
                          placeholder="Type to search or create..."
                          className="w-full border border-stone-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#8d3038]/30 focus:border-[#8d3038]"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-36 overflow-y-auto border-t border-stone-100">
                        {availableTags.map(tag => (
                          <button
                            key={tag}
                            onClick={() => handleAddTag(tag)}
                            className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50 transition-colors"
                          >
                            {tag}
                          </button>
                        ))}
                        {newTagValue.trim() &&
                          !allTags.includes(newTagValue.trim().toLowerCase()) && (
                            <button
                              onClick={() => handleAddTag(newTagValue)}
                              className="w-full text-left px-3 py-1.5 text-xs text-[#8d3038] hover:bg-stone-50 transition-colors font-medium"
                            >
                              Create "{newTagValue.trim()}"
                            </button>
                          )}
                        {availableTags.length === 0 && !newTagValue.trim() && (
                          <p className="px-3 py-2 text-xs text-stone-400 italic">
                            No more tags available
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* --- Dates -------------------------------------------------- */}
            <div className="mb-6 border-t border-stone-100 pt-4">
              <h3 className="text-sm font-semibold text-stone-700 mb-2">Key Dates</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                <div className="flex justify-between sm:justify-start sm:gap-3">
                  <dt className="text-stone-400">Subscribed</dt>
                  <dd className="text-stone-700">{formatDate(subscriber.subscribedAt)}</dd>
                </div>
                <div className="flex justify-between sm:justify-start sm:gap-3">
                  <dt className="text-stone-400">Last Emailed</dt>
                  <dd className="text-stone-700">{formatDate(subscriber.lastEmailedAt)}</dd>
                </div>
                <div className="flex justify-between sm:justify-start sm:gap-3">
                  <dt className="text-stone-400">Last Opened</dt>
                  <dd className="text-stone-700">{formatDate(subscriber.lastOpenedAt)}</dd>
                </div>
                <div className="flex justify-between sm:justify-start sm:gap-3">
                  <dt className="text-stone-400">Last Clicked</dt>
                  <dd className="text-stone-700">{formatDate(subscriber.lastClickedAt)}</dd>
                </div>
                <div className="flex justify-between sm:justify-start sm:gap-3">
                  <dt className="text-stone-400">Last Bounce</dt>
                  <dd className="text-stone-700">{formatDate(subscriber.lastBounceAt)}</dd>
                </div>
                {subscriber.unsubscribedAt && (
                  <div className="flex justify-between sm:justify-start sm:gap-3">
                    <dt className="text-stone-400">Unsubscribed</dt>
                    <dd className="text-red-600">{formatDate(subscriber.unsubscribedAt)}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* --- Actions ------------------------------------------------ */}
            <div className="flex items-center gap-3 border-t border-stone-100 pt-4 flex-wrap">
              <button
                onClick={handleToggleSubscription}
                disabled={togglingSubscription}
                className={`inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                  subscriber.subscribed
                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                {togglingSubscription ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : subscriber.subscribed ? (
                  <UserMinus className="w-4 h-4" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {subscriber.subscribed ? 'Unsubscribe' : 'Resubscribe'}
              </button>

              <button
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT COLUMN - Email Timeline                                     */}
        {/* ================================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2
              className="text-lg font-bold text-stone-900"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Email History
            </h2>
            <span className="text-xs text-stone-400 font-medium">
              {eventsTotal} event{eventsTotal !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Timeline loading skeleton */}
          {eventsLoading && events.length === 0 && (
            <div className="space-y-3 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 space-y-2">
                  <div className="h-4 w-48 bg-stone-100 rounded" />
                  <div className="h-3 w-32 bg-stone-50 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!eventsLoading && events.length === 0 && (
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-8 text-center">
              <Mail className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-sm text-stone-400">No events yet</p>
            </div>
          )}

          {/* Event list */}
          {events.map(event => {
            const Icon = EVENT_ICON[event.eventType] ?? Mail;
            const color = eventColor(event.eventType);

            return (
              <div
                key={event.id}
                className="bg-white rounded-xl border border-stone-200 shadow-sm p-4"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${color.bg}`}>
                    <Icon className={`w-4 h-4 ${color.text}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">
                      {event.campaignSubject || 'Untitled Campaign'}
                    </p>

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}>
                        {event.eventType}
                      </span>
                      <span className="text-xs text-stone-400">
                        {relativeTime(event.createdAt)}
                      </span>
                    </div>

                    {/* Click URL */}
                    {event.eventType === 'clicked' && event.metadata?.url && (
                      <p className="text-xs text-purple-600 mt-1.5 truncate">
                        {event.metadata.url}
                      </p>
                    )}

                    {/* Bounce details */}
                    {event.eventType === 'bounced' && (
                      <div className="mt-1.5 text-xs text-amber-600 space-y-0.5">
                        {event.metadata?.bounceType && (
                          <p>Type: {event.metadata.bounceType}</p>
                        )}
                        {event.metadata?.reason && (
                          <p className="truncate">Reason: {event.metadata.reason}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Load more */}
          {eventsPage < eventsTotalPages && (
            <button
              onClick={handleLoadMore}
              disabled={eventsLoading}
              className="w-full py-2.5 text-sm font-medium text-stone-600 bg-white rounded-xl border border-stone-200 shadow-sm hover:bg-stone-50 transition-colors disabled:opacity-50"
            >
              {eventsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                'Load more'
              )}
            </button>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* Delete Confirmation Modal                                           */}
      {/* =================================================================== */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowDeleteModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
                  Remove subscriber?
                </h3>
                <p className="text-sm text-stone-500 mt-1">
                  Remove <strong className="text-stone-700">{subscriber.email}</strong>? This will delete all their data.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
