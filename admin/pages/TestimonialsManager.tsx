import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import FormModal, { FormField } from '../components/FormModal';
import { useAuth } from '../context/AuthContext';

interface Testimonial {
  id: string;
  text: string;
  author: string;
  role: string;
  type: 'shop' | 'coaching';
  rating?: number;
}

import { API_BASE } from '../config/api';

const emptyItem: Partial<Testimonial> = {
  text: '',
  author: '',
  role: '',
  type: 'shop',
  rating: 5,
};

const formFields: FormField[] = [
  { name: 'author', label: 'Author Name', type: 'text', required: true },
  { name: 'role', label: 'Role/Title', type: 'text', placeholder: 'Artist, Melbourne' },
  { name: 'text', label: 'Testimonial Text', type: 'textarea', rows: 4, required: true },
  { name: 'type', label: 'Type', type: 'select', required: true, options: [
    { value: 'shop', label: 'Shop' },
    { value: 'coaching', label: 'Coaching' },
  ]},
  { name: 'rating', label: 'Rating (1-5)', type: 'number' },
];

export default function TestimonialsManager() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Testimonial | null>(null);
  const [formValues, setFormValues] = useState<Partial<Testimonial>>(emptyItem);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(''), 5000); };

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE}/testimonials`);
      setItems(await res.json());
    } catch (err) {
      showError('Could not load testimonials. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = () => {
    setEditingItem(null);
    setFormValues(emptyItem);
    setModalOpen(true);
  };

  const handleEdit = (item: Testimonial) => {
    setEditingItem(item);
    setFormValues(item);
    setModalOpen(true);
  };

  const handleDelete = async (item: Testimonial) => {
    if (!window.confirm(`Are you sure you want to delete this testimonial from ${item.author}?`)) return;
    try {
      await fetch(`${API_BASE}/testimonials/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      showToast('Testimonial deleted.');
      fetchData();
    } catch (err) {
      showError('Something went wrong while deleting the testimonial. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingItem ? 'PUT' : 'POST';
      const url = editingItem ? `${API_BASE}/testimonials/${editingItem.id}` : `${API_BASE}/testimonials`;
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(formValues),
      });
      setModalOpen(false);
      showToast(editingItem ? 'Testimonial updated!' : 'Testimonial added!');
      fetchData();
    } catch (err) {
      showError('Could not save the testimonial. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredItems = typeFilter === 'all' ? items : items.filter(i => i.type === typeFilter);

  const columns = [
    { key: 'author', label: 'Author' },
    { key: 'role', label: 'Role' },
    { key: 'text', label: 'Text', render: (item: Testimonial) => (
      <span className="truncate block max-w-xs text-stone-500">{item.text.substring(0, 60)}...</span>
    )},
    { key: 'type', label: 'Type', render: (item: Testimonial) => (
      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-stone-100 text-stone-600">
        {item.type}
      </span>
    )},
    { key: 'rating', label: 'Rating', render: (item: Testimonial) => `${item.rating || 5}/5` },
  ];

  const typeOptions = [
    { value: 'all', label: 'All' },
    { value: 'shop', label: 'Shop' },
    { value: 'coaching', label: 'Coaching' },
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-stone-900">Testimonials</h1>
            <p className="text-sm text-stone-500 mt-1">Reviews and kind words from your customers.</p>
          </div>
        </div>
        <div className="mt-4 inline-flex bg-stone-100 rounded-md p-0.5">
          {typeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className={`px-3 py-1 text-sm rounded-md transition ${
                typeFilter === opt.value
                  ? 'bg-white text-stone-900 font-medium shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <DataTable
        title="Testimonials"
        data={filteredItems}
        columns={columns}
        loading={loading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        getId={(item) => item.id}
      />
      <FormModal
        isOpen={modalOpen}
        title={editingItem ? 'Edit Testimonial' : 'Add Testimonial'}
        fields={formFields}
        values={formValues}
        onChange={(name, value) => setFormValues((prev) => ({ ...prev, [name]: value }))}
        onSubmit={handleSubmit}
        onClose={() => setModalOpen(false)}
        isLoading={saving}
      />
      {toast && <div className="fixed bottom-4 right-4 bg-stone-900 text-white px-4 py-2 rounded-md shadow-lg text-sm z-50">{toast}</div>}
      {error && <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-md shadow-lg text-sm z-50">{error}</div>}
    </div>
  );
}
