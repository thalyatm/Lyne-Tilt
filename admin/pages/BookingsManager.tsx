import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';
import BookSessionModal from '../components/BookSessionModal';
import {
  CalendarDays,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  Loader2,
  X,
  Trash2,
  Edit3,
  Calendar,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  packageName?: string | null;
  meetingUrl?: string | null;
  notes?: string | null;
  status: BookingStatus;
  cancellationReason?: string | null;
  clientId?: string | null;
  createdAt: string;
}

interface BookingStats {
  total: number;
  upcoming: number;
  completed: number;
  cancelled: number;
}

interface AvailabilityWindow {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  enabled: boolean;
}

interface BlockedDate {
  id: string;
  date: string;
  reason?: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_NAMES: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first

const STATUS_BADGE_STYLES: Record<BookingStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-stone-100 text-stone-600',
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

const SLOT_DURATIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 90, label: '90 min' },
  { value: 120, label: '120 min' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateNice(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${ampm}`;
}

function addMinutesToTime(time24: string, minutes: number): string {
  const [hStr, mStr] = time24.split(':');
  const totalMinutes = parseInt(hStr, 10) * 60 + parseInt(mStr || '0', 10) + minutes;
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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
      className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-4"
      style={{ borderLeftWidth: '4px', borderLeftColor: borderColor }}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-semibold text-stone-900">{value}</p>
        <p className="text-xs text-stone-500">{label}</p>
      </div>
    </div>
  );
}

function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function BookingsManager() {
  const { accessToken } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<'bookings' | 'availability'>('bookings');

  // =========================================================================
  // BOOKINGS TAB STATE
  // =========================================================================
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<BookingStats>({ total: 0, upcoming: 0, completed: 0, cancelled: 0 });
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Create booking modal
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Status update state
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [cancelReasonBookingId, setCancelReasonBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // =========================================================================
  // AVAILABILITY TAB STATE
  // =========================================================================
  const [availability, setAvailability] = useState<AvailabilityWindow[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);

  // Availability modal
  const [availModalOpen, setAvailModalOpen] = useState(false);
  const [editingAvail, setEditingAvail] = useState<AvailabilityWindow | null>(null);
  const [availForm, setAvailForm] = useState({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: 60,
  });
  const [availSaving, setAvailSaving] = useState(false);

  // Blocked date form
  const [blockDateForm, setBlockDateForm] = useState({ date: '', reason: '' });
  const [blockDateSaving, setBlockDateSaving] = useState(false);

  // =========================================================================
  // DEBOUNCED SEARCH
  // =========================================================================
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

  // =========================================================================
  // FETCH BOOKINGS
  // =========================================================================
  const fetchBookings = useCallback(async () => {
    setBookingsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await fetch(`${API_BASE}/bookings?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to load bookings');
      const data = await res.json();
      setBookings(data.bookings || []);
      setStats(data.stats || { total: 0, upcoming: 0, completed: 0, cancelled: 0 });
    } catch {
      // silently handle
    } finally {
      setBookingsLoading(false);
    }
  }, [accessToken, statusFilter, debouncedSearch]);

  useEffect(() => {
    if (activeTab === 'bookings') {
      fetchBookings();
    }
  }, [fetchBookings, activeTab]);

  // =========================================================================
  // FETCH AVAILABILITY & BLOCKED DATES
  // =========================================================================
  const fetchAvailability = useCallback(async () => {
    setAvailabilityLoading(true);
    try {
      const [availRes, blockedRes] = await Promise.all([
        fetch(`${API_BASE}/bookings/availability`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${API_BASE}/bookings/blocked-dates`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);

      if (availRes.ok) {
        const data = await availRes.json();
        setAvailability(Array.isArray(data) ? data : data.availability || []);
      }
      if (blockedRes.ok) {
        const data = await blockedRes.json();
        setBlockedDates(Array.isArray(data) ? data : data.blockedDates || []);
      }
    } catch {
      // silently handle
    } finally {
      setAvailabilityLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (activeTab === 'availability') {
      fetchAvailability();
    }
  }, [fetchAvailability, activeTab]);

  // =========================================================================
  // BOOKING ACTIONS
  // =========================================================================
  const handleStatusChange = async (bookingId: string, newStatus: BookingStatus, reason?: string) => {
    setStatusUpdating(bookingId);
    try {
      const body: Record<string, string> = { status: newStatus };
      if (reason) body.cancellationReason = reason;

      const res = await fetch(`${API_BASE}/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to update status');
      setCancelReasonBookingId(null);
      setCancelReason('');
      fetchBookings();
    } catch {
      // silently handle
    } finally {
      setStatusUpdating(null);
    }
  };

  // =========================================================================
  // AVAILABILITY ACTIONS
  // =========================================================================
  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setAvailSaving(true);
    try {
      const method = editingAvail ? 'PUT' : 'POST';
      const url = editingAvail
        ? `${API_BASE}/bookings/availability/${editingAvail.id}`
        : `${API_BASE}/bookings/availability`;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(availForm),
      });
      if (!res.ok) throw new Error('Failed to save availability');
      setAvailModalOpen(false);
      setEditingAvail(null);
      fetchAvailability();
    } catch {
      // silently handle
    } finally {
      setAvailSaving(false);
    }
  };

  const handleToggleAvailability = async (window: AvailabilityWindow) => {
    try {
      await fetch(`${API_BASE}/bookings/availability/${window.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          dayOfWeek: window.dayOfWeek,
          startTime: window.startTime,
          endTime: window.endTime,
          slotDuration: window.slotDuration,
          enabled: !window.enabled,
        }),
      });
      fetchAvailability();
    } catch {
      // silently handle
    }
  };

  const handleDeleteAvailability = async (id: string) => {
    if (!window.confirm('Delete this availability window?')) return;
    try {
      await fetch(`${API_BASE}/bookings/availability/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      fetchAvailability();
    } catch {
      // silently handle
    }
  };

  // =========================================================================
  // BLOCKED DATE ACTIONS
  // =========================================================================
  const handleBlockDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockDateForm.date) return;
    setBlockDateSaving(true);
    try {
      const res = await fetch(`${API_BASE}/bookings/blocked-dates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          blockedDate: blockDateForm.date,
          reason: blockDateForm.reason || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to block date');
      setBlockDateForm({ date: '', reason: '' });
      fetchAvailability();
    } catch {
      // silently handle
    } finally {
      setBlockDateSaving(false);
    }
  };

  const handleDeleteBlockedDate = async (id: string) => {
    if (!window.confirm('Remove this blocked date?')) return;
    try {
      await fetch(`${API_BASE}/bookings/blocked-dates/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      fetchAvailability();
    } catch {
      // silently handle
    }
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  const tabs = [
    { key: 'bookings' as const, label: 'Bookings' },
    { key: 'availability' as const, label: 'Availability' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-serif font-semibold text-stone-900">Bookings</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Manage coaching sessions and availability
          </p>
        </div>
        {activeTab === 'bookings' && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="text-white rounded-lg px-4 h-9 text-sm font-medium transition-colors inline-flex items-center gap-1.5 hover:opacity-90"
            style={{ backgroundColor: '#8d3038' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#6b2228')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#8d3038')}
          >
            <Plus size={16} />
            New Booking
          </button>
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 mb-6 border-b border-stone-200">
        {tabs.map((tab) => (
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

      {/* Tab content */}
      {activeTab === 'bookings' ? (
        <BookingsTab
          bookings={bookings}
          stats={stats}
          loading={bookingsLoading}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          debouncedSearch={debouncedSearch}
          statusUpdating={statusUpdating}
          cancelReasonBookingId={cancelReasonBookingId}
          setCancelReasonBookingId={setCancelReasonBookingId}
          cancelReason={cancelReason}
          setCancelReason={setCancelReason}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <AvailabilityTab
          availability={availability}
          blockedDates={blockedDates}
          loading={availabilityLoading}
          onAddWindow={(dayOfWeek?: number) => {
            setEditingAvail(null);
            setAvailForm({
              dayOfWeek: dayOfWeek ?? 1,
              startTime: '09:00',
              endTime: '17:00',
              slotDuration: 60,
            });
            setAvailModalOpen(true);
          }}
          onEditWindow={(w) => {
            setEditingAvail(w);
            setAvailForm({
              dayOfWeek: w.dayOfWeek,
              startTime: w.startTime,
              endTime: w.endTime,
              slotDuration: w.slotDuration,
            });
            setAvailModalOpen(true);
          }}
          onToggleWindow={handleToggleAvailability}
          onDeleteWindow={handleDeleteAvailability}
          blockDateForm={blockDateForm}
          setBlockDateForm={setBlockDateForm}
          blockDateSaving={blockDateSaving}
          onBlockDate={handleBlockDate}
          onDeleteBlockedDate={handleDeleteBlockedDate}
        />
      )}

      {/* Create Booking Modal */}
      <BookSessionModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => {
          setCreateModalOpen(false);
          fetchBookings();
        }}
      />

      {/* Availability Modal */}
      {availModalOpen && (
        <ModalOverlay onClose={() => { setAvailModalOpen(false); setEditingAvail(null); }}>
          <form onSubmit={handleSaveAvailability} className="space-y-4">
            <h2 className="text-lg font-serif font-semibold text-stone-900 mb-4">
              {editingAvail ? 'Edit Availability' : 'Add Availability'}
            </h2>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Day of Week</label>
              <select
                value={availForm.dayOfWeek}
                onChange={(e) => setAvailForm((f) => ({ ...f, dayOfWeek: parseInt(e.target.value) }))}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
              >
                {DAY_ORDER.map((d) => (
                  <option key={d} value={d}>{DAY_NAMES[d]}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Start Time</label>
                <input
                  type="time"
                  required
                  value={availForm.startTime}
                  onChange={(e) => setAvailForm((f) => ({ ...f, startTime: e.target.value }))}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">End Time</label>
                <input
                  type="time"
                  required
                  value={availForm.endTime}
                  onChange={(e) => setAvailForm((f) => ({ ...f, endTime: e.target.value }))}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Slot Duration</label>
              <select
                value={availForm.slotDuration}
                onChange={(e) => setAvailForm((f) => ({ ...f, slotDuration: parseInt(e.target.value) }))}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
              >
                {SLOT_DURATIONS.map((sd) => (
                  <option key={sd.value} value={sd.value}>{sd.label}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setAvailModalOpen(false); setEditingAvail(null); }}
                className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={availSaving}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors inline-flex items-center gap-1.5 disabled:opacity-60"
                style={{ backgroundColor: '#8d3038' }}
                onMouseEnter={(e) => !availSaving && (e.currentTarget.style.backgroundColor = '#6b2228')}
                onMouseLeave={(e) => !availSaving && (e.currentTarget.style.backgroundColor = '#8d3038')}
              >
                {availSaving && <Loader2 size={14} className="animate-spin" />}
                {editingAvail ? 'Update' : 'Add'} Window
              </button>
            </div>
          </form>
        </ModalOverlay>
      )}
    </div>
  );
}

// ===========================================================================
// MODAL OVERLAY
// ===========================================================================

function ModalOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-stone-100 rounded-lg transition-colors"
        >
          <X size={16} className="text-stone-400" />
        </button>
        {children}
      </div>
    </div>
  );
}

// ===========================================================================
// BOOKINGS TAB
// ===========================================================================

function BookingsTab({
  bookings,
  stats,
  loading,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  debouncedSearch,
  statusUpdating,
  cancelReasonBookingId,
  setCancelReasonBookingId,
  cancelReason,
  setCancelReason,
  onStatusChange,
}: {
  bookings: Booking[];
  stats: BookingStats;
  loading: boolean;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  debouncedSearch: string;
  statusUpdating: string | null;
  cancelReasonBookingId: string | null;
  setCancelReasonBookingId: (v: string | null) => void;
  cancelReason: string;
  setCancelReason: (v: string) => void;
  onStatusChange: (id: string, status: BookingStatus, reason?: string) => Promise<void>;
}) {
  return (
    <>
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={CalendarDays}
          label="Total Bookings"
          value={stats.total}
          borderColor="#78716c"
          accent="bg-stone-100 text-stone-600"
        />
        <StatCard
          icon={Clock}
          label="Upcoming"
          value={stats.upcoming}
          borderColor="#2563eb"
          accent="bg-blue-100 text-blue-700"
        />
        <StatCard
          icon={CheckCircle}
          label="Completed"
          value={stats.completed}
          borderColor="#16a34a"
          accent="bg-green-100 text-green-700"
        />
        <StatCard
          icon={XCircle}
          label="Cancelled"
          value={stats.cancelled}
          borderColor="#dc2626"
          accent="bg-red-100 text-red-700"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name or email..."
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

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
        </select>
      </div>

      {/* Bookings table */}
      <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 size={24} className="animate-spin mx-auto mb-3 text-stone-400" />
            <p className="text-stone-500 text-sm">Loading bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CalendarDays size={24} className="text-stone-400" />
            </div>
            <p className="text-stone-600 font-medium">
              {debouncedSearch || statusFilter !== 'all'
                ? 'No bookings match your filters'
                : 'No bookings yet'}
            </p>
            <p className="text-sm text-stone-400 mt-1">
              {debouncedSearch || statusFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Bookings will appear here once clients start scheduling.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-stone-50/80">
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Package
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-stone-50/50 transition">
                    {/* Date */}
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-stone-900">
                        {formatDateNice(booking.sessionDate)}
                      </span>
                    </td>

                    {/* Time */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-stone-600">
                        {formatTime(booking.startTime)} &ndash; {formatTime(booking.endTime)}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3">
                      {booking.clientId ? (
                        <Link
                          to={`/admin/coaching/clients/${booking.clientId}`}
                          className="text-sm font-medium text-stone-700 hover:text-[#8d3038] inline-flex items-center gap-1"
                        >
                          {booking.customerName}
                          <ExternalLink size={12} className="text-stone-400" />
                        </Link>
                      ) : (
                        <span className="text-sm font-medium text-stone-700">
                          {booking.customerName}
                        </span>
                      )}
                      <p className="text-xs text-stone-400 mt-0.5">{booking.customerEmail}</p>
                    </td>

                    {/* Package */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-stone-600">
                        {booking.packageName || '\u2014'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <BookingStatusBadge status={booking.status} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {cancelReasonBookingId === booking.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Reason..."
                            className="border border-stone-200 rounded px-2 py-1 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-stone-400"
                            autoFocus
                          />
                          <button
                            onClick={() => onStatusChange(booking.id, 'cancelled', cancelReason)}
                            disabled={statusUpdating === booking.id}
                            className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            {statusUpdating === booking.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              'Confirm'
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setCancelReasonBookingId(null);
                              setCancelReason('');
                            }}
                            className="text-xs text-stone-400 hover:text-stone-600"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <select
                            value={booking.status}
                            disabled={statusUpdating === booking.id}
                            onChange={(e) => {
                              const newStatus = e.target.value as BookingStatus;
                              if (newStatus === 'cancelled') {
                                setCancelReasonBookingId(booking.id);
                                setCancelReason('');
                              } else {
                                onStatusChange(booking.id, newStatus);
                              }
                            }}
                            className="bg-white border border-stone-200 rounded px-2 py-1 text-xs text-stone-700 focus:outline-none focus:ring-1 focus:ring-stone-400 disabled:opacity-50 pr-6 appearance-none cursor-pointer"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="no_show">No Show</option>
                          </select>
                          {statusUpdating === booking.id && (
                            <Loader2 size={12} className="absolute right-1 top-1/2 -translate-y-1/2 animate-spin text-stone-400" />
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ===========================================================================
// AVAILABILITY TAB
// ===========================================================================

function AvailabilityTab({
  availability,
  blockedDates,
  loading,
  onAddWindow,
  onEditWindow,
  onToggleWindow,
  onDeleteWindow,
  blockDateForm,
  setBlockDateForm,
  blockDateSaving,
  onBlockDate,
  onDeleteBlockedDate,
}: {
  availability: AvailabilityWindow[];
  blockedDates: BlockedDate[];
  loading: boolean;
  onAddWindow: (dayOfWeek?: number) => void;
  onEditWindow: (w: AvailabilityWindow) => void;
  onToggleWindow: (w: AvailabilityWindow) => void;
  onDeleteWindow: (id: string) => void;
  blockDateForm: { date: string; reason: string };
  setBlockDateForm: (v: { date: string; reason: string }) => void;
  blockDateSaving: boolean;
  onBlockDate: (e: React.FormEvent) => void;
  onDeleteBlockedDate: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="p-12 text-center">
        <Loader2 size={24} className="animate-spin mx-auto mb-3 text-stone-400" />
        <p className="text-stone-500 text-sm">Loading availability...</p>
      </div>
    );
  }

  // Group availability by day
  const byDay: Record<number, AvailabilityWindow[]> = {};
  DAY_ORDER.forEach((d) => (byDay[d] = []));
  availability.forEach((w) => {
    if (!byDay[w.dayOfWeek]) byDay[w.dayOfWeek] = [];
    byDay[w.dayOfWeek].push(w);
  });

  return (
    <div className="space-y-8">
      {/* Weekly Schedule */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-serif font-semibold text-stone-900">Weekly Schedule</h2>
          <button
            onClick={() => onAddWindow()}
            className="text-sm font-medium inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-white"
            style={{ backgroundColor: '#8d3038' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#6b2228')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#8d3038')}
          >
            <Plus size={14} />
            Add Window
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {DAY_ORDER.map((dayNum) => {
            const windows = byDay[dayNum] || [];
            const dayName = DAY_NAMES[dayNum];
            const shortName = dayName.slice(0, 3);

            return (
              <div
                key={dayNum}
                className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden"
              >
                {/* Day header */}
                <div className="bg-stone-50 px-3 py-2 border-b border-stone-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    {shortName}
                  </span>
                  <button
                    onClick={() => onAddWindow(dayNum)}
                    className="p-0.5 hover:bg-stone-200 rounded transition-colors"
                    title={`Add window to ${dayName}`}
                  >
                    <Plus size={12} className="text-stone-500" />
                  </button>
                </div>

                {/* Windows */}
                <div className="p-2 min-h-[80px]">
                  {windows.length === 0 ? (
                    <p className="text-[11px] text-stone-400 text-center py-4">No slots</p>
                  ) : (
                    <div className="space-y-2">
                      {windows.map((w) => (
                        <div
                          key={w.id}
                          className={`rounded-md p-2 text-xs transition-colors ${
                            w.enabled
                              ? 'bg-green-50 border border-green-200'
                              : 'bg-stone-50 border border-stone-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`font-medium ${w.enabled ? 'text-green-800' : 'text-stone-500'}`}>
                              {formatTime(w.startTime)}
                            </span>
                            <button
                              onClick={() => onToggleWindow(w)}
                              className="p-0.5 hover:bg-white/50 rounded transition"
                              title={w.enabled ? 'Disable' : 'Enable'}
                            >
                              {w.enabled ? (
                                <ToggleRight size={14} className="text-green-600" />
                              ) : (
                                <ToggleLeft size={14} className="text-stone-400" />
                              )}
                            </button>
                          </div>
                          <p className={`${w.enabled ? 'text-green-700' : 'text-stone-400'}`}>
                            {formatTime(w.endTime)}
                          </p>
                          <p className={`mt-0.5 ${w.enabled ? 'text-green-600' : 'text-stone-400'}`}>
                            {w.slotDuration} min slots
                          </p>
                          <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-stone-200/50">
                            <button
                              onClick={() => onEditWindow(w)}
                              className="p-0.5 hover:bg-white/60 rounded transition"
                              title="Edit"
                            >
                              <Edit3 size={11} className="text-stone-500" />
                            </button>
                            <button
                              onClick={() => onDeleteWindow(w.id)}
                              className="p-0.5 hover:bg-red-50 rounded transition"
                              title="Delete"
                            >
                              <Trash2 size={11} className="text-red-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Blocked Dates */}
      <div>
        <h2 className="text-lg font-serif font-semibold text-stone-900 mb-4">
          <AlertTriangle size={16} className="inline mr-1.5 -mt-0.5 text-amber-500" />
          Blocked Dates
        </h2>

        {/* Add blocked date form */}
        <form onSubmit={onBlockDate} className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Date</label>
            <input
              type="date"
              required
              value={blockDateForm.date}
              onChange={(e) => setBlockDateForm({ ...blockDateForm, date: e.target.value })}
              className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-stone-600 mb-1">Reason (optional)</label>
            <input
              type="text"
              value={blockDateForm.reason}
              onChange={(e) => setBlockDateForm({ ...blockDateForm, reason: e.target.value })}
              placeholder="e.g. Holiday, Personal day..."
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
            />
          </div>
          <button
            type="submit"
            disabled={blockDateSaving}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors inline-flex items-center gap-1.5 disabled:opacity-60"
            style={{ backgroundColor: '#8d3038' }}
            onMouseEnter={(e) => !blockDateSaving && (e.currentTarget.style.backgroundColor = '#6b2228')}
            onMouseLeave={(e) => !blockDateSaving && (e.currentTarget.style.backgroundColor = '#8d3038')}
          >
            {blockDateSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Block Date
          </button>
        </form>

        {/* Blocked dates list */}
        {blockedDates.length === 0 ? (
          <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-8 text-center">
            <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Calendar size={18} className="text-stone-400" />
            </div>
            <p className="text-sm text-stone-500">No blocked dates</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-stone-100">
              {blockedDates.map((bd) => (
                <div
                  key={bd.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-stone-50/50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                      <XCircle size={14} className="text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-900">{formatDateNice(bd.date)}</p>
                      {bd.reason && (
                        <p className="text-xs text-stone-400 mt-0.5">{bd.reason}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onDeleteBlockedDate(bd.id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove blocked date"
                  >
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
