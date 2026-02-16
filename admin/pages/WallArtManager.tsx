import React, { useState, useEffect } from 'react';
import DataTable from '../components/DataTable';
import FormModal, { FormField } from '../components/FormModal';
import { useAuth } from '../context/AuthContext';

interface WallArtProduct {
  id: string;
  name: string;
  price: number;
  currency: string;
  category: string;
  shortDescription: string;
  longDescription: string;
  dimensions?: string;
  image: string;
  detailImages: string[];
  badge?: string;
  rating?: number;
  reviewCount?: number;
  availability?: string;
  archived?: boolean;
}

import { API_BASE, resolveImageUrl } from '../config/api';

const emptyProduct: Partial<WallArtProduct> = {
  name: '',
  price: 0,
  currency: 'AUD',
  category: 'Prints',
  shortDescription: '',
  longDescription: '',
  dimensions: '',
  image: '',
  detailImages: [],
  badge: '',
  availability: 'In stock',
};

const formFields: FormField[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'price', label: 'Price', type: 'number', required: true },
  { name: 'currency', label: 'Currency', type: 'select', options: [
    { value: 'AUD', label: 'AUD' },
    { value: 'USD', label: 'USD' },
  ]},
  { name: 'category', label: 'Category', type: 'select', required: true, options: [
    { value: 'Prints', label: 'Prints' },
    { value: 'Originals', label: 'Originals' },
    { value: 'Mixed Media', label: 'Mixed Media' },
  ]},
  { name: 'dimensions', label: 'Dimensions', type: 'text', placeholder: 'e.g., 30cm x 40cm' },
  { name: 'shortDescription', label: 'Short Description', type: 'textarea', rows: 2 },
  { name: 'longDescription', label: 'Long Description', type: 'textarea', rows: 4 },
  { name: 'image', label: 'Main Image', type: 'image', required: true },
  { name: 'detailImages', label: 'Detail Images', type: 'images' },
  { name: 'badge', label: 'Badge', type: 'text', placeholder: 'e.g., LIMITED EDITION' },
  { name: 'availability', label: 'Availability', type: 'select', options: [
    { value: 'In stock', label: 'In stock' },
    { value: 'Sold out', label: 'Sold out' },
  ]},
];

export default function WallArtManager() {
  const { accessToken } = useAuth();
  const [products, setProducts] = useState<WallArtProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WallArtProduct | null>(null);
  const [formValues, setFormValues] = useState<Partial<WallArtProduct>>(emptyProduct);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage(null);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage(null);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [archiveFilter, setArchiveFilter] = useState<string>('active');

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/wall-art`);
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      showError('Could not load wall art pieces. Please refresh the page and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAdd = () => {
    setEditingItem(null);
    setFormValues(emptyProduct);
    setModalOpen(true);
  };

  const handleEdit = (item: WallArtProduct) => {
    setEditingItem(item);
    setFormValues(item);
    setModalOpen(true);
  };

  const handleDuplicate = (item: WallArtProduct) => {
    setEditingItem(null);
    const { id, ...rest } = item;
    setFormValues({
      ...rest,
      name: `${item.name} (Copy)`,
    });
    setModalOpen(true);
  };

  const handleDelete = async (item: WallArtProduct) => {
    if (!window.confirm(
      `Are you sure you want to delete "${item.name}"? This cannot be undone.`
    )) return;

    try {
      await fetch(`${API_BASE}/wall-art/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      showSuccess(`"${item.name}" has been deleted.`);
      fetchProducts();
    } catch (error) {
      showError(`Something went wrong while deleting "${item.name}". Please try again.`);
    }
  };

  const handleArchive = async (item: WallArtProduct) => {
    const newArchived = !item.archived;
    const confirmMessage = newArchived
      ? `Are you sure you want to hide "${item.name}"? It won't appear on your website anymore.`
      : `Would you like to show "${item.name}" again? It will be visible to visitors.`;
    if (!window.confirm(confirmMessage)) return;

    try {
      await fetch(`${API_BASE}/wall-art/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ archived: newArchived }),
      });
      showSuccess(
        newArchived
          ? `"${item.name}" is now hidden.`
          : `"${item.name}" is now visible!`
      );
      fetchProducts();
    } catch (error) {
      showError(`Something went wrong. Please try again.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const method = editingItem ? 'PUT' : 'POST';
      const url = editingItem
        ? `${API_BASE}/wall-art/${editingItem.id}`
        : `${API_BASE}/wall-art`;

      await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formValues),
      });

      setModalOpen(false);
      showSuccess(
        editingItem
          ? `"${formValues.name}" has been updated!`
          : `"${formValues.name}" has been added!`
      );
      fetchProducts();
    } catch (error) {
      showError(
        editingItem
          ? `Something went wrong while saving your changes. Please try again.`
          : `Something went wrong while adding the piece. Please try again.`
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'in-stock' && product.availability?.toLowerCase().includes('in stock')) ||
      (statusFilter === 'sold-out' && product.availability?.toLowerCase().includes('sold out'));
    const matchesArchive = archiveFilter === 'all' ||
      (archiveFilter === 'active' && !product.archived) ||
      (archiveFilter === 'archived' && product.archived);
    return matchesCategory && matchesStatus && matchesArchive;
  });

  const categories = [...new Set(products.map(p => p.category))].filter(Boolean);

  const columns = [
    {
      key: 'image',
      label: 'Image',
      render: (item: WallArtProduct) => (
        <img src={resolveImageUrl(item.image)} alt={item.name} className="w-12 h-12 object-cover rounded" />
      ),
    },
    {
      key: 'name',
      label: 'Name',
      render: (item: WallArtProduct) => (
        <div className="flex items-center gap-2">
          <span>{item.name}</span>
          {item.archived && (
            <span className="px-1.5 py-0.5 text-[10px] bg-stone-200 text-stone-600 rounded">
              Hidden
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'price',
      label: 'Price',
      render: (item: WallArtProduct) => `${item.currency} $${item.price}`,
    },
    { key: 'category', label: 'Category' },
    { key: 'dimensions', label: 'Dimensions' },
    {
      key: 'availability',
      label: 'Status',
      render: (item: WallArtProduct) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          item.availability?.toLowerCase().includes('sold out')
            ? 'bg-red-100 text-red-700'
            : 'bg-green-100 text-green-700'
        }`}>
          {item.availability?.toLowerCase().includes('sold out') ? 'Sold Out' : 'In Stock'}
        </span>
      ),
    },
  ];

  return (
    <div>
      {successMessage && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-green-600 hover:text-green-800 ml-4">&times;</button>
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-red-600 hover:text-red-800 ml-4">&times;</button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Category:</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="in-stock">In Stock</option>
            <option value="sold-out">Sold Out</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Visibility:</label>
          <select
            value={archiveFilter}
            onChange={(e) => setArchiveFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">Showing on site</option>
            <option value="archived">Hidden from site</option>
            <option value="all">All</option>
          </select>
        </div>

        {(categoryFilter !== 'all' || statusFilter !== 'all' || archiveFilter !== 'active') && (
          <button
            onClick={() => { setCategoryFilter('all'); setStatusFilter('all'); setArchiveFilter('active'); }}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Clear filters
          </button>
        )}

        <span className="text-sm text-gray-500 ml-auto">
          Showing {filteredProducts.length} of {products.length} items
        </span>
      </div>

      <DataTable
        title="Wall Art"
        subtitle="Manage your wall art pieces - prints, originals, and mixed media works."
        data={filteredProducts}
        columns={columns}
        loading={loading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onArchive={handleArchive}
        isArchived={(item) => !!item.archived}
        getId={(item) => item.id}
        addButtonLabel="Add New Piece"
        archiveLabel="Hide from site"
        unarchiveLabel="Show on site"
      />

      <FormModal
        isOpen={modalOpen}
        title={editingItem ? 'Edit Wall Art' : 'Add New Wall Art'}
        fields={formFields}
        values={formValues}
        onChange={(name, value) => setFormValues((prev) => ({ ...prev, [name]: value }))}
        onSubmit={handleSubmit}
        onClose={() => setModalOpen(false)}
        isLoading={saving}
      />
    </div>
  );
}
