import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  X,
  Monitor,
  Smartphone,
  Send,
  Calendar,
  Clock,
  AlertTriangle,
  Loader2,
  Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';

// ============================================
// TYPES
// ============================================

interface PreflightChecks {
  hasSubject: boolean;
  hasContent: boolean;
  hasUnsubscribeLink: boolean;
  testSent: boolean;
  audienceSelected: boolean;
}

interface PreflightData {
  campaign: {
    id: string;
    subject: string;
    preheader?: string;
    bodyHtml: string;
    audience: 'all' | 'segment';
  };
  checks: PreflightChecks;
  allPassed: boolean;
  recipientCount: number;
}

// ============================================
// CONSTANTS
// ============================================

const TIMEZONES = [
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
  { value: 'Australia/Adelaide', label: 'Adelaide (ACST/ACDT)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
  { value: 'America/Denver', label: 'Denver (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
];

const CHECKLIST_ITEMS: {
  key: keyof PreflightChecks;
  label: string;
  failMessage?: string;
  failLink?: (id: string) => { to: string; text: string };
}[] = [
  {
    key: 'hasSubject',
    label: 'Subject line is present',
  },
  {
    key: 'hasContent',
    label: 'Email body has content',
  },
  {
    key: 'hasUnsubscribeLink',
    label: 'Unsubscribe link present',
  },
  {
    key: 'testSent',
    label: 'Test email sent',
    failLink: (id) => ({
      to: `/admin/campaigns/${id}/compose`,
      text: 'Send a test email first',
    }),
  },
  {
    key: 'audienceSelected',
    label: 'Audience selected',
  },
];

// ============================================
// CHECKLIST ITEM COMPONENT
// ============================================

function ChecklistItem({
  passed,
  label,
  failMessage,
  failLink,
}: {
  passed: boolean;
  label: string;
  failMessage?: string;
  failLink?: { to: string; text: string };
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5">
        {passed ? (
          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
            <Check size={14} className="text-emerald-600" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
            <X size={14} className="text-red-600" />
          </div>
        )}
      </div>
      <div>
        <p className={`text-sm font-medium ${passed ? 'text-stone-700' : 'text-red-700'}`}>
          {label}
        </p>
        {!passed && failMessage && (
          <p className="text-xs text-red-500 mt-0.5">{failMessage}</p>
        )}
        {!passed && failLink && (
          <Link
            to={failLink.to}
            className="text-xs text-clay hover:underline mt-0.5 inline-block"
          >
            {failLink.text}
          </Link>
        )}
      </div>
    </div>
  );
}

// ============================================
// SCHEDULE MODAL
// ============================================

function ScheduleModal({
  onClose,
  onSchedule,
  scheduling,
}: {
  onClose: () => void;
  onSchedule: (scheduledFor: string, timezone: string) => void;
  scheduling: boolean;
}) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [timezone, setTimezone] = useState('Australia/Melbourne');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) return;
    const scheduledFor = `${date}T${time}`;
    onSchedule(scheduledFor, timezone);
  };

  // Get tomorrow's date as min date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <h3 className="text-lg font-medium text-stone-800 flex items-center gap-2">
            <Calendar size={20} className="text-stone-500" />
            Schedule Campaign
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-lg transition"
          >
            <X size={20} className="text-stone-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              min={minDate}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-clay/20 focus:border-clay"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-clay/20 focus:border-clay"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-clay/20 focus:border-clay bg-white"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-600 rounded-lg text-sm hover:bg-stone-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!date || !time || scheduling}
              className="flex-1 px-4 py-2.5 bg-stone-800 text-white rounded-lg text-sm hover:bg-stone-900 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {scheduling ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Clock size={16} />
                  Schedule
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// SEND CONFIRMATION MODAL
// ============================================

function SendConfirmationModal({
  subject,
  recipientCount,
  onClose,
  onConfirm,
  sending,
}: {
  subject: string;
  recipientCount: number;
  onClose: () => void;
  onConfirm: () => void;
  sending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <h3 className="text-lg font-medium text-stone-800 flex items-center gap-2">
            <Send size={20} className="text-clay" />
            Confirm Send
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-lg transition"
          >
            <X size={20} className="text-stone-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-stone-700">
            You are about to send <strong className="text-stone-900">{subject}</strong> to{' '}
            <strong className="text-stone-900">
              {recipientCount.toLocaleString()} subscriber{recipientCount !== 1 ? 's' : ''}
            </strong>
            .
          </p>
          <p className="text-sm text-red-600 font-medium">This action cannot be undone.</p>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-600 rounded-lg text-sm hover:bg-stone-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={sending}
              className="flex-1 px-4 py-2.5 bg-clay text-white rounded-lg text-sm hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Send Now
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ERROR TOAST
// ============================================

function ErrorToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-6 right-6 z-[60] bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-md animate-in slide-in-from-bottom-4">
      <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
      <p className="text-sm">{message}</p>
      <button
        onClick={onDismiss}
        className="p-1 hover:bg-red-100 rounded-md flex-shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function CampaignReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  // State
  const [preflight, setPreflight] = useState<PreflightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [sending, setSending] = useState(false);
  const [toastError, setToastError] = useState<string | null>(null);

  // Lock body scroll when modals are open
  useEffect(() => {
    if (showScheduleModal || showSendModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showScheduleModal, showSendModal]);

  // Fetch preflight data
  const fetchPreflight = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/campaigns/${id}/preflight`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Failed to load campaign preflight data');
      }
      const data: PreflightData = await response.json();
      setPreflight(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    fetchPreflight();
  }, [fetchPreflight]);

  // Schedule campaign
  const handleSchedule = async (scheduledFor: string, timezone: string) => {
    if (!token || !id) return;
    setScheduling(true);
    try {
      const response = await fetch(`${API_BASE}/campaigns/${id}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ scheduledFor, timezone }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to schedule campaign');
      }
      setShowScheduleModal(false);
      navigate('/admin/newsletter');
    } catch (err) {
      setToastError(err instanceof Error ? err.message : 'Failed to schedule campaign');
    } finally {
      setScheduling(false);
    }
  };

  // Send campaign
  const handleSend = async () => {
    if (!token || !id) return;
    setSending(true);
    try {
      const response = await fetch(`${API_BASE}/campaigns/${id}/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send campaign');
      }
      setShowSendModal(false);
      navigate(`/admin/campaigns/${id}/analytics`);
    } catch (err) {
      setShowSendModal(false);
      setToastError(err instanceof Error ? err.message : 'Failed to send campaign');
    } finally {
      setSending(false);
    }
  };

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <Loader2 className="animate-spin text-stone-400 mx-auto mb-3" size={32} />
          <p className="text-sm text-stone-500">Loading campaign review...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================

  if (error || !preflight) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <AlertTriangle className="text-red-400 mx-auto mb-3" size={32} />
          <p className="text-stone-700 font-medium mb-1">Failed to load campaign</p>
          <p className="text-sm text-stone-500 mb-4">{error || 'Campaign not found'}</p>
          <button
            onClick={fetchPreflight}
            className="px-4 py-2 bg-stone-800 text-white rounded-lg text-sm hover:bg-stone-900 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { campaign, checks, allPassed, recipientCount } = preflight;

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="mb-6">
        <Link
          to={`/admin/campaigns/${id}/compose`}
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 transition mb-3"
        >
          <ArrowLeft size={16} />
          Back to compose
        </Link>
        <h1 className="text-2xl font-serif text-stone-800">Review Campaign</h1>
        <p className="text-lg text-stone-600 mt-1">{campaign.subject}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Checklist */}
        <div className="lg:col-span-1 space-y-6">
          {/* Pre-send Checklist */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
            <div className="p-4 border-b border-stone-100">
              <h2 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                <Shield size={16} className="text-stone-500" />
                Pre-send Checklist
              </h2>
            </div>
            <div className="px-4 divide-y divide-stone-100">
              {CHECKLIST_ITEMS.map((item) => (
                <ChecklistItem
                  key={item.key}
                  passed={checks[item.key]}
                  label={item.label}
                  failMessage={item.failMessage}
                  failLink={
                    !checks[item.key] && item.failLink && id
                      ? item.failLink(id)
                      : undefined
                  }
                />
              ))}
            </div>

            {/* Recipient count */}
            <div className="px-4 py-3 border-t border-stone-100 bg-stone-50/50 rounded-b-xl">
              <p className="text-sm text-stone-600">
                Sending to{' '}
                <strong className="text-stone-900">
                  {recipientCount.toLocaleString()} subscriber{recipientCount !== 1 ? 's' : ''}
                </strong>
              </p>
            </div>
          </div>

          {/* Warning if checks fail */}
          {!allPassed && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Cannot send yet</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Please resolve all checklist items before sending or scheduling this campaign.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Email Preview */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-800">Email Preview</h2>
              <div className="flex items-center bg-stone-100 rounded-lg p-0.5">
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    previewMode === 'desktop'
                      ? 'bg-white text-stone-800 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  <Monitor size={14} />
                  Desktop
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    previewMode === 'mobile'
                      ? 'bg-white text-stone-800 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  <Smartphone size={14} />
                  Mobile
                </button>
              </div>
            </div>

            <div className="p-4 flex justify-center bg-stone-50">
              <div
                className={`bg-white border border-stone-200 rounded-lg overflow-hidden transition-all duration-300 ${
                  previewMode === 'desktop' ? 'w-full max-w-[600px]' : 'w-[375px]'
                }`}
              >
                <iframe
                  srcDoc={campaign.bodyHtml}
                  title="Email preview"
                  className="w-full border-0"
                  style={{
                    height: previewMode === 'desktop' ? '700px' : '600px',
                    maxWidth: '100%',
                  }}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 lg:left-60 right-0 z-30 bg-white border-t border-stone-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3 flex items-center justify-between gap-3">
          <Link
            to={`/admin/campaigns/${id}/compose`}
            className="px-4 py-2.5 border border-stone-200 text-stone-600 rounded-lg text-sm hover:bg-stone-50 transition flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Edit
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowScheduleModal(true)}
              disabled={!allPassed}
              className="px-4 py-2.5 border border-stone-200 text-stone-700 rounded-lg text-sm hover:bg-stone-50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Calendar size={16} />
              Schedule
            </button>
            <button
              onClick={() => setShowSendModal(true)}
              disabled={!allPassed}
              className="px-5 py-2.5 bg-clay text-white rounded-lg text-sm hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send size={16} />
              Send Now
            </button>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal
          onClose={() => setShowScheduleModal(false)}
          onSchedule={handleSchedule}
          scheduling={scheduling}
        />
      )}

      {/* Send Confirmation Modal */}
      {showSendModal && (
        <SendConfirmationModal
          subject={campaign.subject}
          recipientCount={recipientCount}
          onClose={() => setShowSendModal(false)}
          onConfirm={handleSend}
          sending={sending}
        />
      )}

      {/* Error Toast */}
      {toastError && (
        <ErrorToast
          message={toastError}
          onDismiss={() => setToastError(null)}
        />
      )}
    </div>
  );
}
