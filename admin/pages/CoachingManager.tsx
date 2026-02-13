import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import FormModal, { FormField, ImageUploadField } from '../components/FormModal';
import AccordionSection from '../components/AccordionSection';
import { StringArrayEditor, ObjectArrayEditor } from '../components/ArrayEditor';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CoachingPackage {
  id: string;
  title: string;
  description: string;
  features: string[];
  ctaText: string;
  image?: string;
  price?: string;
  badge?: string;
}

interface CoachingSettings {
  hero: { title: string; subtitle: string; description: string };
  isThisForYou: { title: string; subtitle: string; items: string[] };
  whatYoullExperience: { title: string; subtitle: string; cards: { title: string; description: string }[] };
  howItWorks: { title: string; subtitle: string; steps: { step: string; title: string; description: string }[] };
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const emptyPackage: Partial<CoachingPackage> = {
  title: '',
  description: '',
  features: [],
  ctaText: 'Book Now',
  price: '',
  badge: '',
};

const defaultCoachingSettings: CoachingSettings = {
  hero: { title: '', subtitle: '', description: '' },
  isThisForYou: { title: '', subtitle: '', items: [] },
  whatYoullExperience: { title: '', subtitle: '', cards: [] },
  howItWorks: { title: '', subtitle: '', steps: [] },
};

const formFields: FormField[] = [
  { name: 'title', label: 'Title', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
  { name: 'price', label: 'Price', type: 'text', placeholder: '$250' },
  { name: 'features', label: 'Features', type: 'array', placeholder: 'Feature description' },
  { name: 'ctaText', label: 'Button Text', type: 'text', required: true },
  { name: 'badge', label: 'Badge', type: 'text', placeholder: 'e.g., MOST POPULAR' },
  { name: 'image', label: 'Image', type: 'image' },
];

// ---------------------------------------------------------------------------
// Shared input class
// ---------------------------------------------------------------------------

const inputClass =
  'w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CoachingManager() {
  const { accessToken } = useAuth();

  // --- Tab state ---
  const [activeTab, setActiveTab] = useState<'packages' | 'settings'>('packages');

  // --- Packages state ---
  const [packages, setPackages] = useState<CoachingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CoachingPackage | null>(null);
  const [formValues, setFormValues] = useState<Partial<CoachingPackage>>(emptyPackage);
  const [saving, setSaving] = useState(false);

  // --- Settings state ---
  const [coachingSettings, setCoachingSettings] = useState<CoachingSettings>(defaultCoachingSettings);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // --- Toast ---
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // ---------------------------------------------------------------------------
  // Packages CRUD
  // ---------------------------------------------------------------------------

  const fetchPackages = async () => {
    try {
      const res = await fetch(`${API_BASE}/coaching`);
      const data = await res.json();
      setPackages(data);
    } catch {
      showToast('Could not load coaching packages. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleAdd = () => {
    setEditingItem(null);
    setFormValues(emptyPackage);
    setModalOpen(true);
  };

  const handleEdit = (item: CoachingPackage) => {
    setEditingItem(item);
    setFormValues(item);
    setModalOpen(true);
  };

  const handleDelete = async (item: CoachingPackage) => {
    if (!window.confirm(`Are you sure you want to remove the '${item.title}' package?`)) return;
    try {
      const res = await fetch(`${API_BASE}/coaching/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Server error');
      showToast(`'${item.title}' has been removed.`);
      fetchPackages();
    } catch {
      showToast(`Something went wrong removing '${item.title}'. Please try again.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingItem ? 'PUT' : 'POST';
      const url = editingItem
        ? `${API_BASE}/coaching/${editingItem.id}`
        : `${API_BASE}/coaching`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(formValues),
      });
      if (!res.ok) throw new Error('Server error');
      setModalOpen(false);
      showToast(
        editingItem
          ? `'${formValues.title}' has been updated.`
          : `'${formValues.title}' has been added.`,
      );
      fetchPackages();
    } catch {
      showToast(`Could not save '${formValues.title}'. Please check all fields and try again.`);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'price', label: 'Price' },
    { key: 'badge', label: 'Badge', render: (item: CoachingPackage) => item.badge || '-' },
    { key: 'features', label: 'Features', render: (item: CoachingPackage) => `${item.features.length} features` },
  ];

  // ---------------------------------------------------------------------------
  // Settings fetch / save
  // ---------------------------------------------------------------------------

  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/settings`);
      const data = await res.json();
      if (data.coaching) {
        setCoachingSettings({
          ...defaultCoachingSettings,
          ...data.coaching,
        });
      }
    } catch {
      showToast('Could not load page settings.');
    } finally {
      setSettingsLoading(false);
    }
  };

  // Fetch settings when switching to the settings tab
  useEffect(() => {
    if (activeTab === 'settings') {
      fetchSettings();
    }
  }, [activeTab]);

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    setSettingsSaved(false);
    try {
      // Read-modify-write: fetch current full settings, merge coaching, PUT back
      const getRes = await fetch(`${API_BASE}/settings`);
      if (!getRes.ok) throw new Error('Failed to fetch settings');
      const fullSettings = await getRes.json();

      const merged = { ...fullSettings, coaching: coachingSettings };

      const putRes = await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(merged),
      });
      if (!putRes.ok) throw new Error('Failed to save settings');

      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch {
      showToast('Could not save page settings. Please try again.');
    } finally {
      setSettingsSaving(false);
    }
  };

  // Helper to update a nested path in coachingSettings
  const updateField = (path: string, value: unknown) => {
    setCoachingSettings((prev) => {
      const keys = path.split('.');
      const clone = JSON.parse(JSON.stringify(prev));
      let obj: Record<string, unknown> = clone;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]] as Record<string, unknown>;
      }
      obj[keys[keys.length - 1]] = value;
      return clone;
    });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-stone-900">Coaching</h1>
        <p className="text-sm text-stone-500 mt-1">Manage packages and page content.</p>
      </div>

      {/* Tabs */}
      <div className="inline-flex bg-stone-100 rounded-md p-0.5 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('packages')}
          className={
            activeTab === 'packages'
              ? 'bg-white text-stone-900 font-medium shadow-sm px-3 py-1.5 rounded-md text-sm'
              : 'text-stone-500 hover:text-stone-700 px-3 py-1.5 rounded-md text-sm'
          }
        >
          Packages
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={
            activeTab === 'settings'
              ? 'bg-white text-stone-900 font-medium shadow-sm px-3 py-1.5 rounded-md text-sm'
              : 'text-stone-500 hover:text-stone-700 px-3 py-1.5 rounded-md text-sm'
          }
        >
          Page Settings
        </button>
      </div>

      {/* ================================================================= */}
      {/* PACKAGES TAB                                                       */}
      {/* ================================================================= */}
      {activeTab === 'packages' && (
        <>
          <DataTable
            title="Coaching Packages"
            data={packages}
            columns={columns}
            loading={loading}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            getId={(item) => item.id}
          />
          <FormModal
            isOpen={modalOpen}
            title={editingItem ? 'Edit Package' : 'Add Package'}
            fields={formFields}
            values={formValues}
            onChange={(name, value) => setFormValues((prev) => ({ ...prev, [name]: value }))}
            onSubmit={handleSubmit}
            onClose={() => setModalOpen(false)}
            isLoading={saving}
          />
        </>
      )}

      {/* ================================================================= */}
      {/* PAGE SETTINGS TAB                                                  */}
      {/* ================================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          {settingsLoading ? (
            <div className="text-sm text-stone-400 py-12 text-center">Loading settings...</div>
          ) : (
            <>
              {/* Hero Section */}
              <AccordionSection title="Hero Section" description="Main banner at the top of the coaching page" defaultOpen>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Subtitle</label>
                    <input
                      type="text"
                      value={coachingSettings.hero.subtitle}
                      onChange={(e) => updateField('hero.subtitle', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Title</label>
                    <input
                      type="text"
                      value={coachingSettings.hero.title}
                      onChange={(e) => updateField('hero.title', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Description</label>
                    <textarea
                      value={coachingSettings.hero.description}
                      onChange={(e) => updateField('hero.description', e.target.value)}
                      rows={3}
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                </div>
              </AccordionSection>

              {/* Is This For You? */}
              <AccordionSection title="Is This For You?" description="Criteria list to help visitors self-qualify">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Title</label>
                    <input
                      type="text"
                      value={coachingSettings.isThisForYou.title}
                      onChange={(e) => updateField('isThisForYou.title', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Subtitle</label>
                    <textarea
                      value={coachingSettings.isThisForYou.subtitle}
                      onChange={(e) => updateField('isThisForYou.subtitle', e.target.value)}
                      rows={2}
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                  <StringArrayEditor
                    label="Criteria Items"
                    items={coachingSettings.isThisForYou.items}
                    onChange={(items) => updateField('isThisForYou.items', items)}
                    placeholder="e.g., You have ideas but struggle to follow through"
                  />
                </div>
              </AccordionSection>

              {/* What You'll Experience */}
              <AccordionSection title="What You'll Experience" description="Feature cards describing the coaching experience">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Title</label>
                    <input
                      type="text"
                      value={coachingSettings.whatYoullExperience.title}
                      onChange={(e) => updateField('whatYoullExperience.title', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Subtitle</label>
                    <textarea
                      value={coachingSettings.whatYoullExperience.subtitle}
                      onChange={(e) => updateField('whatYoullExperience.subtitle', e.target.value)}
                      rows={2}
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                  <ObjectArrayEditor
                    label="Experience Cards"
                    items={coachingSettings.whatYoullExperience.cards}
                    onChange={(cards) => updateField('whatYoullExperience.cards', cards)}
                    createItem={() => ({ title: '', description: '' })}
                    addLabel="Add Card"
                    renderItem={(item, _, updateItem) => (
                      <div className="space-y-3 pr-6">
                        <div>
                          <label className="block text-xs text-stone-500 mb-1">Title</label>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => updateItem({ title: e.target.value })}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-stone-500 mb-1">Description</label>
                          <textarea
                            value={item.description}
                            onChange={(e) => updateItem({ description: e.target.value })}
                            rows={2}
                            className={`${inputClass} resize-none`}
                          />
                        </div>
                      </div>
                    )}
                  />
                </div>
              </AccordionSection>

              {/* How It Works */}
              <AccordionSection title="How It Works" description="Step-by-step process overview">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Title</label>
                    <input
                      type="text"
                      value={coachingSettings.howItWorks.title}
                      onChange={(e) => updateField('howItWorks.title', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Subtitle</label>
                    <input
                      type="text"
                      value={coachingSettings.howItWorks.subtitle}
                      onChange={(e) => updateField('howItWorks.subtitle', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <ObjectArrayEditor
                    label="Steps"
                    items={coachingSettings.howItWorks.steps}
                    onChange={(steps) => updateField('howItWorks.steps', steps)}
                    createItem={() => ({ step: '', title: '', description: '' })}
                    addLabel="Add Step"
                    renderItem={(item, _, updateItem) => (
                      <div className="space-y-3 pr-6">
                        <div className="grid grid-cols-[80px_1fr] gap-3">
                          <div>
                            <label className="block text-xs text-stone-500 mb-1">Step #</label>
                            <input
                              type="text"
                              value={item.step}
                              onChange={(e) => updateItem({ step: e.target.value })}
                              placeholder="01"
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-stone-500 mb-1">Title</label>
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => updateItem({ title: e.target.value })}
                              className={inputClass}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-stone-500 mb-1">Description</label>
                          <textarea
                            value={item.description}
                            onChange={(e) => updateItem({ description: e.target.value })}
                            rows={2}
                            className={`${inputClass} resize-none`}
                          />
                        </div>
                      </div>
                    )}
                  />
                </div>
              </AccordionSection>

              {/* Save button */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={settingsSaving}
                  className="bg-stone-900 text-white hover:bg-stone-800 rounded-md px-4 h-9 text-sm font-medium disabled:opacity-50"
                >
                  {settingsSaving ? 'Saving...' : 'Save'}
                </button>
                {settingsSaved && (
                  <span className="text-sm text-stone-500">Settings saved.</span>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-stone-900 text-white px-4 py-2 rounded-md shadow-lg text-sm z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
