import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Copy,
  Check,
  Plus,
  Edit3,
  Trash2,
  FileText,
  Target,
  MessageSquare,
  Loader2,
  Save,
  ExternalLink,
  DollarSign,
  Send,
  Eye,
  CheckCircle,
  XCircle,
  Link as LinkIcon,
} from 'lucide-react';
import BookSessionModal from '../components/BookSessionModal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ClientStatus = 'prospect' | 'discovery' | 'active' | 'paused' | 'completed';

interface ClientData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: ClientStatus;
  source: string | null;
  currentPackageId: string | null;
  packageName: string | null;
  goals: string | null;
  notes: string | null;
  communicationPreference: string | null;
  importantDates: string[] | null;
  startDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SessionData {
  id: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  packageName: string | null;
  status: string;
  notes: string | null;
  meetingUrl: string | null;
}

interface ClientStats {
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  cancelledSessions: number;
  clientSince: string;
}

interface ClientNote {
  id: string;
  clientId: string;
  content: string;
  type: 'session' | 'general' | 'goal';
  sessionDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CoachingPackage {
  id: string;
  title: string;
}

type ContractStatus = 'draft' | 'sent' | 'viewed' | 'agreed' | 'paid' | 'cancelled' | 'expired';

interface ContractData {
  id: string;
  clientId: string;
  packageId: string | null;
  title: string;
  description: string | null;
  amount: string;
  currency: string;
  status: ContractStatus;
  paymentToken: string;
  contractTerms: string;
  paymentInstructions: string | null;
  stripePaymentLink: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  agreedAt: string | null;
  paidAt: string | null;
  paidMethod: string | null;
  paidReference: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_BADGE_STYLES: Record<ClientStatus, string> = {
  prospect: 'bg-amber-100 text-amber-700',
  discovery: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-stone-100 text-stone-600',
  completed: 'bg-emerald-100 text-emerald-700',
};

const STATUS_LABELS: Record<ClientStatus, string> = {
  prospect: 'Prospect',
  discovery: 'Discovery',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
};

const SOURCE_LABELS: Record<string, string> = {
  website_form: 'Website Form',
  social_dm: 'Social DM',
  referral: 'Referral',
  other: 'Other',
};

const SOURCE_OPTIONS = [
  { value: 'website_form', label: 'Website Form' },
  { value: 'social_dm', label: 'Social DM' },
  { value: 'referral', label: 'Referral' },
  { value: 'other', label: 'Other' },
];

const SESSION_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-stone-100 text-stone-600',
};

const NOTE_TYPE_STYLES: Record<string, { bg: string; label: string }> = {
  session: { bg: 'bg-blue-100 text-blue-700', label: 'Session' },
  general: { bg: 'bg-stone-100 text-stone-600', label: 'General' },
  goal: { bg: 'bg-green-100 text-green-700', label: 'Goal' },
};

const CONTRACT_STATUS_STYLES: Record<ContractStatus, string> = {
  draft: 'bg-stone-100 text-stone-600',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-purple-100 text-purple-700',
  agreed: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  expired: 'bg-stone-100 text-stone-500',
};

const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  agreed: 'Agreed',
  paid: 'Paid',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

type TabKey = 'journey' | 'sessions' | 'notes' | 'payments' | 'profile';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'journey', label: 'Journey' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'notes', label: 'Notes' },
  { key: 'payments', label: 'Payments' },
  { key: 'profile', label: 'Profile' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '--';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

function isUpcoming(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateStr >= today;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  // Data
  const [client, setClient] = useState<ClientData | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [packages, setPackages] = useState<CoachingPackage[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('journey');
  const [copied, setCopied] = useState(false);

  // Contracts
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [showContractModal, setShowContractModal] = useState(false);
  const [savingContract, setSavingContract] = useState(false);
  const [sendingContractId, setSendingContractId] = useState<string | null>(null);
  const [contractForm, setContractForm] = useState({
    title: '',
    description: '',
    amount: '',
    contractTerms: 'I understand and accept the coaching terms outlined in this agreement. I commit to the programme as described and acknowledge the payment obligations. Sessions must be rescheduled with at least 24 hours notice. Refunds are available within 14 days of purchase if no sessions have been attended.',
    paymentInstructions: '',
    stripePaymentLink: '',
    packageId: '',
  });

  // Book session modal
  const [bookModalOpen, setBookModalOpen] = useState(false);

  // Header inline editing
  const [editingHeader, setEditingHeader] = useState(false);
  const [headerForm, setHeaderForm] = useState({ name: '', email: '', phone: '' });
  const [savingHeader, setSavingHeader] = useState(false);

  // Notes form
  const [noteForm, setNoteForm] = useState({ content: '', type: 'general' as string, sessionDate: '' });
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [savingNoteEdit, setSavingNoteEdit] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    status: 'prospect' as ClientStatus,
    source: 'other',
    currentPackageId: '',
    goals: '',
    communicationPreference: '',
    startDate: '',
    notes: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // =========================================================================
  // FETCH DATA
  // =========================================================================

  const fetchClient = useCallback(async () => {
    if (!id || !accessToken) return;
    try {
      setLoading(true);
      setNotFound(false);
      const res = await fetch(`${API_BASE}/clients/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) throw new Error('Failed to load client');
      const data = await res.json();
      setClient(data.client);
      setSessions(data.sessions || []);
      setStats(data.stats || null);

      // Initialize header form
      setHeaderForm({
        name: data.client.name || '',
        email: data.client.email || '',
        phone: data.client.phone || '',
      });

      // Initialize profile form
      setProfileForm({
        status: data.client.status || 'prospect',
        source: data.client.source || 'other',
        currentPackageId: data.client.currentPackageId || '',
        goals: data.client.goals || '',
        communicationPreference: data.client.communicationPreference || '',
        startDate: data.client.startDate || '',
        notes: data.client.notes || '',
      });
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id, accessToken]);

  const fetchNotes = useCallback(async () => {
    if (!id || !accessToken) return;
    try {
      const res = await fetch(`${API_BASE}/clients/${id}/notes`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to load notes');
      const data = await res.json();
      setNotes(data);
    } catch {
      // silent
    }
  }, [id, accessToken]);

  const fetchPackages = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${API_BASE}/coaching?all=true&status=published`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const pkgs = data.packages || data;
      if (Array.isArray(pkgs)) {
        setPackages(pkgs.map((p: any) => ({ id: p.id, title: p.title })));
      }
    } catch {
      // silent
    }
  }, [accessToken]);

  const fetchContracts = useCallback(async () => {
    if (!id || !accessToken) return;
    try {
      const res = await fetch(`${API_BASE}/clients/${id}/contracts`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setContracts(data);
    } catch {
      // silent
    }
  }, [id, accessToken]);

  useEffect(() => {
    fetchClient();
    fetchNotes();
    fetchPackages();
    fetchContracts();
  }, [fetchClient, fetchNotes, fetchPackages, fetchContracts]);

  // =========================================================================
  // HANDLERS
  // =========================================================================

  // -- Copy email --
  const handleCopyEmail = async () => {
    if (!client) return;
    try {
      await navigator.clipboard.writeText(client.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback silent
    }
  };

  // -- Save header (name/email/phone) --
  const handleSaveHeader = async () => {
    if (!id || !accessToken) return;
    setSavingHeader(true);
    try {
      const res = await fetch(`${API_BASE}/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: headerForm.name,
          email: headerForm.email,
          phone: headerForm.phone || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to update client');
      setEditingHeader(false);
      fetchClient();
    } catch {
      // silent
    } finally {
      setSavingHeader(false);
    }
  };

  // -- Create note --
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !accessToken || !noteForm.content.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`${API_BASE}/clients/${id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          content: noteForm.content,
          type: noteForm.type,
          sessionDate: noteForm.type === 'session' && noteForm.sessionDate ? noteForm.sessionDate : null,
        }),
      });
      if (!res.ok) throw new Error('Failed to create note');
      setNoteForm({ content: '', type: 'general', sessionDate: '' });
      fetchNotes();
    } catch {
      // silent
    } finally {
      setSavingNote(false);
    }
  };

  // -- Update note --
  const handleUpdateNote = async (noteId: string) => {
    if (!id || !accessToken) return;
    setSavingNoteEdit(true);
    try {
      const res = await fetch(`${API_BASE}/clients/${id}/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ content: editingNoteContent }),
      });
      if (!res.ok) throw new Error('Failed to update note');
      setEditingNoteId(null);
      setEditingNoteContent('');
      fetchNotes();
    } catch {
      // silent
    } finally {
      setSavingNoteEdit(false);
    }
  };

  // -- Delete note --
  const handleDeleteNote = async (noteId: string) => {
    if (!id || !accessToken) return;
    if (!window.confirm('Delete this note? This cannot be undone.')) return;
    setDeletingNoteId(noteId);
    try {
      const res = await fetch(`${API_BASE}/clients/${id}/notes/${noteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to delete note');
      fetchNotes();
    } catch {
      // silent
    } finally {
      setDeletingNoteId(null);
    }
  };

  // -- Save profile --
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !accessToken) return;
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      const res = await fetch(`${API_BASE}/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          status: profileForm.status,
          source: profileForm.source,
          currentPackageId: profileForm.currentPackageId || null,
          goals: profileForm.goals || null,
          communicationPreference: profileForm.communicationPreference || null,
          startDate: profileForm.startDate || null,
          notes: profileForm.notes || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to update client');
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
      fetchClient();
    } catch {
      // silent
    } finally {
      setSavingProfile(false);
    }
  };

  // -- Create contract --
  const handleCreateContract = async () => {
    if (!id || !accessToken || !contractForm.title.trim() || !contractForm.amount.trim() || !contractForm.contractTerms.trim()) return;
    setSavingContract(true);
    try {
      const res = await fetch(`${API_BASE}/clients/${id}/contracts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: contractForm.title,
          description: contractForm.description || null,
          amount: contractForm.amount,
          contractTerms: contractForm.contractTerms,
          paymentInstructions: contractForm.paymentInstructions || null,
          stripePaymentLink: contractForm.stripePaymentLink || null,
          packageId: contractForm.packageId || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to create contract');
      setShowContractModal(false);
      setContractForm({
        title: '',
        description: '',
        amount: '',
        contractTerms: 'I understand and accept the coaching terms outlined in this agreement. I commit to the programme as described and acknowledge the payment obligations. Sessions must be rescheduled with at least 24 hours notice. Refunds are available within 14 days of purchase if no sessions have been attended.',
        paymentInstructions: '',
        stripePaymentLink: '',
        packageId: '',
      });
      fetchContracts();
    } catch {
      // silent
    } finally {
      setSavingContract(false);
    }
  };

  // -- Send contract email --
  const handleSendContract = async (contractId: string) => {
    if (!id || !accessToken) return;
    setSendingContractId(contractId);
    try {
      const res = await fetch(`${API_BASE}/clients/${id}/contracts/${contractId}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to send contract');
      fetchContracts();
    } catch {
      // silent
    } finally {
      setSendingContractId(null);
    }
  };

  // -- Mark contract as paid --
  const handleMarkPaid = async (contractId: string) => {
    if (!id || !accessToken) return;
    const method = window.prompt('Payment method (e.g. bank transfer, Stripe, cash):');
    if (method === null) return;
    const reference = window.prompt('Payment reference (optional):') || '';
    try {
      const res = await fetch(`${API_BASE}/clients/${id}/contracts/${contractId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          status: 'paid',
          paidMethod: method || 'manual',
          paidReference: reference || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to update contract');
      fetchContracts();
    } catch {
      // silent
    }
  };

  // -- Cancel contract --
  const handleCancelContract = async (contractId: string) => {
    if (!id || !accessToken) return;
    if (!window.confirm('Cancel this contract? The client will no longer be able to access the link.')) return;
    try {
      const res = await fetch(`${API_BASE}/clients/${id}/contracts/${contractId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (!res.ok) throw new Error('Failed to cancel contract');
      fetchContracts();
    } catch {
      // silent
    }
  };

  // -- Copy contract link --
  const handleCopyContractLink = async (token: string) => {
    const url = `${window.location.origin}/#/contract/${token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // fallback
    }
  };

  // -- Change session status --
  const handleSessionStatusChange = async (sessionId: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE}/bookings/${sessionId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchClient(); // refresh
      }
    } catch {
      // silent
    }
  };

  // =========================================================================
  // BUILD TIMELINE EVENTS
  // =========================================================================

  function buildTimelineEvents() {
    if (!client) return [];

    interface TimelineEvent {
      date: string;
      label: string;
      detail?: string;
      dotColor: string;
    }

    const events: TimelineEvent[] = [];

    // Client created
    events.push({
      date: client.createdAt,
      label: 'Client added',
      detail: client.source ? SOURCE_LABELS[client.source] || client.source : undefined,
      dotColor: 'bg-stone-400',
    });

    // Start date (became active)
    if (client.startDate) {
      events.push({
        date: client.startDate + 'T00:00:00',
        label: 'Became active',
        dotColor: 'bg-green-500',
      });
    }

    // Sessions
    for (const s of sessions) {
      const statusLabel =
        s.status === 'completed'
          ? 'Completed'
          : s.status === 'confirmed'
          ? 'Confirmed'
          : s.status === 'cancelled'
          ? 'Cancelled'
          : s.status === 'no_show'
          ? 'No Show'
          : 'Pending';

      const dotColor =
        s.status === 'completed'
          ? 'bg-green-500'
          : s.status === 'cancelled'
          ? 'bg-red-400'
          : s.status === 'no_show'
          ? 'bg-stone-400'
          : 'bg-blue-500';

      events.push({
        date: s.sessionDate + 'T' + (s.startTime || '00:00'),
        label: `Session: ${s.packageName || 'Coaching'}`,
        detail: statusLabel,
        dotColor,
      });
    }

    // Contracts
    for (const ct of contracts) {
      if (ct.status === 'paid' && ct.paidAt) {
        events.push({
          date: ct.paidAt,
          label: `Payment: ${ct.title}`,
          detail: `$${parseFloat(ct.amount).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`,
          dotColor: 'bg-green-500',
        });
      } else if (ct.status === 'agreed' && ct.agreedAt) {
        events.push({
          date: ct.agreedAt,
          label: `Contract agreed: ${ct.title}`,
          dotColor: 'bg-amber-500',
        });
      } else if (ct.sentAt) {
        events.push({
          date: ct.sentAt,
          label: `Contract sent: ${ct.title}`,
          dotColor: 'bg-blue-400',
        });
      }
    }

    // Sort chronologically (oldest first)
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return events;
  }

  // =========================================================================
  // RENDER
  // =========================================================================

  // -- Loading state --
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
        <span className="ml-2 text-sm text-stone-500">Loading client...</span>
      </div>
    );
  }

  // -- Not found state --
  if (notFound || !client) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <button
          onClick={() => navigate('/admin/coaching/clients')}
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </button>
        <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-12 text-center">
          <User className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500">Client not found.</p>
        </div>
      </div>
    );
  }

  // -- Derived data --
  const initial = (client.name?.[0] || '?').toUpperCase();
  const timelineEvents = buildTimelineEvents();

  // =========================================================================
  // MAIN RENDER
  // =========================================================================

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Back link */}
      <button
        onClick={() => navigate('/admin/coaching/clients')}
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Clients
      </button>

      {/* ================================================================= */}
      {/* Header section                                                    */}
      {/* ================================================================= */}
      <div className="flex items-start gap-5 mb-8">
        {/* Avatar */}
        <div className="flex-shrink-0 w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center">
          <span className="text-2xl font-semibold text-stone-600">{initial}</span>
        </div>

        <div className="min-w-0 flex-1">
          {editingHeader ? (
            <div className="space-y-3">
              <input
                type="text"
                value={headerForm.name}
                onChange={(e) => setHeaderForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full max-w-sm border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                placeholder="Client name"
              />
              <input
                type="email"
                value={headerForm.email}
                onChange={(e) => setHeaderForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full max-w-sm border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                placeholder="Email"
              />
              <input
                type="text"
                value={headerForm.phone}
                onChange={(e) => setHeaderForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full max-w-sm border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                placeholder="Phone (optional)"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveHeader}
                  disabled={savingHeader}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-60"
                  style={{ backgroundColor: '#8d3038' }}
                >
                  {savingHeader ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingHeader(false);
                    setHeaderForm({
                      name: client.name || '',
                      email: client.email || '',
                      phone: client.phone || '',
                    });
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <h1
                  className="text-2xl font-bold text-stone-900"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {client.name}
                </h1>
                <span
                  className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${
                    STATUS_BADGE_STYLES[client.status]
                  }`}
                >
                  {STATUS_LABELS[client.status]}
                </span>
                {client.source && (
                  <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
                    {SOURCE_LABELS[client.source] || client.source}
                  </span>
                )}
                <button
                  onClick={() => setEditingHeader(true)}
                  className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors"
                  title="Edit name, email, phone"
                >
                  <Edit3 className="w-4 h-4 text-stone-400" />
                </button>
              </div>

              <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-sm text-stone-500">
                  <Mail className="w-3.5 h-3.5" />
                  {client.email}
                  <button
                    onClick={handleCopyEmail}
                    className="text-stone-400 hover:text-stone-600 transition-colors"
                    title="Copy email"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </span>
                {client.phone && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-stone-500">
                    <Phone className="w-3.5 h-3.5" />
                    {client.phone}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* Metrics row                                                       */}
      {/* ================================================================= */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-4 text-center">
            <Calendar className="w-5 h-5 text-stone-400 mx-auto mb-1.5" />
            <p className="text-xl font-semibold text-stone-800">{stats.totalSessions}</p>
            <p className="text-xs text-stone-500">Total Sessions</p>
          </div>
          <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-4 text-center">
            <Check className="w-5 h-5 text-stone-400 mx-auto mb-1.5" />
            <p className="text-xl font-semibold text-stone-800">{stats.completedSessions}</p>
            <p className="text-xs text-stone-500">Completed</p>
          </div>
          <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-4 text-center">
            <Clock className="w-5 h-5 text-stone-400 mx-auto mb-1.5" />
            <p className="text-xl font-semibold text-stone-800">{stats.upcomingSessions}</p>
            <p className="text-xs text-stone-500">Upcoming</p>
          </div>
          <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-4 text-center">
            <User className="w-5 h-5 text-stone-400 mx-auto mb-1.5" />
            <p className="text-xl font-semibold text-stone-800">{formatDate(stats.clientSince)}</p>
            <p className="text-xs text-stone-500">Client Since</p>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Tab navigation                                                    */}
      {/* ================================================================= */}
      <div className="flex items-center gap-1 border-b border-stone-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
            }`}
            style={activeTab === tab.key ? { borderBottomColor: '#8d3038', color: '#8d3038' } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================================================================= */}
      {/* Tab content                                                       */}
      {/* ================================================================= */}

      {/* ─────────────────── Journey Tab ─────────────────── */}
      {activeTab === 'journey' && (
        <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-6">
          <h2
            className="text-lg font-bold text-stone-900 mb-6"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Client Journey
          </h2>

          {timelineEvents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-sm text-stone-400">No events to display yet</p>
            </div>
          ) : (
            <div className="relative pl-8">
              {/* Timeline line */}
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-stone-200" />

              <div className="space-y-6">
                {timelineEvents.map((event, i) => (
                  <div key={i} className="relative">
                    {/* Dot */}
                    <div
                      className={`absolute -left-5 top-1 w-3 h-3 rounded-full border-2 border-white ${event.dotColor}`}
                      style={{ boxShadow: '0 0 0 2px #e7e5e4' }}
                    />

                    {/* Content */}
                    <div>
                      <p className="text-sm font-medium text-stone-800">{event.label}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-stone-400">{formatDate(event.date)}</span>
                        {event.detail && (
                          <span className="text-xs text-stone-500 bg-stone-50 px-1.5 py-0.5 rounded">
                            {event.detail}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────── Sessions Tab ─────────────────── */}
      {activeTab === 'sessions' && (
        <>
        <div className="bg-white rounded-lg border border-stone-200 shadow-sm">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
            <h2
              className="text-lg font-bold text-stone-900"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Sessions
            </h2>
            <button
              onClick={() => setBookModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors text-white"
              style={{ backgroundColor: '#8d3038' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#6b2228')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#8d3038')}
            >
              <Plus className="w-4 h-4" />
              Book New Session
            </button>
          </div>

          {(() => {
            const today = new Date().toISOString().split('T')[0];
            const upcomingSessions = sessions.filter(
              (s) => s.sessionDate >= today && ['pending', 'confirmed'].includes(s.status)
            );
            const pastSessions = sessions.filter(
              (s) => !(s.sessionDate >= today && ['pending', 'confirmed'].includes(s.status))
            );

            return (
              <div className="p-6 space-y-8">
                {/* ── Upcoming Sessions ── */}
                <div>
                  <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wider mb-3">
                    Upcoming ({upcomingSessions.length})
                  </h3>
                  {upcomingSessions.length === 0 ? (
                    <div className="text-center py-6">
                      <Calendar className="w-7 h-7 text-stone-300 mx-auto mb-1.5" />
                      <p className="text-sm text-stone-400">No upcoming sessions</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingSessions.map((s) => {
                        const statusStyle =
                          SESSION_STATUS_STYLES[s.status] || 'bg-stone-100 text-stone-600';
                        return (
                          <div
                            key={s.id}
                            className="bg-blue-50/40 border border-blue-100 rounded-lg p-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              {/* Left: date, time, package, meeting URL */}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-stone-800">
                                  {formatDate(s.sessionDate)}
                                </p>
                                <p className="text-sm text-stone-600 mt-0.5">
                                  {formatTime(s.startTime)}
                                  {s.endTime ? ` - ${formatTime(s.endTime)}` : ''}
                                </p>
                                {s.packageName && (
                                  <p className="text-xs text-stone-500 mt-1">{s.packageName}</p>
                                )}
                                {s.meetingUrl && (
                                  <a
                                    href={s.meetingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs mt-1.5 hover:underline"
                                    style={{ color: '#8d3038' }}
                                  >
                                    Meeting link
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                                {s.notes && (
                                  <p className="text-xs text-stone-500 mt-1.5 line-clamp-2">
                                    {s.notes}
                                  </p>
                                )}
                              </div>

                              {/* Right: status badge + status dropdown */}
                              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                <span
                                  className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${statusStyle}`}
                                >
                                  {s.status.charAt(0).toUpperCase() +
                                    s.status.slice(1).replace('_', ' ')}
                                </span>
                                <select
                                  value={s.status}
                                  onChange={(e) =>
                                    handleSessionStatusChange(s.id, e.target.value)
                                  }
                                  className="text-xs border border-stone-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="confirmed">Confirmed</option>
                                  <option value="completed">Completed</option>
                                  <option value="cancelled">Cancelled</option>
                                  <option value="no_show">No Show</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Past Sessions ── */}
                <div>
                  <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wider mb-3">
                    Past ({pastSessions.length})
                  </h3>
                  {pastSessions.length === 0 ? (
                    <div className="text-center py-6">
                      <Calendar className="w-7 h-7 text-stone-300 mx-auto mb-1.5" />
                      <p className="text-sm text-stone-400">No past sessions</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-stone-100">
                            <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-4 py-2.5">
                              Date
                            </th>
                            <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-4 py-2.5">
                              Time
                            </th>
                            <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-4 py-2.5">
                              Package
                            </th>
                            <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-4 py-2.5">
                              Status
                            </th>
                            <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider px-4 py-2.5">
                              Notes
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {pastSessions.map((s) => {
                            const statusStyle =
                              SESSION_STATUS_STYLES[s.status] || 'bg-stone-100 text-stone-600';
                            return (
                              <tr
                                key={s.id}
                                className="border-b border-stone-50 last:border-0 hover:bg-stone-50 transition-colors"
                              >
                                <td className="px-4 py-3 text-sm text-stone-800">
                                  {formatDate(s.sessionDate)}
                                </td>
                                <td className="px-4 py-3 text-sm text-stone-600">
                                  {formatTime(s.startTime)}
                                  {s.endTime ? ` - ${formatTime(s.endTime)}` : ''}
                                </td>
                                <td className="px-4 py-3 text-sm text-stone-600">
                                  {s.packageName || '--'}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${statusStyle}`}
                                  >
                                    {s.status.charAt(0).toUpperCase() +
                                      s.status.slice(1).replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-stone-500 max-w-[200px] truncate">
                                  {s.notes || '--'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Book Session Modal */}
        <BookSessionModal
          open={bookModalOpen}
          onClose={() => setBookModalOpen(false)}
          onCreated={() => {
            setBookModalOpen(false);
            fetchClient();
          }}
          clientId={client?.id}
          clientName={client?.name}
          clientEmail={client?.email}
          packageId={client?.currentPackageId}
          packageName={client?.packageName}
          durationMinutes={null}
        />
        </>
      )}

      {/* ─────────────────── Notes Tab ─────────────────── */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          {/* Add Note form */}
          <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-6">
            <h3
              className="text-sm font-bold text-stone-800 mb-4"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Add Note
            </h3>
            <form onSubmit={handleCreateNote} className="space-y-3">
              <div className="flex items-center gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Type</label>
                  <select
                    value={noteForm.type}
                    onChange={(e) => setNoteForm((f) => ({ ...f, type: e.target.value }))}
                    className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 bg-white"
                  >
                    <option value="general">General</option>
                    <option value="session">Session</option>
                    <option value="goal">Goal</option>
                  </select>
                </div>
                {noteForm.type === 'session' && (
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1">Session Date</label>
                    <input
                      type="date"
                      value={noteForm.sessionDate}
                      onChange={(e) => setNoteForm((f) => ({ ...f, sessionDate: e.target.value }))}
                      className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                    />
                  </div>
                )}
              </div>
              <textarea
                value={noteForm.content}
                onChange={(e) => setNoteForm((f) => ({ ...f, content: e.target.value }))}
                rows={3}
                placeholder="Write a note..."
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingNote || !noteForm.content.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-60"
                  style={{ backgroundColor: '#8d3038' }}
                  onMouseEnter={(e) => !savingNote && (e.currentTarget.style.backgroundColor = '#6b2228')}
                  onMouseLeave={(e) => !savingNote && (e.currentTarget.style.backgroundColor = '#8d3038')}
                >
                  {savingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Save Note
                </button>
              </div>
            </form>
          </div>

          {/* Notes list */}
          <div className="bg-white rounded-lg border border-stone-200 shadow-sm">
            <div className="px-6 py-4 border-b border-stone-100">
              <h2
                className="text-lg font-bold text-stone-900"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Notes ({notes.length})
              </h2>
            </div>

            {notes.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-sm text-stone-400">No notes yet</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {notes.map((note) => {
                  const typeStyle = NOTE_TYPE_STYLES[note.type] || NOTE_TYPE_STYLES.general;
                  const isEditing = editingNoteId === note.id;

                  return (
                    <div key={note.id} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span
                              className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${typeStyle.bg}`}
                            >
                              {typeStyle.label}
                            </span>
                            <span className="text-xs text-stone-400">{formatDate(note.createdAt)}</span>
                            {note.sessionDate && (
                              <span className="text-xs text-stone-400">
                                (Session: {formatDate(note.sessionDate)})
                              </span>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="space-y-2">
                              <textarea
                                value={editingNoteContent}
                                onChange={(e) => setEditingNoteContent(e.target.value)}
                                rows={3}
                                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 resize-none"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleUpdateNote(note.id)}
                                  disabled={savingNoteEdit}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-60"
                                  style={{ backgroundColor: '#8d3038' }}
                                >
                                  {savingNoteEdit ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Save className="w-3.5 h-3.5" />
                                  )}
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingNoteId(null);
                                    setEditingNoteContent('');
                                  }}
                                  className="px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-stone-700 whitespace-pre-wrap">{note.content}</p>
                          )}
                        </div>

                        {!isEditing && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setEditingNoteContent(note.content);
                              }}
                              className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors"
                              title="Edit note"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-stone-400" />
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              disabled={deletingNoteId === note.id}
                              className="p-1.5 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete note"
                            >
                              {deletingNoteId === note.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-400" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────── Payments Tab ─────────────────── */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Header with Create button */}
          <div className="flex items-center justify-between">
            <h2
              className="text-lg font-bold text-stone-900"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Contracts & Payments
            </h2>
            <button
              onClick={() => {
                // Pre-fill title from package if available
                if (client?.packageName) {
                  setContractForm((f) => ({
                    ...f,
                    title: client.packageName || '',
                    packageId: client.currentPackageId || '',
                  }));
                }
                setShowContractModal(true);
              }}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors text-white"
              style={{ backgroundColor: '#8d3038' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#6b2228')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#8d3038')}
            >
              <Plus className="w-4 h-4" />
              New Contract
            </button>
          </div>

          {/* Contracts list */}
          {contracts.length === 0 ? (
            <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-12 text-center">
              <DollarSign className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-sm text-stone-400">No contracts yet</p>
              <p className="text-xs text-stone-400 mt-1">Create a contract to generate a payment link</p>
            </div>
          ) : (
            <div className="space-y-4">
              {contracts.map((contract) => {
                const statusStyle = CONTRACT_STATUS_STYLES[contract.status] || 'bg-stone-100 text-stone-600';
                const isSending = sendingContractId === contract.id;
                const isActive = !['cancelled', 'expired', 'paid'].includes(contract.status);

                return (
                  <div key={contract.id} className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-sm font-semibold text-stone-800">
                              {contract.title}
                            </h3>
                            <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${statusStyle}`}>
                              {CONTRACT_STATUS_LABELS[contract.status]}
                            </span>
                          </div>
                          {contract.description && (
                            <p className="text-xs text-stone-500 mb-1">{contract.description}</p>
                          )}
                          <p className="text-lg font-bold" style={{ color: '#8d3038' }}>
                            ${parseFloat(contract.amount).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                            <span className="text-xs font-normal text-stone-400 ml-1">{contract.currency}</span>
                          </p>

                          {/* Timeline */}
                          <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-stone-400">
                            <span>Created {formatDate(contract.createdAt)}</span>
                            {contract.sentAt && <span>Sent {formatDate(contract.sentAt)}</span>}
                            {contract.viewedAt && (
                              <span className="inline-flex items-center gap-0.5">
                                <Eye className="w-3 h-3" /> Viewed {formatDate(contract.viewedAt)}
                              </span>
                            )}
                            {contract.agreedAt && (
                              <span className="inline-flex items-center gap-0.5 text-amber-600">
                                <CheckCircle className="w-3 h-3" /> Agreed {formatDate(contract.agreedAt)}
                              </span>
                            )}
                            {contract.paidAt && (
                              <span className="inline-flex items-center gap-0.5 text-green-600">
                                <DollarSign className="w-3 h-3" /> Paid {formatDate(contract.paidAt)}
                                {contract.paidMethod && ` (${contract.paidMethod})`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Copy link */}
                          {isActive && (
                            <button
                              onClick={() => handleCopyContractLink(contract.paymentToken)}
                              className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors"
                              title="Copy contract link"
                            >
                              <LinkIcon className="w-3.5 h-3.5 text-stone-400" />
                            </button>
                          )}

                          {/* Send email */}
                          {isActive && contract.status !== 'agreed' && (
                            <button
                              onClick={() => handleSendContract(contract.id)}
                              disabled={isSending}
                              className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                              title={contract.status === 'draft' ? 'Send to client' : 'Resend to client'}
                            >
                              {isSending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-400" />
                              ) : (
                                <Send className="w-3.5 h-3.5 text-blue-500" />
                              )}
                            </button>
                          )}

                          {/* Mark as paid */}
                          {(contract.status === 'agreed' || contract.status === 'sent' || contract.status === 'viewed') && (
                            <button
                              onClick={() => handleMarkPaid(contract.id)}
                              className="p-1.5 hover:bg-green-50 rounded-lg transition-colors"
                              title="Mark as paid"
                            >
                              <DollarSign className="w-3.5 h-3.5 text-green-500" />
                            </button>
                          )}

                          {/* Cancel */}
                          {isActive && contract.status !== 'paid' && (
                            <button
                              onClick={() => handleCancelContract(contract.id)}
                              className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                              title="Cancel contract"
                            >
                              <XCircle className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Create Contract Modal */}
          {showContractModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowContractModal(false)}>
              <div className="absolute inset-0 bg-black/30" />
              <div
                className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
                  <h3
                    className="text-lg font-bold text-stone-900"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    New Contract
                  </h3>
                  <button
                    onClick={() => setShowContractModal(false)}
                    className="p-1 hover:bg-stone-100 rounded-lg transition-colors text-stone-400"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={contractForm.title}
                      onChange={(e) => setContractForm((f) => ({ ...f, title: e.target.value }))}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                      placeholder="e.g. 12-Week Coaching Programme"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={contractForm.description}
                      onChange={(e) => setContractForm((f) => ({ ...f, description: e.target.value }))}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                      placeholder="Brief description of the service"
                    />
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Amount (AUD) *</label>
                    <input
                      type="text"
                      value={contractForm.amount}
                      onChange={(e) => setContractForm((f) => ({ ...f, amount: e.target.value }))}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                      placeholder="e.g. 1200.00"
                    />
                  </div>

                  {/* Package */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Coaching Package</label>
                    <select
                      value={contractForm.packageId}
                      onChange={(e) => setContractForm((f) => ({ ...f, packageId: e.target.value }))}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 bg-white"
                    >
                      <option value="">None</option>
                      {packages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Contract Terms */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Contract Terms *</label>
                    <textarea
                      value={contractForm.contractTerms}
                      onChange={(e) => setContractForm((f) => ({ ...f, contractTerms: e.target.value }))}
                      rows={5}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 resize-none"
                      placeholder="Terms the client must agree to..."
                    />
                    <p className="text-[11px] text-stone-400 mt-1">
                      The client will see: "By clicking I Agree & Accept, you acknowledge that you have read, understood, and agree to the terms..."
                    </p>
                  </div>

                  {/* Payment Instructions */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Payment Instructions</label>
                    <textarea
                      value={contractForm.paymentInstructions}
                      onChange={(e) => setContractForm((f) => ({ ...f, paymentInstructions: e.target.value }))}
                      rows={3}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 resize-none"
                      placeholder="e.g. BSB: 123-456, Account: 12345678, Reference: [client name]"
                    />
                    <p className="text-[11px] text-stone-400 mt-1">Shown to the client after they agree. Leave blank if using Stripe.</p>
                  </div>

                  {/* Stripe Payment Link (optional) */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Stripe Payment Link (optional)</label>
                    <input
                      type="url"
                      value={contractForm.stripePaymentLink}
                      onChange={(e) => setContractForm((f) => ({ ...f, stripePaymentLink: e.target.value }))}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                      placeholder="https://buy.stripe.com/..."
                    />
                    <p className="text-[11px] text-stone-400 mt-1">If provided, the client will see a "Proceed to Payment" button after agreeing.</p>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowContractModal(false)}
                    className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateContract}
                    disabled={savingContract || !contractForm.title.trim() || !contractForm.amount.trim() || !contractForm.contractTerms.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-60"
                    style={{ backgroundColor: '#8d3038' }}
                    onMouseEnter={(e) => !savingContract && (e.currentTarget.style.backgroundColor = '#6b2228')}
                    onMouseLeave={(e) => !savingContract && (e.currentTarget.style.backgroundColor = '#8d3038')}
                  >
                    {savingContract ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create Contract
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────── Profile Tab ─────────────────── */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-6">
          <h2
            className="text-lg font-bold text-stone-900 mb-6"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Client Profile
          </h2>

          <form onSubmit={handleSaveProfile} className="space-y-5 max-w-2xl">
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Status</label>
              <select
                value={profileForm.status}
                onChange={(e) => setProfileForm((f) => ({ ...f, status: e.target.value as ClientStatus }))}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 bg-white"
              >
                <option value="prospect">Prospect</option>
                <option value="discovery">Discovery</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Source */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Source</label>
              <select
                value={profileForm.source}
                onChange={(e) => setProfileForm((f) => ({ ...f, source: e.target.value }))}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 bg-white"
              >
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Current Package */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Current Package</label>
              <select
                value={profileForm.currentPackageId}
                onChange={(e) => setProfileForm((f) => ({ ...f, currentPackageId: e.target.value }))}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 bg-white"
              >
                <option value="">None</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Goals */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Goals</label>
              <textarea
                value={profileForm.goals}
                onChange={(e) => setProfileForm((f) => ({ ...f, goals: e.target.value }))}
                rows={3}
                placeholder="Client goals and aspirations..."
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 resize-none"
              />
            </div>

            {/* Communication Preference */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Communication Preference</label>
              <input
                type="text"
                value={profileForm.communicationPreference}
                onChange={(e) => setProfileForm((f) => ({ ...f, communicationPreference: e.target.value }))}
                placeholder="e.g. Email, WhatsApp, Phone..."
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Start Date</label>
              <input
                type="date"
                value={profileForm.startDate}
                onChange={(e) => setProfileForm((f) => ({ ...f, startDate: e.target.value }))}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
              />
            </div>

            {/* Notes (client.notes field) */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
              <textarea
                value={profileForm.notes}
                onChange={(e) => setProfileForm((f) => ({ ...f, notes: e.target.value }))}
                rows={4}
                placeholder="General notes about this client..."
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 resize-none"
              />
            </div>

            {/* Save */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-60"
                style={{ backgroundColor: '#8d3038' }}
                onMouseEnter={(e) => !savingProfile && (e.currentTarget.style.backgroundColor = '#6b2228')}
                onMouseLeave={(e) => !savingProfile && (e.currentTarget.style.backgroundColor = '#8d3038')}
              >
                {savingProfile ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Profile
              </button>
              {profileSaved && (
                <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                  <Check className="w-4 h-4" />
                  Saved successfully
                </span>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
