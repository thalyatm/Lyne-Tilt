import React, { useState, useEffect, useRef, useCallback } from 'react';
import DataTable from '../components/DataTable';
import { useAuth } from '../context/AuthContext';
import { ImageUploadField } from '../components/FormModal';
import RichTextEditor from '../components/RichTextEditor';
import {
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Loader2,
  Calendar,
  Tag,
  FileText,
  Plus,
  X,
  Settings,
  Search,
  Clock,
  History,
  Globe,
  PanelRightClose,
  PanelRightOpen,
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Send,
  CalendarClock,
  Archive,
  Link as LinkIcon,
} from 'lucide-react';
import { API_BASE, resolveImageUrl } from '../config/api';

// ─── Types ──────────────────────────────────────────────

type PostStatus = 'draft' | 'scheduled' | 'published' | 'archived';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  contentJson?: string | null;
  date: string;
  category: string;
  image: string;
  published: boolean;
  status: PostStatus;
  publishedAt: string | null;
  scheduledAt: string | null;
  authorId?: string | null;
  authorName?: string | null;
  metaTitle: string;
  metaDescription: string;
  ogImageUrl?: string | null;
  canonicalUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BlogVersion {
  id: string;
  title: string;
  excerpt: string;
  savedAt: string;
  createdBy?: string;
}

const emptyPost: Partial<BlogPost> = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  category: '',
  image: '',
  status: 'draft',
  published: false,
  scheduledAt: null,
  metaTitle: '',
  metaDescription: '',
  ogImageUrl: '',
  canonicalUrl: '',
};

const DEFAULT_CATEGORIES = [
  'Mindset',
  'Growth',
  'Aesthetics',
  'Process',
  'Creativity',
  'Inspiration',
  'Business',
];

type ViewMode = 'list' | 'editor';
type SidebarTab = 'settings' | 'seo' | 'history';
type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

// ─── Helpers ────────────────────────────────────────────

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getWordCount(html: string): number {
  const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
  return text.split(/\s+/).filter(Boolean).length;
}

function getReadingTime(html: string): string {
  const words = getWordCount(html);
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatScheduledDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ─── Status Badge ───────────────────────────────────────

function StatusBadge({ status, scheduledAt }: { status: PostStatus; scheduledAt?: string | null }) {
  const config: Record<PostStatus, { icon: any; label: string; className: string }> = {
    draft: { icon: EyeOff, label: 'Draft', className: 'bg-amber-100 text-amber-700' },
    scheduled: { icon: CalendarClock, label: 'Scheduled', className: 'bg-blue-100 text-blue-700' },
    published: { icon: Eye, label: 'Published', className: 'bg-green-100 text-green-700' },
    archived: { icon: Archive, label: 'Archived', className: 'bg-stone-200 text-stone-600' },
  };

  const { icon: Icon, label, className } = config[status] || config.draft;

  return (
    <div className="flex flex-col">
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${className}`}>
        <Icon size={10} />
        {label}
      </span>
      {status === 'scheduled' && scheduledAt && (
        <span className="text-[10px] text-stone-400 mt-0.5">{formatScheduledDate(scheduledAt)}</span>
      )}
    </div>
  );
}

// ─── Save Status Indicator ─────────────────────────────

function SaveIndicator({ status }: { status: SaveStatus }) {
  const config = {
    saved: { icon: CheckCircle2, text: 'Saved', color: 'text-green-600' },
    saving: { icon: Loader2, text: 'Saving...', color: 'text-stone-400' },
    unsaved: { icon: AlertCircle, text: 'Unsaved changes', color: 'text-amber-500' },
    error: { icon: AlertCircle, text: 'Save failed', color: 'text-red-500' },
  };
  const { icon: Icon, text, color } = config[status];

  return (
    <div className={`flex items-center gap-1.5 text-xs ${color}`}>
      <Icon size={14} className={status === 'saving' ? 'animate-spin' : ''} />
      <span>{text}</span>
    </div>
  );
}

// ─── Social Preview Card ────────────────────────────────

function SocialPreviewCard({ title, description, image, url }: {
  title: string;
  description: string;
  image: string;
  url: string;
}) {
  return (
    <div className="border border-stone-200 rounded-lg overflow-hidden bg-white">
      {image ? (
        <div className="h-32 bg-stone-100 overflow-hidden">
          <img src={image} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-32 bg-stone-100 flex items-center justify-center">
          <ImageIcon size={24} className="text-stone-300" />
        </div>
      )}
      <div className="p-3">
        <p className="text-[10px] text-stone-400 uppercase tracking-wide mb-1">
          {url || 'yourdomain.com'}
        </p>
        <p className="text-sm font-medium text-stone-900 line-clamp-2 leading-snug">
          {title || 'Post title will appear here'}
        </p>
        <p className="text-xs text-stone-500 mt-1 line-clamp-2">
          {description || 'Meta description will appear here...'}
        </p>
      </div>
    </div>
  );
}

// ─── Cover Image Banner ─────────────────────────────────

function CoverImageBanner({ image, onChange, onError }: { image: string; onChange: (url: string) => void; onError?: (msg: string) => void }) {
  const { accessToken } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Upload failed (${res.status})`);
      }
      const data = await res.json();
      const baseUrl = API_BASE.replace('/api', '');
      onChange(`${baseUrl}${data.url}`);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (image) {
    return (
      <div className="relative group rounded-lg overflow-hidden mb-6">
        <img src={image} alt="Cover" className="w-full h-56 object-cover" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex gap-2">
            <label className="px-3 py-1.5 bg-white rounded-md text-sm font-medium cursor-pointer hover:bg-stone-50 transition shadow-sm">
              Change
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
              />
            </label>
            <button
              onClick={() => onChange('')}
              className="px-3 py-1.5 bg-white rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition shadow-sm"
            >
              Remove
            </button>
          </div>
        </div>
        {uploading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-stone-500" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file?.type.startsWith('image/')) upload(file);
      }}
      className={`mb-6 border-2 border-dashed rounded-lg h-40 flex flex-col items-center justify-center gap-2 transition cursor-pointer ${
        dragging ? 'border-stone-400 bg-stone-50' : 'border-stone-200 hover:border-stone-300'
      }`}
      onClick={() => fileRef.current?.click()}
    >
      {uploading ? (
        <Loader2 size={24} className="animate-spin text-stone-400" />
      ) : (
        <>
          <div className="p-3 bg-stone-100 rounded-full">
            <Upload size={20} className="text-stone-400" />
          </div>
          <p className="text-sm text-stone-500">Add cover image</p>
          <p className="text-xs text-stone-400">Drag & drop or click to upload</p>
        </>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
    </div>
  );
}

// ─── Schedule Modal ─────────────────────────────────────

function ScheduleModal({ onSchedule, onClose }: {
  onSchedule: (date: string) => void;
  onClose: () => void;
}) {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 60);
  const defaultStr = now.toISOString().slice(0, 16);
  const [dateValue, setDateValue] = useState(defaultStr);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-full">
            <CalendarClock size={20} className="text-blue-600" />
          </div>
          <h3 className="text-lg font-medium text-stone-800">Schedule publication</h3>
        </div>
        <p className="text-stone-600 mb-4 text-sm">
          Choose when this post should be automatically published.
        </p>
        <input
          type="datetime-local"
          value={dateValue}
          onChange={(e) => setDateValue(e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
          className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 mb-4"
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const d = new Date(dateValue);
              if (d > new Date()) {
                onSchedule(d.toISOString());
              }
            }}
            disabled={!dateValue || new Date(dateValue) <= new Date()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-40"
          >
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Modal ──────────────────────────────────────

function ConfirmModal({ title, message, confirmLabel, confirmColor, icon: Icon, iconColor, onConfirm, onClose }: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: string;
  icon: any;
  iconColor: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-full ${iconColor}`}>
            <Icon size={20} />
          </div>
          <h3 className="text-lg font-medium text-stone-800">{title}</h3>
        </div>
        <p className="text-stone-600 mb-6 text-sm">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`px-4 py-2 text-white rounded-lg transition text-sm ${confirmColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────

export default function BlogManager() {
  const { accessToken } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(''), 5000); };

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingItem, setEditingItem] = useState<BlogPost | null>(null);
  const [formValues, setFormValues] = useState<Partial<BlogPost>>(emptyPost);

  // List filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('settings');

  // Save status
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const lastSavedContent = useRef<string>('');
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Version history
  const [versions, setVersions] = useState<BlogVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  // Categories
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  // Get all unique categories
  const allCategories = React.useMemo(() => {
    const fromPosts = posts.flatMap(p =>
      p.category?.split(',').map(c => c.trim()).filter(Boolean) || []
    );
    return [...new Set([...DEFAULT_CATEGORIES, ...fromPosts, ...customCategories])].sort();
  }, [posts, customCategories]);

  // Filtered posts for list view
  const filteredPosts = React.useMemo(() => {
    let result = posts;
    if (statusFilter !== 'all') {
      result = result.filter(p => (p.status || (p.published ? 'published' : 'draft')) === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.excerpt || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [posts, statusFilter, searchQuery]);

  // Status counts for filter badges
  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: posts.length, draft: 0, scheduled: 0, published: 0, archived: 0 };
    posts.forEach(p => {
      const s = p.status || (p.published ? 'published' : 'draft');
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [posts]);

  // ─── Data fetching ─────────────────────────────────

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE}/blog`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : data.data || []);
    } catch {
      showError('Could not load blog posts.');
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async (postId: string) => {
    setVersionsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/blog/${postId}/versions`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) setVersions(await res.json());
    } catch {
      // silent
    } finally {
      setVersionsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [accessToken]);

  // ─── Auto-save (1200ms debounce) ──────────────────

  const createVersionSnapshot = useCallback(async (postId: string, values: Partial<BlogPost>) => {
    try {
      await fetch(`${API_BASE}/blog/${postId}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: values.title,
          content: values.content,
          excerpt: values.excerpt,
        }),
      });
    } catch {
      // silent
    }
  }, [accessToken]);

  const performAutoSave = useCallback(async () => {
    if (!editingItem) return;

    const contentHash = JSON.stringify({
      title: formValues.title,
      content: formValues.content,
      excerpt: formValues.excerpt,
    });

    if (contentHash === lastSavedContent.current) return;

    setSaveStatus('saving');
    try {
      const res = await fetch(`${API_BASE}/blog/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formValues),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Save failed (${res.status})`);
      }
      lastSavedContent.current = contentHash;
      setSaveStatus('saved');

      await createVersionSnapshot(editingItem.id, formValues);

      if (sidebarTab === 'history') {
        fetchVersions(editingItem.id);
      }
    } catch (err) {
      setSaveStatus('error');
      showError(err instanceof Error ? err.message : 'Auto-save failed');
    }
  }, [editingItem, formValues, accessToken, createVersionSnapshot, sidebarTab]);

  useEffect(() => {
    if (viewMode !== 'editor' || !editingItem) return;

    const contentHash = JSON.stringify({
      title: formValues.title,
      content: formValues.content,
      excerpt: formValues.excerpt,
    });

    if (contentHash !== lastSavedContent.current) {
      setSaveStatus('unsaved');

      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        performAutoSave();
      }, 1200);
    }

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [formValues.title, formValues.content, formValues.excerpt, viewMode, editingItem, performAutoSave]);

  // ─── Actions ───────────────────────────────────────

  const handleAdd = () => {
    setEditingItem(null);
    setFormValues(emptyPost);
    setVersions([]);
    setSaveStatus('saved');
    lastSavedContent.current = '';
    setViewMode('editor');
    setSidebarTab('settings');
  };

  const handleEdit = (item: BlogPost) => {
    setEditingItem(item);
    setFormValues(item);
    setVersions([]);
    lastSavedContent.current = JSON.stringify({
      title: item.title,
      content: item.content,
      excerpt: item.excerpt,
    });
    setSaveStatus('saved');
    setViewMode('editor');
    setSidebarTab('settings');
    fetchVersions(item.id);
  };

  const handleDelete = async (item: BlogPost) => {
    if (!window.confirm(`Delete "${item.title}"? This can't be undone.`)) return;
    try {
      await fetch(`${API_BASE}/blog/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      showToast('Post deleted.');
      fetchData();
    } catch {
      showError('Could not delete post.');
    }
  };

  const handleDuplicate = async (item: BlogPost) => {
    try {
      await fetch(`${API_BASE}/blog/${item.id}/duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      showToast('Post duplicated as draft.');
      fetchData();
    } catch {
      showError('Could not duplicate post.');
    }
  };

  const handleArchiveFromList = async (item: BlogPost) => {
    try {
      if (item.status === 'archived') {
        await fetch(`${API_BASE}/blog/${item.id}/unpublish`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        showToast('Post restored as draft.');
      } else {
        await fetch(`${API_BASE}/blog/${item.id}/archive`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        showToast('Post archived.');
      }
      fetchData();
    } catch {
      showError('Could not update post.');
    }
  };

  const handlePublish = async () => {
    if (!editingItem) return;
    try {
      const res = await fetch(`${API_BASE}/blog/${editingItem.id}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const updated = await res.json();
      setEditingItem(updated);
      setFormValues(prev => ({ ...prev, status: 'published', published: true, publishedAt: updated.publishedAt }));
      showToast('Post published!');
      fetchData();
    } catch {
      showError('Could not publish post.');
    }
  };

  const handleUnpublish = async () => {
    if (!editingItem) return;
    try {
      const res = await fetch(`${API_BASE}/blog/${editingItem.id}/unpublish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const updated = await res.json();
      setEditingItem(updated);
      setFormValues(prev => ({ ...prev, status: 'draft', published: false, scheduledAt: null }));
      showToast('Post unpublished.');
      fetchData();
    } catch {
      showError('Could not unpublish post.');
    }
  };

  const handleSchedule = async (scheduledAt: string) => {
    if (!editingItem) return;
    setShowScheduleModal(false);
    try {
      const res = await fetch(`${API_BASE}/blog/${editingItem.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ scheduledAt }),
      });
      const updated = await res.json();
      setEditingItem(updated);
      setFormValues(prev => ({ ...prev, status: 'scheduled', published: false, scheduledAt: updated.scheduledAt }));
      showToast(`Post scheduled for ${formatScheduledDate(scheduledAt)}`);
      fetchData();
    } catch {
      showError('Could not schedule post.');
    }
  };

  const handleArchive = async () => {
    if (!editingItem) return;
    try {
      const res = await fetch(`${API_BASE}/blog/${editingItem.id}/archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const updated = await res.json();
      setEditingItem(updated);
      setFormValues(prev => ({ ...prev, status: 'archived', published: false, scheduledAt: null }));
      showToast('Post archived.');
      fetchData();
    } catch {
      showError('Could not archive post.');
    }
  };

  const handleSave = async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaving(true);
    setSaveStatus('saving');

    try {
      const payload = {
        ...formValues,
        slug: formValues.slug || generateSlug(formValues.title || ''),
      };

      const method = editingItem ? 'PUT' : 'POST';
      const url = editingItem ? `${API_BASE}/blog/${editingItem.id}` : `${API_BASE}/blog`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Save failed (${res.status})`);
      }

      const saved = await res.json();

      lastSavedContent.current = JSON.stringify({
        title: formValues.title,
        content: formValues.content,
        excerpt: formValues.excerpt,
      });
      setSaveStatus('saved');
      showToast(editingItem ? 'Post saved!' : 'Post created!');
      fetchData();

      if (!editingItem && saved.id) {
        setEditingItem(saved);
        setFormValues(saved);
        fetchVersions(saved.id);
      }
    } catch (err) {
      setSaveStatus('error');
      showError(err instanceof Error ? err.message : 'Could not save post.');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (saveStatus === 'unsaved') {
      if (!confirm('You have unsaved changes. Leave anyway?')) return;
    }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setViewMode('list');
    setEditingItem(null);
    setFormValues(emptyPost);
    setVersions([]);
  };

  const handleRestoreVersion = async (version: BlogVersion) => {
    if (!editingItem) return;
    if (!confirm(`Restore version from ${timeAgo(version.savedAt)}? Current content will be replaced.`)) return;

    try {
      const res = await fetch(`${API_BASE}/blog/${editingItem.id}/restore/${version.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const restored = await res.json();
      setFormValues(prev => ({
        ...prev,
        title: restored.title,
        content: restored.content,
        excerpt: restored.excerpt,
      }));
      lastSavedContent.current = JSON.stringify({
        title: restored.title,
        content: restored.content,
        excerpt: restored.excerpt,
      });
      setSaveStatus('saved');
      showToast('Version restored!');
      fetchVersions(editingItem.id);
    } catch {
      showError('Could not restore version.');
    }
  };

  const updateFormValue = (key: string, value: any) => {
    setFormValues(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'title' && (!editingItem || (editingItem.status === 'draft' && !editingItem.publishedAt))) {
        next.slug = generateSlug(value);
      }
      if (key === 'title' && !prev.metaTitle) {
        next.metaTitle = value;
      }
      return next;
    });
  };

  const toggleCategory = (category: string) => {
    const current = formValues.category?.split(',').map(c => c.trim()).filter(Boolean) || [];
    const next = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];
    updateFormValue('category', next.join(', '));
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (trimmed && !allCategories.includes(trimmed)) {
      setCustomCategories(prev => [...prev, trimmed]);
      const current = formValues.category?.split(',').map(c => c.trim()).filter(Boolean) || [];
      updateFormValue('category', [...current, trimmed].join(', '));
    }
    setNewCategoryName('');
    setShowAddCategory(false);
  };

  // ─── List Columns ─────────────────────────────────

  const columns = [
    {
      key: 'image',
      label: '',
      render: (item: BlogPost) => item.image ? (
        <img src={resolveImageUrl(item.image)} alt="" className="w-10 h-10 object-cover rounded" />
      ) : (
        <div className="w-10 h-10 bg-stone-100 rounded flex items-center justify-center">
          <FileText size={14} className="text-stone-300" />
        </div>
      ),
    },
    {
      key: 'title',
      label: 'Title',
      render: (item: BlogPost) => (
        <div>
          <p className="font-medium text-stone-900 text-sm">{item.title}</p>
          {item.excerpt && (
            <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{item.excerpt}</p>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Categories',
      render: (item: BlogPost) => (
        <div className="flex flex-wrap gap-1">
          {item.category
            ?.split(',')
            .map(c => c.trim())
            .filter(Boolean)
            .map(cat => (
              <span key={cat} className="px-2 py-0.5 text-xs rounded-full bg-stone-100 text-stone-600">
                {cat}
              </span>
            )) || <span className="text-stone-300">-</span>}
        </div>
      ),
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      render: (item: BlogPost) => (
        <span className="text-xs text-stone-500">{timeAgo(item.updatedAt)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: BlogPost) => (
        <StatusBadge status={item.status || (item.published ? 'published' : 'draft')} scheduledAt={item.scheduledAt} />
      ),
    },
  ];

  // ─── List View ─────────────────────────────────────

  if (viewMode === 'list') {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-stone-900">Oxygen Notes</h1>
          <p className="text-sm text-stone-500 mt-1">Write and publish articles for your website.</p>
        </div>

        {/* Filters Bar */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          {/* Status Tabs */}
          <div className="flex gap-1 bg-stone-100 p-0.5 rounded-lg">
            {(['all', 'draft', 'scheduled', 'published', 'archived'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition capitalize ${
                  statusFilter === s
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {s === 'all' ? 'All' : s}
                {statusCounts[s] > 0 && (
                  <span className="ml-1.5 text-[10px] text-stone-400">{statusCounts[s]}</span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <DataTable
          title="Oxygen Notes"
          data={filteredPosts}
          columns={columns}
          loading={loading}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onArchive={handleArchiveFromList}
          isArchived={(item) => (item.status || (item.published ? 'published' : 'draft')) === 'archived'}
          getId={(item) => item.id}
          archiveLabel="Archive"
          unarchiveLabel="Restore"
        />
        {toast && <div className="fixed bottom-4 right-4 bg-stone-900 text-white px-4 py-2 rounded-md shadow-lg text-sm z-50">{toast}</div>}
        {error && <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-md shadow-lg text-sm z-50">{error}</div>}
      </div>
    );
  }

  // ─── Editor View ───────────────────────────────────

  const wordCount = getWordCount(formValues.content || '');
  const readingTime = getReadingTime(formValues.content || '');
  const metaDescLength = (formValues.metaDescription || '').length;
  const currentStatus: PostStatus = formValues.status || 'draft';

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col -m-6">
      {/* ─── Top Bar ─────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-stone-500 hover:text-stone-900 transition text-sm"
          >
            <ArrowLeft size={16} />
            Posts
          </button>
          <div className="h-4 w-px bg-stone-200" />
          <SaveIndicator status={saveStatus} />
          <div className="h-4 w-px bg-stone-200" />
          <StatusBadge status={currentStatus} scheduledAt={formValues.scheduledAt} />
        </div>

        <div className="flex items-center gap-2">
          {/* Word count & reading time */}
          <div className="hidden md:flex items-center gap-3 text-xs text-stone-400 mr-2">
            <span>{wordCount.toLocaleString()} words</span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {readingTime}
            </span>
          </div>

          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-2 rounded-md transition ${
              sidebarOpen ? 'bg-stone-100 text-stone-700' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'
            }`}
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            {sidebarOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
          </button>

          {/* ─── Workflow Buttons ─────────────────── */}
          {editingItem && currentStatus === 'published' && (
            <button
              onClick={() => setShowUnpublishConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-stone-600 hover:bg-stone-100 rounded-md transition text-sm"
            >
              <EyeOff size={15} />
              Unpublish
            </button>
          )}

          {editingItem && currentStatus === 'scheduled' && (
            <button
              onClick={handleUnpublish}
              className="flex items-center gap-1.5 px-3 py-2 text-stone-600 hover:bg-stone-100 rounded-md transition text-sm"
              title="Cancel schedule"
            >
              <X size={15} />
              Cancel Schedule
            </button>
          )}

          {editingItem && (currentStatus === 'draft' || currentStatus === 'scheduled') && (
            <button
              onClick={() => setShowScheduleModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition text-sm"
            >
              <CalendarClock size={15} />
              Schedule
            </button>
          )}

          {editingItem && currentStatus !== 'archived' && (
            <button
              onClick={() => setShowArchiveConfirm(true)}
              className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded-md transition"
              title="Archive"
            >
              <Archive size={16} />
            </button>
          )}

          {editingItem && currentStatus === 'archived' && (
            <button
              onClick={handleUnpublish}
              className="flex items-center gap-1.5 px-3 py-2 text-stone-600 hover:bg-stone-100 rounded-md transition text-sm"
            >
              <RotateCcw size={15} />
              Restore as Draft
            </button>
          )}

          {/* Save / Publish button */}
          {currentStatus === 'published' ? (
            <button
              onClick={handleSave}
              disabled={saving || !formValues.title}
              className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white rounded-md hover:bg-stone-800 transition text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Saving...' : 'Update'}
            </button>
          ) : !editingItem ? (
            <button
              onClick={handleSave}
              disabled={saving || !formValues.title}
              className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white rounded-md hover:bg-stone-800 transition text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Creating...' : 'Create Draft'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !formValues.title}
                className="flex items-center gap-1.5 px-3 py-2 text-stone-600 hover:bg-stone-100 rounded-md transition text-sm disabled:opacity-40"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Save
              </button>
              {(currentStatus === 'draft' || currentStatus === 'archived') && (
                <button
                  onClick={() => setShowPublishConfirm(true)}
                  disabled={!formValues.title}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition text-sm font-medium disabled:opacity-40"
                >
                  <Send size={15} />
                  Publish
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Main Content Area ───────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ─── Editor Canvas ─────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className={`mx-auto py-8 px-6 ${sidebarOpen ? 'max-w-3xl' : 'max-w-4xl'}`}>
            {/* Cover Image */}
            <CoverImageBanner
              image={formValues.image || ''}
              onChange={(url) => updateFormValue('image', url)}
              onError={showError}
            />

            {/* Title */}
            <input
              type="text"
              value={formValues.title || ''}
              onChange={(e) => updateFormValue('title', e.target.value)}
              placeholder="Post title..."
              className="w-full text-3xl font-serif text-stone-900 placeholder:text-stone-300 border-none outline-none mb-4 bg-transparent leading-snug"
            />

            {/* Excerpt */}
            <textarea
              value={formValues.excerpt || ''}
              onChange={(e) => updateFormValue('excerpt', e.target.value)}
              placeholder="Write a brief summary..."
              rows={2}
              className="w-full text-lg text-stone-500 placeholder:text-stone-300 border-none outline-none resize-none mb-8 bg-transparent leading-relaxed"
            />

            {/* Divider */}
            <div className="border-t border-stone-100 mb-8" />

            {/* Rich Text Editor */}
            <RichTextEditor
              content={formValues.content || ''}
              onChange={(html) => updateFormValue('content', html)}
              placeholder="Start writing..."
              minHeight="500px"
            />
          </div>
        </div>

        {/* ─── Right Sidebar ─────────────────────── */}
        {sidebarOpen && (
          <div className="w-80 border-l border-stone-200 bg-stone-50/50 flex flex-col flex-shrink-0 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="flex border-b border-stone-200 bg-white">
              {([
                { key: 'settings' as SidebarTab, label: 'Settings', icon: Settings },
                { key: 'seo' as SidebarTab, label: 'SEO', icon: Globe },
                { key: 'history' as SidebarTab, label: 'History', icon: History },
              ]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => {
                    setSidebarTab(key);
                    if (key === 'history' && editingItem) fetchVersions(editingItem.id);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition border-b-2 ${
                    sidebarTab === key
                      ? 'text-stone-900 border-stone-900'
                      : 'text-stone-400 border-transparent hover:text-stone-600'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* ── Settings Tab ── */}
              {sidebarTab === 'settings' && (
                <>
                  {/* Date */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-stone-700 mb-1.5">
                      <Calendar size={12} />
                      Date
                    </label>
                    <input
                      type="text"
                      value={formValues.date || ''}
                      onChange={(e) => updateFormValue('date', e.target.value)}
                      placeholder="February 2026"
                      className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 bg-white"
                    />
                  </div>

                  {/* Categories */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-stone-700 mb-2">
                      <Tag size={12} />
                      Categories
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {allCategories.map((cat) => {
                        const isSelected = formValues.category?.split(',').map(c => c.trim()).includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleCategory(cat)}
                            className={`px-2.5 py-1 rounded-full text-xs transition ${
                              isSelected
                                ? 'bg-stone-900 text-white'
                                : 'bg-white border border-stone-200 text-stone-500 hover:border-stone-300'
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                      {showAddCategory ? (
                        <div className="flex items-center gap-1 w-full mt-1">
                          <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); }
                              if (e.key === 'Escape') { setShowAddCategory(false); setNewCategoryName(''); }
                            }}
                            placeholder="New category..."
                            autoFocus
                            className="flex-1 px-2.5 py-1 text-xs border border-stone-200 rounded-full focus:outline-none focus:ring-2 focus:ring-stone-400 bg-white"
                          />
                          <button onClick={handleAddCategory} disabled={!newCategoryName.trim()} className="p-1 bg-stone-900 text-white rounded-full disabled:opacity-40">
                            <Plus size={12} />
                          </button>
                          <button onClick={() => { setShowAddCategory(false); setNewCategoryName(''); }} className="p-1 text-stone-400">
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowAddCategory(true)}
                          className="px-2.5 py-1 rounded-full text-xs border border-dashed border-stone-300 text-stone-400 hover:border-stone-400 hover:text-stone-500 transition flex items-center gap-1"
                        >
                          <Plus size={10} />
                          Add
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Featured Image */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-stone-700 mb-1.5">
                      <ImageIcon size={12} />
                      Featured Image
                    </label>
                    {formValues.image ? (
                      <div className="relative group rounded-md overflow-hidden">
                        <img src={resolveImageUrl(formValues.image)} alt="" className="w-full h-24 object-cover" />
                        <button
                          onClick={() => updateFormValue('image', '')}
                          className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded opacity-0 group-hover:opacity-100 transition"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <ImageUploadField
                        value=""
                        onChange={(url) => updateFormValue('image', url)}
                        compact
                      />
                    )}
                  </div>

                  {/* Schedule Info */}
                  {formValues.status === 'scheduled' && formValues.scheduledAt && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 text-xs font-medium text-blue-700 mb-1">
                        <CalendarClock size={12} />
                        Scheduled
                      </div>
                      <p className="text-sm text-blue-600">{formatScheduledDate(formValues.scheduledAt)}</p>
                      <button
                        onClick={handleUnpublish}
                        className="mt-2 text-xs text-blue-500 hover:text-blue-700 underline"
                      >
                        Cancel schedule
                      </button>
                    </div>
                  )}

                  {/* Post Info */}
                  {editingItem && (
                    <div className="pt-3 border-t border-stone-200">
                      <div className="space-y-2 text-xs text-stone-500">
                        {editingItem.createdAt && (
                          <div className="flex justify-between">
                            <span>Created</span>
                            <span>{new Date(editingItem.createdAt).toLocaleDateString()}</span>
                          </div>
                        )}
                        {editingItem.updatedAt && (
                          <div className="flex justify-between">
                            <span>Updated</span>
                            <span>{timeAgo(editingItem.updatedAt)}</span>
                          </div>
                        )}
                        {editingItem.publishedAt && (
                          <div className="flex justify-between">
                            <span>Published</span>
                            <span>{new Date(editingItem.publishedAt).toLocaleDateString()}</span>
                          </div>
                        )}
                        {editingItem.authorName && (
                          <div className="flex justify-between">
                            <span>Author</span>
                            <span>{editingItem.authorName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── SEO Tab ── */}
              {sidebarTab === 'seo' && (
                <>
                  {/* URL Slug */}
                  <div>
                    <label className="text-xs font-medium text-stone-700 mb-1.5 block">URL Slug</label>
                    <div className="flex items-center gap-0 border border-stone-200 rounded-md overflow-hidden bg-white">
                      <span className="px-2.5 py-2 text-xs text-stone-400 bg-stone-50 border-r border-stone-200 flex-shrink-0">/oxygennotes/</span>
                      <input
                        type="text"
                        value={formValues.slug || ''}
                        onChange={(e) => updateFormValue('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                        placeholder={generateSlug(formValues.title || 'post-title')}
                        className="flex-1 px-2.5 py-2 text-sm focus:outline-none"
                      />
                    </div>
                    {editingItem?.publishedAt && (
                      <p className="text-[10px] text-amber-500 mt-1">Changing the slug of a published post will create an automatic redirect.</p>
                    )}
                  </div>

                  {/* Meta Title */}
                  <div>
                    <label className="text-xs font-medium text-stone-700 mb-1.5 block">Meta Title</label>
                    <input
                      type="text"
                      value={formValues.metaTitle || ''}
                      onChange={(e) => updateFormValue('metaTitle', e.target.value)}
                      placeholder={formValues.title || 'Page title for search engines'}
                      className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 bg-white"
                    />
                    <p className="text-[10px] text-stone-400 mt-1">
                      {(formValues.metaTitle || formValues.title || '').length}/60 characters
                    </p>
                  </div>

                  {/* Meta Description */}
                  <div>
                    <label className="text-xs font-medium text-stone-700 mb-1.5 block">Meta Description</label>
                    <textarea
                      value={formValues.metaDescription || ''}
                      onChange={(e) => updateFormValue('metaDescription', e.target.value)}
                      placeholder={formValues.excerpt || 'Brief description for search results...'}
                      rows={3}
                      className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 bg-white resize-none"
                    />
                    <p className={`text-[10px] mt-1 ${
                      metaDescLength > 160 ? 'text-amber-500' : 'text-stone-400'
                    }`}>
                      {metaDescLength}/155 characters {metaDescLength > 160 ? '(too long)' : ''}
                    </p>
                  </div>

                  {/* Canonical URL */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-stone-700 mb-1.5">
                      <LinkIcon size={12} />
                      Canonical URL
                    </label>
                    <input
                      type="url"
                      value={formValues.canonicalUrl || ''}
                      onChange={(e) => updateFormValue('canonicalUrl', e.target.value)}
                      placeholder="https://... (leave empty for default)"
                      className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 bg-white"
                    />
                    <p className="text-[10px] text-stone-400 mt-1">
                      Only set this if this post was originally published elsewhere.
                    </p>
                  </div>

                  {/* OG Image */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-stone-700 mb-1.5">
                      <ImageIcon size={12} />
                      Social Sharing Image
                    </label>
                    {formValues.ogImageUrl ? (
                      <div className="relative group rounded-md overflow-hidden">
                        <img src={formValues.ogImageUrl} alt="" className="w-full h-24 object-cover" />
                        <button
                          onClick={() => updateFormValue('ogImageUrl', '')}
                          className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded opacity-0 group-hover:opacity-100 transition"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <ImageUploadField
                        value=""
                        onChange={(url) => updateFormValue('ogImageUrl', url)}
                        compact
                      />
                    )}
                    <p className="text-[10px] text-stone-400 mt-1">
                      Defaults to cover image if not set. Recommended: 1200x630px.
                    </p>
                  </div>

                  {/* Social Preview */}
                  <div>
                    <label className="text-xs font-medium text-stone-700 mb-2 block">Social Preview</label>
                    <SocialPreviewCard
                      title={formValues.metaTitle || formValues.title || ''}
                      description={formValues.metaDescription || formValues.excerpt || ''}
                      image={formValues.ogImageUrl || formValues.image || ''}
                      url={`/oxygennotes/${formValues.slug || generateSlug(formValues.title || '')}`}
                    />
                  </div>
                </>
              )}

              {/* ── History Tab ── */}
              {sidebarTab === 'history' && (
                <>
                  {!editingItem ? (
                    <div className="text-center py-8">
                      <History size={24} className="text-stone-300 mx-auto mb-2" />
                      <p className="text-sm text-stone-400">Save the post first to start tracking history.</p>
                    </div>
                  ) : versionsLoading ? (
                    <div className="text-center py-8">
                      <Loader2 size={20} className="animate-spin text-stone-400 mx-auto" />
                    </div>
                  ) : versions.length === 0 ? (
                    <div className="text-center py-8">
                      <History size={24} className="text-stone-300 mx-auto mb-2" />
                      <p className="text-sm text-stone-400">No versions saved yet.</p>
                      <p className="text-xs text-stone-300 mt-1">Versions are created automatically when you save.</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-stone-400 font-medium mb-2">
                        {versions.length} version{versions.length !== 1 ? 's' : ''}
                      </p>
                      {versions.map((version) => (
                        <div
                          key={version.id}
                          className="group flex items-start justify-between p-2.5 rounded-md hover:bg-white border border-transparent hover:border-stone-200 transition"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-stone-700 truncate">{version.title}</p>
                            <p className="text-[10px] text-stone-400 mt-0.5">{timeAgo(version.savedAt)}</p>
                          </div>
                          <button
                            onClick={() => handleRestoreVersion(version)}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded transition opacity-0 group-hover:opacity-100 flex-shrink-0 ml-2"
                          >
                            <RotateCcw size={10} />
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Modals ──────────────────────────────── */}
      {showScheduleModal && (
        <ScheduleModal
          onSchedule={handleSchedule}
          onClose={() => setShowScheduleModal(false)}
        />
      )}

      {showPublishConfirm && (
        <ConfirmModal
          title="Publish this post?"
          message="This will make the post visible to all visitors on your website."
          confirmLabel="Yes, Publish"
          confirmColor="bg-green-600 hover:bg-green-700"
          icon={Send}
          iconColor="bg-green-100 text-green-600"
          onConfirm={handlePublish}
          onClose={() => setShowPublishConfirm(false)}
        />
      )}

      {showUnpublishConfirm && (
        <ConfirmModal
          title="Unpublish this post?"
          message="This will hide the post from visitors. It will remain as a draft and you can republish it later."
          confirmLabel="Yes, Unpublish"
          confirmColor="bg-amber-600 hover:bg-amber-700"
          icon={EyeOff}
          iconColor="bg-amber-100 text-amber-600"
          onConfirm={handleUnpublish}
          onClose={() => setShowUnpublishConfirm(false)}
        />
      )}

      {showArchiveConfirm && (
        <ConfirmModal
          title="Archive this post?"
          message="This will remove the post from the public site. You can restore it later."
          confirmLabel="Yes, Archive"
          confirmColor="bg-stone-700 hover:bg-stone-800"
          icon={Archive}
          iconColor="bg-stone-200 text-stone-600"
          onConfirm={handleArchive}
          onClose={() => setShowArchiveConfirm(false)}
        />
      )}

      {/* ─── Toast Notifications ─────────────────── */}
      {toast && <div className="fixed bottom-4 right-4 bg-stone-900 text-white px-4 py-2 rounded-md shadow-lg text-sm z-50">{toast}</div>}
      {error && <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-md shadow-lg text-sm z-50">{error}</div>}
    </div>
  );
}
