import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, User, Search } from 'lucide-react';
import { API_BASE } from '../config/api';
import { useAuth } from '../context/AuthContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BookSessionModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  // Pre-fill context (all optional)
  clientId?: string | null;
  clientName?: string;
  clientEmail?: string;
  packageId?: string | null;
  packageName?: string | null;
  durationMinutes?: number | null;
  sessionType?: 'coaching' | 'discovery';
  applicationId?: string | null;
}

interface ClientResult {
  id: string;
  name: string;
  email: string;
}

interface CoachingPackageOption {
  id: string;
  title: string;
  durationMinutes: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addMinutesToTime(time: string, minutes: number): string {
  const [hStr, mStr] = time.split(':');
  const totalMinutes = parseInt(hStr, 10) * 60 + parseInt(mStr || '0', 10) + minutes;
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const INPUT_CLASS =
  'w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BookSessionModal({
  open,
  onClose,
  onCreated,
  clientId: propClientId,
  clientName: propClientName,
  clientEmail: propClientEmail,
  packageId: propPackageId,
  packageName: propPackageName,
  durationMinutes: propDuration,
  sessionType,
  applicationId,
}: BookSessionModalProps) {
  const { accessToken } = useAuth();

  // ── Form state ──────────────────────────────────────────
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState('');
  const [selectedClientEmail, setSelectedClientEmail] = useState('');

  // Client search
  const [clientSearch, setClientSearch] = useState('');
  const [clientResults, setClientResults] = useState<ClientResult[]>([]);
  const [clientSearching, setClientSearching] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Package
  const [packages, setPackages] = useState<CoachingPackageOption[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [currentDuration, setCurrentDuration] = useState<number | null>(null);

  // Date / Time
  const [sessionDate, setSessionDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  // Other fields
  const [meetingUrl, setMeetingUrl] = useState('');
  const [notes, setNotes] = useState('');

  // Submission
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Whether client is pre-filled (read-only) ───────────
  const hasPrefilledClient = !!(propClientId);

  // ── Fetch packages on mount ─────────────────────────────
  useEffect(() => {
    if (!open || !accessToken) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/coaching?all=true&status=published`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const items: any[] = data.items || [];
        if (!cancelled) {
          setPackages(
            items.map((p) => ({
              id: p.id,
              title: p.title,
              durationMinutes: p.durationMinutes ?? null,
            }))
          );
        }
      } catch {
        // silent
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, accessToken]);

  // ── Reset form when modal opens ─────────────────────────
  useEffect(() => {
    if (!open) return;

    // Reset everything
    setError(null);
    setSaving(false);
    setClientSearch('');
    setClientResults([]);
    setClientSearching(false);
    setShowClientDropdown(false);
    setManualEntry(false);
    setManualName('');
    setManualEmail('');
    setSessionDate('');
    setStartTime('09:00');
    setMeetingUrl('');
    setNotes('');

    // Pre-fill client from props
    if (propClientId) {
      setSelectedClientId(propClientId);
      setSelectedClientName(propClientName || '');
      setSelectedClientEmail(propClientEmail || '');
    } else {
      setSelectedClientId(null);
      setSelectedClientName('');
      setSelectedClientEmail('');
    }

    // Pre-fill package from props
    if (propPackageId) {
      setSelectedPackageId(propPackageId);
      const dur = propDuration ?? null;
      setCurrentDuration(dur);
      setEndTime(dur ? addMinutesToTime('09:00', dur) : '10:00');
    } else {
      setSelectedPackageId('');
      setCurrentDuration(null);
      setEndTime('10:00');
    }
  }, [open, propClientId, propClientName, propClientEmail, propPackageId, propDuration]);

  // ── Debounced client search ─────────────────────────────
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!clientSearch.trim() || !accessToken) {
      setClientResults([]);
      setShowClientDropdown(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setClientSearching(true);
      try {
        const res = await fetch(
          `${API_BASE}/clients?q=${encodeURIComponent(clientSearch.trim())}&pageSize=10`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!res.ok) return;
        const data = await res.json();
        const clients: ClientResult[] = (data.clients || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          email: c.email,
        }));
        setClientResults(clients);
        setShowClientDropdown(clients.length > 0);
      } catch {
        // silent
      } finally {
        setClientSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [clientSearch, accessToken]);

  // ── Close dropdown on outside click ─────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowClientDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Auto-update end time when start time or package changes ──
  const updateEndTime = useCallback(
    (start: string, duration: number | null) => {
      if (duration && duration > 0) {
        setEndTime(addMinutesToTime(start, duration));
      }
    },
    []
  );

  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    updateEndTime(newStart, currentDuration);
  };

  const handlePackageChange = (pkgId: string) => {
    setSelectedPackageId(pkgId);
    const pkg = packages.find((p) => p.id === pkgId);
    const dur = pkg?.durationMinutes ?? null;
    setCurrentDuration(dur);
    updateEndTime(startTime, dur);
  };

  // ── Select a client from search results ─────────────────
  const handleSelectClient = (client: ClientResult) => {
    setSelectedClientId(client.id);
    setSelectedClientName(client.name);
    setSelectedClientEmail(client.email);
    setClientSearch('');
    setClientResults([]);
    setShowClientDropdown(false);
    setManualEntry(false);
    setManualName('');
    setManualEmail('');
  };

  // ── Clear selected client ───────────────────────────────
  const handleClearClient = () => {
    setSelectedClientId(null);
    setSelectedClientName('');
    setSelectedClientEmail('');
  };

  // ── Derived: determine customer name/email for submission ──
  const customerName = selectedClientId
    ? selectedClientName
    : manualEntry
    ? manualName
    : '';
  const customerEmail = selectedClientId
    ? selectedClientEmail
    : manualEntry
    ? manualEmail
    : '';

  const canSubmit =
    !saving &&
    customerName.trim() !== '' &&
    customerEmail.trim() !== '' &&
    sessionDate !== '' &&
    startTime !== '' &&
    endTime !== '';

  // ── Submit ──────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !accessToken) return;

    setSaving(true);
    setError(null);

    try {
      const body: Record<string, any> = {
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        sessionDate,
        startTime,
        endTime,
      };

      if (selectedClientId) body.clientId = selectedClientId;
      if (selectedPackageId) body.coachingPackageId = selectedPackageId;
      if (meetingUrl.trim()) body.meetingUrl = meetingUrl.trim();
      if (notes.trim()) body.notes = notes.trim();

      const res = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create booking');
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────
  if (!open) return null;

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

        {/* Title */}
        <h2 className="text-lg font-serif font-semibold text-stone-900 mb-4">
          Book Session
        </h2>

        {/* Discovery badge */}
        {sessionType === 'discovery' && (
          <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-700 mb-4">
            Discovery Call
          </span>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ═══════════ CLIENT SECTION ═══════════ */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Client <span className="text-red-500">*</span>
            </label>

            {hasPrefilledClient ? (
              /* Read-only client badge */
              <div className="inline-flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                <User size={14} className="text-stone-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">
                    {selectedClientName}
                  </p>
                  <p className="text-xs text-stone-500 truncate">
                    {selectedClientEmail}
                  </p>
                </div>
              </div>
            ) : selectedClientId ? (
              /* Client selected from search */
              <div className="inline-flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                <User size={14} className="text-stone-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">
                    {selectedClientName}
                  </p>
                  <p className="text-xs text-stone-500 truncate">
                    {selectedClientEmail}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearClient}
                  className="ml-1 p-0.5 hover:bg-stone-200 rounded transition-colors"
                >
                  <X size={14} className="text-stone-400" />
                </button>
              </div>
            ) : !manualEntry ? (
              /* Client search input */
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                  />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Search clients by name or email..."
                    className="w-full border border-stone-200 rounded-lg pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                  />
                  {clientSearching && (
                    <Loader2
                      size={14}
                      className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-stone-400"
                    />
                  )}
                </div>

                {/* Search results dropdown */}
                {showClientDropdown && clientResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-stone-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {clientResults.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => handleSelectClient(client)}
                        className="w-full text-left px-3 py-2 hover:bg-stone-50 transition-colors border-b border-stone-50 last:border-0"
                      >
                        <p className="text-sm font-medium text-stone-800">
                          {client.name}
                        </p>
                        <p className="text-xs text-stone-500">{client.email}</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* "Or enter manually" toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setManualEntry(true);
                    setClientSearch('');
                    setClientResults([]);
                    setShowClientDropdown(false);
                  }}
                  className="mt-1.5 text-xs text-stone-500 hover:text-stone-700 transition-colors"
                >
                  Or enter manually
                </button>
              </div>
            ) : (
              /* Manual name + email inputs */
              <div className="space-y-3">
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Client name"
                  className={INPUT_CLASS}
                />
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="Client email"
                  className={INPUT_CLASS}
                />
                <button
                  type="button"
                  onClick={() => {
                    setManualEntry(false);
                    setManualName('');
                    setManualEmail('');
                  }}
                  className="text-xs text-stone-500 hover:text-stone-700 transition-colors"
                >
                  Search existing clients instead
                </button>
              </div>
            )}
          </div>

          {/* ═══════════ PACKAGE DROPDOWN ═══════════ */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Package
            </label>
            <select
              value={selectedPackageId}
              onChange={(e) => handlePackageChange(e.target.value)}
              className={`${INPUT_CLASS} bg-white`}
            >
              <option value="">&mdash; Select package &mdash;</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.title}
                  {pkg.durationMinutes ? ` (${pkg.durationMinutes} min)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* ═══════════ DATE / TIME ═══════════ */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Session Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          {/* ═══════════ MEETING URL ═══════════ */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Meeting URL
            </label>
            <input
              type="url"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://zoom.us/j/..."
              className={INPUT_CLASS}
            />
          </div>

          {/* ═══════════ NOTES ═══════════ */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Session notes..."
              className={`${INPUT_CLASS} resize-none`}
            />
          </div>

          {/* ═══════════ ERROR ═══════════ */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* ═══════════ ACTIONS ═══════════ */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors inline-flex items-center gap-1.5 disabled:opacity-60"
              style={{ backgroundColor: '#8d3038' }}
              onMouseEnter={(e) =>
                canSubmit && (e.currentTarget.style.backgroundColor = '#6b2228')
              }
              onMouseLeave={(e) =>
                canSubmit && (e.currentTarget.style.backgroundColor = '#8d3038')
              }
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Book Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
