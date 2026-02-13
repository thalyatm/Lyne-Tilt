import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  Ban,
  Calendar,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE } from '../config/api';

interface QueueItem {
  id: string;
  recipientEmail: string;
  recipientName?: string;
  automationName: string;
  stepOrder: number;
  subject: string;
  scheduledFor: string;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  error?: string;
  retryCount?: number;
  lastAttempt?: string;
}

interface QueueStats {
  scheduled: number;
  sent: number;
  failed: number;
  cancelled: number;
}

export default function AutomationQueue() {
  const { token } = useAuth();
  const toast = useToast();

  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats>({ scheduled: 0, sent: 0, failed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingQueue, setProcessingQueue] = useState(false);

  useEffect(() => {
    fetchQueueData();
    fetchStats();
  }, []);

  const fetchQueueData = async () => {
    try {
      const response = await fetch(`${API_BASE}/automations/queue/all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch queue items');

      const data = await response.json();
      setQueueItems(data);
    } catch (error) {
      console.error('Error fetching queue:', error);
      toast.error('Failed to load queue items');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/automations/queue/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch stats');

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const processQueue = async () => {
    setProcessingQueue(true);
    try {
      const response = await fetch(`${API_BASE}/automations/queue/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to process queue');

      toast.success('Queue processed successfully');
      await fetchQueueData();
      await fetchStats();
    } catch (error) {
      console.error('Error processing queue:', error);
      toast.error('Failed to process queue');
    } finally {
      setProcessingQueue(false);
    }
  };

  const retryItem = async (id: string) => {
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      const response = await fetch(`${API_BASE}/automations/queue/${id}/retry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to retry item');

      toast.success('Item queued for retry');
      await fetchQueueData();
      await fetchStats();
    } catch (error) {
      console.error('Error retrying item:', error);
      toast.error('Failed to retry item');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const cancelItem = async (id: string) => {
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      const response = await fetch(`${API_BASE}/automations/queue/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to cancel item');

      toast.success('Item cancelled successfully');
      await fetchQueueData();
      await fetchStats();
    } catch (error) {
      console.error('Error cancelling item:', error);
      toast.error('Failed to cancel item');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
      sent: 'bg-green-50 text-green-700 border-green-200',
      failed: 'bg-red-50 text-red-700 border-red-200',
      cancelled: 'bg-stone-100 text-stone-600 border-stone-200'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const filteredItems = activeTab === 'all'
    ? queueItems
    : queueItems.filter(item => item.status === activeTab);

  const tabs = ['all', 'scheduled', 'sent', 'failed', 'cancelled'];

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-serif text-stone-800" style={{ fontFamily: 'Georgia, serif' }}>
            Automation Queue
          </h1>
          <button
            onClick={processQueue}
            disabled={processingQueue}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#8d3038' }}
          >
            {processingQueue ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Process Queue
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600 mb-1">Scheduled</p>
                <p className="text-2xl font-semibold text-stone-800">{stats.scheduled}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600 mb-1">Sent</p>
                <p className="text-2xl font-semibold text-stone-800">{stats.sent}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600 mb-1">Failed</p>
                <p className="text-2xl font-semibold text-stone-800">{stats.failed}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-600 mb-1">Cancelled</p>
                <p className="text-2xl font-semibold text-stone-800">{stats.cancelled}</p>
              </div>
              <Ban className="w-8 h-8 text-stone-400" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mb-6 border-b border-stone-200">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 text-stone-800'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
              style={activeTab === tab ? { borderColor: '#8d3038', color: '#8d3038' } : {}}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Queue Items Table */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-stone-200">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-stone-200 rounded animate-pulse w-1/4"></div>
                    <div className="h-3 bg-stone-100 rounded animate-pulse w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-12 h-12 text-stone-400 mx-auto mb-4" />
              <h3 className="text-lg font-serif text-stone-800 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                Queue is empty
              </h3>
              <p className="text-stone-600">
                {activeTab === 'all'
                  ? 'No automation emails are currently queued.'
                  : `No ${activeTab} items in the queue.`
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-600 uppercase tracking-wider">
                      Recipient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-600 uppercase tracking-wider">
                      Automation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-600 uppercase tracking-wider">
                      Step
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-600 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-600 uppercase tracking-wider">
                      Scheduled For
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-stone-200">
                  {filteredItems.map(item => (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-stone-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-stone-800">{item.recipientEmail}</div>
                            {item.recipientName && (
                              <div className="text-xs text-stone-500">{item.recipientName}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-800">
                          {item.automationName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">
                          Step {item.stepOrder + 1}
                        </td>
                        <td className="px-6 py-4 text-sm text-stone-800 max-w-xs truncate">
                          {item.subject}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(item.scheduledFor)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            {item.status === 'failed' && (
                              <>
                                <button
                                  onClick={() => retryItem(item.id)}
                                  disabled={processingIds.has(item.id)}
                                  className="flex items-center gap-1 px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                                >
                                  {processingIds.has(item.id) ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3 h-3" />
                                  )}
                                  Retry
                                </button>
                                <button
                                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                                  className="flex items-center gap-1 px-2 py-1 text-stone-600 hover:bg-stone-100 rounded transition-colors"
                                >
                                  {expandedId === item.id ? (
                                    <ChevronDown className="w-3 h-3" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3" />
                                  )}
                                  Details
                                </button>
                              </>
                            )}
                            {item.status === 'scheduled' && (
                              <button
                                onClick={() => cancelItem(item.id)}
                                disabled={processingIds.has(item.id)}
                                className="flex items-center gap-1 px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                              >
                                {processingIds.has(item.id) ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedId === item.id && item.status === 'failed' && (
                        <tr className="bg-red-50">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="space-y-2">
                              <div>
                                <span className="text-xs font-medium text-red-800">Error:</span>
                                <p className="text-sm text-red-700 mt-1">{item.error || 'Unknown error'}</p>
                              </div>
                              {item.retryCount !== undefined && (
                                <div>
                                  <span className="text-xs font-medium text-red-800">Retry Count:</span>
                                  <span className="text-sm text-red-700 ml-2">{item.retryCount}</span>
                                </div>
                              )}
                              {item.lastAttempt && (
                                <div>
                                  <span className="text-xs font-medium text-red-800">Last Attempt:</span>
                                  <span className="text-sm text-red-700 ml-2">{formatDate(item.lastAttempt)}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
