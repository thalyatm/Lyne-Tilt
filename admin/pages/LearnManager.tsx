import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../components/DataTable';
import FormModal, { FormField } from '../components/FormModal';
import AccordionSection from '../components/AccordionSection';
import { StringArrayEditor, StatArrayEditor } from '../components/ArrayEditor';
import { useAuth } from '../context/AuthContext';
import { API_BASE, resolveImageUrl } from '../config/api';

interface LearnItem {
  id: string;
  title: string;
  type: 'ONLINE' | 'WORKSHOP';
  price: string;
  image: string;
  description: string;
}

interface LearnSettings {
  hero: { title: string; subtitle: string; description: string };
  instructorBio: { name: string; paragraphs: string[]; stats: { value: string; label: string }[] };
  newsletterSignup: { title: string; description: string };
}

const defaultLearnSettings: LearnSettings = {
  hero: { title: '', subtitle: '', description: '' },
  instructorBio: { name: '', paragraphs: [], stats: [] },
  newsletterSignup: { title: '', description: '' },
};

const emptyItem: Partial<LearnItem> = {
  title: '',
  type: 'ONLINE',
  price: '',
  image: '',
  description: '',
};

const formFields: FormField[] = [
  { name: 'title', label: 'Title', type: 'text', required: true },
  { name: 'type', label: 'Type', type: 'select', required: true, options: [
    { value: 'ONLINE', label: 'Online Course' },
    { value: 'WORKSHOP', label: 'Workshop' },
  ]},
  { name: 'price', label: 'Price', type: 'text', required: true, placeholder: 'from $105' },
  { name: 'description', label: 'Description', type: 'textarea', rows: 4 },
  { name: 'image', label: 'Image', type: 'image', required: true },
];

const inputClass = 'w-full border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1';
const labelClass = 'block text-sm font-medium text-stone-700 mb-1.5';

export default function LearnManager() {
  const { accessToken } = useAuth();

  // --- Courses & Workshops state ---
  const [items, setItems] = useState<LearnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LearnItem | null>(null);
  const [formValues, setFormValues] = useState<Partial<LearnItem>>(emptyItem);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // --- Tab state ---
  const [activeTab, setActiveTab] = useState<'items' | 'settings'>('items');

  // --- Page Settings state ---
  const [learnSettings, setLearnSettings] = useState<LearnSettings>(defaultLearnSettings);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // --- Courses & Workshops data ---
  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE}/learn`);
      setItems(await res.json());
    } catch (error) {
      showToast('Could not load workshops and courses. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Settings data ---
  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.learn) {
          setLearnSettings({
            hero: { ...defaultLearnSettings.hero, ...data.learn.hero },
            instructorBio: { ...defaultLearnSettings.instructorBio, ...data.learn.instructorBio },
            newsletterSignup: { ...defaultLearnSettings.newsletterSignup, ...data.learn.newsletterSignup },
          });
        }
      }
    } catch (error) {
      showToast('Could not load page settings.');
    } finally {
      setSettingsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (activeTab === 'settings') {
      fetchSettings();
    }
  }, [activeTab, fetchSettings]);

  const saveSettings = async () => {
    setSettingsSaving(true);
    setSettingsSaved(false);
    try {
      // Read-modify-write: fetch current full settings, merge learn, put back
      const getRes = await fetch(`${API_BASE}/settings`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!getRes.ok) throw new Error('Failed to fetch current settings');
      const fullSettings = await getRes.json();

      const updated = { ...fullSettings, learn: learnSettings };

      const putRes = await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(updated),
      });
      if (!putRes.ok) throw new Error('Failed to save settings');
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (error) {
      showToast('Could not save page settings. Please try again.');
    } finally {
      setSettingsSaving(false);
    }
  };

  // --- CRUD handlers ---
  const handleAdd = () => {
    setEditingItem(null);
    setFormValues(emptyItem);
    setModalOpen(true);
  };

  const handleEdit = (item: LearnItem) => {
    setEditingItem(item);
    setFormValues(item);
    setModalOpen(true);
  };

  const handleDelete = async (item: LearnItem) => {
    if (!window.confirm(`Are you sure you want to remove '${item.title}'?`)) return;
    try {
      const res = await fetch(`${API_BASE}/learn/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Server error');
      showToast(`'${item.title}' has been removed.`);
      fetchData();
    } catch (error) {
      showToast(`Something went wrong removing '${item.title}'. Please try again.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingItem ? 'PUT' : 'POST';
      const url = editingItem ? `${API_BASE}/learn/${editingItem.id}` : `${API_BASE}/learn`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(formValues),
      });
      if (!res.ok) throw new Error('Server error');
      setModalOpen(false);
      showToast(editingItem ? `'${formValues.title}' has been updated.` : `'${formValues.title}' has been added.`);
      fetchData();
    } catch (error) {
      showToast(`Could not save '${formValues.title}'. Please check all fields and try again.`);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'image', label: 'Image', render: (item: LearnItem) => (
      <img src={resolveImageUrl(item.image)} alt={item.title} className="w-12 h-12 object-cover rounded" />
    )},
    { key: 'title', label: 'Title' },
    { key: 'type', label: 'Type' },
    { key: 'price', label: 'Price' },
  ];

  // --- Settings field updater ---
  const updateLearn = (path: string, value: unknown) => {
    setLearnSettings(prev => {
      const keys = path.split('.');
      const updated = JSON.parse(JSON.stringify(prev));
      let obj = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-stone-900">Workshops</h1>
        <p className="text-sm text-stone-500 mt-1">Manage your courses, workshops, and learn page settings.</p>
      </div>

      {/* Tabs */}
      <div className="inline-flex bg-stone-100 rounded-md p-0.5 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('items')}
          className={
            activeTab === 'items'
              ? 'bg-white text-stone-900 font-medium shadow-sm px-3 py-1.5 rounded-md text-sm'
              : 'text-stone-500 hover:text-stone-700 px-3 py-1.5 rounded-md text-sm'
          }
        >
          Courses & Workshops
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

      {/* Courses & Workshops tab */}
      {activeTab === 'items' && (
        <>
          <DataTable
            title="Learn Items"
            data={items}
            columns={columns}
            loading={loading}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            getId={(item) => item.id}
          />
          <FormModal
            isOpen={modalOpen}
            title={editingItem ? 'Edit Learn Item' : 'Add Learn Item'}
            fields={formFields}
            values={formValues}
            onChange={(name, value) => setFormValues((prev) => ({ ...prev, [name]: value }))}
            onSubmit={handleSubmit}
            onClose={() => setModalOpen(false)}
            isLoading={saving}
          />
        </>
      )}

      {/* Page Settings tab */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          {settingsLoading ? (
            <div className="bg-white border border-stone-200 rounded-lg p-8 text-center text-sm text-stone-400">
              Loading settings...
            </div>
          ) : (
            <>
              {/* Hero Section */}
              <AccordionSection title="Hero Section" description="Main heading area of the learn page" defaultOpen>
                <div>
                  <label className={labelClass}>Subtitle</label>
                  <input
                    type="text"
                    value={learnSettings.hero.subtitle}
                    onChange={(e) => updateLearn('hero.subtitle', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Title</label>
                  <input
                    type="text"
                    value={learnSettings.hero.title}
                    onChange={(e) => updateLearn('hero.title', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Description</label>
                  <textarea
                    value={learnSettings.hero.description}
                    onChange={(e) => updateLearn('hero.description', e.target.value)}
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </AccordionSection>

              {/* Instructor Bio */}
              <AccordionSection title="Instructor Bio" description="Bio section displayed on the learn page">
                <div>
                  <label className={labelClass}>Name</label>
                  <input
                    type="text"
                    value={learnSettings.instructorBio.name}
                    onChange={(e) => updateLearn('instructorBio.name', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <StringArrayEditor
                  label="Bio Paragraphs"
                  items={learnSettings.instructorBio.paragraphs}
                  onChange={(items) => updateLearn('instructorBio.paragraphs', items)}
                  placeholder="Enter paragraph..."
                />
                <StatArrayEditor
                  label="Stats"
                  items={learnSettings.instructorBio.stats}
                  onChange={(items) => updateLearn('instructorBio.stats', items)}
                />
              </AccordionSection>

              {/* Newsletter Signup */}
              <AccordionSection title="Newsletter Signup Section" description="Email signup prompt on the learn page">
                <div>
                  <label className={labelClass}>Title</label>
                  <input
                    type="text"
                    value={learnSettings.newsletterSignup.title}
                    onChange={(e) => updateLearn('newsletterSignup.title', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Description</label>
                  <textarea
                    value={learnSettings.newsletterSignup.description}
                    onChange={(e) => updateLearn('newsletterSignup.description', e.target.value)}
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </AccordionSection>

              {/* Save button */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={saveSettings}
                  disabled={settingsSaving}
                  className="bg-stone-900 text-white hover:bg-stone-800 rounded-md px-4 h-9 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
