import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Send,
  Eye,
  EyeOff,
  Monitor,
  Smartphone,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  Check,
  Clock,
  AlertCircle,
  Users,
  Filter,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';
import BlockBuilder, { generateEmailHtml, EmailBlock } from '../components/newsletter/BlockBuilder';

// ============================================
// TYPES
// ============================================

interface Campaign {
  id: string;
  subject: string;
  preheader?: string;
  body: string;
  bodyHtml?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent';
  audience: 'all' | 'segment';
  segmentFilters?: { sources?: string[]; tags?: string[] };
  scheduledFor?: string;
  createdAt: string;
  updatedAt: string;
}

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'idle';
type PreviewDevice = 'desktop' | 'mobile';

// ============================================
// CAMPAIGN COMPOSE PAGE
// ============================================

export default function CampaignCompose() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();

  // Campaign state
  const [campaignId, setCampaignId] = useState<string | null>(id || null);
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [audience, setAudience] = useState<'all' | 'segment'>('all');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [status, setStatus] = useState<'draft' | 'scheduled'>('draft');
  const [bodyHtml, setBodyHtml] = useState('');

  // UI state
  const [loading, setLoading] = useState(!!id);
  const [metadataOpen, setMetadataOpen] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  // Save state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);

  // Audience data
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Toast
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // ============================================
  // DATA FETCHING
  // ============================================

  // Load campaign data if editing
  useEffect(() => {
    if (id) {
      fetchCampaign(id);
    } else {
      // New campaign: create immediately so we have an ID to work with
      createCampaign();
    }
    fetchAvailableFilters();
  }, []);

  // Pre-fill test email with user's email
  useEffect(() => {
    if (user?.email) {
      setTestEmail(user.email);
    }
  }, [user]);

  const fetchCampaign = async (campaignId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/campaigns/${campaignId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        showToast('Campaign not found');
        navigate('/admin/newsletter');
        return;
      }
      const data: Campaign = await res.json();
      setSubject(data.subject || '');
      setPreheader(data.preheader || '');
      setAudience(data.audience || 'all');
      setSelectedSources(data.segmentFilters?.sources || []);
      setSelectedTags(data.segmentFilters?.tags || []);
      setStatus(data.status === 'scheduled' ? 'scheduled' : 'draft');
      setBodyHtml(data.bodyHtml || '');
      setCampaignId(data.id);

      try {
        const parsed = JSON.parse(data.body);
        setBlocks(Array.isArray(parsed) ? parsed : []);
      } catch {
        setBlocks([]);
      }

      setLastSavedAt(new Date(data.updatedAt));
      setSaveStatus('saved');
    } catch {
      showToast('Failed to load campaign');
      navigate('/admin/newsletter');
    } finally {
      setLoading(false);
      // After initial load, allow change tracking
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 500);
    }
  };

  const createCampaign = async () => {
    try {
      const res = await fetch(`${API_BASE}/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          subject: 'Untitled Campaign',
          body: '[]',
          audience: 'all',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCampaignId(data.id);
        setSubject(data.subject || 'Untitled Campaign');
        setLastSavedAt(new Date(data.updatedAt));
        setSaveStatus('saved');
        // Replace URL without navigation so the browser URL shows the ID
        navigate(`/admin/campaigns/${data.id}`, { replace: true });
        setTimeout(() => {
          isInitialLoadRef.current = false;
        }, 500);
      }
    } catch {
      showToast('Failed to create campaign');
    }
  };

  const fetchAvailableFilters = async () => {
    try {
      const res = await fetch(`${API_BASE}/campaigns/preview-recipients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ audience: 'all' }),
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableSources(data.availableSources || []);
        setAvailableTags(data.availableTags || []);
        setRecipientCount(data.count);
      }
    } catch {
      // Filters not available
    }
  };

  // ============================================
  // AUTO-SAVE
  // ============================================

  const saveCampaign = useCallback(async () => {
    if (!campaignId) return;
    setSaveStatus('saving');
    try {
      const html = blocks.length > 0 ? generateEmailHtml(blocks) : '';
      const res = await fetch(`${API_BASE}/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          subject,
          preheader: preheader || undefined,
          body: JSON.stringify(blocks),
          bodyHtml: html,
          audience,
          segmentFilters: audience === 'segment' ? { sources: selectedSources, tags: selectedTags } : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBodyHtml(data.bodyHtml || html);
        setLastSavedAt(new Date());
        setHasUnsavedChanges(false);
        setSaveStatus('saved');
      } else {
        setSaveStatus('unsaved');
        showToast('Failed to save');
      }
    } catch {
      setSaveStatus('unsaved');
      showToast('Failed to save');
    }
  }, [campaignId, subject, preheader, blocks, audience, selectedSources, selectedTags, accessToken]);

  // Track unsaved changes
  useEffect(() => {
    if (isInitialLoadRef.current) return;
    setHasUnsavedChanges(true);
    setSaveStatus('unsaved');
  }, [subject, preheader, blocks, audience, selectedSources, selectedTags]);

  // Auto-save every 30 seconds when changes are detected
  useEffect(() => {
    if (!hasUnsavedChanges || !campaignId) return;

    saveTimeoutRef.current = setTimeout(() => {
      saveCampaign();
    }, 30000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, saveCampaign, campaignId]);

  // Cmd+S / Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (campaignId && hasUnsavedChanges) {
          saveCampaign();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [campaignId, hasUnsavedChanges, saveCampaign]);

  // Update recipient count when audience changes
  useEffect(() => {
    if (isInitialLoadRef.current) return;
    updateRecipientCount();
  }, [audience, selectedSources, selectedTags]);

  const updateRecipientCount = async () => {
    setLoadingRecipients(true);
    try {
      const res = await fetch(`${API_BASE}/campaigns/preview-recipients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          audience,
          segmentFilters: audience === 'segment' ? { sources: selectedSources, tags: selectedTags } : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRecipientCount(data.count);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingRecipients(false);
    }
  };

  // ============================================
  // ACTIONS
  // ============================================

  const handleSendTest = async () => {
    if (!testEmail.trim()) {
      showToast('Please enter an email address');
      return;
    }
    if (!campaignId) return;

    // Save first to ensure bodyHtml is up to date
    if (hasUnsavedChanges) {
      await saveCampaign();
    }

    setSendingTest(true);
    try {
      const res = await fetch(`${API_BASE}/campaigns/${campaignId}/send-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email: testEmail }),
      });
      if (res.ok) {
        showToast(`Test email sent to ${testEmail}`);
        setShowTestModal(false);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'Failed to send test email');
      }
    } catch {
      showToast('Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  };

  const handleContinueToReview = async () => {
    if (!subject.trim()) {
      showToast('Please add a subject line');
      return;
    }
    if (blocks.length === 0) {
      showToast('Please add some content to your email');
      return;
    }

    // Save before navigating
    if (hasUnsavedChanges) {
      await saveCampaign();
    }

    navigate(`/admin/campaigns/${campaignId}/review`);
  };

  const handleBlocksChange = useCallback((newBlocks: EmailBlock[]) => {
    setBlocks(newBlocks);
  }, []);

  const handleGenerateHtml = useCallback(() => {
    return blocks.length > 0 ? generateEmailHtml(blocks) : '';
  }, [blocks]);

  // ============================================
  // HELPERS
  // ============================================

  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const getSaveIndicator = () => {
    switch (saveStatus) {
      case 'saving':
        return { icon: Loader2, text: 'Saving...', className: 'text-stone-400 animate-spin', textClass: 'text-stone-400' };
      case 'saved':
        return { icon: Check, text: lastSavedAt ? `Saved ${formatTimeAgo(lastSavedAt)}` : 'Saved', className: 'text-emerald-500', textClass: 'text-stone-400' };
      case 'unsaved':
        return { icon: AlertCircle, text: 'Unsaved changes', className: 'text-amber-500', textClass: 'text-amber-600' };
      default:
        return { icon: Save, text: '', className: 'text-stone-300', textClass: 'text-stone-300' };
    }
  };

  const toggleSource = (source: string) => {
    setSelectedSources(prev =>
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-stone-400" size={32} />
      </div>
    );
  }

  const saveIndicator = getSaveIndicator();
  const SaveIcon = saveIndicator.icon;

  return (
    <div className="min-h-screen bg-stone-50 -m-4 lg:-m-6">
      {/* ============================================ */}
      {/* TOP BAR (Sticky) */}
      {/* ============================================ */}
      <div className="sticky top-0 z-20 bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3">
          <div className="flex items-center gap-3">
            {/* Back button */}
            <button
              onClick={() => navigate('/admin/newsletter')}
              className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              title="Back to campaigns"
            >
              <ArrowLeft size={20} />
            </button>

            {/* Subject / title */}
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Campaign subject..."
                className="text-lg font-semibold text-stone-800 bg-transparent border-none outline-none w-full placeholder:text-stone-300 focus:ring-0"
                maxLength={150}
              />
            </div>

            {/* Status badge */}
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${
                status === 'scheduled'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-stone-100 text-stone-500'
              }`}
            >
              {status === 'scheduled' ? 'Scheduled' : 'Draft'}
            </span>

            {/* Save indicator */}
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <SaveIcon size={14} className={saveIndicator.className} />
              <span className={`text-xs ${saveIndicator.textClass}`}>{saveIndicator.text}</span>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-stone-200 hidden sm:block" />

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTestModal(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <Send size={14} />
                Send Test
              </button>

              <button
                onClick={() => {
                  if (!previewMode && blocks.length > 0) {
                    setBodyHtml(generateEmailHtml(blocks));
                  }
                  setPreviewMode(!previewMode);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  previewMode
                    ? 'bg-stone-800 text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {previewMode ? <EyeOff size={14} /> : <Eye size={14} />}
                <span className="hidden sm:inline">Preview</span>
              </button>

              <button
                onClick={handleContinueToReview}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white rounded-lg transition-colors"
                style={{ backgroundColor: '#8d3038' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#7a2930')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#8d3038')}
              >
                <span className="hidden sm:inline">Continue to Review</span>
                <span className="sm:hidden">Review</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* METADATA BAR (Collapsible) */}
      {/* ============================================ */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          {/* Collapse toggle */}
          <button
            onClick={() => setMetadataOpen(!metadataOpen)}
            className="flex items-center gap-2 py-2.5 text-sm text-stone-500 hover:text-stone-700 transition-colors w-full"
          >
            {metadataOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <span className="font-medium">Email Settings</span>
            {recipientCount !== null && (
              <span className="ml-auto flex items-center gap-1.5 text-xs text-stone-400">
                <Users size={13} />
                {loadingRecipients ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  `${recipientCount} recipient${recipientCount !== 1 ? 's' : ''}`
                )}
              </span>
            )}
          </button>

          {metadataOpen && (
            <div className="pb-4 space-y-4">
              {/* Subject line */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Subject line <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="What's this email about?"
                  maxLength={150}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-400 transition-colors"
                />
                <p className="text-xs text-stone-400 mt-1 text-right">{subject.length}/150</p>
              </div>

              {/* Preheader text */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Preheader text
                </label>
                <input
                  type="text"
                  value={preheader}
                  onChange={e => setPreheader(e.target.value)}
                  placeholder="Shown as preview text in inbox"
                  maxLength={200}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-400 transition-colors"
                />
                <p className="text-xs text-stone-400 mt-1 flex justify-between">
                  <span>Shown as preview text in inbox</span>
                  <span>{preheader.length}/200</span>
                </p>
              </div>

              {/* Audience selector */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Audience
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="audience"
                      value="all"
                      checked={audience === 'all'}
                      onChange={() => { setAudience('all'); setSelectedSources([]); setSelectedTags([]); }}
                      className="text-stone-600 focus:ring-stone-400"
                      style={{ accentColor: '#8d3038' }}
                    />
                    <span className="text-sm text-stone-700">All subscribers</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="audience"
                      value="segment"
                      checked={audience === 'segment'}
                      onChange={() => setAudience('segment')}
                      className="text-stone-600 focus:ring-stone-400"
                      style={{ accentColor: '#8d3038' }}
                    />
                    <span className="text-sm text-stone-700">Segment</span>
                  </label>
                </div>

                {/* Segment filters */}
                {audience === 'segment' && (
                  <div className="mt-3 p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-3">
                    {/* Source filter */}
                    {availableSources.length > 0 && (
                      <div>
                        <label className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                          <Filter size={12} />
                          Source
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {availableSources.map(source => (
                            <button
                              key={source}
                              onClick={() => toggleSource(source)}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                selectedSources.includes(source)
                                  ? 'text-white'
                                  : 'bg-white border border-stone-300 text-stone-600 hover:border-stone-400'
                              }`}
                              style={selectedSources.includes(source) ? { backgroundColor: '#8d3038' } : {}}
                            >
                              {source}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tag filter */}
                    {availableTags.length > 0 && (
                      <div>
                        <label className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                          <Filter size={12} />
                          Tags
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {availableTags.map(tag => (
                            <button
                              key={tag}
                              onClick={() => toggleTag(tag)}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                selectedTags.includes(tag)
                                  ? 'text-white'
                                  : 'bg-white border border-stone-300 text-stone-600 hover:border-stone-400'
                              }`}
                              style={selectedTags.includes(tag) ? { backgroundColor: '#8d3038' } : {}}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recipient count */}
                    <div className="flex items-center gap-2 pt-1">
                      <Users size={14} className="text-stone-400" />
                      <span className="text-sm text-stone-600">
                        {loadingRecipients ? (
                          <span className="flex items-center gap-1.5">
                            <Loader2 size={12} className="animate-spin" />
                            Counting...
                          </span>
                        ) : (
                          <>
                            <strong>{recipientCount ?? 0}</strong> subscriber{recipientCount !== 1 ? 's' : ''} match
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* CONTENT AREA */}
      {/* ============================================ */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        {previewMode ? (
          // PREVIEW MODE
          <div>
            {/* Device toggle */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <button
                onClick={() => setPreviewDevice('desktop')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  previewDevice === 'desktop'
                    ? 'bg-stone-800 text-white'
                    : 'bg-white border border-stone-300 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Monitor size={14} />
                Desktop
              </button>
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  previewDevice === 'mobile'
                    ? 'bg-stone-800 text-white'
                    : 'bg-white border border-stone-300 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Smartphone size={14} />
                Mobile
              </button>
            </div>

            {/* Preview iframe */}
            <div className="flex justify-center">
              <div
                className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden transition-all duration-300"
                style={{
                  width: previewDevice === 'desktop' ? 600 : 375,
                  minHeight: 500,
                }}
              >
                {bodyHtml ? (
                  <iframe
                    srcDoc={bodyHtml}
                    title="Email preview"
                    className="w-full border-none"
                    style={{ minHeight: 500, height: '100%' }}
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <div className="flex items-center justify-center h-[500px] text-stone-400 text-sm">
                    No content to preview. Add some blocks first.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // EDIT MODE — Block Builder
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
            <BlockBuilder
              blocks={blocks}
              onChange={handleBlocksChange}
              onGenerateHtml={handleGenerateHtml}
              apiBase={API_BASE}
              accessToken={accessToken || undefined}
            />
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* SEND TEST MODAL */}
      {/* ============================================ */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowTestModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-stone-800">Send Test Email</h3>
              <button
                onClick={() => setShowTestModal(false)}
                className="p-1 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-stone-500 mb-4">
              Send a test version of this email to preview how it looks in a real inbox.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-400"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendTest();
                  }
                }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendTest}
                disabled={sendingTest || !testEmail.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#8d3038' }}
                onMouseEnter={e => {
                  if (!sendingTest) e.currentTarget.style.backgroundColor = '#7a2930';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#8d3038';
                }}
              >
                {sendingTest ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Send Test
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* TOAST NOTIFICATION */}
      {/* ============================================ */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-800 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Check size={14} />
          {toast}
        </div>
      )}
    </div>
  );
}
