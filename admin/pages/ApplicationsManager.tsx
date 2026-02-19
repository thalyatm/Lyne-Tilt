import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE } from '../config/api';
import {
  Search,
  Loader2,
  X,
  Phone,
  Mail,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  CalendarPlus,
  Calendar,
  Pencil,
  UserCheck,
  Sparkles,
  Plus,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ApplicationStatus =
  | 'new'
  | 'contacted_retry'
  | 'contacted_awaiting'
  | 'scheduled'
  | 'complete_promoted'
  | 'complete_closed';

interface CoachingApplication {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  reason: string | null;
  preferredPackage: string | null;
  referredFrom: string | null;
  scheduledCallAt: string | null;
  scheduledCallTimezone: string | null;
  status: ApplicationStatus;
  notes: string | null;
  bookingId?: string | null;
  clientId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTIVE_STATUSES: ApplicationStatus[] = [
  'new',
  'contacted_retry',
  'contacted_awaiting',
  'scheduled',
];

const HISTORICAL_STATUSES: ApplicationStatus[] = [
  'complete_promoted',
  'complete_closed',
];

const ACTION_REQUIRED_STATUSES: ApplicationStatus[] = [
  'new',
  'contacted_retry',
];

const STATUS_BADGE_STYLES: Record<ApplicationStatus, string> = {
  new: 'bg-amber-100 text-amber-700',
  contacted_retry: 'bg-orange-100 text-orange-700',
  contacted_awaiting: 'bg-blue-100 text-blue-700',
  scheduled: 'bg-green-100 text-green-700',
  complete_promoted: 'bg-emerald-100 text-emerald-700',
  complete_closed: 'bg-stone-100 text-stone-600',
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: 'New',
  contacted_retry: 'Contacted - Re-try Later',
  contacted_awaiting: 'Contacted - Awaiting Call Back',
  scheduled: 'Scheduled',
  complete_promoted: 'Complete - Promoted',
  complete_closed: 'Complete - Closed',
};

const STATUS_SHORT_LABELS: Record<ApplicationStatus, string> = {
  new: 'New',
  contacted_retry: 'Re-try Later',
  contacted_awaiting: 'Awaiting Call Back',
  scheduled: 'Scheduled',
  complete_promoted: 'Promoted',
  complete_closed: 'Closed',
};

const REFERRED_FROM_OPTIONS = ['Website', 'Social Media', 'Referral', 'Other'];

function getTzLabel(tz: string, city: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-AU', { timeZone: tz, timeZoneName: 'short' }).formatToParts(new Date());
    const abbr = parts.find(p => p.type === 'timeZoneName')?.value || tz;
    return `${abbr} (${city})`;
  } catch {
    return `${city}`;
  }
}

const TIMEZONE_OPTIONS = [
  { value: 'Australia/Brisbane', label: getTzLabel('Australia/Brisbane', 'Brisbane') },
  { value: 'Australia/Sydney', label: getTzLabel('Australia/Sydney', 'Sydney') },
  { value: 'Australia/Melbourne', label: getTzLabel('Australia/Melbourne', 'Melbourne') },
  { value: 'Australia/Perth', label: getTzLabel('Australia/Perth', 'Perth') },
  { value: 'Australia/Adelaide', label: getTzLabel('Australia/Adelaide', 'Adelaide') },
  { value: 'Pacific/Auckland', label: getTzLabel('Pacific/Auckland', 'Auckland') },
  { value: 'America/New_York', label: getTzLabel('America/New_York', 'New York') },
  { value: 'America/Los_Angeles', label: getTzLabel('America/Los_Angeles', 'Los Angeles') },
  { value: 'Europe/London', label: getTzLabel('Europe/London', 'London') },
];

const ALL_STATUSES: ApplicationStatus[] = [
  'new',
  'contacted_retry',
  'contacted_awaiting',
  'scheduled',
  'complete_promoted',
  'complete_closed',
];

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
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return new Date(date).toLocaleDateString();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(iso: string, tz?: string | null): string {
  try {
    return new Date(iso).toLocaleString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: tz || 'Australia/Brisbane',
    });
  } catch {
    return new Date(iso).toLocaleString('en-AU');
  }
}

function toLocalDateValue(iso: string, tz?: string | null): string {
  try {
    const d = new Date(iso);
    const formatter = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: tz || 'Australia/Brisbane',
    });
    return formatter.format(d);
  } catch {
    return iso.slice(0, 10);
  }
}

function toLocalTimeValue(iso: string, tz?: string | null): string {
  try {
    const d = new Date(iso);
    const formatter = new Intl.DateTimeFormat('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: tz || 'Australia/Brisbane',
    });
    return formatter.format(d);
  } catch {
    return '09:00';
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_BADGE_STYLES[status]}`}
    >
      {STATUS_SHORT_LABELS[status]}
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
      className="bg-white rounded-xl border border-stone-200 px-4 py-2.5 flex items-center gap-3"
      style={{ borderLeftWidth: '4px', borderLeftColor: borderColor }}
    >
      <div
        className={`w-7 h-7 rounded-md flex items-center justify-center ${accent}`}
      >
        <Icon size={14} />
      </div>
      <div>
        <p className="text-xl font-semibold text-stone-900 leading-tight">{value}</p>
        <p className="text-[11px] text-stone-500">{label}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline Schedule Picker
// ---------------------------------------------------------------------------

function SchedulePicker({
  initialDate,
  initialTime,
  initialTz,
  onSave,
  onCancel,
  saving,
}: {
  initialDate?: string;
  initialTime?: string;
  initialTz?: string;
  onSave: (date: string, time: string, tz: string) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [date, setDate] = useState(initialDate || '');
  const [time, setTime] = useState(initialTime || '09:00');
  const [tz, setTz] = useState(initialTz || 'Australia/Brisbane');

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="bg-white border border-stone-200 rounded px-2 py-1 text-xs text-stone-700 focus:outline-none focus:ring-1 focus:ring-stone-400"
      />
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        className="bg-white border border-stone-200 rounded px-2 py-1 text-xs text-stone-700 focus:outline-none focus:ring-1 focus:ring-stone-400"
      />
      <select
        value={tz}
        onChange={(e) => setTz(e.target.value)}
        className="bg-white border border-stone-200 rounded px-2 py-1 text-xs text-stone-700 focus:outline-none focus:ring-1 focus:ring-stone-400"
      >
        {TIMEZONE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <button
        onClick={() => {
          if (date) onSave(date, time, tz);
        }}
        disabled={!date || saving}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-white disabled:opacity-50 transition-colors"
        style={{ backgroundColor: '#8d3038' }}
        onMouseEnter={(e) => {
          if (date && !saving) e.currentTarget.style.backgroundColor = '#6b2228';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#8d3038';
        }}
      >
        {saving ? <Loader2 size={12} className="animate-spin" /> : null}
        Save
      </button>
      <button
        onClick={onCancel}
        className="px-2.5 py-1 rounded text-xs font-medium text-stone-600 hover:bg-stone-100 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schedule Call Modal (for when status changes to 'scheduled' without a date)
// ---------------------------------------------------------------------------

function ScheduleModal({
  appName,
  onSave,
  onCancel,
  saving,
}: {
  appName: string;
  onSave: (date: string, time: string, tz: string) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [tz, setTz] = useState('Australia/Brisbane');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-stone-900 mb-1">
          Schedule Call
        </h3>
        <p className="text-sm text-stone-500 mb-4">
          Set a call date and time for {appName}.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">
              Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">
              Timezone
            </label>
            <select
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
            >
              {TIMEZONE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (date) onSave(date, time, tz);
            }}
            disabled={!date || saving}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors"
            style={{ backgroundColor: '#8d3038' }}
            onMouseEnter={(e) => {
              if (date && !saving)
                e.currentTarget.style.backgroundColor = '#6b2228';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#8d3038';
            }}
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin inline mr-1" />
            ) : null}
            Schedule Call
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Application Row
// ---------------------------------------------------------------------------

function ApplicationRow({
  app,
  expanded,
  onToggleExpand,
  onUpdate,
  updating,
  onNavigateToClient,
}: {
  app: CoachingApplication;
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (
    id: string,
    data: Partial<
      Pick<
        CoachingApplication,
        | 'status'
        | 'referredFrom'
        | 'scheduledCallAt'
        | 'scheduledCallTimezone'
        | 'notes'
      >
    >
  ) => Promise<void>;
  updating: boolean;
  onNavigateToClient: (clientId: string) => void;
}) {
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ApplicationStatus | null>(
    null
  );
  const { accessToken } = useAuth();
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Timestamped notes
  interface AppNote {
    id: string;
    content: string;
    createdByName: string | null;
    createdAt: string;
  }
  const [appNotes, setAppNotes] = useState<AppNote[]>([]);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    // If changing to 'scheduled' and no scheduledCallAt, show modal
    if (newStatus === 'scheduled' && !app.scheduledCallAt) {
      setPendingStatus(newStatus);
      setShowScheduleModal(true);
      return;
    }

    await onUpdate(app.id, { status: newStatus });
  };

  const handleScheduleSave = async (
    date: string,
    time: string,
    tz: string
  ) => {
    setSavingSchedule(true);
    try {
      // Build an ISO string from the date and time in the selected timezone
      const isoString = `${date}T${time}:00`;
      const updateData: Record<string, string> = {
        scheduledCallAt: isoString,
        scheduledCallTimezone: tz,
      };
      // If there's a pending status (from the modal), include it
      if (pendingStatus) {
        updateData.status = pendingStatus;
      }
      await onUpdate(app.id, updateData);
      setShowSchedulePicker(false);
      setShowScheduleModal(false);
      setPendingStatus(null);
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleScheduleCancel = () => {
    setShowSchedulePicker(false);
    setShowScheduleModal(false);
    setPendingStatus(null);
  };

  const handleReferredFromChange = async (value: string) => {
    await onUpdate(app.id, { referredFrom: value || null });
  };

  // Fetch notes when expanded
  useEffect(() => {
    if (expanded && !notesLoaded) {
      (async () => {
        try {
          const res = await fetch(`${API_BASE}/coaching/applications/${app.id}/notes`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            setAppNotes(Array.isArray(data) ? data : []);
          }
        } catch { /* ignore */ }
        setNotesLoaded(true);
      })();
    }
  }, [expanded, notesLoaded, app.id, accessToken]);

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetch(`${API_BASE}/coaching/applications/${app.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ content: newNoteText.trim() }),
      });
      if (res.ok) {
        const note = await res.json();
        setAppNotes((prev) => [note, ...prev]);
        setNewNoteText('');
      }
    } catch { /* ignore */ }
    setAddingNote(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await fetch(`${API_BASE}/coaching/applications/notes/${noteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setAppNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch { /* ignore */ }
  };

  const colSpan = 6;

  return (
    <React.Fragment>
      <tr
        className="hover:bg-stone-50/60 transition-colors cursor-pointer group"
        onClick={onToggleExpand}
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
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-stone-800 truncate">
                  {app.name}
                </p>
                {app.clientId && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 whitespace-nowrap">
                    Client
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 truncate">{app.email}</p>
            </div>
          </div>
        </td>

        {/* Referred From */}
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <select
            value={app.referredFrom || ''}
            onChange={(e) => handleReferredFromChange(e.target.value)}
            className="bg-transparent border border-transparent hover:border-stone-200 rounded px-1.5 py-0.5 text-xs text-stone-600 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:border-stone-200 cursor-pointer appearance-none pr-5 transition-colors"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 2px center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '16px 16px',
            }}
          >
            <option value="">--</option>
            {REFERRED_FROM_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </td>

        {/* Applied */}
        <td className="px-4 py-3">
          <span
            className="text-sm text-stone-500"
            title={formatDate(app.createdAt)}
          >
            {timeAgo(app.createdAt)}
          </span>
        </td>

        {/* Package Interest */}
        <td className="px-4 py-3">
          <span className="text-sm text-stone-600">
            {app.preferredPackage || '\u2014'}
          </span>
        </td>

        {/* Scheduled Call */}
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          {showSchedulePicker ? (
            <span className="inline-flex items-center gap-1 text-xs text-stone-400">
              <Calendar size={13} />
              Editing below...
            </span>
          ) : app.scheduledCallAt ? (
            <div>
              <div className="flex items-center gap-1.5 group/date">
                <Calendar size={13} className={new Date(app.scheduledCallAt) < new Date() && app.status === 'scheduled' ? 'text-amber-500 flex-shrink-0' : 'text-green-600 flex-shrink-0'} />
                <span className="text-xs text-stone-700">
                  {formatDateTime(
                    app.scheduledCallAt,
                    app.scheduledCallTimezone
                  )}
                </span>
                {app.bookingId && (
                  <Link
                    to="/admin/bookings"
                    className="text-xs text-[#8d3038] hover:underline ml-2 inline-flex items-center gap-0.5"
                  >
                    View Booking
                  </Link>
                )}
                {ACTIVE_STATUSES.includes(app.status) && (
                  <button
                    onClick={() => setShowSchedulePicker(true)}
                    className="opacity-0 group-hover/date:opacity-100 p-0.5 rounded hover:bg-stone-100 transition-all"
                    title="Change scheduled date"
                  >
                    <Pencil size={11} className="text-stone-400 hover:text-stone-600" />
                  </button>
                )}
              </div>
              {new Date(app.scheduledCallAt) < new Date() && app.status === 'scheduled' && (
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                  <AlertCircle size={10} />
                  Outcome required
                </span>
              )}
            </div>
          ) : ACTIVE_STATUSES.includes(app.status) ? (
            <button
              onClick={() => setShowSchedulePicker(true)}
              className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-[#8d3038] transition-colors"
            >
              <CalendarPlus size={13} />
              Add
            </button>
          ) : (
            <span className="text-xs text-stone-400">{'\u2014'}</span>
          )}
        </td>

        {/* Status (inline dropdown) */}
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <div className="relative inline-flex items-center">
            <select
              value={app.status}
              disabled={updating}
              onChange={(e) =>
                handleStatusChange(e.target.value as ApplicationStatus)
              }
              className={`border-0 rounded-full pl-2.5 pr-6 py-0.5 text-[11px] font-medium focus:outline-none focus:ring-2 focus:ring-stone-300 disabled:opacity-50 appearance-none cursor-pointer ${STATUS_BADGE_STYLES[app.status]}`}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 4px center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '14px 14px',
              }}
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_SHORT_LABELS[s]}
                </option>
              ))}
            </select>
            {updating && (
              <Loader2
                size={12}
                className="absolute right-1 top-1/2 -translate-y-1/2 animate-spin text-stone-400"
              />
            )}
          </div>
        </td>
      </tr>

      {/* Inline schedule picker row */}
      {showSchedulePicker && (
        <tr className="bg-stone-50/40">
          <td colSpan={colSpan} className="px-4 py-3">
            <div className="ml-11">
              <p className="text-xs font-medium text-stone-600 mb-2">
                Schedule a call with {app.name}
              </p>
              <SchedulePicker
                initialDate={
                  app.scheduledCallAt
                    ? toLocalDateValue(
                        app.scheduledCallAt,
                        app.scheduledCallTimezone
                      )
                    : undefined
                }
                initialTime={
                  app.scheduledCallAt
                    ? toLocalTimeValue(
                        app.scheduledCallAt,
                        app.scheduledCallTimezone
                      )
                    : undefined
                }
                initialTz={app.scheduledCallTimezone || 'Australia/Brisbane'}
                onSave={handleScheduleSave}
                onCancel={handleScheduleCancel}
                saving={savingSchedule}
              />
            </div>
          </td>
        </tr>
      )}

      {/* Schedule modal (when changing status to scheduled without a date) */}
      {showScheduleModal && (
        <ScheduleModal
          appName={app.name}
          onSave={handleScheduleSave}
          onCancel={handleScheduleCancel}
          saving={savingSchedule}
        />
      )}

      {/* Expanded detail row */}
      {expanded && (
        <tr className="bg-stone-50/40">
          <td colSpan={colSpan} className="px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl ml-11">
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
                {app.referredFrom && (
                  <div className="text-sm text-stone-500">
                    <span className="text-stone-400">Referred from:</span>{' '}
                    {app.referredFrom}
                  </div>
                )}
              </div>

              {/* Reason / goals */}
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
                {app.clientId && (
                  <div className="pt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToClient(app.clientId!);
                      }}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#8d3038] hover:text-[#6b2228] transition-colors"
                    >
                      <UserCheck size={14} />
                      View Client Profile
                    </button>
                  </div>
                )}
              </div>

              {/* Admin Notes (timestamped comments) */}
              <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Admin Notes
                </h4>

                {/* Add new note */}
                <div className="flex gap-2">
                  <textarea
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    rows={2}
                    placeholder="Add a note..."
                    className="flex-1 bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8d3038]/20 focus:border-[#8d3038] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleAddNote();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={addingNote || !newNoteText.trim()}
                    className="self-end px-3 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50 transition-colors"
                    style={{ backgroundColor: '#8d3038' }}
                  >
                    {addingNote ? <Loader2 size={12} className="animate-spin" /> : 'Add'}
                  </button>
                </div>

                {/* Notes list */}
                {appNotes.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {appNotes.map((note) => (
                      <div key={note.id} className="bg-white border border-stone-100 rounded-lg px-3 py-2 group/note">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="opacity-0 group-hover/note:opacity-100 p-0.5 rounded hover:bg-stone-100 transition-all flex-shrink-0"
                            title="Delete note"
                          >
                            <X size={12} className="text-stone-400" />
                          </button>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-1">
                          {note.createdByName || 'Admin'} &middot;{' '}
                          {new Date(note.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}{' '}
                          {new Date(note.createdAt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : notesLoaded ? (
                  <p className="text-sm text-stone-400 italic">No notes yet</p>
                ) : null}

                {/* Legacy note (from old single-text field) */}
                {app.notes && (
                  <div className="bg-stone-50 border border-stone-100 rounded-lg px-3 py-2">
                    <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">{app.notes}</p>
                    <p className="text-[11px] text-stone-400 mt-1">Legacy note</p>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

// ---------------------------------------------------------------------------
// Application Table
// ---------------------------------------------------------------------------

function ApplicationTable({
  title,
  applications,
  expandedId,
  setExpandedId,
  onUpdate,
  updatingId,
  onNavigateToClient,
  collapsible,
  defaultCollapsed,
}: {
  title: string;
  applications: CoachingApplication[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  onUpdate: (
    id: string,
    data: Partial<
      Pick<
        CoachingApplication,
        | 'status'
        | 'referredFrom'
        | 'scheduledCallAt'
        | 'scheduledCallTimezone'
        | 'notes'
      >
    >
  ) => Promise<void>;
  updatingId: string | null;
  onNavigateToClient: (clientId: string) => void;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed || false);

  if (applications.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
      {/* Table header */}
      {collapsible ? (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-between px-4 py-3 bg-stone-50/80 hover:bg-stone-100/80 transition-colors"
        >
          <div className="flex items-center gap-2">
            {collapsed ? (
              <ChevronRight size={16} className="text-stone-400" />
            ) : (
              <ChevronDown size={16} className="text-stone-400" />
            )}
            <h3 className="text-sm font-semibold text-stone-700">{title}</h3>
            <span className="text-xs text-stone-400 ml-1">
              ({applications.length})
            </span>
          </div>
        </button>
      ) : (
        <div className="px-4 py-3 bg-stone-50/80 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-stone-700">{title}</h3>
            <span className="text-xs text-stone-400">
              ({applications.length})
            </span>
          </div>
        </div>
      )}

      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50/40">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                  Applicant
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                  Referred From
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                  Applied
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                  Package Interest
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                  Scheduled Call
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {applications.map((app) => (
                <ApplicationRow
                  key={app.id}
                  app={app}
                  expanded={expandedId === app.id}
                  onToggleExpand={() =>
                    setExpandedId(expandedId === app.id ? null : app.id)
                  }
                  onUpdate={onUpdate}
                  updating={updatingId === app.id}
                  onNavigateToClient={onNavigateToClient}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
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
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionRequiredFilter, setActionRequiredFilter] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  // Update state
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

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
      const res = await fetch(`${API_BASE}/coaching/applications`, {
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
  }, [accessToken, error]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Handle update (status, referredFrom, scheduledCallAt, notes, etc.)
  const handleUpdate = useCallback(
    async (id: string, data: Record<string, unknown>) => {
      setUpdatingId(id);
      try {
        const res = await fetch(`${API_BASE}/coaching/applications/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update application');

        const updated = await res.json();

        // Merge the full response into local state so bookingId etc. are picked up
        setApplications((prev) =>
          prev.map((app) => (app.id === id ? { ...app, ...updated } : app))
        );

        // Show appropriate toast
        if (data.status === 'complete_promoted') {
          success(
            'Application marked as complete. Client record has been created.'
          );
        } else if (data.status) {
          success(
            `Status updated to "${STATUS_LABELS[data.status as ApplicationStatus]}".`
          );
        } else if (data.scheduledCallAt) {
          success('Call scheduled successfully.');
        } else if (data.referredFrom !== undefined) {
          success('Referral source updated.');
        } else if (data.notes !== undefined) {
          success('Notes saved.');
        } else {
          success('Application updated.');
        }
      } catch {
        error('Could not update application.');
      } finally {
        setUpdatingId(null);
      }
    },
    [accessToken, success, error]
  );

  // Create new application
  const handleCreate = async (formData: { name: string; email: string; phone?: string; reason?: string; referredFrom?: string }) => {
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/coaching/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create application');
      }
      const created = await res.json();
      setApplications((prev) => [created, ...prev]);
      setShowCreateModal(false);
      success('Application added successfully.');
    } catch (err: any) {
      error(err.message || 'Could not create application.');
    } finally {
      setCreating(false);
    }
  };

  // Filter by search locally
  const searchFiltered = debouncedSearch
    ? applications.filter(
        (app) =>
          app.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          app.email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          (app.reason &&
            app.reason.toLowerCase().includes(debouncedSearch.toLowerCase()))
      )
    : applications;

  // Split into active and historical
  const activeApplications = searchFiltered.filter((app) =>
    ACTIVE_STATUSES.includes(app.status)
  );
  const historicalApplications = searchFiltered.filter((app) =>
    HISTORICAL_STATUSES.includes(app.status)
  );

  // Apply action required filter to active only
  const displayedActive = actionRequiredFilter
    ? activeApplications.filter((app) =>
        ACTION_REQUIRED_STATUSES.includes(app.status)
      )
    : activeApplications;

  // Compute counts (from all unfiltered applications)
  const totalActive = applications.filter((app) =>
    ACTIVE_STATUSES.includes(app.status)
  ).length;
  const actionRequiredCount = applications.filter((app) =>
    ACTION_REQUIRED_STATUSES.includes(app.status)
  ).length;
  const scheduledCount = applications.filter(
    (app) => app.status === 'scheduled'
  ).length;
  const completedCount = applications.filter((app) =>
    HISTORICAL_STATUSES.includes(app.status)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-serif font-semibold text-stone-900">
            Applications
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Review coaching applications and manage the intake pipeline
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: '#8d3038' }}
        >
          <Plus className="w-4 h-4" />
          Add Application
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label="Total Active"
          value={totalActive}
          borderColor="#78716c"
          accent="bg-stone-100 text-stone-600"
        />
        <StatCard
          icon={AlertCircle}
          label="Action Required"
          value={actionRequiredCount}
          borderColor="#ea580c"
          accent="bg-orange-100 text-orange-700"
        />
        <StatCard
          icon={CheckCircle2}
          label="Scheduled"
          value={scheduledCount}
          borderColor="#16a34a"
          accent="bg-green-100 text-green-700"
        />
        <StatCard
          icon={Sparkles}
          label="Completed"
          value={completedCount}
          borderColor="#059669"
          accent="bg-emerald-100 text-emerald-700"
        />
      </div>

      {/* Search + Action Required filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Search */}
        <div className="relative max-w-sm flex-1">
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

        {/* Action Required toggle */}
        <button
          onClick={() => setActionRequiredFilter(!actionRequiredFilter)}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
            actionRequiredFilter
              ? 'bg-orange-50 border-orange-200 text-orange-700'
              : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          <AlertCircle size={15} />
          Action Required
          {actionRequiredCount > 0 && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                actionRequiredFilter
                  ? 'bg-orange-200 text-orange-800'
                  : 'bg-stone-200 text-stone-600'
              }`}
            >
              {actionRequiredCount}
            </span>
          )}
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="bg-white rounded-lg border border-stone-200 shadow-sm">
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-stone-400 mb-3" />
            <p className="text-sm text-stone-500">Loading applications...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Active Applications table */}
          {displayedActive.length > 0 ? (
            <ApplicationTable
              title="Active Applications"
              applications={displayedActive}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              onUpdate={handleUpdate}
              updatingId={updatingId}
              onNavigateToClient={(clientId) =>
                navigate(`/admin/coaching/clients/${clientId}`)
              }
            />
          ) : (
            <div className="bg-white rounded-lg border border-stone-200 shadow-sm">
              <div className="px-4 py-3 bg-stone-50/80 border-b border-stone-100">
                <h3 className="text-sm font-semibold text-stone-700">
                  Active Applications
                </h3>
              </div>
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-4">
                  <FileText size={28} className="text-stone-400" />
                </div>
                <h3 className="text-lg font-semibold text-stone-800 mb-1">
                  {debouncedSearch || actionRequiredFilter
                    ? 'No applications match your filters'
                    : 'No active applications'}
                </h3>
                <p className="text-sm text-stone-500">
                  {debouncedSearch || actionRequiredFilter
                    ? 'Try adjusting your search or filters.'
                    : 'New coaching applications will appear here when people apply through your website.'}
                </p>
              </div>
            </div>
          )}

          {/* Historical Applications table */}
          {!actionRequiredFilter && (
            <ApplicationTable
              title="Historical Applications"
              applications={historicalApplications}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              onUpdate={handleUpdate}
              updatingId={updatingId}
              onNavigateToClient={(clientId) =>
                navigate(`/admin/coaching/clients/${clientId}`)
              }
              collapsible
              defaultCollapsed
            />
          )}
        </>
      )}

      {/* Create Application Modal */}
      {showCreateModal && (
        <CreateApplicationModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
          creating={creating}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Application Modal
// ---------------------------------------------------------------------------

function CreateApplicationModal({
  onClose,
  onCreate,
  creating,
}: {
  onClose: () => void;
  onCreate: (data: { name: string; email: string; phone?: string; reason?: string; referredFrom?: string }) => void;
  creating: boolean;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [referredFrom, setReferredFrom] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      reason: reason.trim() || undefined,
      referredFrom: referredFrom || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="text-lg font-semibold text-stone-900">Add Application</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-stone-100 transition-colors">
            <X size={18} className="text-stone-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Full name"
              className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#8d3038]/20 focus:border-[#8d3038]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@example.com"
              className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#8d3038]/20 focus:border-[#8d3038]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#8d3038]/20 focus:border-[#8d3038]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Reason / Context</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What are they looking for? (e.g., Instagram DM about coaching)"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#8d3038]/20 focus:border-[#8d3038] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Source</label>
            <select
              value={referredFrom}
              onChange={(e) => setReferredFrom(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#8d3038]/20 focus:border-[#8d3038]"
            >
              <option value="">Not specified</option>
              <option value="instagram_dm">Instagram DM</option>
              <option value="facebook">Facebook</option>
              <option value="email_direct">Direct Email</option>
              <option value="referral">Referral</option>
              <option value="in_person">In Person</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !name.trim() || !email.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#8d3038' }}
            >
              {creating ? 'Adding...' : 'Add Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
