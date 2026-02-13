import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE } from '../config/api';
import { ArrowLeft, Plus, Trash2, Users, Save, Loader2, AlertCircle, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

interface FieldDef {
  value: string;
  label: string;
  type: 'text' | 'array' | 'number' | 'enum';
  options?: string[];
}

const FIELDS: FieldDef[] = [
  { value: 'source', label: 'Source', type: 'text' },
  { value: 'tags', label: 'Tags', type: 'array' },
  { value: 'subscribed_days_ago', label: 'Subscribed Days Ago', type: 'number' },
  { value: 'engagement_score', label: 'Engagement Score', type: 'number' },
  {
    value: 'engagement_level',
    label: 'Engagement Level',
    type: 'enum',
    options: ['highly_engaged', 'engaged', 'cold', 'at_risk', 'churned', 'new'],
  },
  { value: 'emails_received', label: 'Emails Received', type: 'number' },
  { value: 'last_emailed_days_ago', label: 'Last Emailed Days Ago', type: 'number' },
  { value: 'last_opened_days_ago', label: 'Last Opened Days Ago', type: 'number' },
];

const OPERATORS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  text: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'not equals' },
    { value: 'in', label: 'in' },
    { value: 'not_in', label: 'not in' },
  ],
  enum: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'not equals' },
    { value: 'in', label: 'in' },
    { value: 'not_in', label: 'not in' },
  ],
  array: [
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'not contains' },
  ],
  number: [
    { value: 'equals', label: 'equals' },
    { value: 'greater_than', label: 'greater than' },
    { value: 'less_than', label: 'less than' },
  ],
};

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string | string[];
}

interface PreviewSubscriber {
  id: string;
  email: string;
  name?: string;
  engagementLevel?: string;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function getFieldDef(field: string): FieldDef {
  return FIELDS.find((f) => f.value === field) || FIELDS[0];
}

function getOperatorsForField(field: string) {
  const def = getFieldDef(field);
  return OPERATORS_BY_TYPE[def.type] || OPERATORS_BY_TYPE.text;
}

function defaultOperator(field: string) {
  const ops = getOperatorsForField(field);
  return ops[0]?.value || 'equals';
}

function isMultiValueOperator(op: string) {
  return op === 'in' || op === 'not_in';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SegmentBuilder() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { token } = useAuth();
  const toast = useToast();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [match, setMatch] = useState<'all' | 'any'>('all');
  const [conditions, setConditions] = useState<Condition[]>([
    { id: uid(), field: 'source', operator: 'equals', value: '' },
  ]);

  // Data for dropdowns
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableSources, setAvailableSources] = useState<string[]>([]);

  // Preview
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewSubscribers, setPreviewSubscribers] = useState<PreviewSubscriber[]>([]);
  const [previewing, setPreviewing] = useState(false);

  // Page state
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Multi-value input tracking
  const [multiInputValues, setMultiInputValues] = useState<Record<string, string>>({});

  // -------------------------------------------------------------------------
  // Fetch helpers
  // -------------------------------------------------------------------------

  useEffect(() => {
    async function loadMeta() {
      try {
        const [tagsRes, sourcesRes] = await Promise.all([
          fetch(`${API_BASE}/subscribers/tags`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/subscribers/sources`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (tagsRes.ok) {
          const tags = await tagsRes.json();
          setAvailableTags(Array.isArray(tags) ? tags : []);
        }
        if (sourcesRes.ok) {
          const sources = await sourcesRes.json();
          setAvailableSources(Array.isArray(sources) ? sources : []);
        }
      } catch {
        // Non-critical — dropdowns will just be text inputs
      }
    }
    loadMeta();
  }, [token]);

  useEffect(() => {
    if (!isEditing || !id) return;
    async function loadSegment() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/segments/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load segment');
        const segment = await res.json();
        setName(segment.name || '');
        setDescription(segment.description || '');
        setMatch(segment.rules?.match || 'all');
        const conds: Condition[] = (segment.rules?.conditions || []).map(
          (c: { field: string; operator: string; value: unknown }) => ({
            id: uid(),
            field: c.field,
            operator: c.operator,
            value: c.value as string | string[],
          })
        );
        setConditions(conds.length > 0 ? conds : [{ id: uid(), field: 'source', operator: 'equals', value: '' }]);
      } catch (err: any) {
        setLoadError(err.message || 'Failed to load segment');
        toast.error(err.message || 'Failed to load segment');
      } finally {
        setLoading(false);
      }
    }
    loadSegment();
  }, [id, isEditing, token]);

  // -------------------------------------------------------------------------
  // Live preview with debounce
  // -------------------------------------------------------------------------

  const evaluateRules = useCallback(async () => {
    const validConditions = conditions.filter((c) => {
      if (Array.isArray(c.value)) return c.value.length > 0;
      return c.value !== '';
    });
    if (validConditions.length === 0) {
      setPreviewCount(null);
      setPreviewSubscribers([]);
      return;
    }
    setPreviewing(true);
    try {
      const res = await fetch(`${API_BASE}/segments/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rules: {
            match,
            conditions: validConditions.map((c) => ({
              field: c.field,
              operator: c.operator,
              value: c.value,
            })),
          },
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPreviewCount(data.count ?? 0);
      setPreviewSubscribers((data.subscribers || []).slice(0, 10));
    } catch {
      setPreviewCount(null);
      setPreviewSubscribers([]);
    } finally {
      setPreviewing(false);
    }
  }, [conditions, match, token]);

  useEffect(() => {
    const timer = setTimeout(evaluateRules, 500);
    return () => clearTimeout(timer);
  }, [evaluateRules]);

  // -------------------------------------------------------------------------
  // Condition helpers
  // -------------------------------------------------------------------------

  function addCondition() {
    setConditions((prev) => [...prev, { id: uid(), field: 'source', operator: 'equals', value: '' }]);
  }

  function removeCondition(condId: string) {
    setConditions((prev) => (prev.length <= 1 ? prev : prev.filter((c) => c.id !== condId)));
  }

  function updateCondition(condId: string, patch: Partial<Condition>) {
    setConditions((prev) =>
      prev.map((c) => {
        if (c.id !== condId) return c;
        const updated = { ...c, ...patch };
        // When field changes, reset operator and value
        if (patch.field && patch.field !== c.field) {
          updated.operator = defaultOperator(patch.field);
          updated.value = isMultiValueOperator(updated.operator) ? [] : '';
        }
        // When operator changes, reset value type
        if (patch.operator && patch.operator !== c.operator) {
          if (isMultiValueOperator(patch.operator) && !Array.isArray(updated.value)) {
            updated.value = updated.value ? [updated.value] : [];
          } else if (!isMultiValueOperator(patch.operator) && Array.isArray(updated.value)) {
            updated.value = updated.value[0] || '';
          }
        }
        return updated;
      })
    );
  }

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------

  async function handleSave() {
    if (!name.trim()) {
      toast.warning('Segment name is required');
      return;
    }
    const validConditions = conditions.filter((c) => {
      if (Array.isArray(c.value)) return c.value.length > 0;
      return c.value !== '';
    });
    if (validConditions.length === 0) {
      toast.warning('Add at least one condition with a value');
      return;
    }

    setSaving(true);
    const body = {
      name: name.trim(),
      description: description.trim(),
      rules: {
        match,
        conditions: validConditions.map((c) => ({
          field: c.field,
          operator: c.operator,
          value: c.value,
        })),
      },
    };

    try {
      const url = isEditing ? `${API_BASE}/segments/${id}` : `${API_BASE}/segments`;
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to save segment');
      }
      toast.success(isEditing ? 'Segment updated' : 'Segment created');
      navigate('/admin/segments');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save segment');
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------------------------------------------
  // Multi-value helpers
  // -------------------------------------------------------------------------

  function addMultiValue(condId: string, val: string) {
    if (!val.trim()) return;
    setConditions((prev) =>
      prev.map((c) => {
        if (c.id !== condId) return c;
        const arr = Array.isArray(c.value) ? c.value : [];
        if (arr.includes(val.trim())) return c;
        return { ...c, value: [...arr, val.trim()] };
      })
    );
    setMultiInputValues((prev) => ({ ...prev, [condId]: '' }));
  }

  function removeMultiValue(condId: string, val: string) {
    setConditions((prev) =>
      prev.map((c) => {
        if (c.id !== condId) return c;
        const arr = Array.isArray(c.value) ? c.value : [];
        return { ...c, value: arr.filter((v) => v !== val) };
      })
    );
  }

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  function renderValueInput(cond: Condition) {
    const fieldDef = getFieldDef(cond.field);
    const isMulti = isMultiValueOperator(cond.operator);

    // Multi-value (in / not_in)
    if (isMulti) {
      const values = Array.isArray(cond.value) ? cond.value : [];
      const inputVal = multiInputValues[cond.id] || '';

      // Determine suggestions
      let suggestions: string[] = [];
      if (fieldDef.type === 'enum' && fieldDef.options) {
        suggestions = fieldDef.options.filter((o) => !values.includes(o));
      } else if (fieldDef.value === 'source') {
        suggestions = availableSources.filter((s) => !values.includes(s));
      } else if (fieldDef.value === 'tags') {
        suggestions = availableTags.filter((t) => !values.includes(t));
      }

      return (
        <div className="flex-1 min-w-[180px]">
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {values.map((v) => (
              <span
                key={v}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-xs"
              >
                {v}
                <button
                  type="button"
                  onClick={() => removeMultiValue(cond.id, v)}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          {suggestions.length > 0 ? (
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) addMultiValue(cond.id, e.target.value);
              }}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            >
              <option value="">Add a value...</option>
              {suggestions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex gap-1.5">
              <input
                type="text"
                value={inputVal}
                onChange={(e) =>
                  setMultiInputValues((prev) => ({ ...prev, [cond.id]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addMultiValue(cond.id, inputVal);
                  }
                }}
                placeholder="Type and press Enter"
                className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
            </div>
          )}
        </div>
      );
    }

    // Enum dropdown (engagement_level)
    if (fieldDef.type === 'enum' && fieldDef.options) {
      return (
        <select
          value={cond.value as string}
          onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
          className="flex-1 min-w-[160px] rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
        >
          <option value="">Select...</option>
          {fieldDef.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      );
    }

    // Source dropdown (if sources available)
    if (fieldDef.value === 'source' && availableSources.length > 0) {
      return (
        <select
          value={cond.value as string}
          onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
          className="flex-1 min-w-[160px] rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
        >
          <option value="">Select...</option>
          {availableSources.map((src) => (
            <option key={src} value={src}>
              {src}
            </option>
          ))}
        </select>
      );
    }

    // Tags dropdown (if tags available, for contains/not_contains)
    if (fieldDef.value === 'tags' && availableTags.length > 0) {
      return (
        <select
          value={cond.value as string}
          onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
          className="flex-1 min-w-[160px] rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
        >
          <option value="">Select...</option>
          {availableTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      );
    }

    // Number input
    if (fieldDef.type === 'number') {
      return (
        <input
          type="number"
          value={cond.value as string}
          onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
          placeholder="Value"
          className="flex-1 min-w-[120px] rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
      );
    }

    // Default text input
    return (
      <input
        type="text"
        value={cond.value as string}
        onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
        placeholder="Value"
        className="flex-1 min-w-[120px] rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
      />
    );
  }

  // -------------------------------------------------------------------------
  // Loading / Error states
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
        <p className="text-stone-600 mb-4">{loadError}</p>
        <button
          onClick={() => navigate('/admin/segments')}
          className="text-sm font-medium hover:underline"
          style={{ color: '#8d3038' }}
        >
          Back to segments
        </button>
      </div>
    );
  }

  const canSave =
    name.trim().length > 0 &&
    conditions.some((c) => {
      if (Array.isArray(c.value)) return c.value.length > 0;
      return c.value !== '';
    });

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/admin/segments')}
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to segments
        </button>
        <h1 className="text-2xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
          {isEditing ? 'Edit Segment' : 'New Segment'}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form — 2 cols on large screens */}
        <div className="lg:col-span-2 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Segment name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Highly engaged subscribers"
              className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Description <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Describe the purpose of this segment..."
              className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>

          {/* Match mode */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Match mode</label>
            <div className="inline-flex rounded-lg border border-stone-300 overflow-hidden">
              <button
                type="button"
                onClick={() => setMatch('all')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  match === 'all'
                    ? 'text-white'
                    : 'text-stone-600 bg-white hover:bg-stone-50'
                }`}
                style={match === 'all' ? { backgroundColor: '#8d3038' } : undefined}
              >
                Match ALL conditions
              </button>
              <button
                type="button"
                onClick={() => setMatch('any')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-l border-stone-300 ${
                  match === 'any'
                    ? 'text-white'
                    : 'text-stone-600 bg-white hover:bg-stone-50'
                }`}
                style={match === 'any' ? { backgroundColor: '#8d3038' } : undefined}
              >
                Match ANY condition
              </button>
            </div>
          </div>

          {/* Conditions */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-stone-800 mb-4">Conditions</h2>

            <div className="space-y-3">
              {conditions.map((cond, idx) => {
                const operators = getOperatorsForField(cond.field);
                return (
                  <div
                    key={cond.id}
                    className="flex flex-wrap items-start gap-2 p-3 rounded-lg bg-stone-50 border border-stone-200"
                  >
                    {/* Conjunction label */}
                    {idx > 0 && (
                      <span className="self-center text-xs font-medium uppercase tracking-wider text-stone-400 w-full mb-1">
                        {match === 'all' ? 'AND' : 'OR'}
                      </span>
                    )}

                    {/* Field */}
                    <select
                      value={cond.field}
                      onChange={(e) => updateCondition(cond.id, { field: e.target.value })}
                      className="rounded-lg border border-stone-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-stone-400 min-w-[160px]"
                    >
                      {FIELDS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>

                    {/* Operator */}
                    <select
                      value={cond.operator}
                      onChange={(e) => updateCondition(cond.id, { operator: e.target.value })}
                      className="rounded-lg border border-stone-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-stone-400 min-w-[130px]"
                    >
                      {operators.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>

                    {/* Value */}
                    {renderValueInput(cond)}

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => removeCondition(cond.id)}
                      disabled={conditions.length <= 1}
                      className="self-center p-2 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove condition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Add condition */}
            <button
              type="button"
              onClick={addCondition}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-stone-300 text-sm font-medium text-stone-500 hover:border-stone-400 hover:text-stone-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add condition
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/admin/segments')}
              className="px-5 py-2.5 text-sm font-medium text-stone-700 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#8d3038' }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Segment'}
            </button>
          </div>
        </div>

        {/* Live preview — right column */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-stone-800">Live Preview</h2>
              {previewing && <Loader2 className="w-4 h-4 animate-spin text-stone-400" />}
            </div>

            {previewCount === null && !previewing && (
              <div className="text-center py-8">
                <Users className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-sm text-stone-400">
                  Add conditions to preview matching subscribers
                </p>
              </div>
            )}

            {previewCount !== null && (
              <>
                <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-stone-50">
                  <Users className="w-5 h-5 text-stone-500" />
                  <span className="text-lg font-bold text-stone-900">
                    {previewCount.toLocaleString()}
                  </span>
                  <span className="text-sm text-stone-500">
                    subscriber{previewCount !== 1 ? 's' : ''} match
                  </span>
                </div>

                {previewSubscribers.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
                      Sample matches
                    </p>
                    <ul className="divide-y divide-stone-100">
                      {previewSubscribers.map((sub) => (
                        <li key={sub.id} className="py-2 flex items-center justify-between">
                          <span className="text-sm text-stone-700 truncate max-w-[180px]">
                            {sub.email}
                          </span>
                          {sub.engagementLevel && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 capitalize shrink-0 ml-2">
                              {sub.engagementLevel.replace(/_/g, ' ')}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {previewCount > 10 && (
                      <p className="text-xs text-stone-400 mt-2 text-center">
                        and {(previewCount - 10).toLocaleString()} more...
                      </p>
                    )}
                  </div>
                )}

                {previewCount === 0 && (
                  <p className="text-sm text-stone-400 text-center py-2">
                    No subscribers match these conditions
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
