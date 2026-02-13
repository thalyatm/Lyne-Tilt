import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE } from '../config/api';
import { Filter, Plus, Trash2, Edit3, Users, AlertCircle, Loader2 } from 'lucide-react';

interface Segment {
  id: string;
  name: string;
  description?: string;
  rules: {
    match: 'all' | 'any';
    conditions: Array<{ field: string; operator: string; value: unknown }>;
  };
  subscriberCount: number;
  lastCalculatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function SegmentList() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const toast = useToast();

  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Segment | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSegments();
  }, []);

  async function fetchSegments() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/segments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load segments');
      const data = await res.json();
      setSegments(data.segments);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load segments');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/segments/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete segment');
      setSegments((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      toast.success(`Segment "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete segment');
    } finally {
      setDeleting(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // Loading skeleton
  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
            Segments
          </h1>
          <button
            disabled
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium opacity-50"
            style={{ backgroundColor: '#8d3038' }}
          >
            <Plus className="w-4 h-4" />
            New Segment
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 animate-pulse"
            >
              <div className="h-5 bg-stone-200 rounded w-2/3 mb-3" />
              <div className="h-4 bg-stone-100 rounded w-full mb-4" />
              <div className="flex items-center gap-4 mb-3">
                <div className="h-4 bg-stone-100 rounded w-20" />
                <div className="h-4 bg-stone-100 rounded w-24" />
              </div>
              <div className="h-3 bg-stone-100 rounded w-28" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (segments.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
            Segments
          </h1>
          <button
            onClick={() => navigate('/admin/segments/new')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#8d3038' }}
          >
            <Plus className="w-4 h-4" />
            New Segment
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-4">
            <Filter className="w-7 h-7 text-stone-400" />
          </div>
          <h2 className="text-lg font-semibold text-stone-800 mb-1">No segments defined</h2>
          <p className="text-stone-500 text-sm mb-6 max-w-sm">
            Create your first segment to target specific subscriber groups
          </p>
          <button
            onClick={() => navigate('/admin/segments/new')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#8d3038' }}
          >
            <Plus className="w-4 h-4" />
            Create a Segment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
          Segments
        </h1>
        <button
          onClick={() => navigate('/admin/segments/new')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#8d3038' }}
        >
          <Plus className="w-4 h-4" />
          New Segment
        </button>
      </div>

      {/* Segment cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {segments.map((segment) => (
          <div
            key={segment.id}
            className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-bold text-stone-900 text-base leading-tight">{segment.name}</h3>
              <div className="flex items-center gap-1 ml-2 shrink-0">
                <button
                  onClick={() => navigate(`/admin/segments/${segment.id}`)}
                  className="p-1.5 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                  title="Edit segment"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(segment)}
                  className="p-1.5 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Delete segment"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {segment.description && (
              <p className="text-sm text-stone-500 mb-3 line-clamp-2">{segment.description}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-stone-600 mb-3">
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-stone-400" />
                {segment.subscriberCount.toLocaleString()} subscriber{segment.subscriberCount !== 1 ? 's' : ''}
              </span>
              <span className="text-stone-400">
                {segment.rules.conditions.length} condition{segment.rules.conditions.length !== 1 ? 's' : ''}
              </span>
            </div>

            <p className="text-xs text-stone-400">
              Updated {formatDate(segment.updatedAt)}
            </p>
          </div>
        ))}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => !deleting && setDeleteTarget(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-900 text-lg">
                  Delete segment &lsquo;{deleteTarget.name}&rsquo;?
                </h3>
                <p className="text-sm text-stone-500 mt-1">
                  This action cannot be undone. Any campaigns using this segment will no longer be able to reference it.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-stone-700 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
