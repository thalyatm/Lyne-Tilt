import React, { useState, useEffect } from 'react';
import { Mail, ShieldOff, Plus, X, Loader2, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE } from '../config/api';

interface EmailSettings {
  fromName: string;
  fromEmail: string;
  replyTo: string;
  footerText: string;
}

interface SuppressionEntry {
  id: string;
  email: string;
  reason: 'manual' | 'hard_bounce' | 'complaint' | 'consecutive_soft_bounce';
  createdAt: string;
}

interface SuppressionResponse {
  entries: SuppressionEntry[];
  total: number;
  page: number;
  totalPages: number;
}

const REASON_LABELS = {
  manual: 'Manual',
  hard_bounce: 'Hard Bounce',
  complaint: 'Complaint',
  consecutive_soft_bounce: 'Consecutive Soft Bounce'
};

const REASON_COLORS = {
  manual: 'bg-stone-100 text-stone-700 border-stone-200',
  hard_bounce: 'bg-red-100 text-red-700 border-red-200',
  complaint: 'bg-amber-100 text-amber-700 border-amber-200',
  consecutive_soft_bounce: 'bg-orange-100 text-orange-700 border-orange-200'
};

export default function EmailSettings() {
  const { token } = useAuth();
  const toast = useToast();

  // Settings state
  const [settings, setSettings] = useState<EmailSettings>({
    fromName: '',
    fromEmail: '',
    replyTo: '',
    footerText: ''
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Suppression list state
  const [suppressionEntries, setSuppressionEntries] = useState<SuppressionEntry[]>([]);
  const [suppressionLoading, setSuppressionLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState({
    email: '',
    reason: 'manual' as SuppressionEntry['reason']
  });
  const [isAdding, setIsAdding] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<SuppressionEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const limit = 25;

  // Fetch email settings
  useEffect(() => {
    fetchSettings();
  }, []);

  // Fetch suppression list
  useEffect(() => {
    fetchSuppressionList();
  }, [currentPage]);

  const fetchSettings = async () => {
    try {
      setSettingsLoading(true);
      const response = await fetch(`${API_BASE}/email-settings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch settings');

      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load email settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchSuppressionList = async () => {
    try {
      setSuppressionLoading(true);
      const response = await fetch(
        `${API_BASE}/email-settings/suppression?page=${currentPage}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch suppression list');

      const data: SuppressionResponse = await response.json();
      setSuppressionEntries(data.entries);
      setTotalPages(data.totalPages);
      setTotalCount(data.total);
    } catch (error) {
      console.error('Error fetching suppression list:', error);
      toast.error('Failed to load suppression list');
    } finally {
      setSuppressionLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSettingsSaving(true);
      const response = await fetch(`${API_BASE}/email-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) throw new Error('Failed to save settings');

      toast.success('Email settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save email settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleAddSuppression = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      setIsAdding(true);
      const response = await fetch(`${API_BASE}/email-settings/suppression`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(addFormData)
      });

      if (!response.ok) throw new Error('Failed to add suppression');

      toast.success('Email added to suppression list');
      setAddFormData({ email: '', reason: 'manual' });
      setShowAddForm(false);
      fetchSuppressionList();
    } catch (error) {
      console.error('Error adding suppression:', error);
      toast.error('Failed to add email to suppression list');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteSuppression = async () => {
    if (!selectedForDelete) return;

    try {
      setIsDeleting(true);
      const response = await fetch(
        `${API_BASE}/email-settings/suppression/${selectedForDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to remove suppression');

      toast.success('Email removed from suppression list');
      setSelectedForDelete(null);
      fetchSuppressionList();
    } catch (error) {
      console.error('Error removing suppression:', error);
      toast.error('Failed to remove email from suppression list');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-3xl font-serif text-stone-800 mb-2"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Email Settings
          </h1>
          <p className="text-stone-600">
            Manage sender identity and suppression list
          </p>
        </div>

        {/* Section 1: Sender Identity */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
          <div className="p-6 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-stone-600" />
              <h2
                className="text-xl font-serif text-stone-800"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Sender Identity
              </h2>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="p-6">
            {settingsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="fromName" className="block text-sm font-medium text-stone-700 mb-1">
                    From Name
                  </label>
                  <input
                    type="text"
                    id="fromName"
                    value={settings.fromName}
                    onChange={(e) => setSettings({ ...settings, fromName: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-400 focus:border-transparent"
                    placeholder="Lyne Tilt"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="fromEmail" className="block text-sm font-medium text-stone-700 mb-1">
                    From Email
                  </label>
                  <input
                    type="email"
                    id="fromEmail"
                    value={settings.fromEmail}
                    onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-400 focus:border-transparent"
                    placeholder="hello@lynetilt.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="replyTo" className="block text-sm font-medium text-stone-700 mb-1">
                    Reply-To
                  </label>
                  <input
                    type="email"
                    id="replyTo"
                    value={settings.replyTo}
                    onChange={(e) => setSettings({ ...settings, replyTo: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-400 focus:border-transparent"
                    placeholder="support@lynetilt.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="footerText" className="block text-sm font-medium text-stone-700 mb-1">
                    Footer Text
                  </label>
                  <textarea
                    id="footerText"
                    value={settings.footerText}
                    onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-400 focus:border-transparent resize-none"
                    rows={2}
                    placeholder="You're receiving this email because..."
                    required
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={settingsSaving}
                    className="px-6 py-2 text-white rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: '#8d3038' }}
                  >
                    {settingsSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Settings
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Section 2: Suppression List */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
          <div className="p-6 border-b border-stone-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <ShieldOff className="w-5 h-5 text-stone-600" />
                  <h2
                    className="text-xl font-serif text-stone-800"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    Suppression List
                  </h2>
                </div>
                <span className="px-2.5 py-0.5 bg-stone-100 text-stone-700 text-sm rounded-full font-medium">
                  {totalCount}
                </span>
              </div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2 text-white rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#8d3038' }}
              >
                <Plus className="w-4 h-4" />
                Add Email
              </button>
            </div>
          </div>

          {/* Add Email Form */}
          {showAddForm && (
            <form onSubmit={handleAddSuppression} className="p-6 border-b border-stone-200 bg-stone-50">
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="email"
                    value={addFormData.email}
                    onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-400 focus:border-transparent"
                    placeholder="email@example.com"
                    required
                  />
                </div>
                <div className="w-56">
                  <select
                    value={addFormData.reason}
                    onChange={(e) => setAddFormData({ ...addFormData, reason: e.target.value as SuppressionEntry['reason'] })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-400 focus:border-transparent"
                  >
                    <option value="manual">Manual</option>
                    <option value="hard_bounce">Hard Bounce</option>
                    <option value="complaint">Complaint</option>
                    <option value="consecutive_soft_bounce">Consecutive Soft Bounce</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: '#8d3038' }}
                >
                  {isAdding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Add'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Table */}
          <div className="p-6">
            {suppressionLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
              </div>
            ) : suppressionEntries.length === 0 ? (
              <div className="text-center py-12">
                <ShieldOff className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <h3
                  className="text-lg font-serif text-stone-800 mb-1"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  No suppressed emails
                </h3>
                <p className="text-stone-600 text-sm">
                  Emails added to the suppression list will appear here
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-stone-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-stone-700">Email</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-stone-700">Reason</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-stone-700">Date Added</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-stone-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suppressionEntries.map((entry) => (
                        <tr key={entry.id} className="border-b border-stone-100 hover:bg-stone-50">
                          <td className="py-3 px-4 text-sm text-stone-800">{entry.email}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 text-xs rounded border ${REASON_COLORS[entry.reason]}`}>
                              {REASON_LABELS[entry.reason]}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-stone-600">{formatDate(entry.createdAt)}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedForDelete(entry)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Remove from suppression list"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-stone-200">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 text-sm text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-stone-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 text-sm text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {selectedForDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3
                className="text-xl font-serif text-stone-800 mb-2"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Remove from suppression list?
              </h3>
              <p className="text-stone-600 mb-4">
                Are you sure you want to remove <strong>{selectedForDelete.email}</strong> from the suppression list?
                They will be able to receive emails again.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setSelectedForDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSuppression}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    'Remove'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
