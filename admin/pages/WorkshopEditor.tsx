import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE } from '../config/api';
import RichTextEditor from '../components/RichTextEditor';
import SeoFields from '../components/SeoFields';
import AccordionSection from '../components/AccordionSection';
import { ImageUploadField } from '../components/FormModal';
import { StringArrayEditor, ObjectArrayEditor } from '../components/ArrayEditor';
import {
  ArrowLeft, Save, MoreHorizontal, Trash2, Archive, Eye, EyeOff,
  Calendar, Clock, Loader2, Check, AlertCircle, X, ExternalLink,
  Globe, MapPin, Video, Users as UsersIcon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorkshopData {
  id?: string;
  title: string;
  slug: string;
  subtitle: string;
  type: 'ONLINE' | 'WORKSHOP';
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  summary: string;
  description: string;
  contentHtml: string;
  contentJson: string;
  price: string;
  priceAmount: string;
  currency: string;
  image: string;
  coverImageUrl: string;
  deliveryMode: 'online' | 'in_person' | 'hybrid';
  locationLabel: string;
  duration: string;
  format: string;
  level: string;
  capacity: number | null;
  startAt: string;
  endAt: string;
  timezone: string;
  evergreen: boolean;
  ticketingUrl: string;
  includes: string[];
  outcomes: string[];
  modules: { title: string; description: string }[];
  seoTitle: string;
  seoDescription: string;
  ogImageUrl: string;
  canonicalUrl: string;
  tags: string[];
  publishedAt: string | null;
  scheduledAt: string | null;
  displayOrder: number;
  enrolledCount: number;
}

interface Revision {
  id: string;
  createdAt: string;
  summary?: string;
  author?: string;
}

const EMPTY_WORKSHOP: WorkshopData = {
  title: '', slug: '', subtitle: '', type: 'WORKSHOP',
  status: 'draft', summary: '', description: '', contentHtml: '', contentJson: '',
  price: '0', priceAmount: '', currency: 'AUD',
  image: '', coverImageUrl: '', deliveryMode: 'online', locationLabel: '',
  duration: '', format: '', level: '', capacity: null,
  startAt: '', endAt: '', timezone: 'Australia/Sydney', evergreen: false,
  ticketingUrl: '', includes: [], outcomes: [], modules: [],
  seoTitle: '', seoDescription: '', ogImageUrl: '', canonicalUrl: '',
  tags: [], publishedAt: null, scheduledAt: null, displayOrder: 0, enrolledCount: 0,
};

const TIMEZONES = [
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Perth',
  'Australia/Adelaide',
  'Australia/Hobart',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
];

const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'All levels'];

const inputClass =
  'w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: WorkshopData['status'] }) {
  const styles: Record<WorkshopData['status'], string> = {
    draft: 'bg-gray-100 text-gray-700',
    scheduled: 'bg-blue-100 text-blue-700',
    published: 'bg-green-100 text-green-700',
    archived: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || styles.draft}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function TypeBadge({ type }: { type: WorkshopData['type'] }) {
  const isOnline = type === 'ONLINE';
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
      isOnline ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'
    }`}>
      {isOnline ? 'Course' : 'Workshop'}
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

function DeliveryIcon({ mode }: { mode: WorkshopData['deliveryMode'] }) {
  if (mode === 'online') return <Video size={14} className="text-purple-500" />;
  if (mode === 'in_person') return <MapPin size={14} className="text-teal-500" />;
  return <Globe size={14} className="text-blue-500" />;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function toDatetimeLocal(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

function fromDatetimeLocal(value: string): string {
  if (!value) return '';
  try {
    return new Date(value).toISOString();
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function WorkshopEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const toast = useToast();
  const isNew = !id || id === 'new';

  // Workshop state
  const [data, setData] = useState<WorkshopData>({ ...EMPTY_WORKSHOP });
  const [workshopId, setWorkshopId] = useState<string | undefined>(isNew ? undefined : id);

  // Revisions
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);

  // UI state
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errors, setErrors] = useState<string[]>([]);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [showScheduleInput, setShowScheduleInput] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const actionsRef = useRef<HTMLDivElement>(null);

  // Autosave
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

  // ---------- Load existing workshop ----------

  useEffect(() => {
    if (isNew) return;

    const loadWorkshop = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/learn/${id}`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        if (!res.ok) throw new Error('Workshop not found');

        const raw = await res.json();
        const workshopData: WorkshopData = {
          id: raw.id,
          title: raw.title || '',
          slug: raw.slug || '',
          subtitle: raw.subtitle || '',
          type: raw.type || 'WORKSHOP',
          status: raw.status || 'draft',
          summary: raw.summary || '',
          description: raw.description || '',
          contentHtml: raw.contentHtml || '',
          contentJson: raw.contentJson || '',
          price: raw.price || '0',
          priceAmount: raw.priceAmount || '',
          currency: raw.currency || 'AUD',
          image: raw.image || '',
          coverImageUrl: raw.coverImageUrl || '',
          deliveryMode: raw.deliveryMode || 'online',
          locationLabel: raw.locationLabel || '',
          duration: raw.duration || '',
          format: raw.format || '',
          level: raw.level || '',
          capacity: raw.capacity ?? null,
          startAt: raw.startAt || '',
          endAt: raw.endAt || '',
          timezone: raw.timezone || 'Australia/Sydney',
          evergreen: !!raw.evergreen,
          ticketingUrl: raw.ticketingUrl || '',
          includes: Array.isArray(raw.includes)
            ? raw.includes
            : typeof raw.includes === 'string'
              ? JSON.parse(raw.includes || '[]')
              : [],
          outcomes: Array.isArray(raw.outcomes)
            ? raw.outcomes
            : typeof raw.outcomes === 'string'
              ? JSON.parse(raw.outcomes || '[]')
              : [],
          modules: Array.isArray(raw.modules)
            ? raw.modules
            : typeof raw.modules === 'string'
              ? JSON.parse(raw.modules || '[]')
              : [],
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
          enrolledCount: raw.enrolledCount || 0,
        };

        setData(workshopData);
        setWorkshopId(raw.id);
        lastSavedData.current = JSON.stringify(workshopData);
      } catch {
        toast.error('Could not load workshop.');
        navigate('/admin/workshops');
      } finally {
        setLoading(false);
      }
    };

    loadWorkshop();
  }, [id, isNew, accessToken, navigate]);

  // ---------- Load revisions ----------

  const loadRevisions = useCallback(async () => {
    if (!workshopId) return;
    setRevisionsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/learn/${workshopId}/revisions`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const list = await res.json();
        setRevisions(Array.isArray(list) ? list.slice(0, 10) : []);
      }
    } catch {
      // Silently fail — revisions are non-critical
    } finally {
      setRevisionsLoading(false);
    }
  }, [workshopId, accessToken]);

  // ---------- Update field helper ----------

  const updateField = useCallback((field: keyof WorkshopData, value: any) => {
    setData(prev => {
      const next = { ...prev, [field]: value };

      // Auto-generate slug from title for new items or when slug matches previous auto-slug
      if (field === 'title' && (!prev.slug || prev.slug === generateSlug(prev.title))) {
        next.slug = generateSlug(value);
      }

      // Auto-set SEO title from title if empty or matches previous title
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
      saveWorkshop(false);
    }, 1000);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [data]);

  // ---------- Save ----------

  const saveWorkshop = useCallback(async (showFeedback = true) => {
    const currentData = JSON.stringify(data);
    if (currentData === lastSavedData.current && workshopId) {
      if (showFeedback) toast.success('No changes to save.');
      return workshopId;
    }

    setSaving(true);
    setSaveStatus('saving');

    try {
      const method = workshopId ? 'PUT' : 'POST';
      const url = workshopId ? `${API_BASE}/learn/${workshopId}` : `${API_BASE}/learn`;

      const payload: Record<string, any> = { ...data };
      delete payload.id;
      delete payload.publishedAt;
      delete payload.enrolledCount;

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

      if (!workshopId) {
        setWorkshopId(saved.id);
        setData(prev => ({ ...prev, id: saved.id }));
        window.history.replaceState(null, '', `#/admin/workshops/${saved.id}`);
      }

      lastSavedData.current = JSON.stringify(data);
      hasChanges.current = false;
      setSaveStatus('saved');
      if (showFeedback) toast.success('Workshop saved.');

      return saved.id;
    } catch (err: any) {
      setSaveStatus('error');
      if (showFeedback) toast.error(err.message || 'Could not save workshop.');
      return null;
    } finally {
      setSaving(false);
    }
  }, [data, workshopId, accessToken]);

  // ---------- Publish ----------

  const handlePublish = async () => {
    const savedId = await saveWorkshop(false);
    if (!savedId) return;

    try {
      const res = await fetch(`${API_BASE}/learn/${savedId}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
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
      setErrors([]);
      toast.success('Workshop is now live!');
    } catch (err: any) {
      toast.error(err.message || 'Could not publish workshop.');
    }
  };

  // ---------- Unpublish ----------

  const handleUnpublish = async () => {
    if (!workshopId) return;
    try {
      const res = await fetch(`${API_BASE}/learn/${workshopId}/unpublish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
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
      toast.success('Workshop unpublished.');
    } catch (err: any) {
      toast.error(err.message || 'Could not unpublish workshop.');
    }
  };

  // ---------- Schedule ----------

  const handleSchedule = async () => {
    if (!workshopId || !scheduleDate) return;
    try {
      const res = await fetch(`${API_BASE}/learn/${workshopId}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ scheduledAt: fromDatetimeLocal(scheduleDate) }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Schedule failed');
      }
      const updated = await res.json();
      setData(prev => ({
        ...prev,
        status: updated.status || 'scheduled',
        scheduledAt: updated.scheduledAt || fromDatetimeLocal(scheduleDate),
      }));
      setShowScheduleInput(false);
      setScheduleDate('');
      toast.success('Workshop scheduled.');
    } catch (err: any) {
      toast.error(err.message || 'Could not schedule workshop.');
    }
  };

  // ---------- Archive ----------

  const handleArchive = async () => {
    if (!workshopId) return;
    try {
      const res = await fetch(`${API_BASE}/learn/${workshopId}/archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Archive failed');
      }
      toast.success('Workshop archived.');
      navigate('/admin/workshops');
    } catch (err: any) {
      toast.error(err.message || 'Could not archive workshop.');
    }
  };

  // ---------- Delete ----------

  const handleDelete = async () => {
    if (!workshopId) return;
    if (!window.confirm('Are you sure you want to delete this workshop? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_BASE}/learn/${workshopId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Delete failed');
      }
      toast.success('Workshop deleted.');
      navigate('/admin/workshops');
    } catch (err: any) {
      toast.error(err.message || 'Could not delete workshop.');
    }
  };

  // ---------- Restore revision ----------

  const handleRestoreRevision = async (revisionId: string) => {
    if (!workshopId) return;
    if (!window.confirm('Restore this revision? Current unsaved changes will be lost.')) return;
    try {
      const res = await fetch(`${API_BASE}/learn/${workshopId}/revisions/${revisionId}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Restore failed');
      }
      toast.success('Revision restored. Reloading...');
      // Reload workshop data
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Could not restore revision.');
    }
  };

  // ---------- Loading state ----------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="text-stone-400 animate-spin" />
      </div>
    );
  }

  // ---------- Render ----------

  return (
    <div className="min-h-screen -m-4 lg:-m-6">
      {/* ================================================================= */}
      {/* TOP BAR                                                            */}
      {/* ================================================================= */}
      <div className="sticky top-0 z-20 bg-white border-b border-stone-200 px-4 lg:px-6 py-3">
        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/admin/workshops')}
            className="p-1.5 hover:bg-stone-100 rounded-md transition text-stone-500"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-stone-900 truncate">
                {data.title || 'Untitled workshop'}
              </h1>
              <TypeBadge type={data.type} />
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
              onClick={() => saveWorkshop(true)}
              disabled={saving}
              className="bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-md px-3 h-8 text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Save size={14} />
              Save
            </button>

            {/* Publish / Unpublish primary action */}
            {(data.status === 'draft' || data.status === 'archived') && (
              <button
                onClick={handlePublish}
                disabled={saving}
                className="bg-stone-900 text-white hover:bg-stone-800 rounded-md px-4 h-8 text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <Eye size={14} />
                Publish
              </button>
            )}
            {data.status === 'published' && (
              <button
                onClick={handleUnpublish}
                disabled={saving}
                className="bg-stone-900 text-white hover:bg-stone-800 rounded-md px-4 h-8 text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <EyeOff size={14} />
                Unpublish
              </button>
            )}
            {data.status === 'scheduled' && (
              <button
                onClick={handleUnpublish}
                disabled={saving}
                className="bg-amber-600 text-white hover:bg-amber-700 rounded-md px-4 h-8 text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <X size={14} />
                Cancel Schedule
              </button>
            )}

            {/* Three-dot menu */}
            {workshopId && (
              <div className="relative" ref={actionsRef}>
                <button
                  onClick={() => setActionsMenuOpen(!actionsMenuOpen)}
                  className="p-1.5 hover:bg-stone-100 rounded-md transition"
                >
                  <MoreHorizontal size={18} className="text-stone-500" />
                </button>
                {actionsMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 z-30 bg-white rounded-lg shadow-lg border border-stone-200 py-1 w-48">
                    {data.status === 'published' && (
                      <a
                        href={`/#/learn/${data.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex items-center gap-2"
                        onClick={() => setActionsMenuOpen(false)}
                      >
                        <ExternalLink size={14} /> View on site
                      </a>
                    )}
                    {data.status !== 'archived' && (
                      <button
                        onClick={() => { handleArchive(); setActionsMenuOpen(false); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex items-center gap-2"
                      >
                        <Archive size={14} /> Archive
                      </button>
                    )}
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

      {/* ================================================================= */}
      {/* TWO-COLUMN LAYOUT                                                  */}
      {/* ================================================================= */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ============================================================= */}
          {/* LEFT COLUMN (3/5)                                              */}
          {/* ============================================================= */}
          <div className="lg:col-span-3 space-y-6">

            {/* Workshop Details */}
            <Card title="Workshop Details">
              <div>
                <div className="flex items-center justify-between">
                  <FieldLabel label="Title" required />
                  <CharCounter current={data.title.length} max={200} />
                </div>
                <input
                  type="text"
                  value={data.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Workshop title"
                  maxLength={200}
                  className={inputClass}
                />
              </div>

              <div>
                <FieldLabel label="Subtitle" />
                <input
                  type="text"
                  value={data.subtitle}
                  onChange={(e) => updateField('subtitle', e.target.value)}
                  placeholder="A short tagline or subtitle"
                  className={inputClass}
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
                  placeholder="Brief summary shown in listings"
                  rows={3}
                  maxLength={500}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div>
                <FieldLabel label="Content" />
                <RichTextEditor
                  content={data.contentHtml}
                  onChange={(html) => updateField('contentHtml', html)}
                  placeholder="Full workshop description..."
                  minHeight="300px"
                />
              </div>
            </Card>

            {/* What's Included */}
            <Card title="What's Included">
              <StringArrayEditor
                label="Includes"
                items={data.includes}
                onChange={(items) => updateField('includes', items)}
                placeholder="e.g., Workbook and materials"
              />
            </Card>

            {/* Learning Outcomes */}
            <Card title="Learning Outcomes">
              <StringArrayEditor
                label="Outcomes"
                items={data.outcomes}
                onChange={(items) => updateField('outcomes', items)}
                placeholder="e.g., Understand colour theory fundamentals"
              />
            </Card>

            {/* Modules */}
            <Card title="Modules">
              <ObjectArrayEditor
                label="Workshop Modules"
                items={data.modules}
                onChange={(modules) => updateField('modules', modules)}
                createItem={() => ({ title: '', description: '' })}
                addLabel="Add Module"
                renderItem={(item, _, updateItem) => (
                  <div className="space-y-3 pr-6">
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">Title</label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateItem({ title: e.target.value })}
                        placeholder="Module title"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">Description</label>
                      <textarea
                        value={item.description}
                        onChange={(e) => updateItem({ description: e.target.value })}
                        rows={2}
                        placeholder="What this module covers"
                        className={`${inputClass} resize-none`}
                      />
                    </div>
                  </div>
                )}
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
            <AccordionSection title="Search Engine Listing" description="Customize how this workshop appears in search results">
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
                baseUrl="lynetilt.com/learn"
              />
            </AccordionSection>
          </div>

          {/* ============================================================= */}
          {/* RIGHT COLUMN (2/5)                                             */}
          {/* ============================================================= */}
          <div className="lg:col-span-2 space-y-6">

            {/* Status & Type */}
            <Card title="Status & Type">
              <div>
                <FieldLabel label="Type" />
                <select
                  value={data.type}
                  onChange={(e) => updateField('type', e.target.value as WorkshopData['type'])}
                  className={inputClass}
                >
                  <option value="WORKSHOP">Workshop</option>
                  <option value="ONLINE">Online Course</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge status={data.status} />
                {data.publishedAt && (
                  <span className="text-xs text-stone-400">
                    Published {new Date(data.publishedAt).toLocaleDateString()}
                  </span>
                )}
                {data.scheduledAt && data.status === 'scheduled' && (
                  <span className="text-xs text-stone-400">
                    Scheduled for {new Date(data.scheduledAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Workflow buttons */}
              <div className="space-y-2 pt-1">
                {(data.status === 'draft' || data.status === 'archived') && (
                  <>
                    <button
                      onClick={handlePublish}
                      disabled={saving}
                      className="w-full bg-stone-900 text-white hover:bg-stone-800 rounded-md px-4 h-9 text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                    >
                      <Eye size={14} /> Publish Now
                    </button>
                    {workshopId && (
                      <div>
                        {!showScheduleInput ? (
                          <button
                            onClick={() => setShowScheduleInput(true)}
                            className="w-full bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-md px-4 h-9 text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5"
                          >
                            <Calendar size={14} /> Schedule
                          </button>
                        ) : (
                          <div className="space-y-2 p-3 bg-stone-50 rounded-md border border-stone-200">
                            <FieldLabel label="Publish at" />
                            <input
                              type="datetime-local"
                              value={scheduleDate}
                              onChange={(e) => setScheduleDate(e.target.value)}
                              className={inputClass}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={handleSchedule}
                                disabled={!scheduleDate || saving}
                                className="flex-1 bg-blue-600 text-white hover:bg-blue-700 rounded-md px-3 h-8 text-sm font-medium transition-colors disabled:opacity-50"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => { setShowScheduleInput(false); setScheduleDate(''); }}
                                className="px-3 h-8 text-sm text-stone-500 hover:text-stone-700 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {data.status === 'published' && (
                  <button
                    onClick={handleUnpublish}
                    disabled={saving}
                    className="w-full bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-md px-4 h-9 text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                  >
                    <EyeOff size={14} /> Unpublish
                  </button>
                )}

                {data.status === 'scheduled' && (
                  <button
                    onClick={handleUnpublish}
                    disabled={saving}
                    className="w-full bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 rounded-md px-4 h-9 text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                  >
                    <X size={14} /> Cancel Schedule
                  </button>
                )}
              </div>
            </Card>

            {/* Schedule & Dates */}
            <Card title="Schedule & Dates">
              {/* Evergreen toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-stone-700">Evergreen</span>
                  <p className="text-xs text-stone-400">Always available, no fixed dates</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateField('evergreen', !data.evergreen)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    data.evergreen ? 'bg-stone-900' : 'bg-stone-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      data.evergreen ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>

              {data.evergreen ? (
                <div className="bg-stone-50 rounded-md p-3 text-center">
                  <Clock size={16} className="text-stone-400 mx-auto mb-1" />
                  <p className="text-sm text-stone-500">Always available</p>
                  <p className="text-xs text-stone-400 mt-0.5">No specific dates apply</p>
                </div>
              ) : (
                <>
                  <div>
                    <FieldLabel label="Start date" />
                    <input
                      type="datetime-local"
                      value={toDatetimeLocal(data.startAt)}
                      onChange={(e) => updateField('startAt', fromDatetimeLocal(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <FieldLabel label="End date" />
                    <input
                      type="datetime-local"
                      value={toDatetimeLocal(data.endAt)}
                      onChange={(e) => updateField('endAt', fromDatetimeLocal(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                </>
              )}

              <div>
                <FieldLabel label="Timezone" />
                <select
                  value={data.timezone}
                  onChange={(e) => updateField('timezone', e.target.value)}
                  className={inputClass}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            </Card>

            {/* Pricing */}
            <Card title="Pricing">
              <div>
                <FieldLabel label="Price" />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">A$</span>
                  <input
                    type="number"
                    value={data.price}
                    onChange={(e) => updateField('price', e.target.value)}
                    step="0.01"
                    min="0"
                    className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                  />
                </div>
              </div>
              <div>
                <FieldLabel label="Currency" />
                <select
                  value={data.currency}
                  onChange={(e) => updateField('currency', e.target.value)}
                  className={inputClass}
                >
                  <option value="AUD">AUD</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </Card>

            {/* Delivery */}
            <Card title="Delivery">
              <div>
                <FieldLabel label="Delivery mode" />
                <div className="flex items-center gap-2 mb-2">
                  <DeliveryIcon mode={data.deliveryMode} />
                  <select
                    value={data.deliveryMode}
                    onChange={(e) => updateField('deliveryMode', e.target.value as WorkshopData['deliveryMode'])}
                    className={`flex-1 ${inputClass}`}
                  >
                    <option value="online">Online</option>
                    <option value="in_person">In Person</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
              </div>

              <div>
                <FieldLabel label="Duration" />
                <input
                  type="text"
                  value={data.duration}
                  onChange={(e) => updateField('duration', e.target.value)}
                  placeholder="e.g., 2 hours, Full day"
                  className={inputClass}
                />
              </div>

              <div>
                <FieldLabel label="Format" />
                <input
                  type="text"
                  value={data.format}
                  onChange={(e) => updateField('format', e.target.value)}
                  placeholder="e.g., Live Workshop, Self-paced"
                  className={inputClass}
                />
              </div>

              <div>
                <FieldLabel label="Level" />
                <select
                  value={data.level}
                  onChange={(e) => updateField('level', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select level...</option>
                  {LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>

              {(data.deliveryMode === 'in_person' || data.deliveryMode === 'hybrid') && (
                <div>
                  <FieldLabel label="Location" />
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-stone-400 shrink-0" />
                    <input
                      type="text"
                      value={data.locationLabel}
                      onChange={(e) => updateField('locationLabel', e.target.value)}
                      placeholder="e.g., Melbourne CBD Studio"
                      className={`flex-1 ${inputClass}`}
                    />
                  </div>
                </div>
              )}
            </Card>

            {/* Capacity */}
            <Card title="Capacity">
              <div>
                <FieldLabel label="Max capacity" />
                <input
                  type="number"
                  value={data.capacity ?? ''}
                  onChange={(e) => updateField('capacity', e.target.value ? parseInt(e.target.value) : null)}
                  min="0"
                  placeholder="Leave empty for unlimited"
                  className={inputClass}
                />
                <p className="text-xs text-stone-400 mt-1">Leave empty for unlimited capacity.</p>
              </div>
              {data.capacity !== null && data.capacity > 0 && (
                <div className="flex items-center gap-2 bg-stone-50 rounded-md p-3">
                  <UsersIcon size={16} className="text-stone-500" />
                  <span className="text-sm text-stone-600">
                    {data.enrolledCount} / {data.capacity} enrolled
                  </span>
                  {data.enrolledCount >= data.capacity && (
                    <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full ml-auto">
                      Full
                    </span>
                  )}
                </div>
              )}
            </Card>

            {/* Ticketing */}
            <Card title="Ticketing">
              <div>
                <FieldLabel label="Ticketing URL" />
                <div className="flex items-center gap-2">
                  <ExternalLink size={14} className="text-stone-400 shrink-0" />
                  <input
                    type="url"
                    value={data.ticketingUrl}
                    onChange={(e) => updateField('ticketingUrl', e.target.value)}
                    placeholder="https://eventbrite.com/..."
                    className={`flex-1 ${inputClass}`}
                  />
                </div>
                <p className="text-xs text-stone-400 mt-1">External link for ticket purchases or registrations.</p>
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
                  className={inputClass}
                />
                <p className="text-xs text-stone-400 mt-1">Separate tags with commas.</p>
              </div>
            </Card>

            {/* Revisions */}
            <AccordionSection title="Revisions" description="View and restore past versions">
              <div>
                {!revisions.length && !revisionsLoading && (
                  <div className="text-center py-4">
                    <button
                      onClick={loadRevisions}
                      disabled={!workshopId}
                      className="text-sm text-stone-500 hover:text-stone-700 transition-colors disabled:opacity-50"
                    >
                      {workshopId ? 'Load revisions' : 'Save first to view revisions'}
                    </button>
                  </div>
                )}
                {revisionsLoading && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 size={16} className="text-stone-400 animate-spin" />
                  </div>
                )}
                {revisions.length > 0 && (
                  <div className="space-y-2">
                    {revisions.map((rev) => (
                      <div
                        key={rev.id}
                        className="flex items-center justify-between bg-stone-50 rounded-md p-3 border border-stone-100"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-stone-700 truncate">
                            {rev.summary || 'Revision'}
                          </p>
                          <p className="text-xs text-stone-400">
                            {new Date(rev.createdAt).toLocaleString()}
                            {rev.author && ` by ${rev.author}`}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRestoreRevision(rev.id)}
                          className="text-xs text-stone-500 hover:text-stone-700 border border-stone-200 rounded px-2 py-1 hover:bg-white transition-colors ml-3 shrink-0"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AccordionSection>
          </div>
        </div>
      </div>
    </div>
  );
}
