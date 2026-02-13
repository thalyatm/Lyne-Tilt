import React, { useState, useEffect } from 'react';
import {
  Mail,
  MailOpen,
  Archive,
  Trash2,
  Download,
  RefreshCw,
  Search,
  ChevronDown,
  ExternalLink,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'archived';
  createdAt: string;
  readAt?: string;
}

export default function ContactInbox() {
  const { token } = useAuth();
  const [messages, setMessages] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactSubmission | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const url = filter === 'all' ? `${API_BASE}/contact` : `${API_BASE}/contact?status=${filter}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      } else {
        showToast('Could not load messages. Please try refreshing.', 'error');
      }
    } catch (error) {
      showToast('Could not load messages. Please check your connection and try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [filter, token]);

  const viewMessage = async (message: ContactSubmission) => {
    setSelectedMessage(message);
    // Auto-mark as read
    if (message.status === 'unread') {
      try {
        await fetch(`${API_BASE}/contact/${message.id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: 'read' }),
        });
        setMessages((prev) =>
          prev.map((m) => (m.id === message.id ? { ...m, status: 'read' } : m))
        );
      } catch (error) {
        showToast('Could not mark message as read. Please try again.', 'error');
      }
    }
  };

  const updateStatus = async (id: string, status: 'unread' | 'read' | 'archived') => {
    try {
      await fetch(`${API_BASE}/contact/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
      if (selectedMessage?.id === id) {
        setSelectedMessage((prev) => (prev ? { ...prev, status } : null));
      }
      const labels: Record<string, string> = { unread: 'marked as new', read: 'marked as read', archived: 'archived' };
      showToast(`Message ${labels[status]}.`);
    } catch (error) {
      showToast('Something went wrong. Please try again.', 'error');
    }
  };

  const deleteMessage = async (id: string) => {
    const msg = messages.find((m) => m.id === id);
    const senderName = msg?.name || 'this person';
    if (!window.confirm(`Are you sure you want to delete this message from ${senderName}? This can't be undone.`)) return;
    try {
      const response = await fetch(`${API_BASE}/contact/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Delete failed');
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (selectedMessage?.id === id) {
        setSelectedMessage(null);
      }
      showToast('Message deleted.');
    } catch (error) {
      showToast('Could not delete the message. Please try again.', 'error');
    }
  };

  const bulkUpdateStatus = async (status: 'read' | 'archived') => {
    if (selectedIds.size === 0) return;
    try {
      await fetch(`${API_BASE}/contact/bulk/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: Array.from(selectedIds), status }),
      });
      setMessages((prev) =>
        prev.map((m) => (selectedIds.has(m.id) ? { ...m, status } : m))
      );
      const count = selectedIds.size;
      setSelectedIds(new Set());
      showToast(`${count} message${count === 1 ? '' : 's'} ${status === 'archived' ? 'archived' : 'marked as read'}.`);
    } catch (error) {
      showToast('Something went wrong. Please try again.', 'error');
    }
  };

  const exportCSV = () => {
    window.open(`${API_BASE}/contact/export/csv?token=${token}`, '_blank');
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredMessages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMessages.map((m) => m.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const filteredMessages = messages.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadCount = messages.filter((m) => m.status === 'unread').length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="h-[calc(100vh-120px)]">
      {/* Toast feedback */}
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

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Messages</h1>
          <p className="text-sm text-stone-400">Messages from your website visitors</p>
          <p className="text-stone-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} new` : 'All caught up'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchMessages}
            className="p-2 hover:bg-stone-100 rounded-lg text-stone-600"
            title="Refresh"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-700 text-sm"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden flex h-full">
        {/* Message List */}
        <div className="w-2/5 border-r border-stone-200 flex flex-col">
          {/* Toolbar */}
          <div className="p-3 border-b border-stone-200 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-clay/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
                className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-clay/20"
              >
                <option value="all">All Messages</option>
                <option value="unread">New</option>
                <option value="read">Read</option>
                <option value="archived">Archived</option>
              </select>
              {selectedIds.size > 0 && (
                <>
                  <button
                    onClick={() => bulkUpdateStatus('read')}
                    className="text-sm px-2 py-1 bg-stone-100 hover:bg-stone-200 rounded text-stone-600"
                  >
                    Mark Read
                  </button>
                  <button
                    onClick={() => bulkUpdateStatus('archived')}
                    className="text-sm px-2 py-1 bg-stone-100 hover:bg-stone-200 rounded text-stone-600"
                  >
                    Archive
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-stone-500">Loading...</div>
            ) : filteredMessages.length === 0 ? (
              <div className="p-8 text-center text-stone-500">
                <Mail size={48} className="mx-auto mb-3 text-stone-300" />
                <p className="font-medium text-stone-600 mb-1">No messages yet</p>
                <p className="text-sm text-stone-400">When someone contacts you through your website, their messages will appear here.</p>
              </div>
            ) : (
              <>
                <div className="px-3 py-2 border-b border-stone-100 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredMessages.length && filteredMessages.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-stone-300"
                  />
                  <span className="text-xs text-stone-500">Select all</span>
                </div>
                {filteredMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`border-b border-stone-100 cursor-pointer transition ${
                      selectedMessage?.id === message.id
                        ? 'bg-stone-100'
                        : message.status === 'unread'
                        ? 'bg-stone-50 hover:bg-stone-100'
                        : 'hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-start gap-3 p-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(message.id)}
                        onChange={() => toggleSelect(message.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 rounded border-stone-300"
                      />
                      <div
                        className="flex-1 min-w-0"
                        onClick={() => viewMessage(message)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-sm truncate ${
                              message.status === 'unread' ? 'font-semibold text-stone-900' : 'text-stone-700'
                            }`}
                          >
                            {message.name}
                          </span>
                          <span className="text-xs text-stone-400 whitespace-nowrap ml-2">
                            {formatDate(message.createdAt)}
                          </span>
                        </div>
                        <p
                          className={`text-sm truncate ${
                            message.status === 'unread' ? 'font-medium text-stone-800' : 'text-stone-600'
                          }`}
                        >
                          {message.subject}
                        </p>
                        <p className="text-xs text-stone-400 truncate mt-0.5">
                          {message.message.substring(0, 60)}...
                        </p>
                      </div>
                      {message.status === 'unread' && (
                        <div className="w-2 h-2 bg-stone-900 rounded-full mt-2" />
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Message Detail */}
        <div className="flex-1 flex flex-col">
          {selectedMessage ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-stone-200">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-medium text-stone-900">{selectedMessage.subject}</h2>
                    <p className="text-sm text-stone-500">
                      From <span className="text-stone-700">{selectedMessage.name}</span> &lt;{selectedMessage.email}&gt;
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {selectedMessage.status === 'unread' ? (
                      <button
                        onClick={() => updateStatus(selectedMessage.id, 'read')}
                        className="p-2 hover:bg-stone-100 rounded-lg text-stone-600"
                        title="Mark as read"
                      >
                        <MailOpen size={18} />
                      </button>
                    ) : selectedMessage.status === 'read' ? (
                      <button
                        onClick={() => updateStatus(selectedMessage.id, 'unread')}
                        className="p-2 hover:bg-stone-100 rounded-lg text-stone-600"
                        title="Mark as unread"
                      >
                        <Mail size={18} />
                      </button>
                    ) : null}
                    <button
                      onClick={() => updateStatus(selectedMessage.id, 'archived')}
                      className="p-2 hover:bg-stone-100 rounded-lg text-stone-600"
                      title="Archive"
                    >
                      <Archive size={18} />
                    </button>
                    <button
                      onClick={() => deleteMessage(selectedMessage.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-stone-500">
                  <span>
                    Received {new Date(selectedMessage.createdAt).toLocaleString()}
                  </span>
                  {selectedMessage.status === 'archived' && (
                    <span className="px-2 py-0.5 bg-stone-200 text-stone-600 rounded">Archived</span>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="prose prose-stone max-w-none">
                  <p className="whitespace-pre-wrap text-stone-700 leading-relaxed">
                    {selectedMessage.message}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-stone-200 bg-stone-50">
                <a
                  href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-md hover:bg-stone-800 transition text-sm font-medium"
                >
                  <ExternalLink size={16} />
                  Reply via Email
                </a>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-stone-400">
              <div className="text-center">
                <Mail size={48} className="mx-auto mb-3" />
                <p>Select a message to view</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
