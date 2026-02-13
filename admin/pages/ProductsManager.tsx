import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';
import {
  Search,
  SlidersHorizontal,
  X,
  Plus,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Archive,
  ArchiveRestore,
  Copy,
  Trash2,
  Eye,
  Pencil,
  Package,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProductType = 'wearable' | 'wall-art';
type ProductStatus = 'draft' | 'active' | 'scheduled' | 'archived' | 'discontinued';

interface Product {
  id: string;
  productType: ProductType;
  name: string;
  slug: string;
  price: string;
  currency: string;
  category: string;
  image: string;
  status: ProductStatus;
  archived: boolean;
  quantity: number;
  trackInventory: boolean;
  availability?: string;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEARABLE_CATEGORIES = ['Earrings', 'Brooches', 'Necklaces'];
const WALL_ART_CATEGORIES = ['Prints', 'Originals', 'Mixed Media'];
const PAGE_SIZE = 25;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ProductStatus }) {
  const styles: Record<ProductStatus, string> = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-green-100 text-green-700',
    scheduled: 'bg-blue-100 text-blue-700',
    archived: 'bg-amber-100 text-amber-700',
    discontinued: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || styles.draft}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function AvailabilityBadge({ availability }: { availability?: string }) {
  const soldOut = availability?.toLowerCase().includes('sold out');
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
        soldOut
          ? 'border-red-200 text-red-600'
          : 'border-green-200 text-green-600'
      }`}
    >
      {soldOut ? 'Sold out' : 'In stock'}
    </span>
  );
}

function RowActionsMenu({
  product,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  product: Product;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isArchived = product.status === 'archived';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1.5 hover:bg-stone-100 rounded transition"
      >
        <MoreHorizontal size={16} className="text-stone-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg shadow-lg border border-stone-200 py-1 w-44">
          <button
            onClick={() => { onEdit(); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex items-center gap-2"
          >
            <Pencil size={14} /> Edit
          </button>
          <button
            onClick={() => { onDuplicate(); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex items-center gap-2"
          >
            <Copy size={14} /> Duplicate
          </button>
          <button
            onClick={() => { onArchive(); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex items-center gap-2"
          >
            {isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
            {isArchived ? 'Unarchive' : 'Archive'}
          </button>
          <div className="border-t border-stone-100 my-1" />
          <button
            onClick={() => { onDelete(); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ProductsManager() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Selection & Bulk
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // ---------- Debounced search ----------

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

  // ---------- Data fetching ----------

  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));
      params.set('includeDrafts', 'true');
      params.set('includeArchived', 'true');

      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('productType', typeFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await fetch(`${API_BASE}/products?${params}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });

      if (!res.ok) throw new Error('Failed to load products');

      const data = await res.json();
      setProducts(data.products || []);
      setPagination(data.pagination || { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 });
    } catch {
      showToast('error', 'Could not load products. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, statusFilter, typeFilter, categoryFilter, debouncedSearch]);

  useEffect(() => {
    fetchProducts(1);
    setSelectedIds(new Set());
  }, [fetchProducts]);

  // ---------- Category options ----------

  const categoryOptions = useMemo(() => {
    if (typeFilter === 'wearable') return WEARABLE_CATEGORIES;
    if (typeFilter === 'wall-art') return WALL_ART_CATEGORIES;
    return [...WEARABLE_CATEGORIES, ...WALL_ART_CATEGORIES];
  }, [typeFilter]);

  // ---------- Selection ----------

  const allSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ---------- Bulk actions ----------

  const handleBulkAction = async (action: string) => {
    if (selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);
    const count = ids.length;

    if (action === 'delete') {
      if (!window.confirm(`Are you sure you want to delete ${count} product(s)? This cannot be undone.`)) return;
    }

    try {
      const res = await fetch(`${API_BASE}/products/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ ids, action }),
      });

      const result = await res.json();

      if (result.updated > 0) {
        showToast('success', `${result.updated} product(s) updated.`);
      }
      if (result.failed > 0) {
        showToast('error', `${result.failed} product(s) failed: ${result.errors?.[0] || ''}`);
      }

      setSelectedIds(new Set());
      fetchProducts(pagination.page);
    } catch {
      showToast('error', 'Bulk action failed. Please try again.');
    }
  };

  // ---------- Row actions ----------

  const handleDuplicate = async (product: Product) => {
    try {
      const res = await fetch(`${API_BASE}/products/${product.id}/duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error();
      const dup = await res.json();
      showToast('success', `"${product.name}" duplicated as draft.`);
      navigate(`/admin/products/${dup.id}`);
    } catch {
      showToast('error', 'Could not duplicate product.');
    }
  };

  const handleArchiveToggle = async (product: Product) => {
    const newStatus = product.status === 'archived' ? 'active' : 'archived';
    try {
      const res = await fetch(`${API_BASE}/products/${product.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Status change failed');
      }
      showToast('success',
        newStatus === 'archived'
          ? `"${product.name}" archived.`
          : `"${product.name}" is now active.`
      );
      fetchProducts(pagination.page);
    } catch (err: any) {
      showToast('error', err.message || 'Could not update product status.');
    }
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Are you sure you want to delete "${product.name}"? This action is irreversible.`)) return;
    try {
      const res = await fetch(`${API_BASE}/products/${product.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Delete failed');
      }
      showToast('success', `"${product.name}" deleted.`);
      fetchProducts(pagination.page);
    } catch (err: any) {
      showToast('error', err.message || 'Could not delete product.');
    }
  };

  // ---------- Filter helpers ----------

  const hasActiveFilters = !!categoryFilter || !!typeFilter;

  const clearFilters = () => {
    setCategoryFilter('');
    setTypeFilter('');
    setSearchQuery('');
  };

  // ---------- Status tabs ----------

  const statusTabs = [
    { key: '', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'draft', label: 'Drafts' },
    { key: 'archived', label: 'Archived' },
  ];

  // ---------- Render ----------

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-stone-900">Products</h1>
        <button
          onClick={() => navigate('/admin/products/new')}
          className="bg-stone-900 text-white hover:bg-stone-800 rounded-md px-4 h-9 text-sm font-medium transition-colors inline-flex items-center gap-1.5"
        >
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-stone-200">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              statusFilter === tab.key
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full bg-white border border-stone-200 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-stone-100 rounded"
            >
              <X size={14} className="text-stone-400" />
            </button>
          )}
        </div>

        {/* Filters toggle */}
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={`bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-md px-4 h-9 text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
            filtersOpen || hasActiveFilters ? 'bg-stone-50 border-stone-300' : ''
          }`}
        >
          <SlidersHorizontal size={14} />
          Filters
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 rounded-full bg-stone-900" />
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-stone-500 hover:text-stone-700"
          >
            Clear filters
          </button>
        )}

        {/* Count */}
        <span className="text-sm text-stone-400 ml-auto">
          {pagination.total} product{pagination.total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Expanded filters */}
      {filtersOpen && (
        <div className="bg-white border border-stone-200 rounded-lg p-4 mb-4 flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCategoryFilter(''); }}
              className="bg-white border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            >
              <option value="">All Types</option>
              <option value="wearable">Wearable Art</option>
              <option value="wall-art">Wall Art</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white border border-stone-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
            >
              <option value="">All Categories</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="bg-stone-900 text-white rounded-lg px-4 py-3 mb-4 flex items-center gap-4">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction('publish')}
              className="px-3 py-1.5 text-xs bg-white/20 hover:bg-white/30 rounded-md transition"
            >
              Publish
            </button>
            <button
              onClick={() => handleBulkAction('archive')}
              className="px-3 py-1.5 text-xs bg-white/20 hover:bg-white/30 rounded-md transition"
            >
              Archive
            </button>
            <button
              onClick={() => handleBulkAction('draft')}
              className="px-3 py-1.5 text-xs bg-white/20 hover:bg-white/30 rounded-md transition"
            >
              Set Draft
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              className="px-3 py-1.5 text-xs bg-red-500/80 hover:bg-red-500 rounded-md transition"
            >
              Delete
            </button>
          </div>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-white/70 hover:text-white"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-stone-500 text-sm">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Package size={24} className="text-stone-400" />
            </div>
            <p className="text-stone-600 font-medium">
              {debouncedSearch || statusFilter || typeFilter || categoryFilter
                ? 'No products match your filters'
                : 'Create your first product'}
            </p>
            <p className="text-sm text-stone-400 mt-1">
              {debouncedSearch || statusFilter || typeFilter || categoryFilter
                ? 'Try adjusting your search or filters.'
                : 'Add a product to start selling.'}
            </p>
            {!(debouncedSearch || statusFilter || typeFilter || categoryFilter) && (
              <button
                onClick={() => navigate('/admin/products/new')}
                className="mt-4 bg-stone-900 text-white hover:bg-stone-800 rounded-md px-4 py-2 text-sm font-medium transition-colors"
              >
                Add Product
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-stone-50/80">
                    <th className="px-4 py-2.5 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-stone-300 text-stone-900 focus:ring-stone-400"
                      />
                    </th>
                    <th className="px-4 py-2.5 w-14" />
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">Product</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">Inventory</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">Price</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2.5 w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className={`hover:bg-stone-50 cursor-pointer transition ${
                        product.status === 'archived' ? 'opacity-60' : ''
                      }`}
                      onClick={() => navigate(`/admin/products/${product.id}`)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(product.id)}
                          onChange={() => toggleSelect(product.id)}
                          className="rounded border-stone-300 text-stone-900 focus:ring-stone-400"
                        />
                      </td>
                      <td className="px-4 py-3">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-stone-100 rounded flex items-center justify-center">
                            <Package size={16} className="text-stone-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-stone-900">{product.name || 'Untitled'}</span>
                          <span className="bg-stone-100 text-stone-500 text-[10px] px-1.5 py-0.5 rounded">
                            {product.productType === 'wearable' ? 'Wearable' : 'Wall Art'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-600">{product.category || '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        {product.trackInventory ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              product.availability?.toLowerCase().includes('sold out')
                                ? 'bg-red-500'
                                : product.quantity <= 0
                                  ? 'bg-red-500'
                                  : product.quantity <= 3
                                    ? 'bg-amber-500'
                                    : 'bg-green-500'
                            }`} />
                            <span className="text-stone-600">
                              {product.availability?.toLowerCase().includes('sold out')
                                ? 'Sold out'
                                : `${product.quantity} in stock`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-400">Not tracked</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-900 font-medium">
                        {product.currency || 'AUD'} ${parseFloat(product.price || '0').toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={product.status} />
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <RowActionsMenu
                          product={product}
                          onEdit={() => navigate(`/admin/products/${product.id}`)}
                          onDuplicate={() => handleDuplicate(product)}
                          onArchive={() => handleArchiveToggle(product)}
                          onDelete={() => handleDelete(product)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100">
                <p className="text-sm text-stone-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fetchProducts(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-2 rounded hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
                    let page: number;
                    if (pagination.totalPages <= 7) {
                      page = i + 1;
                    } else if (pagination.page <= 4) {
                      page = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 3) {
                      page = pagination.totalPages - 6 + i;
                    } else {
                      page = pagination.page - 3 + i;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => fetchProducts(page)}
                        className={`w-8 h-8 rounded text-sm transition ${
                          pagination.page === page
                            ? 'bg-stone-900 text-white'
                            : 'hover:bg-stone-100 text-stone-600'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => fetchProducts(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-2 rounded hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-2">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className={toast.type === 'success' ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
