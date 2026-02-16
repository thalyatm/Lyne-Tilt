import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';
import {
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  Search,
  Loader2,
  Trash2,
  Reply,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReviewStatus = 'pending' | 'approved' | 'rejected';

interface Review {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  customerEmail: string;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  isVerifiedPurchase: boolean;
  adminResponse: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ReviewStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  averageRating: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  if (diffWeek < 5) return `${diffWeek} week${diffWeek === 1 ? '' : 's'} ago`;
  return `${diffMonth} month${diffMonth === 1 ? '' : 's'} ago`;
}

// ---------------------------------------------------------------------------
// StarRating component
// ---------------------------------------------------------------------------

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={16}
          className={
            i <= rating
              ? 'text-amber-400 fill-amber-400'
              : 'text-stone-300'
          }
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatCard component
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

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ReviewStatus }) {
  const styles: Record<ReviewStatus, string> = {
    pending: 'bg-amber-50 text-amber-700',
    approved: 'bg-green-50 text-green-700',
    rejected: 'bg-red-50 text-red-700',
  };
  const labels: Record<ReviewStatus, string> = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
  };
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ReviewsManager() {
  const { accessToken } = useAuth();

  // Data
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    averageRating: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Reply
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySaving, setReplySaving] = useState(false);

  // Action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ---------- Debounced search ----------

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

  // ---------- Data fetching ----------

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (ratingFilter && ratingFilter !== 'all') params.set('rating', ratingFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await fetch(`${API_BASE}/reviews?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) throw new Error('Failed to load reviews');

      const data = await res.json();
      setReviews(data.reviews || []);
      setStats(data.stats || { total: 0, pending: 0, approved: 0, rejected: 0, averageRating: 0 });
    } catch {
      showToast('Could not load reviews. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [accessToken, statusFilter, ratingFilter, debouncedSearch]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // ---------- Actions ----------

  const updateStatus = async (id: string, status: ReviewStatus) => {
    setActionLoading(id);
    try {
      const res = await fetch(`${API_BASE}/reviews/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error('Failed to update status');

      // Optimistically update the local state
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );

      // Update stats counts
      setStats((prev) => {
        const review = reviews.find((r) => r.id === id);
        if (!review) return prev;
        const oldStatus = review.status;
        return {
          ...prev,
          [oldStatus]: prev[oldStatus as keyof Pick<ReviewStats, 'pending' | 'approved' | 'rejected'>] - 1,
          [status]: prev[status as keyof Pick<ReviewStats, 'pending' | 'approved' | 'rejected'>] + 1,
        };
      });

      showToast(`Review ${status}.`);
    } catch {
      showToast('Could not update the review. Please try again.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteReview = async (id: string) => {
    const review = reviews.find((r) => r.id === id);
    const name = review?.customerName || 'this customer';
    if (!window.confirm(`Are you sure you want to delete this review from ${name}? This cannot be undone.`)) return;

    setActionLoading(id);
    try {
      const res = await fetch(`${API_BASE}/reviews/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) throw new Error('Failed to delete review');

      setReviews((prev) => prev.filter((r) => r.id !== id));
      setStats((prev) => {
        const oldStatus = review?.status || 'pending';
        return {
          ...prev,
          total: prev.total - 1,
          [oldStatus]: prev[oldStatus as keyof Pick<ReviewStats, 'pending' | 'approved' | 'rejected'>] - 1,
        };
      });
      showToast('Review deleted.');
    } catch {
      showToast('Could not delete the review. Please try again.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const submitReply = async (id: string) => {
    if (!replyText.trim()) return;
    setReplySaving(true);
    try {
      const res = await fetch(`${API_BASE}/reviews/${id}/response`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ adminResponse: replyText.trim() }),
      });

      if (!res.ok) throw new Error('Failed to save response');

      setReviews((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, adminResponse: replyText.trim(), respondedAt: new Date().toISOString() }
            : r
        )
      );
      setReplyingTo(null);
      setReplyText('');
      showToast('Response saved.');
    } catch {
      showToast('Could not save your response. Please try again.', 'error');
    } finally {
      setReplySaving(false);
    }
  };

  const openReply = (id: string, existing: string | null) => {
    setReplyingTo(id);
    setReplyText(existing || '');
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyText('');
  };

  // ---------- Status filter tabs ----------

  const statusTabs: { key: string; label: string; count?: number }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending', count: stats.pending },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  // ---------- Render ----------

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-serif font-semibold text-stone-900">Reviews</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          {stats.total} review{stats.total !== 1 ? 's' : ''} from your customers
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          icon={MessageSquare}
          label="Total Reviews"
          value={stats.total}
          borderColor="#78716c"
          accent="bg-stone-100 text-stone-600"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={stats.pending}
          borderColor="#d97706"
          accent="bg-amber-100 text-amber-700"
        />
        <StatCard
          icon={CheckCircle}
          label="Approved"
          value={stats.approved}
          borderColor="#16a34a"
          accent="bg-green-100 text-green-700"
        />
        <StatCard
          icon={XCircle}
          label="Rejected"
          value={stats.rejected}
          borderColor="#dc2626"
          accent="bg-red-100 text-red-700"
        />
        <StatCard
          icon={Star}
          label="Avg Rating"
          value={stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '--'}
          borderColor="#eab308"
          accent="bg-yellow-100 text-yellow-700"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reviews..."
            className="w-full bg-white border border-stone-200 rounded-md pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
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

        {/* Rating filter */}
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className="bg-white border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
        >
          <option value="all">All ratings</option>
          <option value="5">5 stars</option>
          <option value="4">4 stars</option>
          <option value="3">3 stars</option>
          <option value="2">2 stars</option>
          <option value="1">1 star</option>
        </select>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-stone-200">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              statusFilter === tab.key
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
            }`}
          >
            {tab.label}
            {tab.key === 'pending' && stats.pending > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-semibold rounded-full bg-amber-100 text-amber-700">
                {stats.pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Reviews list */}
      {loading ? (
        <div className="bg-white rounded-lg border border-stone-200 p-12 text-center">
          <Loader2 size={24} className="animate-spin mx-auto mb-3 text-stone-400" />
          <p className="text-stone-500 text-sm">Loading reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-lg border border-stone-200 p-12 text-center">
          <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <MessageSquare size={24} className="text-stone-400" />
          </div>
          <p className="text-stone-600 font-medium">
            {debouncedSearch || statusFilter !== 'all' || ratingFilter !== 'all'
              ? 'No reviews match your filters'
              : 'No reviews yet'}
          </p>
          <p className="text-sm text-stone-400 mt-1">
            {debouncedSearch || statusFilter !== 'all' || ratingFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Reviews will appear here once customers start leaving feedback.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className={`bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden ${
                review.status === 'pending' ? 'border-l-4 border-l-amber-300' : ''
              }`}
            >
              <div className="p-5">
                {/* Card header */}
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <StarRating rating={review.rating} />

                  <div className="flex items-center gap-1.5 text-sm text-stone-700">
                    <User size={14} className="text-stone-400" />
                    <span className="font-medium">{review.customerName}</span>
                  </div>

                  {review.isVerifiedPurchase && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                      <ShieldCheck size={12} />
                      Verified Purchase
                    </span>
                  )}

                  <StatusBadge status={review.status} />

                  <span className="text-xs text-stone-400 ml-auto">
                    {relativeTime(review.createdAt)}
                  </span>
                </div>

                {/* Title */}
                {review.title && (
                  <h3 className="text-sm font-semibold text-stone-900 mb-1">
                    {review.title}
                  </h3>
                )}

                {/* Body */}
                <p className="text-sm text-stone-600 leading-relaxed mb-2">
                  {review.body}
                </p>

                {/* Product */}
                <p className="text-xs text-stone-400 mb-4">
                  on <span className="text-stone-500 font-medium">{review.productName}</span>
                </p>

                {/* Admin response */}
                {review.adminResponse && replyingTo !== review.id && (
                  <div className="ml-4 pl-4 border-l-2 border-stone-200 mb-4">
                    <p className="text-xs font-medium text-stone-500 mb-1">Your response</p>
                    <p className="text-sm text-stone-600">{review.adminResponse}</p>
                    {review.respondedAt && (
                      <p className="text-xs text-stone-400 mt-1">{relativeTime(review.respondedAt)}</p>
                    )}
                    <button
                      onClick={() => openReply(review.id, review.adminResponse)}
                      className="text-xs font-medium mt-2 hover:underline"
                      style={{ color: '#8d3038' }}
                    >
                      Edit response
                    </button>
                  </div>
                )}

                {/* Reply form (inline) */}
                {replyingTo === review.id && (
                  <div className="ml-4 pl-4 border-l-2 border-stone-200 mb-4">
                    <p className="text-xs font-medium text-stone-500 mb-2">
                      {review.adminResponse ? 'Edit your response' : 'Write a response'}
                    </p>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Thank you for your feedback..."
                      rows={3}
                      className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 resize-none"
                      autoFocus
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => submitReply(review.id)}
                        disabled={replySaving || !replyText.trim()}
                        className="px-3 py-1.5 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50"
                        style={{ backgroundColor: '#8d3038' }}
                        onMouseEnter={(e) => {
                          if (!replySaving && replyText.trim()) e.currentTarget.style.backgroundColor = '#6b2228';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#8d3038';
                        }}
                      >
                        {replySaving ? (
                          <span className="flex items-center gap-1.5">
                            <Loader2 size={14} className="animate-spin" />
                            Saving...
                          </span>
                        ) : (
                          'Save Response'
                        )}
                      </button>
                      <button
                        onClick={cancelReply}
                        className="px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-stone-100">
                  {/* Status actions */}
                  {review.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateStatus(review.id, 'approved')}
                        disabled={actionLoading === review.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors disabled:opacity-50"
                      >
                        <CheckCircle size={14} />
                        Approve
                      </button>
                      <button
                        onClick={() => updateStatus(review.id, 'rejected')}
                        disabled={actionLoading === review.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50"
                      >
                        <XCircle size={14} />
                        Reject
                      </button>
                    </>
                  )}
                  {review.status === 'approved' && (
                    <button
                      onClick={() => updateStatus(review.id, 'rejected')}
                      disabled={actionLoading === review.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50"
                    >
                      <XCircle size={14} />
                      Reject
                    </button>
                  )}
                  {review.status === 'rejected' && (
                    <button
                      onClick={() => updateStatus(review.id, 'approved')}
                      disabled={actionLoading === review.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors disabled:opacity-50"
                    >
                      <CheckCircle size={14} />
                      Approve
                    </button>
                  )}

                  {/* Reply button */}
                  {replyingTo !== review.id && (
                    <button
                      onClick={() => openReply(review.id, review.adminResponse)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-md transition-colors"
                    >
                      <Reply size={14} />
                      {review.adminResponse ? 'Edit Reply' : 'Reply'}
                    </button>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={() => deleteReview(review.id)}
                    disabled={actionLoading === review.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors ml-auto disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
