import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import FormModal, { FormField } from '../components/FormModal';
import { useAuth } from '../context/AuthContext';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

import { API_BASE } from '../config/api';

const emptyItem: Partial<FAQ> = {
  question: '',
  answer: '',
  category: 'General',
};

const formFields: FormField[] = [
  { name: 'question', label: 'Question', type: 'text', required: true },
  { name: 'answer', label: 'Answer', type: 'textarea', rows: 4, required: true },
  { name: 'category', label: 'Category', type: 'select', required: true, options: [
    { value: 'Shipping', label: 'Shipping' },
    { value: 'Handmade Work', label: 'Handmade Work' },
    { value: 'Colour Accuracy', label: 'Colour Accuracy' },
    { value: 'Returns + Exchanges', label: 'Returns + Exchanges' },
    { value: 'Product Care', label: 'Product Care' },
    { value: 'Coaching + Services', label: 'Coaching + Services' },
    { value: 'General', label: 'General' },
  ]},
];

export default function FAQsManager() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FAQ | null>(null);
  const [formValues, setFormValues] = useState<Partial<FAQ>>(emptyItem);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(''), 5000); };

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE}/faqs`);
      setItems(await res.json());
    } catch (err) {
      showError('Could not load FAQs. Please check your internet connection and try again.');
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

  const handleEdit = (item: FAQ) => {
    setEditingItem(item);
    setFormValues(item);
    setModalOpen(true);
  };

  const handleDelete = async (item: FAQ) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await fetch(`${API_BASE}/faqs/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      showToast('Question deleted.');
      fetchData();
    } catch (err) {
      showError('Something went wrong while deleting the question. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingItem ? 'PUT' : 'POST';
      const url = editingItem ? `${API_BASE}/faqs/${editingItem.id}` : `${API_BASE}/faqs`;
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(formValues),
      });
      setModalOpen(false);
      showToast(editingItem ? 'Question updated!' : 'Question added!');
      fetchData();
    } catch (err) {
      showError('Could not save the question. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = async (reorderedItems: FAQ[]) => {
    setItems(reorderedItems);
    // Persist the new order to the server
    try {
      const ids = reorderedItems.map(item => item.id);
      await fetch(`${API_BASE}/faqs/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ ids }),
      });
    } catch (err) {
      showError('Could not save the new order. The list has been reset.');
      // Revert on failure
      fetchData();
    }
  };

  const [catFilter, setCatFilter] = useState<string>('all');

  const filteredItems = catFilter === 'all' ? items : items.filter(i => i.category === catFilter);

  const columns = [
    { key: 'question', label: 'Question' },
    { key: 'answer', label: 'Answer', render: (item: FAQ) => (
      <span className="truncate block max-w-xs text-stone-500">{item.answer.substring(0, 50)}...</span>
    )},
    { key: 'category', label: 'Category', render: (item: FAQ) => (
      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-stone-100 text-stone-600">
        {item.category}
      </span>
    )},
  ];

  const catOptions = [
    { value: 'all', label: 'All' },
    { value: 'Shipping', label: 'Shipping' },
    { value: 'Handmade Work', label: 'Handmade Work' },
    { value: 'Colour Accuracy', label: 'Colour Accuracy' },
    { value: 'Returns + Exchanges', label: 'Returns + Exchanges' },
    { value: 'Product Care', label: 'Product Care' },
    { value: 'Coaching + Services', label: 'Coaching + Services' },
    { value: 'General', label: 'General' },
  ];

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-stone-900">FAQs</h1>
            <p className="text-sm text-stone-500 mt-1">Common questions your customers ask.</p>
          </div>
        </div>
        <div className="mt-4 inline-flex bg-stone-100 rounded-md p-0.5">
          {catOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setCatFilter(opt.value)}
              className={`px-3 py-1 text-sm rounded-md transition ${
                catFilter === opt.value
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
        title="FAQs"
        data={filteredItems}
        columns={columns}
        loading={loading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        getId={(item) => item.id}
        draggable
        onReorder={handleReorder}
      />
      <FormModal
        isOpen={modalOpen}
        title={editingItem ? 'Edit FAQ' : 'Add FAQ'}
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
