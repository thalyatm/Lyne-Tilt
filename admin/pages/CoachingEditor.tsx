import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE } from '../config/api';
import RichTextEditor from '../components/RichTextEditor';
import SeoFields from '../components/SeoFields';
import AccordionSection from '../components/AccordionSection';
import { ImageUploadField } from '../components/FormModal';
import { StringArrayEditor } from '../components/ArrayEditor';
import {
  ArrowLeft, Save, MoreHorizontal, Trash2, Archive, Eye, EyeOff,
  Calendar, Clock, Loader2, Check, AlertCircle, X, ExternalLink,
  Globe, MapPin, Video,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CoachingStatus = 'draft' | 'scheduled' | 'published' | 'archived';
type PriceType = 'fixed' | 'from' | 'free' | 'inquiry';
type DeliveryMode = 'online' | 'in_person' | 'hybrid';

interface CoachingData {
  id?: string;
  title: string;
  slug: string;
  status: CoachingStatus;
  summary: string;
  description: string;
  descriptionHtml: string;
  descriptionJson: string;
  features: string[];
  ctaText: string;
  coverImageUrl: string;
  image: string;
  price: string;
  priceAmount: string;
  priceType: PriceType;
  currency: string;
  recurring: boolean;
  recurringInterval: string;
  durationMinutes: number | null;
  deliveryMode: DeliveryMode;
  locationLabel: string;
  bookingUrl: string;
  badge: string;
  seoTitle: string;
  seoDescription: string;
  ogImageUrl: string;
  canonicalUrl: string;
  tags: string[];
  publishedAt: string | null;
  scheduledAt: string | null;
  displayOrder: number;
}

interface Revision {
  id: string;
  title: string;
  summary: string;
  savedAt: string;
}

const EMPTY_COACHING: CoachingData = {
  title: '',
  slug: '',
  status: 'draft',
  summary: '',
  description: '',
  descriptionHtml: '',
  descriptionJson: '',
  features: [],
  ctaText: 'Apply Now',
  coverImageUrl: '',
  image: '',
  price: '',
  priceAmount: '',
  priceType: 'fixed',
  currency: 'AUD',
  recurring: false,
  recurringInterval: 'monthly',
  durationMinutes: null,
  deliveryMode: 'online',
  locationLabel: '',
  bookingUrl: '',
  badge: '',
  seoTitle: '',
  seoDescription: '',
  ogImageUrl: '',
  canonicalUrl: '',
  tags: [],
  publishedAt: null,
  scheduledAt: null,
  displayOrder: 0,
};

const RECURRING_INTERVALS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const DURATION_PRESETS = [30, 45, 60, 90];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    published: 'bg-green-100 text-green-700',
    scheduled: 'bg-blue-100 text-blue-700',
    archived: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || styles.draft}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-stone-200">
      <div className="px-4 py-3 border-b border-stone-100">
        <h3 className="text-sm font-medium text-stone-800">{title}</h3>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );
}

function FieldLabel({ label, required, htmlFor }: { label: string; required?: boolean; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-stone-700 mb-1">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function CharCounter({ current, max }: { current: number; max: number }) {
  const ratio = current / max;
  const color = ratio >= 1 ? 'text-red-500' : ratio >= 0.9 ? 'text-amber-500' : 'text-stone-400';
  return <span className={`text-xs ${color}`}>{current}/{max}</span>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function formatDatetime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  // Format for datetime-local input: YYYY-MM-DDTHH:MM
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CoachingEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const toast = useToast();
  const isNew = !id || id === 'new';

  // Data state
  const [data, setData] = useState<CoachingData>({ ...EMPTY_COACHING });
  const [coachingId, setCoachingId] = useState<string | undefined>(isNew ? undefined : id);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [revisionsOpen, setRevisionsOpen] = useState(false);

  // UI state
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errors, setErrors] = useState<string[]>([]);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [scheduleInput, setScheduleInput] = useState('');

  // Refs
  const actionsRef = useRef<HTMLDivElement>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hasChanges = useRef(false);
  const lastSavedData = useRef<string>('');

  // ---------- Close actions menu on outside click ----------

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setActionsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ---------- Load existing coaching offer ----------

  useEffect(() => {
    if (isNew) return;

    const loadCoaching = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/coaching/${id}`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        if (!res.ok) throw new Error('Coaching offer not found');

        const raw = await res.json();
        const coachingData: CoachingData = {
          id: raw.id,
          title: raw.title || '',
          slug: raw.slug || '',
          status: raw.status || 'draft',
          summary: raw.summary || '',
          description: raw.description || '',
          descriptionHtml: raw.descriptionHtml || '',
          descriptionJson: raw.descriptionJson || '',
          features: Array.isArray(raw.features)
            ? raw.features
            : typeof raw.features === 'string'
              ? JSON.parse(raw.features || '[]')
              : [],
          ctaText: raw.ctaText || 'Apply Now',
          coverImageUrl: raw.coverImageUrl || '',
          image: raw.image || '',
          price: raw.price || '',
          priceAmount: raw.priceAmount || '',
          priceType: raw.priceType || 'fixed',
          currency: raw.currency || 'AUD',
          recurring: !!raw.recurring,
          recurringInterval: raw.recurringInterval || 'monthly',
          durationMinutes: raw.durationMinutes ?? null,
          deliveryMode: raw.deliveryMode || 'online',
          locationLabel: raw.locationLabel || '',
          bookingUrl: raw.bookingUrl || '',
          badge: raw.badge || '',
          seoTitle: raw.seoTitle || '',
          seoDescription: raw.seoDescription || '',
          ogImageUrl: raw.ogImageUrl || '',
          canonicalUrl: raw.canonicalUrl || '',
          tags: Array.isArray(raw.tags)
            ? raw.tags
            : typeof raw.tags === 'string'
              ? JSON.parse(raw.tags || '[]')
              : [],
          publishedAt: raw.publishedAt || null,
          scheduledAt: raw.scheduledAt || null,
          displayOrder: raw.displayOrder || 0,
        };

        setData(coachingData);
        setCoachingId(raw.id);
        setScheduleInput(formatDatetime(raw.scheduledAt));
        lastSavedData.current = JSON.stringify(coachingData);
      } catch {
        toast.error('Could not load coaching offer.');
        navigate('/admin/coaching');
      } finally {
        setLoading(false);
      }
    };

    loadCoaching();
  }, [id, isNew, accessToken, navigate]);

  // ---------- Load revisions ----------

  const loadRevisions = useCallback(async () => {
    if (!coachingId) return;
    try {
      const res = await fetch(`${API_BASE}/coaching/${coachingId}/revisions`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (res.ok) {
        const list = await res.json();
        setRevisions(Array.isArray(list) ? list.slice(0, 10) : []);
      }
    } catch {
      // Silently fail — revisions are optional
    }
  }, [coachingId, accessToken]);

  useEffect(() => {
    if (coachingId) loadRevisions();
  }, [coachingId, loadRevisions]);

  // ---------- Update field helper ----------

  const updateField = useCallback((field: keyof CoachingData, value: any) => {
    setData(prev => {
      const next = { ...prev, [field]: value };

      // Auto-generate slug from title for new items or when slug matches generated slug
      if (field === 'title' && (!prev.slug || prev.slug === generateSlug(prev.title))) {
        next.slug = generateSlug(value);
      }

      // Auto-set seoTitle from title if seoTitle is empty or matches previous title
      if (field === 'title' && (!prev.seoTitle || prev.seoTitle === prev.title)) {
        next.seoTitle = value;
      }

      return next;
    });
    hasChanges.current = true;
  }, []);

  // ---------- Autosave ----------

  useEffect(() => {
    if (!hasChanges.current) return;

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      saveCoaching(false);
    }, 1000);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [data]);

  // ---------- Save ----------

  const saveCoaching = useCallback(async (showFeedback = true) => {
    const currentData = JSON.stringify(data);
    if (currentData === lastSavedData.current && coachingId) {
      if (showFeedback) toast.success('No changes to save.');
      return coachingId;
    }

    setSaving(true);
    setSaveStatus('saving');

    try {
      const method = coachingId ? 'PUT' : 'POST';
      const url = coachingId
        ? `${API_BASE}/coaching/${coachingId}`
        : `${API_BASE}/coaching`;

      const payload: Record<string, any> = { ...data };
      delete payload.id;
      delete payload.publishedAt;
      delete payload.scheduledAt;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Save failed');
      }

      const saved = await res.json();

      if (!coachingId) {
        setCoachingId(saved.id);
        setData(prev => ({ ...prev, id: saved.id }));
        window.history.replaceState(null, '', `#/admin/coaching/${saved.id}`);
      }

      lastSavedData.current = JSON.stringify(data);
      hasChanges.current = false;
      setSaveStatus('saved');
      if (showFeedback) toast.success('Saved.');

      return saved.id;
    } catch (err: any) {
      setSaveStatus('error');
      if (showFeedback) toast.error(err.message || 'Could not save coaching offer.');
      return null;
    } finally {
      setSaving(false);
    }
  }, [data, coachingId, accessToken]);

  // ---------- Publish ----------

  const handlePublish = async () => {
    const savedId = await saveCoaching(false);
    if (!savedId) return;

    try {
      const res = await fetch(`${API_BASE}/coaching/${savedId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.errors) {
          setErrors(err.errors);
          toast.error('Cannot publish: ' + err.errors[0]);
          return;
        }
        throw new Error(err.error || 'Publish failed');
      }

      const updated = await res.json();
      setData(prev => ({
        ...prev,
        status: updated.status || 'published',
        publishedAt: updated.publishedAt || new Date().toISOString(),
      }));
      lastSavedData.current = JSON.stringify({
        ...data,
        status: updated.status || 'published',
        publishedAt: updated.publishedAt || new Date().toISOString(),
      });
      setErrors([]);
      toast.success('Coaching offer is now live!');
    } catch (err: any) {
      toast.error(err.message || 'Could not publish.');
    }
  };

  // ---------- Unpublish ----------

  const handleUnpublish = async () => {
    if (!coachingId) return;
    try {
      const res = await fetch(`${API_BASE}/coaching/${coachingId}/unpublish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Unpublish failed');
      }

      const updated = await res.json();
      setData(prev => ({
        ...prev,
        status: updated.status || 'draft',
        publishedAt: null,
      }));
      lastSavedData.current = JSON.stringify({
        ...data,
        status: updated.status || 'draft',
        publishedAt: null,
      });
      toast.success('Coaching offer unpublished.');
    } catch (err: any) {
      toast.error(err.message || 'Could not unpublish.');
    }
  };

  // ---------- Schedule ----------

  const handleSchedule = async () => {
    if (!scheduleInput) {
      toast.error('Please select a date and time.');
      return;
    }

    const savedId = await saveCoaching(false);
    if (!savedId) return;

    const scheduledAt = new Date(scheduleInput).toISOString();

    try {
      const res = await fetch(`${API_BASE}/coaching/${savedId}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ scheduledAt }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Schedule failed');
      }

      const updated = await res.json();
      setData(prev => ({
        ...prev,
        status: updated.status || 'scheduled',
        scheduledAt: updated.scheduledAt || scheduledAt,
      }));
      lastSavedData.current = JSON.stringify({
        ...data,
        status: updated.status || 'scheduled',
        scheduledAt: updated.scheduledAt || scheduledAt,
      });
      toast.success('Coaching offer scheduled.');
    } catch (err: any) {
      toast.error(err.message || 'Could not schedule.');
    }
  };

  // ---------- Cancel schedule ----------

  const handleCancelSchedule = async () => {
    if (!coachingId) return;
    try {
      const res = await fetch(`${API_BASE}/coaching/${coachingId}/unpublish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to cancel schedule');
      }

      const updated = await res.json();
      setData(prev => ({
        ...prev,
        status: updated.status || 'draft',
        scheduledAt: null,
      }));
      setScheduleInput('');
      lastSavedData.current = JSON.stringify({
        ...data,
        status: updated.status || 'draft',
        scheduledAt: null,
      });
      toast.success('Schedule cancelled.');
    } catch (err: any) {
      toast.error(err.message || 'Could not cancel schedule.');
    }
  };

  // ---------- Archive ----------

  const handleArchive = async () => {
    if (!coachingId) return;
    try {
      const res = await fetch(`${API_BASE}/coaching/${coachingId}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success('Coaching offer archived.');
      navigate('/admin/coaching');
    } catch (err: any) {
      toast.error(err.message || 'Could not archive.');
    }
  };

  // ---------- Delete ----------

  const handleDelete = async () => {
    if (!coachingId) return;
    if (!window.confirm(
      'Are you sure you want to permanently delete this coaching offer? This action cannot be undone and all associated data will be lost.'
    )) return;

    try {
      const res = await fetch(`${API_BASE}/coaching/${coachingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success('Coaching offer deleted.');
      navigate('/admin/coaching');
    } catch (err: any) {
      toast.error(err.message || 'Could not delete.');
    }
  };

  // ---------- Restore revision ----------

  const handleRestoreRevision = async (revisionId: string) => {
    if (!coachingId) return;
    if (!window.confirm('Restore this revision? Current unsaved changes will be lost.')) return;

    try {
      const res = await fetch(`${API_BASE}/coaching/${coachingId}/revisions/${revisionId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Restore failed');
      }

      const restored = await res.json();
      const restoredData: CoachingData = {
        id: restored.id || coachingId,
        title: restored.title || '',
        slug: restored.slug || '',
        status: restored.status || 'draft',
        summary: restored.summary || '',
        description: restored.description || '',
        descriptionHtml: restored.descriptionHtml || '',
        descriptionJson: restored.descriptionJson || '',
        features: Array.isArray(restored.features)
          ? restored.features
          : typeof restored.features === 'string'
            ? JSON.parse(restored.features || '[]')
            : [],
        ctaText: restored.ctaText || 'Apply Now',
        coverImageUrl: restored.coverImageUrl || '',
        image: restored.image || '',
        price: restored.price || '',
        priceAmount: restored.priceAmount || '',
        priceType: restored.priceType || 'fixed',
        currency: restored.currency || 'AUD',
        recurring: !!restored.recurring,
        recurringInterval: restored.recurringInterval || 'monthly',
        durationMinutes: restored.durationMinutes ?? null,
        deliveryMode: restored.deliveryMode || 'online',
        locationLabel: restored.locationLabel || '',
        bookingUrl: restored.bookingUrl || '',
        badge: restored.badge || '',
        seoTitle: restored.seoTitle || '',
        seoDescription: restored.seoDescription || '',
        ogImageUrl: restored.ogImageUrl || '',
        canonicalUrl: restored.canonicalUrl || '',
        tags: Array.isArray(restored.tags)
          ? restored.tags
          : typeof restored.tags === 'string'
            ? JSON.parse(restored.tags || '[]')
            : [],
        publishedAt: restored.publishedAt || null,
        scheduledAt: restored.scheduledAt || null,
        displayOrder: restored.displayOrder || 0,
      };

      setData(restoredData);
      lastSavedData.current = JSON.stringify(restoredData);
      hasChanges.current = false;
      toast.success('Revision restored.');
      loadRevisions();
    } catch (err: any) {
      toast.error(err.message || 'Could not restore revision.');
    }
  };

  // ---------- Loading state ----------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin" />
      </div>
    );
  }

  // ---------- Render ----------

  return (
    <div className="min-h-screen -m-4 lg:-m-6">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-stone-200 px-4 lg:px-6 py-3">
        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/admin/coaching')}
            className="p-1.5 hover:bg-stone-100 rounded-md transition text-stone-500"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-stone-900 truncate">
                {data.title || 'Untitled offer'}
              </h1>
              <StatusBadge status={data.status} />
            </div>
          </div>

          {/* Save indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-400">
            {saveStatus === 'saving' && (
              <><Loader2 size={12} className="animate-spin" /> Saving...</>
            )}
            {saveStatus === 'saved' && (
              <><Check size={12} className="text-green-500" /> Saved</>
            )}
            {saveStatus === 'error' && (
              <><AlertCircle size={12} className="text-red-500" /> Save failed</>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => saveCoaching(true)}
              disabled={saving}
              className="bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-md px-3 h-8 text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Save size={14} />
              Save
            </button>

            {(data.status === 'draft' || data.status === 'archived') && (
              <button
                onClick={handlePublish}
                disabled={saving}
                className="bg-stone-900 text-white hover:bg-stone-800 rounded-md px-4 h-8 text-sm font-medium transition-colors disabled:opacity-50"
              >
                Publish
              </button>
            )}

            {data.status === 'scheduled' && (
              <button
                onClick={handlePublish}
                disabled={saving}
                className="bg-stone-900 text-white hover:bg-stone-800 rounded-md px-4 h-8 text-sm font-medium transition-colors disabled:opacity-50"
              >
                Publish Now
              </button>
            )}

            {data.status === 'published' && (
              <button
                onClick={handleUnpublish}
                disabled={saving}
                className="bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-md px-3 h-8 text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <EyeOff size={14} />
                Unpublish
              </button>
            )}

            {/* Three-dot menu */}
            {coachingId && (
              <div className="relative" ref={actionsRef}>
                <button
                  onClick={() => setActionsMenuOpen(!actionsMenuOpen)}
                  className="p-1.5 hover:bg-stone-100 rounded-md transition"
                >
                  <MoreHorizontal size={18} className="text-stone-500" />
                </button>
                {actionsMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 z-30 bg-white rounded-lg shadow-lg border border-stone-200 py-1 w-44">
                    {data.status === 'published' && (
                      <a
                        href={`/#/coaching/${data.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex items-center gap-2"
                        onClick={() => setActionsMenuOpen(false)}
                      >
                        <ExternalLink size={14} /> View on site
                      </a>
                    )}
                    <button
                      onClick={() => { handleArchive(); setActionsMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex items-center gap-2"
                    >
                      <Archive size={14} /> Archive
                    </button>
                    <div className="border-t border-stone-100 my-1" />
                    <button
                      onClick={() => { handleDelete(); setActionsMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 lg:px-6 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm font-medium text-red-800 mb-1">Cannot publish -- fix these issues:</p>
            <ul className="text-sm text-red-700 list-disc list-inside">
              {errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* LEFT COLUMN (60%) */}
          <div className="lg:col-span-3 space-y-6">

            {/* Offer Details */}
            <Card title="Offer Details">
              <div>
                <div className="flex items-center justify-between">
                  <FieldLabel label="Title" required />
                  <CharCounter current={data.title.length} max={200} />
                </div>
                <input
                  type="text"
                  value={data.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Coaching offer title"
                  maxLength={200}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <FieldLabel label="Summary" />
                  <CharCounter current={data.summary.length} max={500} />
                </div>
                <textarea
                  value={data.summary}
                  onChange={(e) => updateField('summary', e.target.value)}
                  placeholder="Short description of this coaching offer"
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 resize-none"
                />
              </div>

              <div>
                <FieldLabel label="Description" />
                <RichTextEditor
                  content={data.descriptionHtml}
                  onChange={(html) => updateField('descriptionHtml', html)}
                  placeholder="Describe your coaching offer..."
                  minHeight="200px"
                />
              </div>
            </Card>

            {/* Features & Benefits */}
            <Card title="Features & Benefits">
              <StringArrayEditor
                label="Features"
                items={data.features}
                onChange={(f) => updateField('features', f)}
                placeholder="e.g., Weekly 1-on-1 sessions"
              />
            </Card>

            {/* Cover Image */}
            <Card title="Cover Image">
              <ImageUploadField
                value={data.coverImageUrl}
                onChange={(url) => updateField('coverImageUrl', url)}
              />
            </Card>

            {/* SEO */}
            <AccordionSection title="Search Engine Listing" description="Customize how this offer appears in search results">
              <SeoFields
                title={data.seoTitle}
                description={data.seoDescription}
                slug={data.slug}
                image={data.ogImageUrl}
                onTitleChange={(v) => updateField('seoTitle', v)}
                onDescriptionChange={(v) => updateField('seoDescription', v)}
                onSlugChange={(v) => updateField('slug', v)}
                onImageChange={(v) => updateField('ogImageUrl', v)}
                showSlug
                showImage
                baseUrl="lynetilt.com/coaching"
              />
            </AccordionSection>
          </div>

          {/* RIGHT COLUMN (40%) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Status */}
            <Card title="Status">
              <div className="flex items-center gap-2">
                <StatusBadge status={data.status} />
                {data.publishedAt && (
                  <span className="text-xs text-stone-400">
                    Published {new Date(data.publishedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Schedule controls */}
              {(data.status === 'draft' || data.status === 'scheduled') && (
                <div className="space-y-3 pt-2">
                  <div className="border-t border-stone-100 pt-3">
                    <FieldLabel label="Schedule publish" htmlFor="schedule-input" />
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          id="schedule-input"
                          type="datetime-local"
                          value={scheduleInput}
                          onChange={(e) => setScheduleInput(e.target.value)}
                          min={new Date().toISOString().slice(0, 16)}
                          className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                        />
                      </div>
                    </div>

                    {data.status === 'draft' && (
                      <button
                        onClick={handleSchedule}
                        disabled={saving || !scheduleInput}
                        className="mt-2 w-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                      >
                        <Calendar size={14} />
                        Schedule
                      </button>
                    )}

                    {data.status === 'scheduled' && (
                      <div className="mt-2 space-y-2">
                        {data.scheduledAt && (
                          <p className="text-xs text-blue-600">
                            Scheduled for {new Date(data.scheduledAt).toLocaleString()}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={handlePublish}
                            disabled={saving}
                            className="flex-1 bg-stone-900 text-white hover:bg-stone-800 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            Publish Now
                          </button>
                          <button
                            onClick={handleCancelSchedule}
                            disabled={saving}
                            className="flex-1 bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            Cancel Schedule
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Published workflow */}
              {data.status === 'published' && (
                <div className="pt-2 border-t border-stone-100">
                  <button
                    onClick={handleUnpublish}
                    disabled={saving}
                    className="w-full bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                  >
                    <EyeOff size={14} />
                    Unpublish
                  </button>
                </div>
              )}
            </Card>

            {/* Pricing */}
            <Card title="Pricing">
              <div>
                <FieldLabel label="Price type" />
                <select
                  value={data.priceType}
                  onChange={(e) => updateField('priceType', e.target.value as PriceType)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                >
                  <option value="fixed">Fixed</option>
                  <option value="from">From</option>
                  <option value="free">Free</option>
                  <option value="inquiry">Enquire</option>
                </select>
              </div>

              {(data.priceType === 'fixed' || data.priceType === 'from') && (
                <div>
                  <FieldLabel label={data.priceType === 'from' ? 'Starting price' : 'Price'} required />
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">A$</span>
                    <input
                      type="number"
                      value={data.priceAmount}
                      onChange={(e) => updateField('priceAmount', e.target.value)}
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                    />
                  </div>
                </div>
              )}

              <div>
                <FieldLabel label="Currency" />
                <input
                  type="text"
                  value={data.currency}
                  onChange={(e) => updateField('currency', e.target.value.toUpperCase())}
                  placeholder="AUD"
                  maxLength={3}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                />
              </div>

              {/* Recurring toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-700">Recurring payment</span>
                  <button
                    type="button"
                    onClick={() => updateField('recurring', !data.recurring)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      data.recurring ? 'bg-stone-900' : 'bg-stone-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        data.recurring ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>

                {data.recurring && (
                  <div>
                    <FieldLabel label="Billing interval" />
                    <select
                      value={data.recurringInterval}
                      onChange={(e) => updateField('recurringInterval', e.target.value)}
                      className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                    >
                      {RECURRING_INTERVALS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </Card>

            {/* Delivery */}
            <Card title="Delivery">
              <div>
                <FieldLabel label="Delivery mode" />
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'online', label: 'Online', icon: <Globe size={14} /> },
                    { value: 'in_person', label: 'In Person', icon: <MapPin size={14} /> },
                    { value: 'hybrid', label: 'Hybrid', icon: <Video size={14} /> },
                  ] as const).map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => updateField('deliveryMode', mode.value)}
                      className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-md border text-sm transition-colors ${
                        data.deliveryMode === mode.value
                          ? 'border-stone-900 bg-stone-50 text-stone-900 font-medium'
                          : 'border-stone-200 text-stone-500 hover:border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      {mode.icon}
                      <span className="text-xs">{mode.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <FieldLabel label="Duration (minutes)" />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={data.durationMinutes ?? ''}
                    onChange={(e) => updateField('durationMinutes', e.target.value ? parseInt(e.target.value) : null)}
                    min="0"
                    placeholder="Duration"
                    className="flex-1 px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                  />
                  <Clock size={14} className="text-stone-400" />
                </div>
                <div className="flex gap-1.5 mt-2">
                  {DURATION_PRESETS.map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => updateField('durationMinutes', mins)}
                      className={`px-2.5 py-1 rounded text-xs transition-colors ${
                        data.durationMinutes === mins
                          ? 'bg-stone-900 text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>

              {(data.deliveryMode === 'in_person' || data.deliveryMode === 'hybrid') && (
                <div>
                  <FieldLabel label="Location" />
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={data.locationLabel}
                      onChange={(e) => updateField('locationLabel', e.target.value)}
                      placeholder="e.g., Melbourne CBD studio"
                      className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                    />
                  </div>
                </div>
              )}

              <div>
                <FieldLabel label="Booking URL" />
                <div className="relative">
                  <ExternalLink size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="url"
                    value={data.bookingUrl}
                    onChange={(e) => updateField('bookingUrl', e.target.value)}
                    placeholder="https://calendly.com/..."
                    className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                  />
                </div>
              </div>
            </Card>

            {/* Call to Action */}
            <Card title="Call to Action">
              <div>
                <FieldLabel label="CTA button text" />
                <input
                  type="text"
                  value={data.ctaText}
                  onChange={(e) => updateField('ctaText', e.target.value)}
                  placeholder="Apply Now"
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                />
              </div>

              <div>
                <FieldLabel label="Badge" />
                <input
                  type="text"
                  value={data.badge}
                  onChange={(e) => updateField('badge', e.target.value)}
                  placeholder="e.g., POPULAR, NEW, LIMITED"
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                />
                <p className="text-xs text-stone-400 mt-1">Optional badge shown on the coaching card.</p>
              </div>
            </Card>

            {/* Tags */}
            <Card title="Tags">
              <div>
                <FieldLabel label="Tags" />
                <input
                  type="text"
                  value={Array.isArray(data.tags) ? data.tags.join(', ') : ''}
                  onChange={(e) => updateField('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                  placeholder="Comma-separated tags"
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                />
                <p className="text-xs text-stone-400 mt-1">
                  Separate tags with commas. Used for filtering and organisation.
                </p>
              </div>
            </Card>

            {/* Revisions */}
            {coachingId && (
              <div className="bg-white rounded-lg border border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setRevisionsOpen(!revisionsOpen);
                    if (!revisionsOpen) loadRevisions();
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-stone-50 transition-colors"
                >
                  <h3 className="text-sm font-medium text-stone-800">Revisions</h3>
                  <span className="text-xs text-stone-400">
                    {revisionsOpen ? 'Hide' : `${revisions.length} saved`}
                  </span>
                </button>

                {revisionsOpen && (
                  <div className="border-t border-stone-100">
                    {revisions.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <p className="text-sm text-stone-400">No revisions yet.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto">
                        {revisions.map((rev) => (
                          <div key={rev.id} className="px-4 py-3 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-stone-700 truncate">
                                {rev.title || 'Untitled'}
                              </p>
                              {rev.summary && (
                                <p className="text-xs text-stone-400 truncate">{rev.summary}</p>
                              )}
                              <p className="text-xs text-stone-400 mt-0.5">
                                {formatRelativeDate(rev.savedAt)}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRestoreRevision(rev.id)}
                              className="text-xs text-stone-500 hover:text-stone-900 px-2 py-1 border border-stone-200 rounded hover:bg-stone-50 transition-colors whitespace-nowrap"
                            >
                              Restore
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
