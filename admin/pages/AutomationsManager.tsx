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
  Package,
  ShoppingCart,
  Sparkles,
  Eye,
  ToggleLeft,
  ToggleRight,
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
  trigger: string;
  status: 'active' | 'paused';
  steps: AutomationStep[];
  subject?: string;
  previewText?: string;
  bodyText?: string;
  bodyHtml?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerText?: string;
  enabled: boolean;
  sendDelayDays: number;
  sendDelayHours: number;
  isSystem: boolean;
  oneTimePerRecipient: boolean;
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
  form_submission_received: { label: 'Form Submission', icon: MessageSquare },
  order_placed: { label: 'Order Placed', icon: ShoppingBag },
  order_fulfilled_or_delivered: { label: 'Order Fulfilled', icon: Package },
  cart_abandoned: { label: 'Cart Abandoned', icon: ShoppingCart },
};

type FormMode = 'template' | 'sequence';

export default function AutomationsManager() {
  const { accessToken } = useAuth();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats>({ scheduled: 0, sent: 0, failed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewAutomation, setPreviewAutomation] = useState<Automation | null>(null);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Form state
  const [formMode, setFormMode] = useState<FormMode>('template');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTrigger, setFormTrigger] = useState('newsletter_signup');
  const [formSubject, setFormSubject] = useState('');
  const [formPreviewText, setFormPreviewText] = useState('');
  const [formBodyText, setFormBodyText] = useState('');
  const [formBodyHtml, setFormBodyHtml] = useState('');
  const [formCtaLabel, setFormCtaLabel] = useState('');
  const [formCtaUrl, setFormCtaUrl] = useState('');
  const [formFooterText, setFormFooterText] = useState('');
  const [formDelayDays, setFormDelayDays] = useState(0);
  const [formDelayHours, setFormDelayHours] = useState(0);
  const [formOneTime, setFormOneTime] = useState(false);
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

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch(`${API_BASE}/automations/seed`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.seeded > 0) {
        fetchAutomations();
      }
      alert(`Seeded ${data.seeded} of ${data.total} automation templates.`);
    } catch (error) {
      alert('Failed to seed automations.');
    } finally {
      setSeeding(false);
    }
  };

  const handleAdd = () => {
    setEditingAutomation(null);
    setFormMode('template');
    setFormName('');
    setFormDescription('');
    setFormTrigger('newsletter_signup');
    setFormSubject('');
    setFormPreviewText('');
    setFormBodyText('');
    setFormBodyHtml('');
    setFormCtaLabel('');
    setFormCtaUrl('');
    setFormFooterText('');
    setFormDelayDays(0);
    setFormDelayHours(0);
    setFormOneTime(false);
    setFormSteps([{ delayDays: 0, delayHours: 0, subject: '', body: '', order: 0 }]);
    setModalOpen(true);
  };

  const handleEdit = (automation: Automation) => {
    setEditingAutomation(automation);
    const isTemplate = !!(automation.subject || automation.bodyText);
    setFormMode(isTemplate ? 'template' : 'sequence');
    setFormName(automation.name);
    setFormDescription(automation.description || '');
    setFormTrigger(automation.trigger);
    setFormSubject(automation.subject || '');
    setFormPreviewText(automation.previewText || '');
    setFormBodyText(automation.bodyText || '');
    setFormBodyHtml(automation.bodyHtml || '');
    setFormCtaLabel(automation.ctaLabel || '');
    setFormCtaUrl(automation.ctaUrl || '');
    setFormFooterText(automation.footerText || '');
    setFormDelayDays(automation.sendDelayDays || 0);
    setFormDelayHours(automation.sendDelayHours || 0);
    setFormOneTime(automation.oneTimePerRecipient || false);
    setFormSteps(automation.steps?.length ? automation.steps.map(s => ({
      delayDays: s.delayDays,
      delayHours: s.delayHours,
      subject: s.subject,
      body: s.body,
      order: s.order,
    })) : [{ delayDays: 0, delayHours: 0, subject: '', body: '', order: 0 }]);
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

  const handleToggleEnabled = async (automation: Automation) => {
    try {
      await fetch(`${API_BASE}/automations/${automation.id}/enabled`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ enabled: !automation.enabled }),
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
      const payload: Record<string, any> = {
        name: formName,
        description: formDescription || undefined,
        trigger: formTrigger,
        status: editingAutomation?.status || 'paused',
      };

      if (formMode === 'template') {
        payload.subject = formSubject;
        payload.previewText = formPreviewText || undefined;
        payload.bodyText = formBodyText;
        payload.bodyHtml = formBodyHtml || undefined;
        payload.ctaLabel = formCtaLabel || undefined;
        payload.ctaUrl = formCtaUrl || undefined;
        payload.footerText = formFooterText || undefined;
        payload.sendDelayDays = formDelayDays;
        payload.sendDelayHours = formDelayHours;
        payload.oneTimePerRecipient = formOneTime;
        payload.steps = [];
      } else {
        payload.steps = formSteps;
      }

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

  const isTemplateAutomation = (a: Automation) => !!(a.subject || a.bodyText);

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
        <div className="flex items-center gap-2">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition text-sm font-medium disabled:opacity-50"
          >
            <Sparkles size={16} />
            {seeding ? 'Seeding...' : 'Seed Templates'}
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-clay text-white rounded-lg hover:bg-clay-dark transition text-sm font-medium"
          >
            <Plus size={18} />
            New Automation
          </button>
        </div>
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
            <p className="text-stone-500 mb-2">No automations yet</p>
            <p className="text-sm text-stone-400 mb-4">
              Click "Seed Templates" to load 4 ready-made email automations, or create your own.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="text-clay hover:underline text-sm font-medium"
              >
                Seed Templates
              </button>
              <span className="text-stone-300">or</span>
              <button
                onClick={handleAdd}
                className="text-clay hover:underline text-sm font-medium"
              >
                Create custom automation
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {automations.map((automation) => {
              const TriggerIcon = triggerLabels[automation.trigger]?.icon || Zap;
              const isExpanded = expandedId === automation.id;
              const isTemplate = isTemplateAutomation(automation);

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

                      <div className={`p-2 rounded-lg ${automation.status === 'active' && automation.enabled ? 'bg-green-100' : 'bg-stone-100'}`}>
                        <TriggerIcon size={20} className={automation.status === 'active' && automation.enabled ? 'text-green-600' : 'text-stone-500'} />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-stone-800">{automation.name}</h3>
                          {automation.isSystem && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">System</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-stone-500">
                            {triggerLabels[automation.trigger]?.label || automation.trigger}
                          </span>
                          <span className="text-stone-300">·</span>
                          <span className="text-xs text-stone-500">
                            {isTemplate ? '1 email' : `${automation.steps?.length || 0} email${(automation.steps?.length || 0) > 1 ? 's' : ''}`}
                          </span>
                          {isTemplate && (
                            <>
                              <span className="text-stone-300">·</span>
                              <span className="text-xs text-stone-500">
                                {formatDelay(automation.sendDelayDays || 0, automation.sendDelayHours || 0)}
                              </span>
                            </>
                          )}
                          {automation.oneTimePerRecipient && (
                            <>
                              <span className="text-stone-300">·</span>
                              <span className="text-xs text-amber-600">One-time</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Enabled toggle */}
                      <button
                        onClick={() => handleToggleEnabled(automation)}
                        className={`p-2 rounded transition ${automation.enabled ? 'text-green-600 hover:bg-green-50' : 'text-stone-400 hover:bg-stone-100'}`}
                        title={automation.enabled ? 'Enabled' : 'Disabled'}
                      >
                        {automation.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      </button>

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

                      {isTemplate && (
                        <button
                          onClick={() => setPreviewAutomation(automation)}
                          className="p-2 text-stone-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Preview"
                        >
                          <Eye size={18} />
                        </button>
                      )}

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

                  {/* Expanded View */}
                  {isExpanded && (
                    <div className="mt-4 ml-12 pl-4 border-l-2 border-stone-200">
                      {automation.description && (
                        <p className="text-sm text-stone-500 mb-4">{automation.description}</p>
                      )}

                      {isTemplate ? (
                        <div className="space-y-3">
                          <div className="bg-stone-50 p-4 rounded-lg">
                            <div className="text-xs text-stone-400 mb-1">Subject</div>
                            <p className="text-sm font-medium text-stone-800">{automation.subject}</p>
                            {automation.previewText && (
                              <>
                                <div className="text-xs text-stone-400 mt-3 mb-1">Preview Text</div>
                                <p className="text-sm text-stone-600">{automation.previewText}</p>
                              </>
                            )}
                            {automation.ctaLabel && (
                              <>
                                <div className="text-xs text-stone-400 mt-3 mb-1">CTA</div>
                                <p className="text-sm text-stone-600">
                                  {automation.ctaLabel} {automation.ctaUrl && <span className="text-stone-400">({automation.ctaUrl})</span>}
                                </p>
                              </>
                            )}
                            <div className="text-xs text-stone-400 mt-3 mb-1">Send Delay</div>
                            <p className="text-sm text-stone-600">
                              {formatDelay(automation.sendDelayDays || 0, automation.sendDelayHours || 0)}
                            </p>
                            {automation.footerText && (
                              <>
                                <div className="text-xs text-stone-400 mt-3 mb-1">Footer</div>
                                <p className="text-sm text-stone-500 whitespace-pre-line">{automation.footerText}</p>
                              </>
                            )}
                          </div>
                          <div className="bg-stone-50 p-4 rounded-lg">
                            <div className="text-xs text-stone-400 mb-2">Body (plain text)</div>
                            <pre className="text-sm text-stone-700 whitespace-pre-wrap font-serif leading-relaxed">{automation.bodyText}</pre>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {(automation.steps || []).map((step, idx) => (
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
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* HTML Preview Modal */}
      {previewAutomation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-stone-200">
              <h2 className="text-lg font-medium">Email Preview: {previewAutomation.name}</h2>
              <button
                onClick={() => setPreviewAutomation(null)}
                className="p-1 hover:bg-stone-100 rounded transition"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {previewAutomation.bodyHtml ? (
                <iframe
                  srcDoc={previewAutomation.bodyHtml}
                  title="Email Preview"
                  className="w-full h-[600px] border-0"
                />
              ) : (
                <div className="p-6">
                  <pre className="whitespace-pre-wrap font-serif text-stone-700 leading-relaxed">{previewAutomation.bodyText}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
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
                  onChange={(e) => setFormTrigger(e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clay"
                >
                  <optgroup label="Standard">
                    <option value="newsletter_signup">Newsletter Signup</option>
                    <option value="purchase">Purchase</option>
                    <option value="coaching_inquiry">Coaching Inquiry</option>
                    <option value="contact_form">Contact Form</option>
                    <option value="manual">Manual Trigger</option>
                  </optgroup>
                  <optgroup label="E-commerce">
                    <option value="form_submission_received">Form Submission Received</option>
                    <option value="order_placed">Order Placed</option>
                    <option value="order_fulfilled_or_delivered">Order Fulfilled / Delivered</option>
                    <option value="cart_abandoned">Cart Abandoned</option>
                  </optgroup>
                </select>
              </div>

              {/* Mode Toggle */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Mode</label>
                <div className="flex rounded-lg border border-stone-300 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setFormMode('template')}
                    className={`flex-1 py-2 text-sm font-medium transition ${
                      formMode === 'template'
                        ? 'bg-clay text-white'
                        : 'bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    Single Email Template
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormMode('sequence')}
                    className={`flex-1 py-2 text-sm font-medium transition ${
                      formMode === 'sequence'
                        ? 'bg-clay text-white'
                        : 'bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    Email Sequence
                  </button>
                </div>
              </div>

              {formMode === 'template' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Subject *</label>
                    <input
                      type="text"
                      value={formSubject}
                      onChange={(e) => setFormSubject(e.target.value)}
                      required
                      placeholder="Email subject line"
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clay"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Preview Text</label>
                    <input
                      type="text"
                      value={formPreviewText}
                      onChange={(e) => setFormPreviewText(e.target.value)}
                      placeholder="Short preview shown in inbox"
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clay"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Body (plain text) *</label>
                    <textarea
                      required
                      rows={8}
                      value={formBodyText}
                      onChange={(e) => setFormBodyText(e.target.value)}
                      placeholder="Plain text email content"
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clay font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Body (HTML)</label>
                    <textarea
                      rows={6}
                      value={formBodyHtml}
                      onChange={(e) => setFormBodyHtml(e.target.value)}
                      placeholder="HTML email content (optional)"
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clay font-mono text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">CTA Label</label>
                      <input
                        type="text"
                        value={formCtaLabel}
                        onChange={(e) => setFormCtaLabel(e.target.value)}
                        placeholder="e.g., View Store"
                        className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clay"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">CTA URL</label>
                      <input
                        type="text"
                        value={formCtaUrl}
                        onChange={(e) => setFormCtaUrl(e.target.value)}
                        placeholder="e.g., {{cta_url}}"
                        className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clay"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Footer Text</label>
                    <input
                      type="text"
                      value={formFooterText}
                      onChange={(e) => setFormFooterText(e.target.value)}
                      placeholder="Footer content"
                      className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clay"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Send Delay (days)</label>
                      <input
                        type="number"
                        min="0"
                        value={formDelayDays}
                        onChange={(e) => setFormDelayDays(parseInt(e.target.value) || 0)}
                        className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clay"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Send Delay (hours)</label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={formDelayHours}
                        onChange={(e) => setFormDelayHours(parseInt(e.target.value) || 0)}
                        className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-clay"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formOneTime}
                      onChange={(e) => setFormOneTime(e.target.checked)}
                      className="w-4 h-4 text-clay rounded border-stone-300 focus:ring-clay"
                    />
                    <span className="text-sm text-stone-700">One-time per recipient (send only once per email address)</span>
                  </label>
                </>
              ) : (
                <>
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
                              <label className="block text-xs text-stone-500 mb-1">Delay (days)</label>
                              <input
                                type="number"
                                min="0"
                                value={step.delayDays}
                                onChange={(e) => handleStepChange(idx, 'delayDays', parseInt(e.target.value) || 0)}
                                className="w-full border border-stone-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-stone-500 mb-1">Delay (hours)</label>
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
                            <label className="block text-xs text-stone-500 mb-1">Subject *</label>
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
                            <label className="block text-xs text-stone-500 mb-1">Body (HTML) *</label>
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
                </>
              )}

              <div className="bg-stone-50 p-3 rounded-lg">
                <p className="text-xs text-stone-500">
                  <strong>Placeholders:</strong>{' '}
                  <code className="bg-stone-200 px-1 rounded">{'{{customer_first_name}}'}</code>{' '}
                  <code className="bg-stone-200 px-1 rounded">{'{{order_id}}'}</code>{' '}
                  <code className="bg-stone-200 px-1 rounded">{'{{product_name}}'}</code>{' '}
                  <code className="bg-stone-200 px-1 rounded">{'{{price}}'}</code>{' '}
                  <code className="bg-stone-200 px-1 rounded">{'{{variant}}'}</code>{' '}
                  <code className="bg-stone-200 px-1 rounded">{'{{size}}'}</code>{' '}
                  <code className="bg-stone-200 px-1 rounded">{'{{color}}'}</code>{' '}
                  <code className="bg-stone-200 px-1 rounded">{'{{qty}}'}</code>{' '}
                  <code className="bg-stone-200 px-1 rounded">{'{{cart_recovery_url}}'}</code>{' '}
                  <code className="bg-stone-200 px-1 rounded">{'{{cta_url}}'}</code>
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
                disabled={saving || !formName || (formMode === 'template' ? !formSubject || !formBodyText : formSteps.some(s => !s.subject || !s.body))}
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
