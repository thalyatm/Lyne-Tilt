import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE, resolveImageUrl } from '../config/api';
import {
  Package,
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  Minus,
  Plus,
  Check,
  Edit3,
  X,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProductType = 'physical' | 'digital' | 'wall-art';
type ProductStatus = 'active' | 'draft' | 'archived';
type StockFilter = 'all' | 'low' | 'out' | 'in';
type SortOption = 'stock-asc' | 'stock-desc' | 'name' | 'newest';

interface InventoryProduct {
  id: string;
  name: string;
  image: string;
  productType: ProductType;
  status: ProductStatus;
  price: string;
  quantity: number;
  trackInventory: boolean;
  continueSelling: boolean;
  availability: string;
}

interface InventoryStats {
  totalTracked: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  totalUnits: number;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  iconColor,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  accent: string;
  iconColor: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-lg border shadow-sm p-4 flex items-center gap-4 text-left w-full transition-all ${
        active
          ? 'border-[#8d3038] ring-2 ring-[#8d3038]/20'
          : 'border-stone-200 hover:border-stone-300 hover:shadow'
      }`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon size={18} className={iconColor} />
      </div>
      <div>
        <p className="text-2xl font-semibold text-stone-900">{value}</p>
        <p className="text-xs text-stone-500">{label}</p>
      </div>
    </button>
  );
}

function ProductTypeBadge({ type }: { type: ProductType }) {
  const styles: Record<ProductType, { bg: string; label: string }> = {
    physical: { bg: 'bg-stone-100 text-stone-600', label: 'Physical' },
    digital: { bg: 'bg-blue-100 text-blue-700', label: 'Digital' },
    'wall-art': { bg: 'bg-purple-100 text-purple-700', label: 'Wall Art' },
  };
  const s = styles[type] || styles.physical;
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${s.bg}`}>
      {s.label}
    </span>
  );
}

function StatusBadge({ status }: { status: ProductStatus }) {
  const styles: Record<ProductStatus, string> = {
    active: 'bg-green-100 text-green-700',
    draft: 'bg-stone-100 text-stone-600',
    archived: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${styles[status] || styles.draft}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function AvailabilityBadge({ availability }: { availability: string }) {
  const lower = availability.toLowerCase();
  if (lower.includes('sold out')) {
    return (
      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        Sold out
      </span>
    );
  }
  if (lower.includes('pre-order') || lower.includes('preorder')) {
    return (
      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
        Pre-order
      </span>
    );
  }
  return (
    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
      In stock
    </span>
  );
}

function StockLevelBar({ quantity }: { quantity: number }) {
  // Color coding: green >= 10, amber 1-9, red = 0
  const color =
    quantity >= 10
      ? 'bg-green-500'
      : quantity > 0
        ? 'bg-amber-500'
        : 'bg-red-500';

  const textColor =
    quantity >= 10
      ? 'text-green-700'
      : quantity > 0
        ? 'text-amber-700'
        : 'text-red-700';

  // Progress bar max at 30 for visual purposes
  const percent = Math.min((quantity / 30) * 100, 100);

  return (
    <div className="flex items-center gap-2.5">
      <div className="w-20 h-2 bg-stone-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={`text-sm font-medium ${textColor} tabular-nums`}>
        {quantity}
      </span>
    </div>
  );
}

function InlineQuantityEditor({
  productId,
  currentQuantity,
  accessToken,
  onSaved,
}: {
  productId: string;
  currentQuantity: number;
  accessToken: string | null;
  onSaved: (newQuantity: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentQuantity);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(currentQuantity);
  }, [currentQuantity]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const saveValue = async (newVal: number) => {
    if (newVal === currentQuantity) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setError(false);
    try {
      const res = await fetch(`${API_BASE}/inventory/${productId}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ quantity: newVal }),
      });

      if (!res.ok) throw new Error('Save failed');

      onSaved(newVal);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError(true);
      setValue(currentQuantity);
      setTimeout(() => setError(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveValue(value);
    } else if (e.key === 'Escape') {
      setValue(currentQuantity);
      setEditing(false);
    }
  };

  if (saving) {
    return (
      <div className="flex items-center gap-1.5">
        <Loader2 size={14} className="animate-spin text-stone-400" />
      </div>
    );
  }

  if (saved) {
    return (
      <div className="flex items-center gap-1.5">
        <Check size={14} className="text-green-600" />
        <span className="text-xs text-green-600">Saved</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-1.5">
        <XCircle size={14} className="text-red-500" />
        <span className="text-xs text-red-500">Error</span>
      </div>
    );
  }

  if (!editing) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        className="flex items-center gap-1 text-stone-500 hover:text-stone-700 transition group"
        title="Edit quantity"
      >
        <span className="text-sm tabular-nums">{currentQuantity}</span>
        <Edit3 size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setValue(Math.max(0, value - 1))}
        className="w-6 h-6 rounded flex items-center justify-center bg-stone-100 hover:bg-stone-200 text-stone-600 transition"
      >
        <Minus size={12} />
      </button>
      <input
        ref={inputRef}
        type="number"
        value={value}
        onChange={(e) => setValue(Math.max(0, parseInt(e.target.value) || 0))}
        onKeyDown={handleKeyDown}
        onBlur={() => saveValue(value)}
        min={0}
        className="w-14 h-6 text-center text-sm border border-stone-300 rounded focus:outline-none focus:ring-1 focus:ring-[#8d3038] tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        onClick={() => setValue(value + 1)}
        className="w-6 h-6 rounded flex items-center justify-center bg-stone-100 hover:bg-stone-200 text-stone-600 transition"
      >
        <Plus size={12} />
      </button>
      {value !== currentQuantity && (
        <button
          onClick={() => saveValue(value)}
          className="ml-1 px-2 h-6 rounded text-xs font-medium bg-[#8d3038] hover:bg-[#6b2228] text-white transition"
        >
          Save
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stock Adjustment Modal
// ---------------------------------------------------------------------------

function AdjustmentModal({
  product,
  accessToken,
  onClose,
  onAdjusted,
}: {
  product: InventoryProduct;
  accessToken: string | null;
  onClose: () => void;
  onAdjusted: () => void;
}) {
  const [adjustment, setAdjustment] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adjustment === 0) {
      setError('Adjustment cannot be zero.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/inventory/${product.id}/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ adjustment, reason: reason.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Adjustment failed');
      }
      onAdjusted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust stock.');
    } finally {
      setSaving(false);
    }
  };

  const newQuantity = Math.max(0, product.quantity + adjustment);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h3 className="font-serif text-lg font-semibold text-stone-900">Adjust Stock</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-stone-100 rounded-lg transition"
          >
            <X size={18} className="text-stone-400" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Product info */}
          <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg">
            {product.image ? (
              <img
                src={resolveImageUrl(product.image)}
                alt={product.name}
                className="w-10 h-10 object-cover rounded"
              />
            ) : (
              <div className="w-10 h-10 bg-stone-200 rounded flex items-center justify-center">
                <Package size={16} className="text-stone-400" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-stone-900">{product.name}</p>
              <p className="text-xs text-stone-500">
                Current stock: <span className="font-medium">{product.quantity}</span>
              </p>
            </div>
          </div>

          {/* Adjustment */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Adjustment
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAdjustment((a) => a - 1)}
                className="w-9 h-9 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition"
              >
                <Minus size={16} className="text-stone-600" />
              </button>
              <input
                type="number"
                value={adjustment}
                onChange={(e) => setAdjustment(parseInt(e.target.value) || 0)}
                className="w-24 h-9 text-center text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8d3038]/30 focus:border-[#8d3038] tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => setAdjustment((a) => a + 1)}
                className="w-9 h-9 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition"
              >
                <Plus size={16} className="text-stone-600" />
              </button>
              <span className="text-sm text-stone-500 ml-2">
                New total:{' '}
                <span className="font-medium text-stone-900">{newQuantity}</span>
              </span>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Reason <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Damaged, Restocked, Inventory count..."
              rows={3}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8d3038]/30 focus:border-[#8d3038] resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || adjustment === 0}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[#8d3038] hover:bg-[#6b2228] text-white transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Saving...' : 'Apply Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function InventoryManager() {
  const { accessToken } = useAuth();

  // Data
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [stats, setStats] = useState<InventoryStats>({
    totalTracked: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
    totalUnits: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('stock-asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Modal
  const [adjustProduct, setAdjustProduct] = useState<InventoryProduct | null>(null);

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

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (stockFilter !== 'all') params.set('filter', stockFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (sortOption) params.set('sort', sortOption);

      const res = await fetch(`${API_BASE}/inventory?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) throw new Error('Failed to load inventory');

      const data = await res.json();
      setProducts(data.products || []);
      setStats(
        data.stats || {
          totalTracked: 0,
          inStock: 0,
          lowStock: 0,
          outOfStock: 0,
          totalUnits: 0,
        }
      );
    } catch {
      showToast('error', 'Could not load inventory. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, stockFilter, debouncedSearch, typeFilter, sortOption]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // ---------- Inline stock update handler ----------

  const handleInlineSave = (productId: string, newQuantity: number) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, quantity: newQuantity } : p
      )
    );
    showToast('success', 'Stock updated.');
  };

  // ---------- Stats card click → filter ----------

  const handleStatClick = (filter: StockFilter) => {
    setStockFilter((prev) => (prev === filter ? 'all' : filter));
  };

  // ---------- Row background ----------

  const getRowBg = (product: InventoryProduct) => {
    if (product.quantity === 0) return 'bg-red-50/60';
    if (product.quantity > 0 && product.quantity < 10) return 'bg-amber-50/60';
    return '';
  };

  // ---------- Render ----------

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-xl font-semibold text-stone-900">Inventory</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          {stats.totalUnits} total units across {stats.totalTracked} tracked products
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Package}
          label="Total Tracked"
          value={stats.totalTracked}
          accent="bg-stone-100"
          iconColor="text-stone-600"
          active={stockFilter === 'all'}
          onClick={() => handleStatClick('all')}
        />
        <StatCard
          icon={CheckCircle}
          label="In Stock"
          value={stats.inStock}
          accent="bg-green-100"
          iconColor="text-green-600"
          active={stockFilter === 'in'}
          onClick={() => handleStatClick('in')}
        />
        <StatCard
          icon={AlertTriangle}
          label="Low Stock"
          value={stats.lowStock}
          accent="bg-amber-100"
          iconColor="text-amber-600"
          active={stockFilter === 'low'}
          onClick={() => handleStatClick('low')}
        />
        <StatCard
          icon={XCircle}
          label="Out of Stock"
          value={stats.outOfStock}
          accent="bg-red-100"
          iconColor="text-red-600"
          active={stockFilter === 'out'}
          onClick={() => handleStatClick('out')}
        />
      </div>

      {/* Toolbar */}
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

        {/* Product type dropdown */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-white border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
        >
          <option value="all">All Types</option>
          <option value="physical">Physical</option>
          <option value="digital">Digital</option>
          <option value="wall-art">Wall Art</option>
        </select>

        {/* Sort dropdown */}
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value as SortOption)}
          className="bg-white border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
        >
          <option value="stock-asc">Stock: Low to High</option>
          <option value="stock-desc">Stock: High to Low</option>
          <option value="name">Name: A-Z</option>
          <option value="newest">Newest First</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 size={24} className="animate-spin text-stone-400 mx-auto mb-3" />
            <p className="text-stone-500 text-sm">Loading inventory...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Package size={24} className="text-stone-400" />
            </div>
            <p className="text-stone-600 font-medium">
              {debouncedSearch || stockFilter !== 'all' || typeFilter !== 'all'
                ? 'No products match your filters'
                : 'No inventory to manage'}
            </p>
            <p className="text-sm text-stone-400 mt-1">
              {debouncedSearch || stockFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Products with inventory tracking will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-stone-50/80">
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Stock Level
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Availability
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className={`hover:bg-stone-50 transition ${getRowBg(product)}`}
                  >
                    {/* Product */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <img
                            src={resolveImageUrl(product.image)}
                            alt={product.name}
                            className="w-8 h-8 object-cover rounded"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-stone-100 rounded flex items-center justify-center">
                            <Package size={14} className="text-stone-400" />
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-stone-900">
                            {product.name || 'Untitled'}
                          </span>
                          <ProductTypeBadge type={product.productType} />
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={product.status} />
                    </td>

                    {/* Stock Level */}
                    <td className="px-4 py-3">
                      <StockLevelBar quantity={product.quantity} />
                    </td>

                    {/* Availability */}
                    <td className="px-4 py-3">
                      <AvailabilityBadge availability={product.availability} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <InlineQuantityEditor
                          productId={product.id}
                          currentQuantity={product.quantity}
                          accessToken={accessToken}
                          onSaved={(newQty) => handleInlineSave(product.id, newQty)}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAdjustProduct(product);
                          }}
                          className="text-xs font-medium px-2.5 py-1 rounded border border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition"
                        >
                          Adjust
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {adjustProduct && (
        <AdjustmentModal
          product={adjustProduct}
          accessToken={accessToken}
          onClose={() => setAdjustProduct(null)}
          onAdjusted={() => {
            fetchInventory();
            showToast('success', `Stock adjusted for "${adjustProduct.name}".`);
          }}
        />
      )}

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
              className={
                toast.type === 'success'
                  ? 'text-green-600 hover:text-green-800'
                  : 'text-red-600 hover:text-red-800'
              }
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
