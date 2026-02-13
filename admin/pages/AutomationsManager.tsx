import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';
import {
  Plus,
  Play,
  Pause,
  Pencil,
  Trash2,
  Clock,
  Mail,
  Users,
  ShoppingBag,
  MessageSquare,
  Zap,
  X,
  ChevronDown,
  ChevronUp,
  Send,
  AlertCircle,
} from 'lucide-react';

interface AutomationStep {
  id: string;
  delayDays: number;
  delayHours: number;
  subject: string;
  body: string;
  order: number;
}

interface Automation {
  id: string;
  name: string;
  description?: string;
  trigger: 'newsletter_signup' | 'purchase' | 'coaching_inquiry' | 'contact_form' | 'manual';
  status: 'active' | 'paused';
  steps: AutomationStep[];
  createdAt: string;
  updatedAt: string;
}

interface QueueStats {
  scheduled: number;
  sent: number;
  failed: number;
  cancelled: number;
}

const triggerLabels: Record<string, { label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  newsletter_signup: { label: 'Newsletter Signup', icon: Mail },
  purchase: { label: 'Purchase', icon: ShoppingBag },
  coaching_inquiry: { label: 'Coaching Inquiry', icon: Users },
  contact_form: { label: 'Contact Form', icon: MessageSquare },
  manual: { label: 'Manual Trigger', icon: Zap },
};

export default function AutomationsManager() {
  const { accessToken } = useAuth();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats>({ scheduled: 0, sent: 0, failed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTrigger, setFormTrigger] = useState<Automation['trigger']>('newsletter_signup');
  const [formSteps, setFormSteps] = useState<Omit<AutomationStep, 'id'>[]>([
    { delayDays: 0, delayHours: 0, subject: '', body: '', order: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  const fetchAutomations = async () => {
    try {
      const res = await fetch(`${API_BASE}/automations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setAutomations(data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const fetchQueueStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/automations/queue/stats`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setQueueStats(data);
    } catch (error) {
    }
  };

  useEffect(() => {
    fetchAutomations();
    fetchQueueStats();
  }, []);

  const handleAdd = () => {
    setEditingAutomation(null);
    setFormName('');
    setFormDescription('');
    setFormTrigger('newsletter_signup');
    setFormSteps([{ delayDays: 0, delayHours: 0, subject: '', body: '', order: 0 }]);
    setModalOpen(true);
  };

  const handleEdit = (automation: Automation) => {
    setEditingAutomation(automation);
    setFormName(automation.name);
    setFormDescription(automation.description || '');
    setFormTrigger(automation.trigger);
    setFormSteps(automation.steps.map(s => ({
      delayDays: s.delayDays,
      delayHours: s.delayHours,
      subject: s.subject,
      body: s.body,
      order: s.order,
    })));
    setModalOpen(true);
  };

  const handleDelete = async (automation: Automation) => {
    if (!confirm(`Delete automation "${automation.name}"? This will also cancel any scheduled emails.`)) return;

    try {
      await fetch(`${API_BASE}/automations/${automation.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      fetchAutomations();
      fetchQueueStats();
    } catch (error) {
    }
  };

  const handleToggleStatus = async (automation: Automation) => {
    const newStatus = automation.status === 'active' ? 'paused' : 'active';

    try {
      await fetch(`${API_BASE}/automations/${automation.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchAutomations();
    } catch (error) {
    }
  };

  const handleProcessQueue = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/automations/queue/process`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      alert(`Processed ${data.processed} emails: ${data.sent} sent, ${data.failed} failed`);
      fetchQueueStats();
    } catch (error) {
    } finally {
      setProcessing(false);
    }
  };

  const handleAddStep = () => {
    setFormSteps([
      ...formSteps,
      { delayDays: 0, delayHours: 0, subject: '', body: '', order: formSteps.length },
    ]);
  };

  const handleRemoveStep = (index: number) => {
    if (formSteps.length === 1) return;
    setFormSteps(formSteps.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })));
  };

  const handleStepChange = (index: number, field: string, value: string | number) => {
    setFormSteps(formSteps.map((step, i) =>
      i === index ? { ...step, [field]: value } : step
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: formName,
        description: formDescription || undefined,
        trigger: formTrigger,
        status: editingAutomation?.status || 'paused',
        steps: formSteps,
      };

      const url = editingAutomation
        ? `${API_BASE}/automations/${editingAutomation.id}`
        : `${API_BASE}/automations`;

      await fetch(url, {
        method: editingAutomation ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      setModalOpen(false);
      fetchAutomations();
    } catch (error) {
    } finally {
      setSaving(false);
    }
  };

  const formatDelay = (days: number, hours: number) => {
    if (days === 0 && hours === 0) return 'Immediately';
    const parts = [];
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    return parts.join(' ');
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif text-stone-800">Email Automations</h1>
          <p className="text-sm text-stone-500 mt-1">
            Set up automated email sequences triggered by user actions
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-clay text-white rounded-lg hover:bg-clay-dark transition text-sm font-medium"
        >
          <Plus size={18} />
          New Automation
        </button>
      </div>

      {/* Queue Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-500">Scheduled</span>
            <Clock size={16} className="text-blue-500" />
          </div>
          <p className="text-2xl font-semibold text-stone-800 mt-1">{queueStats.scheduled}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-500">Sent</span>
            <Send size={16} className="text-green-500" />
          </div>
          <p className="text-2xl font-semibold text-stone-800 mt-1">{queueStats.sent}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-500">Failed</span>
            <AlertCircle size={16} className="text-red-500" />
          </div>
          <p className="text-2xl font-semibold text-stone-800 mt-1">{queueStats.failed}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-center">
          <button
            onClick={handleProcessQueue}
            disabled={processing || queueStats.scheduled === 0}
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
            {processing ? 'Processing...' : 'Process Queue'}
          </button>
        </div>
      </div>

      {/* Automations List */}
      <div className="bg-white rounded-lg shadow-sm">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-stone-300 border-t-clay rounded-full animate-spin mx-auto mb-4" />
            <p className="text-stone-500">Loading automations...</p>
          </div>
        ) : automations.length === 0 ? (
          <div className="p-8 text-center">
            <Zap size={40} className="mx-auto text-stone-300 mb-3" />
            <p className="text-stone-500 mb-4">No automations yet</p>
            <button
              onClick={handleAdd}
              className="text-clay hover:underline text-sm font-medium"
            >
              Create your first automation
            </button>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {automations.map((automation) => {
              const TriggerIcon = triggerLabels[automation.trigger]?.icon || Zap;
              const isExpanded = expandedId === automation.id;

              return (
                <div key={automation.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : automation.id)}
                        className="p-1 hover:bg-stone-100 rounded transition"
                      >
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>

                      <div className={`p-2 rounded-lg ${automation.status === 'active' ? 'bg-green-100' : 'bg-stone-100'}`}>
                        <TriggerIcon size={20} className={automation.status === 'active' ? 'text-green-600' : 'text-stone-500'} />
                      </div>

                      <div>
                        <h3 className="font-medium text-stone-800">{automation.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-stone-500">
                            {triggerLabels[automation.trigger]?.label}
                          </span>
                          <span className="text-stone-300">·</span>
                          <span className="text-xs text-stone-500">
                            {automation.steps.length} email{automation.steps.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        automation.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-stone-100 text-stone-600'
                      }`}>
                        {automation.status === 'active' ? 'Active' : 'Paused'}
                      </span>

                      <button
                        onClick={() => handleToggleStatus(automation)}
                        className={`p-2 rounded transition ${
                          automation.status === 'active'
                            ? 'text-amber-600 hover:bg-amber-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={automation.status === 'active' ? 'Pause' : 'Activate'}
                      >
                        {automation.status === 'active' ? <Pause size={18} /> : <Play size={18} />}
                      </button>

                      <button
                        onClick={() => handleEdit(automation)}
                        className="p-2 text-stone-500 hover:text-clay hover:bg-stone-100 rounded transition"
                        title="Edit"
                      >
                        <Pencil size={18} />
                      </button>

                      <button
                        onClick={() => handleDelete(automation)}
                        className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Steps View */}
                  {isExpanded && (
                    <div className="mt-4 ml-12 pl-4 border-l-2 border-stone-200">
                      {automation.description && (
                        <p className="text-sm text-stone-500 mb-4">{automation.description}</p>
                      )}
                      <div className="space-y-3">
                        {automation.steps.map((step, idx) => (
                          <div key={step.id} className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-clay text-white flex items-center justify-center text-xs font-medium shrink-0">
                              {idx + 1}
                            </div>
                            <div className="flex-1 bg-stone-50 p-3 rounded-lg">
                              <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
                                <Clock size={12} />
                                <span>{formatDelay(step.delayDays, step.delayHours)}</span>
                              </div>
                              <p className="font-medium text-sm text-stone-800">{step.subject}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-stone-200">
              <h2 className="text-lg font-medium">
                {editingAutomation ? 'Edit Automation' : 'New Automation'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 hover:bg-stone-100 rounded transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Automation Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  placeholder="e.g., Welcome Sequence"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clay"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description of this automation"
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clay"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Trigger *
                </label>
                <select
                  value={formTrigger}
                  onChange={(e) => setFormTrigger(e.target.value as Automation['trigger'])}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clay"
                >
                  <option value="newsletter_signup">Newsletter Signup</option>
                  <option value="purchase">Purchase</option>
                  <option value="coaching_inquiry">Coaching Inquiry</option>
                  <option value="contact_form">Contact Form</option>
                  <option value="manual">Manual Trigger</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-stone-700">
                    Email Sequence *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="flex items-center gap-1 text-sm text-clay hover:underline"
                  >
                    <Plus size={14} />
                    Add Email
                  </button>
                </div>

                <div className="space-y-4">
                  {formSteps.map((step, idx) => (
                    <div key={idx} className="border border-stone-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-stone-600">
                          Email {idx + 1}
                        </span>
                        {formSteps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveStep(idx)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs text-stone-500 mb-1">
                            Delay (days)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={step.delayDays}
                            onChange={(e) => handleStepChange(idx, 'delayDays', parseInt(e.target.value) || 0)}
                            className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-stone-500 mb-1">
                            Delay (hours)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="23"
                            value={step.delayHours}
                            onChange={(e) => handleStepChange(idx, 'delayHours', parseInt(e.target.value) || 0)}
                            className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay"
                          />
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="block text-xs text-stone-500 mb-1">
                          Subject *
                        </label>
                        <input
                          type="text"
                          required
                          value={step.subject}
                          onChange={(e) => handleStepChange(idx, 'subject', e.target.value)}
                          placeholder="Email subject line"
                          className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-stone-500 mb-1">
                          Body (HTML) *
                        </label>
                        <textarea
                          required
                          rows={4}
                          value={step.body}
                          onChange={(e) => handleStepChange(idx, 'body', e.target.value)}
                          placeholder="Email content. Use {{name}} for recipient name."
                          className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-stone-50 p-3 rounded-lg">
                <p className="text-xs text-stone-500">
                  <strong>Tip:</strong> Use <code className="bg-stone-200 px-1 rounded">{'{{name}}'}</code> in your subject or body to personalize with the recipient's name.
                </p>
              </div>
            </form>

            <div className="flex justify-end gap-3 p-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !formName || formSteps.some(s => !s.subject || !s.body)}
                className="px-4 py-2 bg-clay text-white rounded-lg hover:bg-clay-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : editingAutomation ? 'Save Changes' : 'Create Automation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
