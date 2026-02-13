import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE } from '../config/api';
import {
  ArrowLeft, Save, Loader2, Check, AlertCircle, Trash2, Copy,
  Plus, X, Calendar, Clock, Users as UsersIcon, DollarSign,
  MapPin, Video, GripVertical,
  BarChart3, CheckCircle, XCircle, AlertTriangle,
  Play, Square, Ban, UserPlus, ClipboardList,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CohortStatus = 'draft' | 'open' | 'closed' | 'in_progress' | 'completed' | 'cancelled';
type DeliveryMode = 'in_person' | 'online' | 'hybrid';
type SessionStatus = 'scheduled' | 'completed' | 'cancelled';
type EnrollmentStatus = 'active' | 'waitlisted' | 'cancelled' | 'completed' | 'refunded' | 'no_show';
type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
type PaymentMethod = 'stripe' | 'manual' | 'free' | 'other';
type TabKey = 'details' | 'sessions' | 'enrollments' | 'attendance' | 'stats';

interface CohortData {
  id?: string;
  workshopId: string;
  title: string;
  description: string;
  internalNotes: string;
  status: CohortStatus;
  startDate: string;
  endDate: string;
  timezone: string;
  registrationOpens: string;
  registrationCloses: string;
  price: string;
  compareAtPrice: string;
  earlyBirdPrice: string;
  earlyBirdEnds: string;
  currency: string;
  maxCapacity: number | null;
  enrolledCount: number;
  waitlistEnabled: boolean;
  waitlistCapacity: number | null;
  waitlistCount: number;
  deliveryMode: DeliveryMode;
  locationLabel: string;
  locationAddress: string;
  meetingUrl: string;
  instructorName: string;
  instructorEmail: string;
  createdAt?: string;
  updatedAt?: string;
}

interface WorkshopOption {
  id: string;
  title: string;
  type: string;
}

interface SessionData {
  id: string;
  cohortId: string;
  sessionNumber: number;
  title: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: SessionStatus;
  locationLabel: string;
  meetingUrl: string;
  notes: string;
}

interface EnrollmentData {
  id: string;
  cohortId: string;
  customerName: string;
  customerEmail: string;
  status: EnrollmentStatus;
  pricePaid: string;
  paymentMethod: PaymentMethod;
  internalNotes: string;
  enrolledAt: string;
}

interface AttendanceRecord {
  enrollmentId: string;
  customerName: string;
  customerEmail: string;
  status: AttendanceStatus;
}

interface CohortStats {
  enrolled: number;
  capacity: number | null;
  waitlist: number;
  revenue: number;
  attendanceRate: number;
  sessionsCompleted: number;
  sessionsTotal: number;
  completionRate: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMPTY_COHORT: CohortData = {
  workshopId: '',
  title: '',
  description: '',
  internalNotes: '',
  status: 'draft',
  startDate: '',
  endDate: '',
  timezone: 'Australia/Sydney',
  registrationOpens: '',
  registrationCloses: '',
  price: '',
  compareAtPrice: '',
  earlyBirdPrice: '',
  earlyBirdEnds: '',
  currency: 'AUD',
  maxCapacity: null,
  enrolledCount: 0,
  waitlistEnabled: false,
  waitlistCapacity: null,
  waitlistCount: 0,
  deliveryMode: 'online',
  locationLabel: '',
  locationAddress: '',
  meetingUrl: '',
  instructorName: '',
  instructorEmail: '',
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

const CURRENCIES = ['AUD', 'USD', 'NZD'];

const TABS: { key: TabKey; label: string }[] = [
  { key: 'details', label: 'Details' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'enrollments', label: 'Enrollments' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'stats', label: 'Stats' },
];

const inputClass =
  'w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function formatDate(iso: string): string {
  if (!iso) return '--';
  try {
    return new Date(iso).toLocaleDateString('en-AU', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return '--';
  }
}

function formatDateTime(iso: string): string {
  if (!iso) return '--';
  try {
    return new Date(iso).toLocaleDateString('en-AU', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '--';
  }
}

function formatCurrency(amount: number | string, currency: string = 'AUD'): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return '$0.00';
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(n);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: CohortStatus }) {
  const styles: Record<CohortStatus, string> = {
    draft: 'bg-stone-100 text-stone-700',
    open: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  const labels: Record<CohortStatus, string> = {
    draft: 'Draft',
    open: 'Open',
    closed: 'Closed',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
}

function SessionStatusBadge({ status }: { status: SessionStatus }) {
  const styles: Record<SessionStatus, string> = {
    scheduled: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || styles.scheduled}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function EnrollmentStatusBadge({ status }: { status: EnrollmentStatus }) {
  const styles: Record<EnrollmentStatus, string> = {
    active: 'bg-green-100 text-green-700',
    waitlisted: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-emerald-100 text-emerald-700',
    refunded: 'bg-purple-100 text-purple-700',
    no_show: 'bg-stone-100 text-stone-700',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || styles.active}`}>
      {status === 'no_show' ? 'No Show' : status.charAt(0).toUpperCase() + status.slice(1)}
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

function Toggle({ checked, onChange, label, description }: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-sm text-stone-700">{label}</span>
        {description && <p className="text-xs text-stone-400">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          checked ? 'bg-stone-900' : 'bg-stone-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  );
}

function CapacityBar({ enrolled, capacity, waitlist }: {
  enrolled: number;
  capacity: number | null;
  waitlist?: number;
}) {
  const pct = capacity ? Math.min((enrolled / capacity) * 100, 100) : 0;
  const isFull = capacity !== null && enrolled >= capacity;

  return (
    <div className="space-y-2">
      {capacity !== null && capacity > 0 && (
        <div className="w-full bg-stone-100 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all ${isFull ? 'bg-red-500' : 'bg-emerald-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <div className="flex items-center justify-between text-sm">
        <span className="text-stone-600">
          {enrolled} {capacity !== null ? `of ${capacity}` : ''} enrolled
          {capacity === null && ' (unlimited)'}
        </span>
        {isFull && (
          <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Full</span>
        )}
      </div>
      {waitlist !== undefined && waitlist > 0 && (
        <p className="text-xs text-amber-600">{waitlist} on waitlist</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CohortEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const toast = useToast();
  const isNew = !id || id === 'new';

  // Core state
  const [data, setData] = useState<CohortData>({ ...EMPTY_COHORT });
  const [cohortId, setCohortId] = useState<string | undefined>(isNew ? undefined : id);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<TabKey>('details');

  // Workshop options for parent selector
  const [workshops, setWorkshops] = useState<WorkshopOption[]>([]);

  // Sessions state
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionData | null>(null);
  const [showBulkAdd, setShowBulkAdd] = useState(false);

  // Enrollments state
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);

  // Attendance state
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceDirty, setAttendanceDirty] = useState(false);

  // Stats state
  const [stats, setStats] = useState<CohortStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Autosave
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hasChanges = useRef(false);
  const lastSavedData = useRef<string>('');

  // ---------- Fetch helpers ----------

  const authHeaders = useCallback((): HeadersInit => {
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  }, [accessToken]);

  const jsonHeaders = useCallback((): HeadersInit => {
    return {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };
  }, [accessToken]);

  // ---------- Load workshops for dropdown ----------

  useEffect(() => {
    const loadWorkshops = async () => {
      try {
        const res = await fetch(`${API_BASE}/learn?all=true&pageSize=100`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const result = await res.json();
          const items = Array.isArray(result) ? result : (result.items || result.data || []);
          setWorkshops(items.map((w: any) => ({ id: w.id, title: w.title, type: w.type })));
        }
      } catch {
        // Non-critical, workshops dropdown may be empty
      }
    };
    loadWorkshops();
  }, [accessToken]);

  // ---------- Load existing cohort ----------

  useEffect(() => {
    if (isNew) return;

    const loadCohort = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/cohorts/${id}`, {
          headers: authHeaders(),
        });
        if (!res.ok) {
          if (res.status === 404) {
            toast.error('Cohort not found.');
            navigate('/admin/cohorts');
            return;
          }
          throw new Error('Failed to load cohort');
        }

        const raw = await res.json();
        const cohortData: CohortData = {
          id: raw.id,
          workshopId: raw.workshopId || '',
          title: raw.title || '',
          description: raw.description || '',
          internalNotes: raw.internalNotes || '',
          status: raw.status || 'draft',
          startDate: raw.startDate || '',
          endDate: raw.endDate || '',
          timezone: raw.timezone || 'Australia/Sydney',
          registrationOpens: raw.registrationOpens || '',
          registrationCloses: raw.registrationCloses || '',
          price: raw.price || '',
          compareAtPrice: raw.compareAtPrice || '',
          earlyBirdPrice: raw.earlyBirdPrice || '',
          earlyBirdEnds: raw.earlyBirdEnds || '',
          currency: raw.currency || 'AUD',
          maxCapacity: raw.maxCapacity ?? null,
          enrolledCount: raw.enrolledCount || 0,
          waitlistEnabled: !!raw.waitlistEnabled,
          waitlistCapacity: raw.waitlistCapacity ?? null,
          waitlistCount: raw.waitlistCount || 0,
          deliveryMode: raw.deliveryMode || 'online',
          locationLabel: raw.locationLabel || '',
          locationAddress: raw.locationAddress || '',
          meetingUrl: raw.meetingUrl || '',
          instructorName: raw.instructorName || '',
          instructorEmail: raw.instructorEmail || '',
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
        };

        setData(cohortData);
        setCohortId(raw.id);
        lastSavedData.current = JSON.stringify(cohortData);
      } catch {
        toast.error('Could not load cohort.');
        navigate('/admin/cohorts');
      } finally {
        setLoading(false);
      }
    };

    loadCohort();
  }, [id, isNew, accessToken, navigate]);

  // ---------- Load tab data when tab changes ----------

  useEffect(() => {
    if (!cohortId) return;

    if (activeTab === 'sessions') loadSessions();
    if (activeTab === 'enrollments') loadEnrollments();
    if (activeTab === 'attendance') { loadSessions(); }
    if (activeTab === 'stats') loadStats();
  }, [activeTab, cohortId]);

  // ---------- Update field helper ----------

  const updateField = useCallback((field: keyof CohortData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    hasChanges.current = true;
  }, []);

  // ---------- Autosave (Details tab only) ----------

  useEffect(() => {
    if (!hasChanges.current || activeTab !== 'details') return;

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      saveCohort(false);
    }, 1500);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [data]);

  // ---------- Save cohort ----------

  const saveCohort = useCallback(async (showFeedback = true): Promise<string | null> => {
    const currentData = JSON.stringify(data);
    if (currentData === lastSavedData.current && cohortId) {
      if (showFeedback) toast.success('No changes to save.');
      return cohortId;
    }

    setSaving(true);
    setSaveStatus('saving');

    try {
      const method = cohortId ? 'PUT' : 'POST';
      const url = cohortId ? `${API_BASE}/cohorts/${cohortId}` : `${API_BASE}/cohorts`;

      const payload: Record<string, any> = { ...data };
      delete payload.id;
      delete payload.enrolledCount;
      delete payload.waitlistCount;
      delete payload.createdAt;
      delete payload.updatedAt;

      const res = await fetch(url, {
        method,
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        throw new Error(err.error || 'Save failed');
      }

      const saved = await res.json();

      if (!cohortId) {
        setCohortId(saved.id);
        setData(prev => ({ ...prev, id: saved.id }));
        window.history.replaceState(null, '', `#/admin/cohorts/${saved.id}`);
      }

      lastSavedData.current = JSON.stringify(data);
      hasChanges.current = false;
      setSaveStatus('saved');
      if (showFeedback) toast.success('Cohort saved.');

      return saved.id || cohortId;
    } catch (err: any) {
      setSaveStatus('error');
      if (showFeedback) toast.error(err.message || 'Could not save cohort.');
      return null;
    } finally {
      setSaving(false);
    }
  }, [data, cohortId, accessToken]);

  // ---------- Status transitions ----------

  const transitionStatus = async (newStatus: CohortStatus) => {
    if (!cohortId) {
      const savedId = await saveCohort(false);
      if (!savedId) return;
    }

    const targetId = cohortId || data.id;
    if (!targetId) return;

    if (newStatus === 'cancelled') {
      if (!window.confirm('Are you sure you want to cancel this cohort? Enrolled participants will be notified.')) return;
    }

    try {
      const res = await fetch(`${API_BASE}/cohorts/${targetId}/status`, {
        method: 'PUT',
        headers: jsonHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Status change failed' }));
        throw new Error(err.error || 'Status change failed');
      }

      setData(prev => ({ ...prev, status: newStatus }));
      lastSavedData.current = JSON.stringify({ ...data, status: newStatus });
      hasChanges.current = false;
      toast.success(`Cohort status updated to ${newStatus.replace('_', ' ')}.`);
    } catch (err: any) {
      toast.error(err.message || 'Could not change status.');
    }
  };

  // ---------- Duplicate ----------

  const handleDuplicate = async () => {
    if (!cohortId) return;
    try {
      const res = await fetch(`${API_BASE}/cohorts/${cohortId}/duplicate`, {
        method: 'POST',
        headers: authHeaders(),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Duplicate failed' }));
        throw new Error(err.error || 'Duplicate failed');
      }

      const dup = await res.json();
      toast.success('Cohort duplicated.');
      navigate(`/admin/cohorts/${dup.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Could not duplicate cohort.');
    }
  };

  // ---------- Delete ----------

  const handleDelete = async () => {
    if (!cohortId) return;
    if (!window.confirm('Are you sure you want to delete this cohort? This cannot be undone.')) return;

    try {
      const res = await fetch(`${API_BASE}/cohorts/${cohortId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }));
        throw new Error(err.error || 'Delete failed');
      }

      toast.success('Cohort deleted.');
      navigate('/admin/cohorts');
    } catch (err: any) {
      toast.error(err.message || 'Could not delete cohort.');
    }
  };

  // =========================================================================
  // SESSIONS
  // =========================================================================

  const loadSessions = async () => {
    if (!cohortId) return;
    setSessionsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/cohorts/${cohortId}/sessions`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const result = await res.json();
        const items = Array.isArray(result) ? result : (result.items || result.data || []);
        setSessions(items.sort((a: SessionData, b: SessionData) => a.sessionNumber - b.sessionNumber));
      }
    } catch {
      toast.error('Could not load sessions.');
    } finally {
      setSessionsLoading(false);
    }
  };

  const saveSession = async (sessionData: Partial<SessionData>) => {
    if (!cohortId) return;

    const isEditing = !!sessionData.id;
    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing
      ? `${API_BASE}/cohorts/${cohortId}/sessions/${sessionData.id}`
      : `${API_BASE}/cohorts/${cohortId}/sessions`;

    try {
      const res = await fetch(url, {
        method,
        headers: jsonHeaders(),
        body: JSON.stringify(sessionData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        throw new Error(err.error || 'Session save failed');
      }

      toast.success(isEditing ? 'Session updated.' : 'Session added.');
      setShowSessionForm(false);
      setEditingSession(null);
      await loadSessions();
    } catch (err: any) {
      toast.error(err.message || 'Could not save session.');
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!cohortId) return;
    if (!window.confirm('Delete this session?')) return;

    try {
      const res = await fetch(`${API_BASE}/cohorts/${cohortId}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error('Delete failed');
      toast.success('Session deleted.');
      await loadSessions();
    } catch (err: any) {
      toast.error(err.message || 'Could not delete session.');
    }
  };

  const bulkAddSessions = async (bulkData: {
    count: number;
    startDate: string;
    recurrence: 'weekly' | 'fortnightly' | 'custom';
    dayOfWeek?: number;
    time: string;
    duration: number;
  }) => {
    if (!cohortId) return;

    try {
      const res = await fetch(`${API_BASE}/cohorts/${cohortId}/sessions/bulk`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(bulkData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Bulk add failed' }));
        throw new Error(err.error || 'Bulk add failed');
      }

      toast.success(`${bulkData.count} sessions created.`);
      setShowBulkAdd(false);
      await loadSessions();
    } catch (err: any) {
      toast.error(err.message || 'Could not create sessions.');
    }
  };

  // =========================================================================
  // ENROLLMENTS
  // =========================================================================

  const loadEnrollments = async () => {
    if (!cohortId) return;
    setEnrollmentsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/cohorts/${cohortId}/enrollments`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const result = await res.json();
        const items = Array.isArray(result) ? result : (result.items || result.data || []);
        setEnrollments(items);
      }
    } catch {
      toast.error('Could not load enrollments.');
    } finally {
      setEnrollmentsLoading(false);
    }
  };

  const addEnrollment = async (enrollment: {
    customerName: string;
    customerEmail: string;
    pricePaid: string;
    paymentMethod: PaymentMethod;
    internalNotes: string;
  }) => {
    if (!cohortId) return;

    try {
      const res = await fetch(`${API_BASE}/cohorts/${cohortId}/enrollments`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(enrollment),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Add failed' }));
        throw new Error(err.error || 'Enrollment add failed');
      }

      toast.success('Enrollment added.');
      setShowEnrollmentForm(false);
      await loadEnrollments();
      // Update enrolled count
      setData(prev => ({ ...prev, enrolledCount: prev.enrolledCount + 1 }));
    } catch (err: any) {
      toast.error(err.message || 'Could not add enrollment.');
    }
  };

  const cancelEnrollment = async (enrollmentId: string) => {
    if (!cohortId) return;
    const reason = window.prompt('Cancellation reason (optional):');
    if (reason === null) return; // user clicked Cancel

    try {
      const res = await fetch(`${API_BASE}/cohorts/${cohortId}/enrollments/${enrollmentId}/cancel`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Cancel failed' }));
        throw new Error(err.error || 'Enrollment cancel failed');
      }

      toast.success('Enrollment cancelled.');
      await loadEnrollments();
      setData(prev => ({ ...prev, enrolledCount: Math.max(0, prev.enrolledCount - 1) }));
    } catch (err: any) {
      toast.error(err.message || 'Could not cancel enrollment.');
    }
  };

  // =========================================================================
  // ATTENDANCE
  // =========================================================================

  const loadAttendance = async (sessionId: string) => {
    if (!cohortId || !sessionId) return;
    setAttendanceLoading(true);
    try {
      const res = await fetch(`${API_BASE}/cohorts/${cohortId}/sessions/${sessionId}/attendance`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const result = await res.json();
        const items = Array.isArray(result) ? result : (result.records || result.items || result.data || []);
        setAttendanceRecords(items);
        setAttendanceDirty(false);
      }
    } catch {
      toast.error('Could not load attendance.');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const saveAttendance = async () => {
    if (!cohortId || !selectedSessionId) return;

    try {
      const res = await fetch(`${API_BASE}/cohorts/${cohortId}/sessions/${selectedSessionId}/attendance`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ records: attendanceRecords }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }));
        throw new Error(err.error || 'Attendance save failed');
      }

      toast.success('Attendance saved.');
      setAttendanceDirty(false);
    } catch (err: any) {
      toast.error(err.message || 'Could not save attendance.');
    }
  };

  const updateAttendanceStatus = (enrollmentId: string, status: AttendanceStatus) => {
    setAttendanceRecords(prev =>
      prev.map(r => r.enrollmentId === enrollmentId ? { ...r, status } : r)
    );
    setAttendanceDirty(true);
  };

  const markAllAttendance = (status: AttendanceStatus) => {
    setAttendanceRecords(prev => prev.map(r => ({ ...r, status })));
    setAttendanceDirty(true);
  };

  // =========================================================================
  // STATS
  // =========================================================================

  const loadStats = async () => {
    if (!cohortId) return;
    setStatsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/cohorts/${cohortId}/stats`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const result = await res.json();
        setStats(result);
      }
    } catch {
      toast.error('Could not load stats.');
    } finally {
      setStatsLoading(false);
    }
  };

  // =========================================================================
  // Loading state
  // =========================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="text-stone-400 animate-spin" />
      </div>
    );
  }

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="min-h-screen -m-4 lg:-m-6">

      {/* ================================================================= */}
      {/* TOP BAR                                                            */}
      {/* ================================================================= */}
      <div className="sticky top-0 z-20 bg-white border-b border-stone-200 px-4 lg:px-6 py-3">
        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/admin/cohorts')}
            className="p-1.5 hover:bg-stone-100 rounded-md transition text-stone-500"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-stone-900 truncate">
                {isNew ? 'New Cohort' : (data.title || 'Untitled Cohort')}
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

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Status transition buttons */}
            {data.status === 'draft' && (
              <button
                onClick={() => transitionStatus('open')}
                className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-md px-3 h-8 text-sm font-medium transition-colors inline-flex items-center gap-1.5"
              >
                <Play size={14} /> Open Registration
              </button>
            )}
            {data.status === 'open' && (
              <button
                onClick={() => transitionStatus('closed')}
                className="bg-amber-600 text-white hover:bg-amber-700 rounded-md px-3 h-8 text-sm font-medium transition-colors inline-flex items-center gap-1.5"
              >
                <Square size={14} /> Close Registration
              </button>
            )}
            {data.status === 'closed' && (
              <button
                onClick={() => transitionStatus('in_progress')}
                className="bg-blue-600 text-white hover:bg-blue-700 rounded-md px-3 h-8 text-sm font-medium transition-colors inline-flex items-center gap-1.5"
              >
                <Play size={14} /> Start
              </button>
            )}
            {data.status === 'in_progress' && (
              <button
                onClick={() => transitionStatus('completed')}
                className="bg-green-600 text-white hover:bg-green-700 rounded-md px-3 h-8 text-sm font-medium transition-colors inline-flex items-center gap-1.5"
              >
                <CheckCircle size={14} /> Complete
              </button>
            )}

            {cohortId && (
              <>
                <button
                  onClick={handleDuplicate}
                  className="bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-md px-3 h-8 text-sm font-medium transition-colors inline-flex items-center gap-1.5"
                  title="Duplicate cohort"
                >
                  <Copy size={14} />
                </button>

                {data.status !== 'cancelled' && (
                  <button
                    onClick={() => transitionStatus('cancelled')}
                    className="bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-md px-3 h-8 text-sm font-medium transition-colors inline-flex items-center gap-1.5"
                    title="Cancel cohort"
                  >
                    <Ban size={14} />
                  </button>
                )}

                <button
                  onClick={handleDelete}
                  className="p-1.5 hover:bg-red-50 rounded-md transition text-red-500"
                  title="Delete cohort"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* TAB NAVIGATION                                                     */}
      {/* ================================================================= */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <nav className="flex gap-0 -mb-px">
            {TABS.map(tab => {
              const isDisabled = isNew && tab.key !== 'details';
              return (
                <button
                  key={tab.key}
                  onClick={() => !isDisabled && setActiveTab(tab.key)}
                  disabled={isDisabled}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-stone-900 text-stone-900'
                      : isDisabled
                        ? 'border-transparent text-stone-300 cursor-not-allowed'
                        : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ================================================================= */}
      {/* TAB CONTENT                                                        */}
      {/* ================================================================= */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">

        {/* ============================================================= */}
        {/* TAB: DETAILS                                                    */}
        {/* ============================================================= */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left column (2/3) */}
            <div className="lg:col-span-2 space-y-6">

              <Card title="Cohort Details">
                <div>
                  <FieldLabel label="Parent Workshop" required />
                  <select
                    value={data.workshopId}
                    onChange={(e) => updateField('workshopId', e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select a workshop...</option>
                    {workshops.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.title} {w.type ? `(${w.type})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <FieldLabel label="Title" />
                  <input
                    type="text"
                    value={data.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder="Cohort title (e.g., March 2026 Evening Class)"
                    className={inputClass}
                  />
                </div>

                <div>
                  <FieldLabel label="Description" />
                  <textarea
                    value={data.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Public description for this cohort..."
                    rows={4}
                    className={`${inputClass} resize-none`}
                  />
                </div>

                <div>
                  <FieldLabel label="Internal Notes" />
                  <textarea
                    value={data.internalNotes}
                    onChange={(e) => updateField('internalNotes', e.target.value)}
                    placeholder="Admin-only notes (not shown publicly)"
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                  <p className="text-xs text-stone-400 mt-1">Only visible to admins.</p>
                </div>
              </Card>
            </div>

            {/* Right column (1/3) */}
            <div className="space-y-6">

              {/* Status Card */}
              <Card title="Status">
                <div className="flex items-center gap-2">
                  <StatusBadge status={data.status} />
                </div>
                <div className="space-y-2 pt-1">
                  {data.status === 'draft' && (
                    <button
                      onClick={() => transitionStatus('open')}
                      className="w-full bg-emerald-600 text-white hover:bg-emerald-700 rounded-md px-4 h-9 text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5"
                    >
                      <Play size={14} /> Open Registration
                    </button>
                  )}
                  {data.status === 'open' && (
                    <button
                      onClick={() => transitionStatus('closed')}
                      className="w-full bg-amber-600 text-white hover:bg-amber-700 rounded-md px-4 h-9 text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5"
                    >
                      <Square size={14} /> Close Registration
                    </button>
                  )}
                  {data.status === 'closed' && (
                    <button
                      onClick={() => transitionStatus('in_progress')}
                      className="w-full bg-blue-600 text-white hover:bg-blue-700 rounded-md px-4 h-9 text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5"
                    >
                      <Play size={14} /> Start
                    </button>
                  )}
                  {data.status === 'in_progress' && (
                    <button
                      onClick={() => transitionStatus('completed')}
                      className="w-full bg-green-600 text-white hover:bg-green-700 rounded-md px-4 h-9 text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle size={14} /> Complete
                    </button>
                  )}
                  {data.status !== 'cancelled' && data.status !== 'completed' && (
                    <button
                      onClick={() => transitionStatus('cancelled')}
                      className="w-full bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-md px-4 h-9 text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5"
                    >
                      <Ban size={14} /> Cancel
                    </button>
                  )}
                </div>
              </Card>

              {/* Schedule Card */}
              <Card title="Schedule">
                <div>
                  <FieldLabel label="Start Date" />
                  <input
                    type="datetime-local"
                    value={toDatetimeLocal(data.startDate)}
                    onChange={(e) => updateField('startDate', fromDatetimeLocal(e.target.value))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel label="End Date" />
                  <input
                    type="datetime-local"
                    value={toDatetimeLocal(data.endDate)}
                    onChange={(e) => updateField('endDate', fromDatetimeLocal(e.target.value))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel label="Timezone" />
                  <select
                    value={data.timezone}
                    onChange={(e) => updateField('timezone', e.target.value)}
                    className={inputClass}
                  >
                    {TIMEZONES.map(tz => (
                      <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel label="Registration Opens" />
                  <input
                    type="datetime-local"
                    value={toDatetimeLocal(data.registrationOpens)}
                    onChange={(e) => updateField('registrationOpens', fromDatetimeLocal(e.target.value))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel label="Registration Closes" />
                  <input
                    type="datetime-local"
                    value={toDatetimeLocal(data.registrationCloses)}
                    onChange={(e) => updateField('registrationCloses', fromDatetimeLocal(e.target.value))}
                    className={inputClass}
                  />
                </div>
              </Card>

              {/* Pricing Card */}
              <Card title="Pricing">
                <div>
                  <FieldLabel label="Price" />
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">$</span>
                    <input
                      type="text"
                      value={data.price}
                      onChange={(e) => updateField('price', e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel label="Compare at Price" />
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">$</span>
                    <input
                      type="text"
                      value={data.compareAtPrice}
                      onChange={(e) => updateField('compareAtPrice', e.target.value)}
                      placeholder="Original price (crossed out)"
                      className="w-full pl-7 pr-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel label="Early Bird Price" />
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">$</span>
                    <input
                      type="text"
                      value={data.earlyBirdPrice}
                      onChange={(e) => updateField('earlyBirdPrice', e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel label="Early Bird Ends" />
                  <input
                    type="datetime-local"
                    value={toDatetimeLocal(data.earlyBirdEnds)}
                    onChange={(e) => updateField('earlyBirdEnds', fromDatetimeLocal(e.target.value))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel label="Currency" />
                  <select
                    value={data.currency}
                    onChange={(e) => updateField('currency', e.target.value)}
                    className={inputClass}
                  >
                    {CURRENCIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </Card>

              {/* Capacity Card */}
              <Card title="Capacity">
                <div>
                  <FieldLabel label="Max Capacity" />
                  <input
                    type="number"
                    value={data.maxCapacity ?? ''}
                    onChange={(e) => updateField('maxCapacity', e.target.value ? parseInt(e.target.value) : null)}
                    min="0"
                    placeholder="Leave blank for unlimited"
                    className={inputClass}
                  />
                </div>

                <CapacityBar
                  enrolled={data.enrolledCount}
                  capacity={data.maxCapacity}
                  waitlist={data.waitlistCount}
                />

                <Toggle
                  checked={data.waitlistEnabled}
                  onChange={(val) => updateField('waitlistEnabled', val)}
                  label="Enable Waitlist"
                  description="Allow signups when capacity is full"
                />

                {data.waitlistEnabled && (
                  <div>
                    <FieldLabel label="Waitlist Capacity" />
                    <input
                      type="number"
                      value={data.waitlistCapacity ?? ''}
                      onChange={(e) => updateField('waitlistCapacity', e.target.value ? parseInt(e.target.value) : null)}
                      min="0"
                      placeholder="Leave blank for unlimited"
                      className={inputClass}
                    />
                    {data.waitlistCount > 0 && (
                      <p className="text-xs text-amber-600 mt-1">{data.waitlistCount} currently on waitlist</p>
                    )}
                  </div>
                )}
              </Card>

              {/* Delivery Card */}
              <Card title="Delivery">
                <div>
                  <FieldLabel label="Delivery Mode" />
                  <select
                    value={data.deliveryMode}
                    onChange={(e) => updateField('deliveryMode', e.target.value as DeliveryMode)}
                    className={inputClass}
                  >
                    <option value="in_person">In Person</option>
                    <option value="online">Online</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>

                {(data.deliveryMode === 'in_person' || data.deliveryMode === 'hybrid') && (
                  <>
                    <div>
                      <FieldLabel label="Location Label" />
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
                    <div>
                      <FieldLabel label="Location Address" />
                      <input
                        type="text"
                        value={data.locationAddress}
                        onChange={(e) => updateField('locationAddress', e.target.value)}
                        placeholder="Full street address"
                        className={inputClass}
                      />
                    </div>
                  </>
                )}

                {(data.deliveryMode === 'online' || data.deliveryMode === 'hybrid') && (
                  <div>
                    <FieldLabel label="Meeting URL" />
                    <div className="flex items-center gap-2">
                      <Video size={14} className="text-stone-400 shrink-0" />
                      <input
                        type="url"
                        value={data.meetingUrl}
                        onChange={(e) => updateField('meetingUrl', e.target.value)}
                        placeholder="https://zoom.us/j/..."
                        className={`flex-1 ${inputClass}`}
                      />
                    </div>
                  </div>
                )}
              </Card>

              {/* Instructor Card */}
              <Card title="Instructor">
                <div>
                  <FieldLabel label="Instructor Name" />
                  <input
                    type="text"
                    value={data.instructorName}
                    onChange={(e) => updateField('instructorName', e.target.value)}
                    placeholder="Full name"
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel label="Instructor Email" />
                  <input
                    type="email"
                    value={data.instructorEmail}
                    onChange={(e) => updateField('instructorEmail', e.target.value)}
                    placeholder="email@example.com"
                    className={inputClass}
                  />
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB: SESSIONS                                                   */}
        {/* ============================================================= */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">

            {/* Action bar */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setEditingSession(null); setShowSessionForm(true); }}
                className="bg-stone-900 text-white hover:bg-stone-800 rounded-md px-4 h-9 text-sm font-medium transition-colors inline-flex items-center gap-1.5"
              >
                <Plus size={14} /> Add Session
              </button>
              <button
                onClick={() => setShowBulkAdd(true)}
                className="bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-md px-4 h-9 text-sm font-medium transition-colors inline-flex items-center gap-1.5"
              >
                <Calendar size={14} /> Bulk Add Sessions
              </button>
            </div>

            {/* Session Form (inline) */}
            {showSessionForm && (
              <SessionForm
                initialData={editingSession}
                nextNumber={sessions.length + 1}
                onSave={saveSession}
                onCancel={() => { setShowSessionForm(false); setEditingSession(null); }}
              />
            )}

            {/* Bulk Add Form */}
            {showBulkAdd && (
              <BulkAddForm
                onSubmit={bulkAddSessions}
                onCancel={() => setShowBulkAdd(false)}
              />
            )}

            {/* Session List */}
            {sessionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="text-stone-400 animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="bg-white rounded-lg border border-stone-200 p-8 text-center">
                <Calendar size={32} className="text-stone-300 mx-auto mb-3" />
                <p className="text-sm text-stone-500">No sessions yet.</p>
                <p className="text-xs text-stone-400 mt-1">Add individual sessions or use bulk add to create a recurring schedule.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200">
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider w-12">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Date / Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Duration</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Location</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {sessions.map(session => (
                      <tr key={session.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <GripVertical size={14} className="text-stone-300" />
                            <span className="text-sm text-stone-600 font-medium">{session.sessionNumber}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-800">{session.title || `Session ${session.sessionNumber}`}</td>
                        <td className="px-4 py-3 text-sm text-stone-600">{formatDateTime(session.startTime)}</td>
                        <td className="px-4 py-3 text-sm text-stone-600">{session.durationMinutes ? `${session.durationMinutes} min` : '--'}</td>
                        <td className="px-4 py-3"><SessionStatusBadge status={session.status} /></td>
                        <td className="px-4 py-3 text-sm text-stone-500 truncate max-w-[150px]">
                          {session.locationLabel || session.meetingUrl || '--'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setEditingSession(session); setShowSessionForm(true); }}
                              className="text-xs text-stone-500 hover:text-stone-700 border border-stone-200 rounded px-2 py-1 hover:bg-white transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteSession(session.id)}
                              className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1 hover:bg-red-50 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB: ENROLLMENTS                                                */}
        {/* ============================================================= */}
        {activeTab === 'enrollments' && (
          <div className="space-y-4">

            {/* Capacity bar */}
            <div className="bg-white rounded-lg border border-stone-200 p-4">
              <CapacityBar
                enrolled={data.enrolledCount}
                capacity={data.maxCapacity}
                waitlist={data.waitlistCount}
              />
            </div>

            {/* Action bar */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowEnrollmentForm(true)}
                className="bg-stone-900 text-white hover:bg-stone-800 rounded-md px-4 h-9 text-sm font-medium transition-colors inline-flex items-center gap-1.5"
              >
                <UserPlus size={14} /> Add Enrollment
              </button>
            </div>

            {/* Enrollment Form */}
            {showEnrollmentForm && (
              <EnrollmentForm
                onSave={addEnrollment}
                onCancel={() => setShowEnrollmentForm(false)}
              />
            )}

            {/* Enrollment Table */}
            {enrollmentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="text-stone-400 animate-spin" />
              </div>
            ) : enrollments.length === 0 ? (
              <div className="bg-white rounded-lg border border-stone-200 p-8 text-center">
                <UsersIcon size={32} className="text-stone-300 mx-auto mb-3" />
                <p className="text-sm text-stone-500">No enrollments yet.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200">
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Price Paid</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Payment</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Enrolled</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {enrollments.map(enrollment => (
                      <tr key={enrollment.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-stone-800 font-medium">{enrollment.customerName}</td>
                        <td className="px-4 py-3 text-sm text-stone-600">{enrollment.customerEmail}</td>
                        <td className="px-4 py-3"><EnrollmentStatusBadge status={enrollment.status} /></td>
                        <td className="px-4 py-3 text-sm text-stone-600">{enrollment.pricePaid ? formatCurrency(enrollment.pricePaid, data.currency) : '--'}</td>
                        <td className="px-4 py-3 text-sm text-stone-500 capitalize">{enrollment.paymentMethod || '--'}</td>
                        <td className="px-4 py-3 text-sm text-stone-500">{formatDate(enrollment.enrolledAt)}</td>
                        <td className="px-4 py-3 text-right">
                          {enrollment.status === 'active' && (
                            <button
                              onClick={() => cancelEnrollment(enrollment.id)}
                              className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1 hover:bg-red-50 transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB: ATTENDANCE                                                 */}
        {/* ============================================================= */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">

            {/* Session selector */}
            <div className="bg-white rounded-lg border border-stone-200 p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <FieldLabel label="Select Session" />
                  <select
                    value={selectedSessionId}
                    onChange={(e) => {
                      setSelectedSessionId(e.target.value);
                      if (e.target.value) loadAttendance(e.target.value);
                    }}
                    className={inputClass}
                  >
                    <option value="">Choose a session...</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>
                        Session {s.sessionNumber}: {s.title || `Session ${s.sessionNumber}`} -- {formatDateTime(s.startTime)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Load sessions if not loaded */}
            {sessions.length === 0 && !sessionsLoading && (
              <div className="bg-white rounded-lg border border-stone-200 p-8 text-center">
                <ClipboardList size={32} className="text-stone-300 mx-auto mb-3" />
                <p className="text-sm text-stone-500">No sessions available.</p>
                <p className="text-xs text-stone-400 mt-1">Create sessions in the Sessions tab first.</p>
              </div>
            )}

            {/* Attendance grid */}
            {selectedSessionId && (
              <>
                {/* Quick actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => markAllAttendance('present')}
                    className="bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-md px-3 h-8 text-sm font-medium transition-colors inline-flex items-center gap-1.5"
                  >
                    <CheckCircle size={14} className="text-green-500" /> Mark All Present
                  </button>
                  <button
                    onClick={() => markAllAttendance('absent')}
                    className="bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-md px-3 h-8 text-sm font-medium transition-colors inline-flex items-center gap-1.5"
                  >
                    <XCircle size={14} className="text-red-500" /> Mark All Absent
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={saveAttendance}
                    disabled={!attendanceDirty}
                    className={`rounded-md px-4 h-9 text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
                      attendanceDirty
                        ? 'bg-stone-900 text-white hover:bg-stone-800'
                        : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                    }`}
                  >
                    <Save size={14} /> Save Attendance
                  </button>
                </div>

                {attendanceLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={20} className="text-stone-400 animate-spin" />
                  </div>
                ) : attendanceRecords.length === 0 ? (
                  <div className="bg-white rounded-lg border border-stone-200 p-8 text-center">
                    <ClipboardList size={32} className="text-stone-300 mx-auto mb-3" />
                    <p className="text-sm text-stone-500">No enrollments to track attendance for.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-200">
                          <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {attendanceRecords.map(record => (
                          <tr key={record.enrollmentId} className="hover:bg-stone-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-stone-800 font-medium">{record.customerName}</td>
                            <td className="px-4 py-3 text-sm text-stone-600">{record.customerEmail}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <AttendanceButton
                                  active={record.status === 'present'}
                                  onClick={() => updateAttendanceStatus(record.enrollmentId, 'present')}
                                  className="bg-green-100 text-green-700 border-green-200"
                                  activeClassName="bg-green-600 text-white border-green-600"
                                  label="Present"
                                  icon={<CheckCircle size={13} />}
                                />
                                <AttendanceButton
                                  active={record.status === 'absent'}
                                  onClick={() => updateAttendanceStatus(record.enrollmentId, 'absent')}
                                  className="bg-red-100 text-red-700 border-red-200"
                                  activeClassName="bg-red-600 text-white border-red-600"
                                  label="Absent"
                                  icon={<XCircle size={13} />}
                                />
                                <AttendanceButton
                                  active={record.status === 'late'}
                                  onClick={() => updateAttendanceStatus(record.enrollmentId, 'late')}
                                  className="bg-amber-100 text-amber-700 border-amber-200"
                                  activeClassName="bg-amber-600 text-white border-amber-600"
                                  label="Late"
                                  icon={<Clock size={13} />}
                                />
                                <AttendanceButton
                                  active={record.status === 'excused'}
                                  onClick={() => updateAttendanceStatus(record.enrollmentId, 'excused')}
                                  className="bg-stone-100 text-stone-700 border-stone-200"
                                  activeClassName="bg-stone-600 text-white border-stone-600"
                                  label="Excused"
                                  icon={<AlertTriangle size={13} />}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB: STATS                                                      */}
        {/* ============================================================= */}
        {activeTab === 'stats' && (
          <div>
            {statsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="text-stone-400 animate-spin" />
              </div>
            ) : !stats ? (
              <div className="bg-white rounded-lg border border-stone-200 p-8 text-center">
                <BarChart3 size={32} className="text-stone-300 mx-auto mb-3" />
                <p className="text-sm text-stone-500">No stats available yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard
                  title="Enrolled"
                  value={stats.capacity !== null ? `${stats.enrolled} / ${stats.capacity}` : `${stats.enrolled}`}
                  subtitle={stats.capacity !== null ? `${Math.round((stats.enrolled / stats.capacity) * 100)}% capacity` : 'Unlimited capacity'}
                  icon={<UsersIcon size={20} className="text-blue-500" />}
                />
                <StatCard
                  title="Waitlist"
                  value={`${stats.waitlist}`}
                  subtitle="Waiting for a spot"
                  icon={<Clock size={20} className="text-amber-500" />}
                />
                <StatCard
                  title="Revenue"
                  value={formatCurrency(stats.revenue, data.currency)}
                  subtitle="Total collected"
                  icon={<DollarSign size={20} className="text-emerald-500" />}
                />
                <StatCard
                  title="Attendance Rate"
                  value={`${Math.round(stats.attendanceRate)}%`}
                  subtitle="Average across sessions"
                  icon={<CheckCircle size={20} className="text-green-500" />}
                />
                <StatCard
                  title="Sessions Completed"
                  value={`${stats.sessionsCompleted} of ${stats.sessionsTotal}`}
                  subtitle={stats.sessionsTotal > 0 ? `${Math.round((stats.sessionsCompleted / stats.sessionsTotal) * 100)}% complete` : 'No sessions'}
                  icon={<Calendar size={20} className="text-purple-500" />}
                />
                <StatCard
                  title="Completion Rate"
                  value={`${Math.round(stats.completionRate)}%`}
                  subtitle="Enrollees who completed"
                  icon={<BarChart3 size={20} className="text-stone-500" />}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// Inline Sub-Components
// ===========================================================================

function AttendanceButton({ active, onClick, className, activeClassName, label, icon }: {
  active: boolean;
  onClick: () => void;
  className: string;
  activeClassName: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
        active ? activeClassName : className
      }`}
    >
      {icon} {label}
    </button>
  );
}

function StatCard({ title, value, subtitle, icon }: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-stone-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-stone-500">{title}</h3>
        {icon}
      </div>
      <p className="text-2xl font-semibold text-stone-900">{value}</p>
      <p className="text-xs text-stone-400 mt-1">{subtitle}</p>
    </div>
  );
}

// ===========================================================================
// Session Form
// ===========================================================================

function SessionForm({ initialData, nextNumber, onSave, onCancel }: {
  initialData: SessionData | null;
  nextNumber: number;
  onSave: (data: Partial<SessionData>) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [startTime, setStartTime] = useState(initialData?.startTime ? toDatetimeLocal(initialData.startTime) : '');
  const [endTime, setEndTime] = useState(initialData?.endTime ? toDatetimeLocal(initialData.endTime) : '');
  const [durationMinutes, setDurationMinutes] = useState(initialData?.durationMinutes || 60);
  const [locationLabel, setLocationLabel] = useState(initialData?.locationLabel || '');
  const [meetingUrl, setMeetingUrl] = useState(initialData?.meetingUrl || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSave({
        ...(initialData?.id ? { id: initialData.id } : {}),
        sessionNumber: initialData?.sessionNumber || nextNumber,
        title: title || `Session ${initialData?.sessionNumber || nextNumber}`,
        startTime: fromDatetimeLocal(startTime),
        endTime: endTime ? fromDatetimeLocal(endTime) : '',
        durationMinutes,
        locationLabel,
        meetingUrl,
        notes,
        status: initialData?.status || 'scheduled',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-stone-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-stone-800">
          {initialData ? 'Edit Session' : 'Add Session'}
        </h3>
        <button onClick={onCancel} className="p-1 hover:bg-stone-100 rounded-md transition">
          <X size={16} className="text-stone-500" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel label="Title" />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`Session ${initialData?.sessionNumber || nextNumber}`}
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel label="Duration (minutes)" />
          <input
            type="number"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
            min="0"
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel label="Date & Time" />
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel label="End Time (optional)" />
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel label="Location Label" />
          <input
            type="text"
            value={locationLabel}
            onChange={(e) => setLocationLabel(e.target.value)}
            placeholder="e.g., Room 3B"
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel label="Meeting URL" />
          <input
            type="url"
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <FieldLabel label="Notes" />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Session notes..."
          className={`${inputClass} resize-none`}
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-stone-900 text-white hover:bg-stone-800 rounded-md px-4 h-9 text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {initialData ? 'Update Session' : 'Add Session'}
        </button>
        <button
          onClick={onCancel}
          className="text-sm text-stone-500 hover:text-stone-700 px-3 h-9 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ===========================================================================
// Bulk Add Form
// ===========================================================================

function BulkAddForm({ onSubmit, onCancel }: {
  onSubmit: (data: {
    count: number;
    startDate: string;
    recurrence: 'weekly' | 'fortnightly' | 'custom';
    dayOfWeek?: number;
    time: string;
    duration: number;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [count, setCount] = useState(6);
  const [startDate, setStartDate] = useState('');
  const [recurrence, setRecurrence] = useState<'weekly' | 'fortnightly' | 'custom'>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [time, setTime] = useState('18:00');
  const [duration, setDuration] = useState(90);
  const [submitting, setSubmitting] = useState(false);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handleSubmit = async () => {
    if (!startDate) return;
    setSubmitting(true);
    try {
      await onSubmit({
        count,
        startDate: fromDatetimeLocal(`${startDate}T${time}`),
        recurrence,
        dayOfWeek: recurrence !== 'custom' ? dayOfWeek : undefined,
        time,
        duration,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-stone-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-stone-800">Bulk Add Sessions</h3>
        <button onClick={onCancel} className="p-1 hover:bg-stone-100 rounded-md transition">
          <X size={16} className="text-stone-500" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <FieldLabel label="Number of Sessions" required />
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value) || 1)}
            min="1"
            max="52"
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel label="Starting Date" required />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel label="Recurrence" />
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as 'weekly' | 'fortnightly' | 'custom')}
            className={inputClass}
          >
            <option value="weekly">Weekly</option>
            <option value="fortnightly">Fortnightly</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        {recurrence !== 'custom' && (
          <div>
            <FieldLabel label="Day of Week" />
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
              className={inputClass}
            >
              {days.map((day, i) => (
                <option key={i} value={i}>{day}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <FieldLabel label="Time" required />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel label="Duration (minutes)" />
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
            min="0"
            className={inputClass}
          />
        </div>
      </div>

      <div className="bg-stone-50 rounded-md p-3 text-sm text-stone-600">
        This will create <strong>{count}</strong> sessions titled "Session 1", "Session 2", etc.
        {recurrence === 'weekly' && <> every <strong>{days[dayOfWeek]}</strong></>}
        {recurrence === 'fortnightly' && <> every other <strong>{days[dayOfWeek]}</strong></>}
        {' '}at <strong>{time}</strong> for <strong>{duration}</strong> minutes each.
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSubmit}
          disabled={submitting || !startDate}
          className="bg-stone-900 text-white hover:bg-stone-800 rounded-md px-4 h-9 text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
          Create {count} Sessions
        </button>
        <button
          onClick={onCancel}
          className="text-sm text-stone-500 hover:text-stone-700 px-3 h-9 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ===========================================================================
// Enrollment Form
// ===========================================================================

function EnrollmentForm({ onSave, onCancel }: {
  onSave: (data: {
    customerName: string;
    customerEmail: string;
    pricePaid: string;
    paymentMethod: PaymentMethod;
    internalNotes: string;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [pricePaid, setPricePaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('manual');
  const [internalNotes, setInternalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!customerName.trim() || !customerEmail.trim()) return;
    setSubmitting(true);
    try {
      await onSave({ customerName, customerEmail, pricePaid, paymentMethod, internalNotes });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-stone-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-stone-800">Add Enrollment</h3>
        <button onClick={onCancel} className="p-1 hover:bg-stone-100 rounded-md transition">
          <X size={16} className="text-stone-500" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel label="Customer Name" required />
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Full name"
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel label="Customer Email" required />
          <input
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="email@example.com"
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel label="Price Paid" />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">$</span>
            <input
              type="text"
              value={pricePaid}
              onChange={(e) => setPricePaid(e.target.value)}
              placeholder="0.00"
              className="w-full pl-7 pr-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
            />
          </div>
        </div>
        <div>
          <FieldLabel label="Payment Method" />
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            className={inputClass}
          >
            <option value="stripe">Stripe</option>
            <option value="manual">Manual</option>
            <option value="free">Free</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <FieldLabel label="Internal Notes" />
        <textarea
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          rows={2}
          placeholder="Admin notes about this enrollment..."
          className={`${inputClass} resize-none`}
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSubmit}
          disabled={submitting || !customerName.trim() || !customerEmail.trim()}
          className="bg-stone-900 text-white hover:bg-stone-800 rounded-md px-4 h-9 text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
          Add Enrollment
        </button>
        <button
          onClick={onCancel}
          className="text-sm text-stone-500 hover:text-stone-700 px-3 h-9 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
