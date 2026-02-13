import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Send,
  Users,
  Trash2,
  RefreshCw,
  Mail,
  Clock,
  Monitor,
  Smartphone,
  Save,
  FileText,
  Tag,
  Filter,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit3,
  BarChart3,
  Search,
  Download,
  Upload,
  Check,
  AlertCircle,
  ArrowLeft,
  ArrowUpDown,
  Calendar,
  MousePointerClick,
  MailOpen,
  TrendingUp,
  Zap,
  Play,
  Pause,
  Copy,
  ChevronRight,
  Loader2,
  LayoutGrid,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';
import BlockBuilder, { generateEmailHtml, EmailBlock } from '../components/newsletter/BlockBuilder';

// ============================================
// TYPES
// ============================================

interface Subscriber {
  id: string;
  email: string;
  name?: string;
  source: string;
  tags: string[];
  subscribed: boolean;
  subscribedAt: string;
  emailsReceived: number;
  engagementScore?: number;
}

interface EmailDraft {
  id: string;
  subject: string;
  preheader?: string;
  body: string;
  bodyHtml?: string;
  blocks?: any[];
  audience: 'all' | 'segment';
  segmentFilters?: { sources?: string[]; tags?: string[] };
  scheduledFor?: string;
  updatedAt: string;
}

interface SentEmail {
  id: string;
  subject: string;
  preheader?: string;
  body: string;
  bodyHtml?: string;
  recipientCount: number;
  recipientEmails: string[];
  audience: 'all' | 'segment';
  segmentFilters?: { sources?: string[]; tags?: string[] };
  sentAt: string;
  openCount: number;
  clickCount: number;
}

interface CampaignAnalytics {
  totalRecipients: number;
  uniqueOpens: number;
  uniqueClicks: number;
  openRate: number;
  clickRate: number;
  linkBreakdown: { url: string; clicks: number; ctr: number }[];
  timeline: { date: string; opens: number; clicks: number }[];
}

interface Stats {
  totalSubscribers: number;
  subscribedCount?: number;
  unsubscribedCount?: number;
  newSubscribersLast30Days: number;
  totalEmailsSent: number;
  draftsCount: number;
  subscribersBySource: Record<string, number>;
}

interface GrowthData {
  date: string;
  count: number;
}

interface SubscriberEvent {
  type: 'open' | 'click';
  emailSubject: string;
  linkUrl?: string;
  createdAt: string;
}

type TabType = 'compose' | 'campaigns' | 'subscribers' | 'automations';
type CampaignSubTab = 'sent' | 'drafts' | 'scheduled';

// ============================================
// HELPER COMPONENTS
// ============================================

function StatCard({ icon: Icon, iconBg, value, label }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconBg: string;
  value: string | number;
  label: string;
}) {
  return (
    <div className="bg-white p-4 rounded-xl border border-stone-200">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${iconBg}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-2xl font-bold text-stone-900">{value}</p>
          <p className="text-xs text-stone-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="p-16 text-center">
      <Icon className="mx-auto mb-4 text-stone-300" size={48} />
      <p className="text-stone-600 font-medium">{title}</p>
      <p className="text-stone-400 text-sm mt-1">{subtitle}</p>
    </div>
  );
}

function Badge({ children, variant = 'default' }: {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'clay';
}) {
  const styles = {
    default: 'bg-stone-100 text-stone-600',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    clay: 'bg-clay/10 text-clay',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  );
}

function EngagementBadge({ score }: { score: number }) {
  if (score >= 75) return <Badge variant="success">{score}</Badge>;
  if (score >= 50) return <Badge variant="default">{score}</Badge>;
  if (score >= 25) return <Badge variant="warning">{score}</Badge>;
  return <Badge variant="danger">{score}</Badge>;
}

function Pagination({ page, totalPages, onPageChange }: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 text-sm border border-stone-300 rounded-lg hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Previous
      </button>
      <span className="text-sm text-stone-500">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 text-sm border border-stone-300 rounded-lg hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
}

// ============================================
// SUBSCRIBER DETAIL DRAWER
// ============================================

function SubscriberDrawer({ subscriber, availableTags, onClose, onUpdateTags, onDelete, accessToken }: {
  subscriber: Subscriber;
  availableTags: string[];
  onClose: () => void;
  onUpdateTags: (id: string, tags: string[]) => void;
  onDelete: (id: string) => void;
  accessToken: string | null;
}) {
  const [tags, setTags] = useState(subscriber.tags);
  const [events, setEvents] = useState<SubscriberEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    setTags(subscriber.tags);
    fetchEvents();
  }, [subscriber.id]);

  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch(`${API_BASE}/newsletter/subscribers/${subscriber.id}/events`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) setEvents(await res.json());
    } catch {
      // Events not available yet
    } finally {
      setLoadingEvents(false);
    }
  };

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const saveTags = () => {
    onUpdateTags(subscriber.id, tags);
  };

  const score = subscriber.engagementScore ?? 0;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl z-50 flex flex-col border-l border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-200">
          <h3 className="text-lg font-medium text-stone-900">Subscriber Details</h3>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Profile */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-clay/10 flex items-center justify-center">
                <Mail className="text-clay" size={20} />
              </div>
              <div>
                <p className="font-medium text-stone-900">{subscriber.email}</p>
                {subscriber.name && <p className="text-sm text-stone-500">{subscriber.name}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-stone-50 p-3 rounded-lg">
                <p className="text-stone-500 text-xs mb-0.5">Source</p>
                <p className="font-medium text-stone-800">{subscriber.source}</p>
              </div>
              <div className="bg-stone-50 p-3 rounded-lg">
                <p className="text-stone-500 text-xs mb-0.5">Subscribed</p>
                <p className="font-medium text-stone-800">
                  {new Date(subscriber.subscribedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="bg-stone-50 p-3 rounded-lg">
                <p className="text-stone-500 text-xs mb-0.5">Emails Received</p>
                <p className="font-medium text-stone-800">{subscriber.emailsReceived}</p>
              </div>
              <div className="bg-stone-50 p-3 rounded-lg">
                <p className="text-stone-500 text-xs mb-0.5">Engagement</p>
                <div className="flex items-center gap-2">
                  <EngagementBadge score={score} />
                  <span className="font-medium text-stone-800">/ 100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <h4 className="text-sm font-medium text-stone-700 mb-2">Tags</h4>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs transition ${
                    tags.includes(tag) ? 'bg-clay text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            {JSON.stringify(tags) !== JSON.stringify(subscriber.tags) && (
              <button
                onClick={saveTags}
                className="px-3 py-1.5 text-xs bg-clay text-white rounded-lg hover:bg-clay/90"
              >
                Save Tags
              </button>
            )}
          </div>

          {/* Activity Timeline */}
          <div>
            <h4 className="text-sm font-medium text-stone-700 mb-3">Activity</h4>
            {loadingEvents ? (
              <div className="flex justify-center py-4">
                <Loader2 size={20} className="animate-spin text-stone-400" />
              </div>
            ) : events.length === 0 ? (
              <p className="text-sm text-stone-400 py-4 text-center">No activity recorded yet</p>
            ) : (
              <div className="space-y-3">
                {events.slice(0, 20).map((event, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-full mt-0.5 ${
                      event.type === 'open' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                    }`}>
                      {event.type === 'open' ? <MailOpen size={12} /> : <MousePointerClick size={12} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-800">
                        {event.type === 'open' ? 'Opened' : 'Clicked'}{' '}
                        <span className="font-medium">{event.emailSubject}</span>
                      </p>
                      {event.linkUrl && (
                        <p className="text-xs text-stone-400 truncate">{event.linkUrl}</p>
                      )}
                      <p className="text-xs text-stone-400 mt-0.5">
                        {new Date(event.createdAt).toLocaleDateString('en-AU', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200">
          <button
            onClick={() => {
              if (confirm(`Delete subscriber ${subscriber.email}?`)) {
                onDelete(subscriber.id);
                onClose();
              }
            }}
            className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            Remove Subscriber
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================
// IMPORT MODAL
// ============================================

function ImportModal({ onClose, onImport, availableTags, accessToken }: {
  onClose: () => void;
  onImport: () => void;
  availableTags: string[];
  accessToken: string | null;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ email: string; name?: string }[]>([]);
  const [importTags, setImportTags] = useState<string[]>([]);
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'update'>('skip');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ added: number; skipped: number; updated: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(Boolean);
      if (lines.length < 2) return;

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      const emailIdx = headers.findIndex(h => h === 'email' || h.includes('email'));
      const nameIdx = headers.findIndex(h => h === 'name' || h.includes('name'));

      if (emailIdx === -1) {
        alert('CSV must have an "email" column');
        setFile(null);
        return;
      }

      const rows = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));
        return {
          email: cols[emailIdx] || '',
          name: nameIdx >= 0 ? cols[nameIdx] : undefined,
        };
      }).filter(r => r.email && r.email.includes('@'));

      setPreview(rows);
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch(`${API_BASE}/newsletter/subscribers/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          subscribers: preview.map(s => ({ ...s, tags: importTags })),
          duplicateAction,
        }),
      });
      if (res.ok) {
        setResult(await res.json());
        onImport();
      }
    } catch {
      alert('Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <h3 className="text-lg font-medium text-stone-800">Import Subscribers</h3>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          {result ? (
            <div className="text-center py-6">
              <Check className="mx-auto mb-3 text-emerald-500" size={48} />
              <h4 className="text-lg font-medium text-stone-800 mb-2">Import Complete</h4>
              <div className="flex justify-center gap-6 text-sm">
                <div><span className="font-bold text-emerald-600">{result.added}</span> added</div>
                <div><span className="font-bold text-stone-600">{result.skipped}</span> skipped</div>
                <div><span className="font-bold text-blue-600">{result.updated}</span> updated</div>
              </div>
              <button onClick={onClose} className="mt-4 px-6 py-2 bg-clay text-white rounded-lg">Done</button>
            </div>
          ) : (
            <>
              {/* File Upload */}
              {!file ? (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-stone-300 rounded-lg p-8 text-center cursor-pointer hover:border-clay transition"
                >
                  <Upload className="mx-auto mb-2 text-stone-400" size={32} />
                  <p className="text-stone-600">Click to upload a CSV file</p>
                  <p className="text-xs text-stone-400 mt-1">Must contain an "email" column</p>
                  <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} className="sr-only" />
                </div>
              ) : (
                <div className="bg-stone-50 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-800">{file.name}</p>
                    <p className="text-xs text-stone-500">{preview.length} valid email{preview.length !== 1 ? 's' : ''} found</p>
                  </div>
                  <button onClick={() => { setFile(null); setPreview([]); }} className="text-stone-400 hover:text-stone-600">
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Preview */}
              {preview.length > 0 && (
                <>
                  <div className="max-h-32 overflow-y-auto border border-stone-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-stone-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-stone-500">Email</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-stone-500">Name</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {preview.slice(0, 10).map((row, i) => (
                          <tr key={i}>
                            <td className="px-3 py-1.5 text-stone-800">{row.email}</td>
                            <td className="px-3 py-1.5 text-stone-500">{row.name || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {preview.length > 10 && (
                      <p className="text-xs text-stone-400 text-center py-2">+{preview.length - 10} more</p>
                    )}
                  </div>

                  {/* Duplicate handling */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Duplicate emails</label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="radio" checked={duplicateAction === 'skip'} onChange={() => setDuplicateAction('skip')} className="text-clay" />
                        Skip existing
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="radio" checked={duplicateAction === 'update'} onChange={() => setDuplicateAction('update')} className="text-clay" />
                        Update existing
                      </label>
                    </div>
                  </div>

                  {/* Tag assignment */}
                  {availableTags.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Assign tags</label>
                      <div className="flex flex-wrap gap-1.5">
                        {availableTags.map(tag => (
                          <button
                            key={tag}
                            onClick={() => setImportTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                            className={`px-3 py-1 rounded-full text-xs transition ${
                              importTags.includes(tag) ? 'bg-clay text-white' : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {!result && preview.length > 0 && (
          <div className="flex justify-end gap-3 p-4 border-t border-stone-200 bg-stone-50">
            <button onClick={onClose} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg">Cancel</button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-4 py-2 bg-clay text-white rounded-lg hover:bg-clay/90 disabled:opacity-50"
            >
              {importing ? 'Importing...' : `Import ${preview.length} subscriber${preview.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// CAMPAIGN DETAIL VIEW
// ============================================

function CampaignDetail({ email, onBack, accessToken }: {
  email: SentEmail;
  onBack: () => void;
  accessToken: string | null;
}) {
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [email.id]);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/newsletter/sent/${email.id}/analytics`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        setAnalytics(await res.json());
      }
    } catch {
      // Analytics not available
    } finally {
      setLoading(false);
    }
  };

  const openRate = analytics?.openRate ?? (email.recipientCount > 0 ? (email.openCount / email.recipientCount) * 100 : 0);
  const clickRate = analytics?.clickRate ?? (email.recipientCount > 0 ? (email.clickCount / email.recipientCount) * 100 : 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-stone-600 hover:text-stone-900 transition">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-serif text-stone-900">{email.subject}</h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Sent {new Date(email.sentAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Users} iconBg="bg-stone-100 text-stone-600" value={email.recipientCount} label="Recipients" />
        <StatCard icon={MailOpen} iconBg="bg-blue-50 text-blue-600" value={`${openRate.toFixed(1)}%`} label="Open Rate" />
        <StatCard icon={MousePointerClick} iconBg="bg-green-50 text-green-600" value={`${clickRate.toFixed(1)}%`} label="Click Rate" />
        <StatCard
          icon={TrendingUp}
          iconBg="bg-clay/10 text-clay"
          value={openRate > 0 ? `${((clickRate / openRate) * 100).toFixed(1)}%` : '0%'}
          label="Click-to-Open"
        />
      </div>

      {/* Timeline Chart */}
      {analytics?.timeline && analytics.timeline.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h3 className="text-sm font-medium text-stone-700 mb-4">Opens &amp; Clicks Over Time</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={analytics.timeline}>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#a8a29e" />
              <YAxis tick={{ fontSize: 12 }} stroke="#a8a29e" />
              <Tooltip
                contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e7e5e4', fontSize: '0.875rem' }}
              />
              <Line type="monotone" dataKey="opens" stroke="#3b82f6" strokeWidth={2} dot={false} name="Opens" />
              <Line type="monotone" dataKey="clicks" stroke="#22c55e" strokeWidth={2} dot={false} name="Clicks" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-Link Breakdown */}
      {analytics?.linkBreakdown && analytics.linkBreakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-200">
            <h3 className="text-sm font-medium text-stone-700">Link Performance</h3>
          </div>
          <table className="w-full">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-stone-500 uppercase">URL</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-stone-500 uppercase">Clicks</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-stone-500 uppercase">CTR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {analytics.linkBreakdown.map((link, i) => (
                <tr key={i} className="hover:bg-stone-50">
                  <td className="px-5 py-3 text-sm text-stone-800 truncate max-w-md">{link.url}</td>
                  <td className="px-5 py-3 text-sm text-stone-600 text-right">{link.clicks}</td>
                  <td className="px-5 py-3 text-sm text-stone-600 text-right">{link.ctr.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Email Content Preview */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200">
          <h3 className="text-sm font-medium text-stone-700">Email Content</h3>
        </div>
        <div className="p-5">
          <div
            className="max-w-[600px] mx-auto prose prose-stone prose-sm"
            dangerouslySetInnerHTML={{ __html: email.bodyHtml || email.body }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN NEWSLETTER MANAGER
// ============================================

export default function NewsletterManager() {
  const { accessToken } = useAuth();

  // Navigation
  const [activeTab, setActiveTab] = useState<TabType>('compose');
  const [campaignSubTab, setCampaignSubTab] = useState<CampaignSubTab>('sent');
  const [selectedCampaign, setSelectedCampaign] = useState<SentEmail | null>(null);

  // Stats
  const [stats, setStats] = useState<Stats | null>(null);
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);

  // Compose state
  const [composeBlocks, setComposeBlocks] = useState<EmailBlock[]>([]);
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [audience, setAudience] = useState<'all' | 'segment'>('all');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [recipientCount, setRecipientCount] = useState(0);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [scheduledFor, setScheduledFor] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Data lists
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Subscriber management
  const [subSearch, setSubSearch] = useState('');
  const [subFilterTags, setSubFilterTags] = useState<string[]>([]);
  const [subFilterSource, setSubFilterSource] = useState('');
  const [subFilterStatus, setSubFilterStatus] = useState<'all' | 'subscribed' | 'unsubscribed'>('all');
  const [subSort, setSubSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'subscribedAt', dir: 'desc' });
  const [subPage, setSubPage] = useState(1);
  const [selectedSubs, setSelectedSubs] = useState<Set<string>>(new Set());
  const [showSubFilters, setShowSubFilters] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [drawerSubscriber, setDrawerSubscriber] = useState<Subscriber | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);

  // Automations state
  const [automations, setAutomations] = useState<any[]>([]);
  const [automationQueueStats, setAutomationQueueStats] = useState<{ scheduled: number; sent: number; failed: number; cancelled: number }>({ scheduled: 0, sent: 0, failed: 0, cancelled: 0 });
  const [automationView, setAutomationView] = useState<'list' | 'builder'>('list');
  const [editingAutomation, setEditingAutomation] = useState<any>(null);
  const [autoName, setAutoName] = useState('');
  const [autoDescription, setAutoDescription] = useState('');
  const [autoTrigger, setAutoTrigger] = useState<string>('newsletter_signup');
  const [autoSteps, setAutoSteps] = useState<{ id: string; order: number; delayDays: number; delayHours: number; subject: string; body: string }[]>([]);
  const [autoSaving, setAutoSaving] = useState(false);

  // Loading
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const SUBS_PER_PAGE = 25;

  // ============================================
  // DATA FETCHING
  // ============================================

  useEffect(() => {
    Promise.all([fetchStats(), fetchGrowth(), fetchDrafts(), fetchSentEmails(), fetchSubscribers(), fetchTags(), fetchAutomations(), fetchAutomationQueueStats()])
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { updateRecipientPreview(); }, [audience, selectedSources, selectedTags]);

  // Cmd+S to save draft
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (activeTab === 'compose') handleSaveDraft();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTab, subject, preheader, composeBlocks, audience, selectedSources, selectedTags, scheduledFor, currentDraftId, accessToken]);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [subject, preheader, composeBlocks, audience, selectedSources, selectedTags, scheduledFor]);

  // Track unsaved changes
  useEffect(() => {
    if (activeTab === 'compose') setHasUnsavedChanges(true);
  }, [subject, preheader, composeBlocks]);

  // Cmd+S to save draft
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (activeTab === 'compose' && subject.trim() && !saving) {
          handleSaveDraft();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTab, subject, saving]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/newsletter/stats`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) setStats(await res.json());
    } catch { /* ignore */ }
  };

  const fetchGrowth = async () => {
    try {
      const res = await fetch(`${API_BASE}/newsletter/stats/growth`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) setGrowthData(await res.json());
    } catch { /* ignore */ }
  };

  const fetchDrafts = async () => {
    try {
      const res = await fetch(`${API_BASE}/newsletter/drafts`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) setDrafts(await res.json());
    } catch { /* ignore */ }
  };

  const fetchSentEmails = async () => {
    try {
      const res = await fetch(`${API_BASE}/newsletter/sent`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) setSentEmails(await res.json());
    } catch { /* ignore */ }
  };

  const fetchSubscribers = async () => {
    setLoadingSubscribers(true);
    try {
      const res = await fetch(`${API_BASE}/newsletter/subscribers`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) {
        const data = await res.json();
        setSubscribers(data);
        const sources = [...new Set(data.map((s: Subscriber) => s.source))] as string[];
        setAvailableSources(sources);
      }
    } catch { /* ignore */ }
    finally { setLoadingSubscribers(false); }
  };

  const fetchTags = async () => {
    try {
      const res = await fetch(`${API_BASE}/newsletter/tags`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) setAvailableTags(await res.json());
    } catch { /* ignore */ }
  };

  const fetchAutomations = async () => {
    try {
      const res = await fetch(`${API_BASE}/automations`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) setAutomations(await res.json());
    } catch {}
  };

  const fetchAutomationQueueStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/automations/queue/stats`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) setAutomationQueueStats(await res.json());
    } catch {}
  };

  const updateRecipientPreview = async () => {
    try {
      const res = await fetch(`${API_BASE}/newsletter/preview-recipients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          audience,
          segmentFilters: audience === 'segment' ? { sources: selectedSources, tags: selectedTags } : undefined,
        }),
      });
      if (res.ok) { const data = await res.json(); setRecipientCount(data.count); }
    } catch { /* ignore */ }
  };

  // ============================================
  // COMPOSE ACTIONS
  // ============================================

  const handleSaveDraft = async () => {
    if (!subject.trim()) return;
    setSaving(true);
    try {
      const url = currentDraftId ? `${API_BASE}/newsletter/drafts/${currentDraftId}` : `${API_BASE}/newsletter/drafts`;
      const res = await fetch(url, {
        method: currentDraftId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          subject, preheader, body: JSON.stringify(composeBlocks),
          bodyHtml: composeBlocks.length > 0 ? generateEmailHtml(composeBlocks) : '',
          audience,
          segmentFilters: audience === 'segment' ? { sources: selectedSources, tags: selectedTags } : undefined,
          scheduledFor: scheduledFor || undefined,
        }),
      });
      if (res.ok) {
        const draft = await res.json();
        setCurrentDraftId(draft.id);
        setLastSavedAt(new Date());
        setHasUnsavedChanges(false);
        showToast('Draft saved');
        fetchDrafts();
      }
    } catch { showToast('Could not save draft'); }
    finally { setSaving(false); }
  };

  const handleSend = async () => {
    if (!subject.trim()) { showToast('Please add a subject line'); return; }
    if (recipientCount === 0) { showToast('No subscribers match your audience'); return; }
    if (!confirm(`Send this email to ${recipientCount} subscriber(s)?`)) return;

    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/newsletter/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          subject, preheader, body: JSON.stringify(composeBlocks),
          bodyHtml: composeBlocks.length > 0 ? generateEmailHtml(composeBlocks) : '',
          audience,
          segmentFilters: audience === 'segment' ? { sources: selectedSources, tags: selectedTags } : undefined,
          draftId: currentDraftId,
        }),
      });
      if (res.ok) {
        showToast(`Email sent to ${recipientCount} subscriber(s)!`);
        handleNewEmail();
        fetchStats(); fetchSentEmails(); fetchDrafts();
      }
    } catch { showToast('Could not send email'); }
    finally { setSending(false); }
  };

  const handleSendTest = async () => {
    if (!subject.trim()) { showToast('Please add a subject line'); return; }
    if (composeBlocks.length === 0) { showToast('Please add some content'); return; }
    const testEmail = prompt('Send test email to:');
    if (!testEmail) return;

    setSendingTest(true);
    try {
      const res = await fetch(`${API_BASE}/newsletter/send-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          email: testEmail,
          subject,
          bodyHtml: generateEmailHtml(composeBlocks),
        }),
      });
      if (res.ok) showToast(`Test email sent to ${testEmail}`);
      else showToast('Failed to send test email');
    } catch { showToast('Could not send test email'); }
    finally { setSendingTest(false); }
  };

  const handleNewEmail = () => {
    setSubject(''); setPreheader(''); setComposeBlocks([]);
    setAudience('all'); setSelectedSources([]); setSelectedTags([]);
    setCurrentDraftId(null); setScheduledFor('');
  };

  const handleLoadDraft = (draft: EmailDraft) => {
    setSubject(draft.subject);
    setPreheader(draft.preheader || '');
    try { setComposeBlocks(JSON.parse(draft.body)); } catch { setComposeBlocks([]); }
    setAudience(draft.audience);
    setSelectedSources(draft.segmentFilters?.sources || []);
    setSelectedTags(draft.segmentFilters?.tags || []);
    setCurrentDraftId(draft.id);
    setScheduledFor(draft.scheduledFor || '');
    setActiveTab('compose');
  };

  const handleDeleteDraft = async (id: string) => {
    if (!confirm('Delete this draft?')) return;
    try {
      await fetch(`${API_BASE}/newsletter/drafts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
      showToast('Draft deleted');
      fetchDrafts();
      if (currentDraftId === id) handleNewEmail();
    } catch { showToast('Could not delete draft'); }
  };

  const handleDuplicateSent = (email: SentEmail) => {
    setSubject(email.subject);
    setPreheader(email.preheader || '');
    try { setComposeBlocks(JSON.parse(email.body)); } catch { setComposeBlocks([]); }
    setAudience(email.audience);
    setSelectedSources(email.segmentFilters?.sources || []);
    setSelectedTags(email.segmentFilters?.tags || []);
    setCurrentDraftId(null);
    setActiveTab('compose');
    showToast('Email duplicated to compose');
  };

  // ============================================
  // SUBSCRIBER ACTIONS
  // ============================================

  const handleUpdateSubscriber = async (id: string, tags: string[]) => {
    try {
      await fetch(`${API_BASE}/newsletter/subscribers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ tags }),
      });
      showToast('Tags updated');
      fetchSubscribers();
    } catch { showToast('Could not update tags'); }
  };

  const handleDeleteSubscriber = async (id: string) => {
    try {
      await fetch(`${API_BASE}/newsletter/subscribers/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` },
      });
      showToast('Subscriber removed');
      setSelectedSubs(prev => { const next = new Set(prev); next.delete(id); return next; });
      fetchSubscribers(); fetchStats();
    } catch { showToast('Could not remove subscriber'); }
  };

  const handleBulkTag = async (tag: string) => {
    const ids = Array.from(selectedSubs);
    for (const id of ids) {
      const sub = subscribers.find(s => s.id === id);
      if (sub && !sub.tags.includes(tag)) {
        await handleUpdateSubscriber(id, [...sub.tags, tag]);
      }
    }
    setSelectedSubs(new Set());
    fetchSubscribers();
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedSubs.size} subscriber(s)?`)) return;
    for (const id of selectedSubs) {
      await handleDeleteSubscriber(id);
    }
    setSelectedSubs(new Set());
  };

  const handleExportCsv = () => {
    const filtered = filteredSubscribers;
    const headers = ['email', 'name', 'source', 'tags', 'subscribed', 'subscribedAt', 'emailsReceived'];
    const rows = filtered.map(s => [
      s.email, s.name || '', s.source, s.tags.join('; '),
      s.subscribed ? 'Yes' : 'No', s.subscribedAt, s.emailsReceived,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleCreateTag = async () => {
    if (!newTag.trim()) return;
    try {
      await fetch(`${API_BASE}/newsletter/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ name: newTag.trim() }),
      });
      showToast(`Tag '${newTag.trim()}' created`);
      fetchTags(); setNewTag('');
    } catch { showToast('Could not create tag'); }
  };

  const handleDeleteTag = async (tag: string) => {
    if (!confirm(`Delete tag '${tag}'?`)) return;
    try {
      await fetch(`${API_BASE}/newsletter/tags/${encodeURIComponent(tag)}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` },
      });
      showToast(`Tag '${tag}' deleted`);
      fetchTags(); fetchSubscribers();
    } catch { showToast('Could not delete tag'); }
  };

  // ============================================
  // AUTOMATION ACTIONS
  // ============================================

  const handleCreateAutomation = () => {
    setEditingAutomation(null);
    setAutoName('');
    setAutoDescription('');
    setAutoTrigger('newsletter_signup');
    setAutoSteps([{ id: crypto.randomUUID(), order: 0, delayDays: 0, delayHours: 1, subject: '', body: '' }]);
    setAutomationView('builder');
  };

  const handleEditAutomation = (automation: any) => {
    setEditingAutomation(automation);
    setAutoName(automation.name);
    setAutoDescription(automation.description || '');
    setAutoTrigger(automation.trigger);
    setAutoSteps(automation.steps || []);
    setAutomationView('builder');
  };

  const handleSaveAutomation = async () => {
    if (!autoName.trim()) { showToast('Please add a name'); return; }
    setAutoSaving(true);
    try {
      const payload = { name: autoName, description: autoDescription, trigger: autoTrigger, steps: autoSteps };
      const url = editingAutomation ? `${API_BASE}/automations/${editingAutomation.id}` : `${API_BASE}/automations`;
      const res = await fetch(url, {
        method: editingAutomation ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showToast(editingAutomation ? 'Automation updated' : 'Automation created');
        setAutomationView('list');
        fetchAutomations();
      }
    } catch { showToast('Could not save automation'); }
    finally { setAutoSaving(false); }
  };

  const handleToggleAutomationStatus = async (automation: any) => {
    const newStatus = automation.status === 'active' ? 'paused' : 'active';
    try {
      const res = await fetch(`${API_BASE}/automations/${automation.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) { fetchAutomations(); showToast(`Automation ${newStatus}`); }
    } catch {}
  };

  const handleDeleteAutomation = async (id: string) => {
    if (!confirm('Delete this automation and all queued emails?')) return;
    try {
      await fetch(`${API_BASE}/automations/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
      showToast('Automation deleted');
      fetchAutomations();
    } catch {}
  };

  const handleAddStep = () => {
    setAutoSteps(prev => [...prev, { id: crypto.randomUUID(), order: prev.length, delayDays: 1, delayHours: 0, subject: '', body: '' }]);
  };

  const handleRemoveStep = (stepId: string) => {
    setAutoSteps(prev => prev.filter(s => s.id !== stepId).map((s, i) => ({ ...s, order: i })));
  };

  const handleUpdateStep = (stepId: string, field: string, value: any) => {
    setAutoSteps(prev => prev.map(s => s.id === stepId ? { ...s, [field]: value } : s));
  };

  // ============================================
  // FILTERED & SORTED SUBSCRIBERS
  // ============================================

  const filteredSubscribers = useMemo(() => {
    let result = [...subscribers];

    // Search
    if (subSearch) {
      const q = subSearch.toLowerCase();
      result = result.filter(s => s.email.toLowerCase().includes(q) || (s.name?.toLowerCase().includes(q)));
    }

    // Filters
    if (subFilterTags.length > 0) {
      result = result.filter(s => subFilterTags.some(t => s.tags.includes(t)));
    }
    if (subFilterSource) {
      result = result.filter(s => s.source === subFilterSource);
    }
    if (subFilterStatus === 'subscribed') {
      result = result.filter(s => s.subscribed !== false);
    } else if (subFilterStatus === 'unsubscribed') {
      result = result.filter(s => s.subscribed === false);
    }

    // Sort
    result.sort((a, b) => {
      const key = subSort.key as keyof Subscriber;
      const aVal = a[key] ?? '';
      const bVal = b[key] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return subSort.dir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [subscribers, subSearch, subFilterTags, subFilterSource, subFilterStatus, subSort]);

  const paginatedSubscribers = useMemo(() => {
    const start = (subPage - 1) * SUBS_PER_PAGE;
    return filteredSubscribers.slice(start, start + SUBS_PER_PAGE);
  }, [filteredSubscribers, subPage]);

  const totalSubPages = Math.ceil(filteredSubscribers.length / SUBS_PER_PAGE);

  const toggleSubSort = (key: string) => {
    setSubSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' });
  };

  const toggleSelectAll = () => {
    if (selectedSubs.size === paginatedSubscribers.length) {
      setSelectedSubs(new Set());
    } else {
      setSelectedSubs(new Set(paginatedSubscribers.map(s => s.id)));
    }
  };

  // ============================================
  // DERIVED DATA
  // ============================================

  const scheduledDrafts = drafts.filter(d => d.scheduledFor);
  const regularDrafts = drafts.filter(d => !d.scheduledFor);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatDateTime = (d: string) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-clay" size={32} />
      </div>
    );
  }

  // Campaign detail view
  if (selectedCampaign) {
    return <CampaignDetail email={selectedCampaign} onBack={() => setSelectedCampaign(null)} accessToken={accessToken} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-stone-900">Newsletter</h1>
          <p className="text-stone-500 text-sm mt-1">Compose emails, track campaigns, and manage subscribers.</p>
        </div>
        <button
          onClick={() => { fetchStats(); fetchGrowth(); fetchSubscribers(); fetchDrafts(); fetchSentEmails(); fetchAutomations(); fetchAutomationQueueStats(); }}
          className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:text-stone-900 border border-stone-300 rounded-lg hover:bg-stone-50 transition"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Stats + Growth Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} iconBg="bg-clay/10 text-clay" value={stats?.totalSubscribers ?? 0} label="Subscribers" />
          <StatCard icon={Plus} iconBg="bg-emerald-50 text-emerald-600" value={`+${stats?.newSubscribersLast30Days ?? 0}`} label="Last 30 Days" />
          <StatCard icon={Send} iconBg="bg-stone-100 text-stone-600" value={stats?.totalEmailsSent ?? 0} label="Emails Sent" />
          <StatCard icon={FileText} iconBg="bg-stone-100 text-stone-600" value={stats?.draftsCount ?? 0} label="Drafts" />
        </div>

        {growthData.length > 0 && (
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <p className="text-xs font-medium text-stone-500 mb-2">Subscriber Growth (90 days)</p>
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8d3038" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#8d3038" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="count" stroke="#8d3038" fill="url(#growthGrad)" strokeWidth={2} />
                <Tooltip
                  contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e7e5e4', fontSize: '0.75rem' }}
                  labelFormatter={(l) => formatDate(l as string)}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-stone-200">
        <nav className="flex gap-6">
          {([
            { id: 'compose' as const, label: 'Compose', icon: Edit3 },
            { id: 'campaigns' as const, label: 'Campaigns', icon: BarChart3 },
            { id: 'subscribers' as const, label: `Subscribers (${subscribers.length})`, icon: Users },
            { id: 'automations' as const, label: 'Automations', icon: Zap },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 border-b-2 transition text-sm ${
                activeTab === tab.id
                  ? 'border-clay text-clay font-medium'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ============================================ */}
      {/* COMPOSE TAB */}
      {/* ============================================ */}
      {activeTab === 'compose' && (
        <div className="space-y-4">
          {/* Top bar: Subject, preheader, audience */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Your email subject..."
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-clay/30 focus:border-clay outline-none"
                />
                <p className={`text-xs mt-1 ${subject.length > 60 ? 'text-amber-600' : 'text-stone-400'}`}>
                  {subject.length}/60 characters
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Preheader <span className="text-stone-400 font-normal">(preview text)</span></label>
                <input
                  type="text"
                  value={preheader}
                  onChange={(e) => setPreheader(e.target.value)}
                  placeholder="Brief preview in inbox..."
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-clay/30 focus:border-clay outline-none"
                />
              </div>
            </div>

            {/* Audience + Schedule */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-stone-700">Audience:</label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="radio" checked={audience === 'all'} onChange={() => setAudience('all')} className="text-clay" />
                  All Subscribers
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="radio" checked={audience === 'segment'} onChange={() => setAudience('segment')} className="text-clay" />
                  Segment
                </label>
                <span className="text-sm text-stone-600">
                  <Users size={14} className="inline mr-1" />
                  <span className="font-medium">{recipientCount}</span> recipient{recipientCount !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-stone-600 flex items-center gap-1.5">
                  <Clock size={14} />
                  Schedule:
                </label>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-clay/30 focus:border-clay outline-none"
                />
                {scheduledFor && (
                  <button onClick={() => setScheduledFor('')} className="text-stone-400 hover:text-stone-600">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Segment filters */}
            {audience === 'segment' && (
              <div className="bg-stone-50 p-4 rounded-lg grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">Filter by Source</label>
                  <div className="flex flex-wrap gap-1.5">
                    {availableSources.map(src => (
                      <button
                        key={src}
                        onClick={() => setSelectedSources(prev => prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src])}
                        className={`px-3 py-1 rounded-full text-xs transition ${
                          selectedSources.includes(src) ? 'bg-clay text-white' : 'bg-white border border-stone-300 text-stone-600'
                        }`}
                      >
                        {src}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">Filter by Tag</label>
                  <div className="flex flex-wrap gap-1.5">
                    {availableTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                        className={`px-3 py-1 rounded-full text-xs transition ${
                          selectedTags.includes(tag) ? 'bg-clay text-white' : 'bg-white border border-stone-300 text-stone-600'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Block Builder */}
          <BlockBuilder blocks={composeBlocks} onChange={setComposeBlocks} onGenerateHtml={() => generateEmailHtml(composeBlocks)} apiBase={API_BASE} accessToken={accessToken || ''} />

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={handleSaveDraft} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50 transition disabled:opacity-50">
                <Save size={16} />
                {saving ? 'Saving...' : currentDraftId ? 'Update Draft' : 'Save Draft'}
              </button>
              {lastSavedAt && !hasUnsavedChanges && (
                <span className="text-xs text-stone-400">
                  Saved {Math.round((Date.now() - lastSavedAt.getTime()) / 60000)}m ago
                </span>
              )}
              {hasUnsavedChanges && subject.trim() && (
                <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>
              )}
              <button onClick={handleNewEmail} className="px-4 py-2 text-stone-500 hover:text-stone-700 transition text-sm">
                New Email
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSendTest}
                disabled={sendingTest || composeBlocks.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50 transition disabled:opacity-50"
              >
                <Eye size={16} />
                {sendingTest ? 'Sending...' : 'Send Test'}
              </button>
              <button
                onClick={handleSend}
                disabled={sending || recipientCount === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-clay text-white rounded-lg hover:bg-clay/90 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {scheduledFor ? <Clock size={16} /> : <Send size={16} />}
                {sending ? 'Sending...' : scheduledFor ? 'Schedule' : `Send to ${recipientCount}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* CAMPAIGNS TAB */}
      {/* ============================================ */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {/* Sub-tabs */}
          <div className="flex gap-2">
            {([
              { id: 'sent' as const, label: 'Sent', count: sentEmails.length },
              { id: 'scheduled' as const, label: 'Scheduled', count: scheduledDrafts.length },
              { id: 'drafts' as const, label: 'Drafts', count: regularDrafts.length },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setCampaignSubTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm transition ${
                  campaignSubTab === tab.id ? 'bg-clay text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Sent campaigns */}
          {campaignSubTab === 'sent' && (
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {sentEmails.length === 0 ? (
                <EmptyState icon={Send} title="No campaigns sent yet" subtitle="Sent campaigns will appear here with performance stats" />
              ) : (
                <div className="divide-y divide-stone-100">
                  {sentEmails.map(email => {
                    const openRate = email.recipientCount > 0 ? ((email.openCount / email.recipientCount) * 100) : 0;
                    const clickRate = email.recipientCount > 0 ? ((email.clickCount / email.recipientCount) * 100) : 0;
                    return (
                      <div
                        key={email.id}
                        className="p-4 hover:bg-stone-50 cursor-pointer flex items-center justify-between"
                        onClick={() => setSelectedCampaign(email)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-stone-900 truncate">{email.subject}</p>
                          <p className="text-sm text-stone-500 mt-0.5">
                            {formatDateTime(email.sentAt)} &middot; {email.recipientCount} recipient{email.recipientCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-6 ml-4">
                          <div className="text-center">
                            <p className="text-sm font-bold text-blue-600">{openRate.toFixed(1)}%</p>
                            <p className="text-xs text-stone-400">Opens</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-green-600">{clickRate.toFixed(1)}%</p>
                            <p className="text-xs text-stone-400">Clicks</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDuplicateSent(email); }}
                            className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg"
                            title="Duplicate as new draft"
                          >
                            <Copy size={16} />
                          </button>
                          <ChevronRight size={16} className="text-stone-300" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Scheduled */}
          {campaignSubTab === 'scheduled' && (
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {scheduledDrafts.length === 0 ? (
                <EmptyState icon={Clock} title="No scheduled emails" subtitle="Schedule an email from the Compose tab" />
              ) : (
                <div className="divide-y divide-stone-100">
                  {scheduledDrafts.map(draft => (
                    <div key={draft.id} className="p-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-stone-900 truncate">{draft.subject || '(No subject)'}</p>
                        <p className="text-sm text-stone-500 mt-0.5 flex items-center gap-1.5">
                          <Clock size={12} />
                          Scheduled for {formatDateTime(draft.scheduledFor!)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button onClick={() => handleLoadDraft(draft)} className="px-3 py-1.5 text-sm text-clay border border-clay rounded-lg hover:bg-clay hover:text-white transition">
                          Edit
                        </button>
                        <button onClick={() => handleDeleteDraft(draft.id)} className="p-1.5 text-stone-400 hover:text-red-600 transition">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Drafts */}
          {campaignSubTab === 'drafts' && (
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {regularDrafts.length === 0 ? (
                <EmptyState icon={FileText} title="No drafts" subtitle="Save a draft from the Compose tab" />
              ) : (
                <div className="divide-y divide-stone-100">
                  {regularDrafts.map(draft => (
                    <div key={draft.id} className="p-4 flex items-center justify-between hover:bg-stone-50">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-stone-900 truncate">{draft.subject || '(No subject)'}</p>
                        <p className="text-sm text-stone-500 mt-0.5">Edited {formatDateTime(draft.updatedAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button onClick={() => handleLoadDraft(draft)} className="px-3 py-1.5 text-sm text-clay border border-clay rounded-lg hover:bg-clay hover:text-white transition">
                          Edit
                        </button>
                        <button onClick={() => handleDeleteDraft(draft.id)} className="p-1.5 text-stone-400 hover:text-red-600 transition">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* SUBSCRIBERS TAB */}
      {/* ============================================ */}
      {activeTab === 'subscribers' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={subSearch}
                  onChange={(e) => { setSubSearch(e.target.value); setSubPage(1); }}
                  placeholder="Search by email or name..."
                  className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-clay/30 focus:border-clay outline-none"
                />
              </div>
              <button
                onClick={() => setShowSubFilters(!showSubFilters)}
                className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm transition ${
                  showSubFilters || subFilterTags.length || subFilterSource ? 'border-clay text-clay bg-clay/5' : 'border-stone-300 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Filter size={14} />
                Filters
                {(subFilterTags.length > 0 || subFilterSource) && (
                  <span className="w-5 h-5 flex items-center justify-center bg-clay text-white rounded-full text-xs">
                    {subFilterTags.length + (subFilterSource ? 1 : 0)}
                  </span>
                )}
              </button>
              <button onClick={() => setShowTagManager(!showTagManager)} className="flex items-center gap-1.5 px-3 py-2 border border-stone-300 text-stone-600 rounded-lg text-sm hover:bg-stone-50 transition">
                <Tag size={14} /> Tags
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowImportModal(true)} className="flex items-center gap-1.5 px-3 py-2 border border-stone-300 text-stone-600 rounded-lg text-sm hover:bg-stone-50 transition">
                <Upload size={14} /> Import
              </button>
              <button onClick={handleExportCsv} className="flex items-center gap-1.5 px-3 py-2 border border-stone-300 text-stone-600 rounded-lg text-sm hover:bg-stone-50 transition">
                <Download size={14} /> Export
              </button>
            </div>
          </div>

          {/* Filters panel */}
          {showSubFilters && (
            <div className="bg-stone-50 p-4 rounded-xl grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => { setSubFilterTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]); setSubPage(1); }}
                      className={`px-2.5 py-1 rounded-full text-xs transition ${
                        subFilterTags.includes(tag) ? 'bg-clay text-white' : 'bg-white border border-stone-300 text-stone-600'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">Source</label>
                <select
                  value={subFilterSource}
                  onChange={(e) => { setSubFilterSource(e.target.value); setSubPage(1); }}
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-sm bg-white"
                >
                  <option value="">All sources</option>
                  {availableSources.map(src => <option key={src} value={src}>{src}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">Status</label>
                <select
                  value={subFilterStatus}
                  onChange={(e) => { setSubFilterStatus(e.target.value as any); setSubPage(1); }}
                  className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-sm bg-white"
                >
                  <option value="all">All</option>
                  <option value="subscribed">Subscribed</option>
                  <option value="unsubscribed">Unsubscribed</option>
                </select>
              </div>
            </div>
          )}

          {/* Bulk actions */}
          {selectedSubs.size > 0 && (
            <div className="bg-clay/5 border border-clay/20 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm text-clay font-medium">{selectedSubs.size} subscriber{selectedSubs.size !== 1 ? 's' : ''} selected</span>
              <div className="flex items-center gap-2">
                {availableTags.length > 0 && (
                  <select
                    onChange={(e) => { if (e.target.value) handleBulkTag(e.target.value); e.target.value = ''; }}
                    className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm bg-white"
                    defaultValue=""
                  >
                    <option value="" disabled>Add tag...</option>
                    {availableTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                  </select>
                )}
                <button onClick={handleBulkDelete} className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition">
                  Delete Selected
                </button>
                <button onClick={() => setSelectedSubs(new Set())} className="px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition">
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Tag Manager */}
          {showTagManager && (
            <div className="bg-stone-50 p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="New tag name..."
                  className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                />
                <button onClick={handleCreateTag} className="px-4 py-2 bg-clay text-white rounded-lg text-sm hover:bg-clay/90">Add Tag</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-stone-300 rounded-full text-sm">
                    {tag}
                    <button onClick={() => handleDeleteTag(tag)} className="text-stone-400 hover:text-red-600"><X size={14} /></button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Subscribers Table */}
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            {loadingSubscribers ? (
              <div className="p-12 text-center"><Loader2 className="animate-spin text-clay mx-auto" size={24} /></div>
            ) : filteredSubscribers.length === 0 ? (
              <EmptyState icon={Users} title="No subscribers found" subtitle={subSearch ? 'Try a different search' : 'Subscribers will appear when people sign up'} />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-stone-50">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={selectedSubs.size === paginatedSubscribers.length && paginatedSubscribers.length > 0}
                            onChange={toggleSelectAll}
                            className="rounded text-clay"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase cursor-pointer hover:text-stone-700" onClick={() => toggleSubSort('email')}>
                          <span className="flex items-center gap-1">Email <ArrowUpDown size={12} /></span>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">Source</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">Tags</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase cursor-pointer hover:text-stone-700" onClick={() => toggleSubSort('subscribedAt')}>
                          <span className="flex items-center gap-1">Subscribed <ArrowUpDown size={12} /></span>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase cursor-pointer hover:text-stone-700" onClick={() => toggleSubSort('emailsReceived')}>
                          <span className="flex items-center gap-1">Emails <ArrowUpDown size={12} /></span>
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {paginatedSubscribers.map(sub => (
                        <tr
                          key={sub.id}
                          className="hover:bg-stone-50 cursor-pointer"
                          onClick={() => setDrawerSubscriber(sub)}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedSubs.has(sub.id)}
                              onChange={() => setSelectedSubs(prev => {
                                const next = new Set(prev);
                                next.has(sub.id) ? next.delete(sub.id) : next.add(sub.id);
                                return next;
                              })}
                              className="rounded text-clay"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-stone-900">{sub.email}</p>
                            {sub.name && <p className="text-xs text-stone-500">{sub.name}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <Badge>{sub.source}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {sub.tags.length > 0
                                ? sub.tags.map(tag => <Badge key={tag} variant="clay">{tag}</Badge>)
                                : <span className="text-xs text-stone-400">-</span>
                              }
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-stone-500">{formatDate(sub.subscribedAt)}</td>
                          <td className="px-4 py-3 text-sm text-stone-500">{sub.emailsReceived}</td>
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDeleteSubscriber(sub.id)}
                              className="text-stone-400 hover:text-red-600 transition p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-stone-200 px-4 py-2 text-xs text-stone-500 flex items-center justify-between">
                  <span>{filteredSubscribers.length} subscriber{filteredSubscribers.length !== 1 ? 's' : ''}</span>
                </div>
                <Pagination page={subPage} totalPages={totalSubPages} onPageChange={setSubPage} />
              </>
            )}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* AUTOMATIONS TAB */}
      {/* ============================================ */}
      {activeTab === 'automations' && (
        <div className="space-y-4">
          {automationView === 'list' ? (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-4 gap-4">
                <StatCard label="Total Automations" value={automations.length} icon={Zap} iconBg="bg-stone-100 text-stone-600" />
                <StatCard label="Active" value={automations.filter(a => a.status === 'active').length} icon={Play} iconBg="bg-emerald-50 text-emerald-600" />
                <StatCard label="Enrolled" value={automationQueueStats.scheduled + automationQueueStats.sent} icon={Users} iconBg="bg-blue-50 text-blue-600" />
                <StatCard label="Emails Sent" value={automationQueueStats.sent} icon={Send} iconBg="bg-clay/10 text-clay" />
              </div>

              {/* Actions */}
              <div className="flex justify-end">
                <button onClick={handleCreateAutomation} className="flex items-center gap-2 px-4 py-2 bg-clay text-white rounded-lg hover:bg-clay/90 transition">
                  <Plus size={16} /> New Automation
                </button>
              </div>

              {/* Automations table */}
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                {automations.length === 0 ? (
                  <EmptyState icon={Zap} title="No automations yet" subtitle="Create automated email sequences triggered by subscriber actions" />
                ) : (
                  <div className="divide-y divide-stone-100">
                    {automations.map(auto => (
                      <div key={auto.id} className="p-4 flex items-center justify-between hover:bg-stone-50">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-stone-900">{auto.name}</p>
                          <p className="text-sm text-stone-500 mt-0.5">{auto.description || 'No description'}</p>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            auto.trigger === 'newsletter_signup' ? 'bg-blue-100 text-blue-700' :
                            auto.trigger === 'purchase' ? 'bg-green-100 text-green-700' :
                            auto.trigger === 'coaching_inquiry' ? 'bg-purple-100 text-purple-700' :
                            auto.trigger === 'contact_form' ? 'bg-amber-100 text-amber-700' :
                            'bg-stone-100 text-stone-600'
                          }`}>
                            {auto.trigger.replace(/_/g, ' ')}
                          </span>
                          <span className="text-sm text-stone-500">{(auto.steps || []).length} step{(auto.steps || []).length !== 1 ? 's' : ''}</span>
                          <button
                            onClick={() => handleToggleAutomationStatus(auto)}
                            className={`relative w-10 h-5 rounded-full transition ${auto.status === 'active' ? 'bg-emerald-500' : 'bg-stone-300'}`}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${auto.status === 'active' ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </button>
                          <button onClick={() => handleEditAutomation(auto)} className="p-1.5 text-stone-400 hover:text-clay transition">
                            <Edit3 size={16} />
                          </button>
                          <button onClick={() => handleDeleteAutomation(auto.id)} className="p-1.5 text-stone-400 hover:text-red-600 transition">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Builder View */
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                <button onClick={() => setAutomationView('list')} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition">
                  <ArrowLeft size={20} />
                </button>
                <h3 className="text-lg font-semibold text-stone-900">{editingAutomation ? 'Edit Automation' : 'New Automation'}</h3>
              </div>

              {/* Name & Description */}
              <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Name</label>
                  <input value={autoName} onChange={e => setAutoName(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-clay/30 focus:border-clay" placeholder="Welcome Series" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Description</label>
                  <input value={autoDescription} onChange={e => setAutoDescription(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-clay/30 focus:border-clay" placeholder="Introduce new subscribers to the brand" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Trigger</label>
                  <select value={autoTrigger} onChange={e => setAutoTrigger(e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-clay/30 focus:border-clay">
                    <option value="newsletter_signup">Newsletter Signup</option>
                    <option value="purchase">Purchase</option>
                    <option value="coaching_inquiry">Coaching Inquiry</option>
                    <option value="contact_form">Contact Form</option>
                    <option value="manual">Manual Trigger</option>
                  </select>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-0">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-stone-700">Email Steps</h4>
                  <button onClick={handleAddStep} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-clay border border-clay rounded-lg hover:bg-clay hover:text-white transition">
                    <Plus size={14} /> Add Step
                  </button>
                </div>
                {autoSteps.map((step, idx) => (
                  <div key={step.id} className="relative">
                    {/* Connector line */}
                    {idx > 0 && (
                      <div className="absolute left-6 -top-3 w-0.5 h-3 bg-stone-300" />
                    )}
                    <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3 ml-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-clay text-white text-xs flex items-center justify-center font-bold">{idx + 1}</div>
                          <span className="text-sm font-medium text-stone-700">Email Step</span>
                        </div>
                        {autoSteps.length > 1 && (
                          <button onClick={() => handleRemoveStep(step.id)} className="p-1 text-stone-400 hover:text-red-600 transition">
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <div>
                          <label className="block text-xs text-stone-500 mb-1">Delay (days)</label>
                          <input type="number" min="0" value={step.delayDays} onChange={e => handleUpdateStep(step.id, 'delayDays', parseInt(e.target.value) || 0)} className="w-20 px-2 py-1.5 border border-stone-300 rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs text-stone-500 mb-1">Hours</label>
                          <input type="number" min="0" max="23" value={step.delayHours} onChange={e => handleUpdateStep(step.id, 'delayHours', parseInt(e.target.value) || 0)} className="w-20 px-2 py-1.5 border border-stone-300 rounded-lg text-sm" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">Subject</label>
                        <input value={step.subject} onChange={e => handleUpdateStep(step.id, 'subject', e.target.value)} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" placeholder="Welcome to Lyne Tilt!" />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">Body (HTML)</label>
                        <textarea value={step.body} onChange={e => handleUpdateStep(step.id, 'body', e.target.value)} rows={4} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono" placeholder="<p>Hi {{name}},</p><p>Welcome aboard!</p>" />
                      </div>
                    </div>
                    {/* Connector line after */}
                    {idx < autoSteps.length - 1 && (
                      <div className="flex justify-start ml-6 py-1">
                        <div className="w-0.5 h-3 bg-stone-300" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between">
                <button onClick={() => setAutomationView('list')} className="px-4 py-2 text-stone-500 hover:text-stone-700 transition text-sm">Cancel</button>
                <div className="flex items-center gap-2">
                  {editingAutomation && (
                    <button onClick={() => handleToggleAutomationStatus(editingAutomation)} className={`px-4 py-2 rounded-lg text-sm transition ${editingAutomation.status === 'active' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                      {editingAutomation.status === 'active' ? 'Pause' : 'Activate'}
                    </button>
                  )}
                  <button onClick={handleSaveAutomation} disabled={autoSaving} className="flex items-center gap-2 px-6 py-2.5 bg-clay text-white rounded-lg hover:bg-clay/90 transition disabled:opacity-50 font-medium">
                    <Save size={16} />
                    {autoSaving ? 'Saving...' : 'Save Automation'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals & Drawers */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImport={() => { fetchSubscribers(); fetchStats(); }}
          availableTags={availableTags}
          accessToken={accessToken}
        />
      )}

      {drawerSubscriber && (
        <SubscriberDrawer
          subscriber={drawerSubscriber}
          availableTags={availableTags}
          onClose={() => setDrawerSubscriber(null)}
          onUpdateTags={handleUpdateSubscriber}
          onDelete={handleDeleteSubscriber}
          accessToken={accessToken}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-stone-800 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm z-50 flex items-center gap-2">
          <Check size={16} className="text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  );
}
