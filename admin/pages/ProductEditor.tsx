import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE, resolveImageUrl } from '../config/api';
import RichTextEditor from '../components/RichTextEditor';
import { ImageUploadField } from '../components/FormModal';
import {
  ArrowLeft,
  Save,
  MoreHorizontal,
  Copy,
  Archive,
  Trash2,
  ExternalLink,
  X,
  Upload,
  GripVertical,
  Loader2,
  Check,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProductType = 'wearable' | 'wall-art';
type ProductStatus = 'draft' | 'active' | 'scheduled' | 'archived' | 'discontinued';

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  altText: string;
  isPrimary: boolean;
  sortOrder: number;
}

interface ProductData {
  id?: string;
  productType: ProductType;
  name: string;
  slug: string;
  price: string;
  compareAtPrice: string;
  costPrice: string;
  currency: string;
  taxable: boolean;
  shortDescription: string;
  longDescription: string;
  careDescription: string;
  category: string;
  tags: string[];
  badge: string;
  materials: string[];
  colours: string[];
  weightGrams: number | null;
  dimensions: string;
  trackInventory: boolean;
  quantity: number;
  continueSelling: boolean;
  availability: string;
  image: string;
  detailImages: string[];
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  status: ProductStatus;
  publishedAt: string | null;
  displayOrder: number;
}

const EMPTY_PRODUCT: ProductData = {
  productType: 'wearable',
  name: '',
  slug: '',
  price: '0',
  compareAtPrice: '',
  costPrice: '',
  currency: 'AUD',
  taxable: true,
  shortDescription: '',
  longDescription: '',
  careDescription: '',
  category: '',
  tags: [],
  badge: '',
  materials: [],
  colours: [],
  weightGrams: null,
  dimensions: '',
  trackInventory: true,
  quantity: 1,
  continueSelling: false,
  availability: 'In stock',
  image: '',
  detailImages: [],
  metaTitle: '',
  metaDescription: '',
  ogImage: '',
  status: 'draft',
  publishedAt: null,
  displayOrder: 0,
};

const WEARABLE_CATEGORIES = ['Earrings', 'Brooches', 'Necklaces'];
const WALL_ART_CATEGORIES = ['Prints', 'Originals', 'Mixed Media'];
const BADGES = ['ONE OF A KIND', 'LIMITED EDITION', 'NEW', 'BESTSELLER'];

const DEFAULT_MATERIALS = ['Polymer Clay', 'Sterling Silver', 'Stainless Steel', 'Resin', 'Acrylic', 'Glass', 'Wood', 'Brass', 'Gold Plated', 'Leather'];
const DEFAULT_COLOURS = ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Purple', 'Orange', 'Brown', 'Gold', 'Silver', 'Multicolour', 'Neutral', 'Earthy Tones'];

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
  const labels: Record<ProductStatus, string> = {
    draft: 'Draft',
    active: 'Live on site',
    scheduled: 'Scheduled',
    archived: 'Hidden from site',
    discontinued: 'Discontinued',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-stone-200">
      <div className="px-3 py-2 border-b border-stone-100">
        <h3 className="text-sm font-medium text-stone-800">{title}</h3>
      </div>
      <div className="p-3 space-y-3">{children}</div>
    </div>
  );
}

function FieldLabel({ label, required, htmlFor }: { label: string; required?: boolean; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-stone-700 mb-1">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function TagMultiSelect({
  label,
  selected,
  options,
  onChange,
}: {
  label: string;
  selected: string[];
  options: string[];
  onChange: (values: string[]) => void;
}) {
  const [customInput, setCustomInput] = useState('');
  const allOptions = useMemo(() => {
    const merged = new Set([...options, ...selected]);
    return Array.from(merged).sort();
  }, [options, selected]);

  const toggleOption = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(s => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
    }
    setCustomInput('');
  };

  return (
    <div>
      <FieldLabel label={label} />
      <div className="flex flex-wrap gap-1.5 mb-2">
        {allOptions.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggleOption(opt)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              selected.includes(opt)
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          placeholder={`Add custom ${label.toLowerCase()}...`}
          className="flex-1 px-3 py-1.5 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!customInput.trim()}
          className="px-3 py-1.5 text-xs font-medium bg-stone-100 text-stone-700 rounded-md hover:bg-stone-200 transition disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function CharCounter({ current, max }: { current: number; max: number }) {
  const ratio = current / max;
  const color = ratio >= 1 ? 'text-red-500' : ratio >= 0.9 ? 'text-amber-500' : 'text-stone-400';
  return <span className={`text-xs ${color}`}>{current}/{max}</span>;
}

// ---------------------------------------------------------------------------
// Media Section
// ---------------------------------------------------------------------------

function MediaSection({
  productId,
  media,
  onMediaChange,
  accessToken,
}: {
  productId: string | undefined;
  media: MediaItem[];
  onMediaChange: (media: MediaItem[]) => void;
  accessToken: string | null;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [editAlt, setEditAlt] = useState('');

  const uploadFile = async (file: File) => {
    if (!productId) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('altText', '');

      const res = await fetch(`${API_BASE}/products/${productId}/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      const newMedia = await res.json();
      onMediaChange([...media, newMedia]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    files.forEach(f => uploadFile(f));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    files.forEach(f => uploadFile(f));
  };

  const handleDelete = async (mediaId: string) => {
    if (!productId) return;
    try {
      await fetch(`${API_BASE}/products/${productId}/media/${mediaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      onMediaChange(media.filter(m => m.id !== mediaId));
      if (selectedMedia === mediaId) setSelectedMedia(null);
    } catch {
      alert('Could not delete image');
    }
  };

  const handleSetPrimary = async (mediaId: string) => {
    if (!productId) return;
    try {
      await fetch(`${API_BASE}/products/${productId}/media/${mediaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ isPrimary: true }),
      });
      onMediaChange(media.map(m => ({ ...m, isPrimary: m.id === mediaId })));
    } catch {
      alert('Could not set primary image');
    }
  };

  const handleUpdateAlt = async (mediaId: string, altText: string) => {
    if (!productId) return;
    try {
      await fetch(`${API_BASE}/products/${productId}/media/${mediaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ altText }),
      });
      onMediaChange(media.map(m => m.id === mediaId ? { ...m, altText } : m));
    } catch {
      alert('Could not update alt text');
    }
  };

  const selected = media.find(m => m.id === selectedMedia);

  return (
    <div className="space-y-3">
      {/* Thumbnail grid */}
      {media.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {media.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setSelectedMedia(item.id);
                setEditAlt(item.altText || '');
              }}
              className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition ${
                selectedMedia === item.id ? 'border-stone-900' : 'border-transparent hover:border-stone-300'
              }`}
            >
              <img src={resolveImageUrl(item.url)} alt={item.altText} className="w-full h-full object-cover" />
              {item.isPrimary && (
                <span className="absolute top-1 left-1 bg-stone-900 text-white text-[9px] px-1.5 py-0.5 rounded">
                  Primary
                </span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                style={{ opacity: selectedMedia === item.id ? 1 : undefined }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Selected image detail */}
      {selected && (
        <div className="bg-stone-50 rounded-lg p-3 space-y-2">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Alt text (required for accessibility)</label>
            <input
              type="text"
              value={editAlt}
              onChange={(e) => setEditAlt(e.target.value)}
              onBlur={() => handleUpdateAlt(selected.id, editAlt)}
              placeholder="Describe this image..."
              className="w-full px-2.5 py-1.5 text-sm border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>
          <div className="flex gap-2">
            {!selected.isPrimary && (
              <button
                onClick={() => handleSetPrimary(selected.id)}
                className="text-xs text-stone-600 hover:text-stone-900 px-2 py-1 border border-stone-200 rounded hover:bg-white transition"
              >
                Set as primary
              </button>
            )}
            <button
              onClick={() => handleDelete(selected.id)}
              className="text-xs text-red-600 hover:text-red-800 px-2 py-1 border border-red-200 rounded hover:bg-red-50 transition"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Drop zone */}
      {productId ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging ? 'border-stone-400 bg-stone-50' : 'border-stone-300 hover:border-stone-400'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={24} className="text-stone-500 animate-spin" />
              <p className="text-sm text-stone-500">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="p-2 bg-stone-100 rounded-full">
                <Upload size={20} className="text-stone-400" />
              </div>
              <p className="text-sm text-stone-600">
                Drag images here or{' '}
                <label className="text-stone-700 font-medium cursor-pointer hover:underline">
                  browse
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFileSelect} className="sr-only" />
                </label>
              </p>
              <p className="text-xs text-stone-400">JPG, PNG, WebP up to 10MB</p>
            </div>
          )}
        </div>
      ) : (
        <div className="border-2 border-dashed border-stone-200 rounded-lg p-6 text-center">
          <p className="text-sm text-stone-400">Save the product first to upload images.</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ProductEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const isNew = !id || id === 'new';

  // Product state
  const [product, setProduct] = useState<ProductData>({ ...EMPTY_PRODUCT });
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [productId, setProductId] = useState<string | undefined>(isNew ? undefined : id);

  // UI state
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errors, setErrors] = useState<string[]>([]);
  const [errorFields, setErrorFields] = useState<Set<string>>(new Set());
  const [showQuantityWarning, setShowQuantityWarning] = useState(false);
  const [pendingQuantity, setPendingQuantity] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  // Autosave
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hasChanges = useRef(false);
  const lastSavedData = useRef<string>('');

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), type === 'success' ? 15000 : 5000);
  };

  const fieldBorder = (field: string) =>
    errorFields.has(field)
      ? 'border-red-400 ring-2 ring-red-200'
      : 'border-stone-200';

  // ---------- Close actions menu on outside click ----------

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setActionsMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ---------- Load existing product ----------

  useEffect(() => {
    if (isNew) return;

    const loadProduct = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/products/${id}`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        if (!res.ok) throw new Error('Product not found');

        const data = await res.json();
        const productData: ProductData = {
          id: data.id,
          productType: data.productType || 'wearable',
          name: data.name || '',
          slug: data.slug || '',
          price: data.price || '0',
          compareAtPrice: data.compareAtPrice || '',
          costPrice: data.costPrice || '',
          currency: data.currency || 'AUD',
          taxable: data.taxable !== false,
          shortDescription: data.shortDescription || '',
          longDescription: data.longDescription || '',
          careDescription: data.careDescription || '',
          category: data.category || '',
          tags: Array.isArray(data.tags) ? data.tags : (typeof data.tags === 'string' ? JSON.parse(data.tags || '[]') : []),
          badge: data.badge || '',
          materials: Array.isArray(data.materials) ? data.materials : (typeof data.materials === 'string' ? JSON.parse(data.materials || '[]') : []),
          colours: Array.isArray(data.colours) ? data.colours : (typeof data.colours === 'string' ? JSON.parse(data.colours || '[]') : []),
          weightGrams: data.weightGrams || null,
          dimensions: data.dimensions || '',
          trackInventory: data.trackInventory !== false,
          quantity: data.quantity ?? 1,
          continueSelling: !!data.continueSelling,
          availability: data.availability || 'In stock',
          image: data.image || '',
          detailImages: Array.isArray(data.detailImages) ? data.detailImages : [],
          metaTitle: data.metaTitle || '',
          metaDescription: data.metaDescription || '',
          ogImage: data.ogImage || '',
          status: data.status || 'draft',
          publishedAt: data.publishedAt || null,
          displayOrder: data.displayOrder || 0,
        };

        setProduct(productData);

        // Use media records if available, otherwise build from image/detailImages fields
        let mediaItems = data.media || [];
        if (mediaItems.length === 0 && data.image) {
          const syntheticMedia: MediaItem[] = [];
          if (data.image) {
            syntheticMedia.push({
              id: `legacy-primary`,
              url: data.image,
              filename: 'primary.jpg',
              altText: data.name || '',
              isPrimary: true,
              sortOrder: 0,
            });
          }
          const detail = Array.isArray(data.detailImages) ? data.detailImages : [];
          detail.forEach((url: string, i: number) => {
            if (url && url !== data.image) {
              syntheticMedia.push({
                id: `legacy-${i}`,
                url,
                filename: `detail-${i}.jpg`,
                altText: '',
                isPrimary: false,
                sortOrder: i + 1,
              });
            }
          });
          mediaItems = syntheticMedia;
        }
        setMedia(mediaItems);
        setProductId(data.id);
        lastSavedData.current = JSON.stringify(productData);
      } catch {
        showToast('error', 'Could not load product.');
        navigate('/admin/products');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id, isNew, accessToken, navigate]);

  // ---------- Update field helper ----------

  const updateField = useCallback((field: keyof ProductData, value: any) => {
    setProduct(prev => {
      const next = { ...prev, [field]: value };

      // Auto-generate slug from name on first edit (only for new products or empty slugs)
      if (field === 'name' && (!prev.slug || prev.slug === generateSlug(prev.name))) {
        next.slug = generateSlug(value);
      }

      // Auto-set meta title from name if meta title is empty or matches previous name
      if (field === 'name' && (!prev.metaTitle || prev.metaTitle === prev.name)) {
        next.metaTitle = value;
      }

      return next;
    });
    hasChanges.current = true;
  }, []);

  // ---------- Autosave ----------

  useEffect(() => {
    if (!hasChanges.current) return;

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      saveProduct(false);
    }, 3000);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [product]);

  // ---------- Save ----------

  const saveProduct = useCallback(async (showFeedback = true) => {
    const currentData = JSON.stringify(product);
    if (currentData === lastSavedData.current && productId) {
      if (showFeedback) showToast('success', 'All changes saved.');
      return productId;
    }

    setSaving(true);
    setSaveStatus('saving');

    try {
      const method = productId ? 'PUT' : 'POST';
      const url = productId ? `${API_BASE}/products/${productId}` : `${API_BASE}/products`;

      const payload: Record<string, any> = { ...product };
      delete payload.id;
      delete payload.publishedAt;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Save failed');
      }

      const saved = await res.json();

      if (!productId) {
        setProductId(saved.id);
        setProduct(prev => ({ ...prev, id: saved.id }));
        // Update URL without full navigation
        window.history.replaceState(null, '', `#/admin/products/${saved.id}`);
      }

      lastSavedData.current = JSON.stringify(product);
      hasChanges.current = false;
      setSaveStatus('saved');
      if (showFeedback) showToast('success', 'All changes saved.');

      return saved.id;
    } catch (err: any) {
      setSaveStatus('error');
      if (showFeedback) showToast('error', err.message || 'Could not save product.');
      return null;
    } finally {
      setSaving(false);
    }
  }, [product, productId, accessToken]);

  // ---------- Publish ----------

  const handlePublish = async () => {
    // First save current changes
    const savedId = await saveProduct(false);
    if (!savedId) return;

    try {
      const res = await fetch(`${API_BASE}/products/${savedId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: 'active' }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.errors) {
          setErrors(err.errors);
          // Map error messages to field names for highlighting
          const fields = new Set<string>();
          for (const msg of err.errors) {
            if (msg.includes('Name')) fields.add('name');
            if (msg.includes('Price')) fields.add('price');
            if (msg.includes('Category')) fields.add('category');
            if (msg.includes('Short description')) fields.add('shortDescription');
            if (msg.includes('image')) fields.add('image');
            if (msg.includes('slug')) fields.add('slug');
          }
          setErrorFields(fields);
          showToast('error', 'Cannot publish — please fix the highlighted fields');
          return;
        }
        throw new Error(err.error || 'Publish failed');
      }

      const updated = await res.json();
      setProduct(prev => ({ ...prev, status: updated.status, publishedAt: updated.publishedAt }));
      setErrors([]);
      setErrorFields(new Set());
      showToast('success', 'Product is now live!');
    } catch (err: any) {
      showToast('error', err.message || 'Could not publish product.');
    }
  };

  // ---------- Duplicate ----------

  const handleDuplicate = async () => {
    if (!productId) return;
    try {
      const res = await fetch(`${API_BASE}/products/${productId}/duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error();
      const dup = await res.json();
      showToast('success', 'Product duplicated.');
      navigate(`/admin/products/${dup.id}`);
    } catch {
      showToast('error', 'Could not duplicate product.');
    }
  };

  // ---------- Archive ----------

  const handleArchive = async () => {
    if (!productId) return;
    try {
      const res = await fetch(`${API_BASE}/products/${productId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: 'archived' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      showToast('success', 'Product archived.');
      navigate('/admin/products');
    } catch (err: any) {
      showToast('error', err.message || 'Could not archive product.');
    }
  };

  // ---------- Delete ----------

  const handleDelete = async () => {
    if (!productId) return;
    if (!window.confirm('Are you sure you want to delete this product? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_BASE}/products/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      showToast('success', 'Product deleted.');
      navigate('/admin/products');
    } catch (err: any) {
      showToast('error', err.message || 'Could not delete product.');
    }
  };

  // ---------- Category options ----------

  const categoryOptions = useMemo(() => {
    return product.productType === 'wearable' ? WEARABLE_CATEGORIES : WALL_ART_CATEGORIES;
  }, [product.productType]);

  // ---------- Margin calculation ----------

  const margin = useMemo(() => {
    const price = parseFloat(product.price) || 0;
    const cost = parseFloat(product.costPrice) || 0;
    if (price <= 0 || cost <= 0) return null;
    return ((price - cost) / price * 100).toFixed(0);
  }, [product.price, product.costPrice]);

  // ---------- Loading state ----------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin" />
      </div>
    );
  }

  // ---------- Render ----------

  return (
    <div className="min-h-screen -m-4 lg:-m-6">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-stone-200 px-4 lg:px-6 py-3">
        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/admin/products')}
            className="p-1.5 hover:bg-stone-100 rounded-md transition text-stone-500"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-stone-900 truncate">
                {product.name || 'Untitled product'}
              </h1>
              <StatusBadge status={product.status} />
            </div>
          </div>

          {/* Save indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-400">
            {saveStatus === 'saving' && (
              <><Loader2 size={12} className="animate-spin" /> Saving...</>
            )}
            {saveStatus === 'saved' && (
              <><Check size={12} className="text-green-500" /> Saved</>
            )}
            {saveStatus === 'error' && (
              <><AlertCircle size={12} className="text-red-500" /> Save failed</>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => saveProduct(true)}
              disabled={saving}
              className="bg-stone-900 text-white hover:bg-stone-800 rounded-md px-4 h-8 text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Save size={14} />
              Save & Update
            </button>

            {(product.status === 'draft' || product.status === 'archived') && (
              <button
                onClick={handlePublish}
                disabled={saving}
                className="bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-md px-4 h-8 text-sm font-medium transition-colors disabled:opacity-50"
              >
                Publish
              </button>
            )}

            {/* Three-dot menu */}
            {productId && (
              <div className="relative" ref={actionsRef}>
                <button
                  onClick={() => setActionsMenuOpen(!actionsMenuOpen)}
                  className="p-1.5 hover:bg-stone-100 rounded-md transition"
                >
                  <MoreHorizontal size={18} className="text-stone-500" />
                </button>
                {actionsMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 z-30 bg-white rounded-lg shadow-lg border border-stone-200 py-1 w-44">
                    <button
                      onClick={() => { handleDuplicate(); setActionsMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex items-center gap-2"
                    >
                      <Copy size={14} /> Duplicate
                    </button>
                    <button
                      onClick={() => { handleArchive(); setActionsMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex items-center gap-2"
                    >
                      <Archive size={14} /> Archive
                    </button>
                    {product.status === 'active' && (
                      <a
                        href={`/#/shop/${product.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex items-center gap-2"
                      >
                        <ExternalLink size={14} /> View on site
                      </a>
                    )}
                    <div className="border-t border-stone-100 my-1" />
                    <button
                      onClick={() => { handleDelete(); setActionsMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 lg:px-6 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm font-medium text-red-800 mb-1">Cannot publish — fix these issues:</p>
            <ul className="text-sm text-red-700 list-disc list-inside">
              {errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* LEFT COLUMN (60%) */}
          <div className="lg:col-span-3 space-y-4">

            {/* Title */}
            <Card title="Product Details">
              <div>
                <div className="flex items-center justify-between">
                  <FieldLabel label="Title" required />
                  <CharCounter current={product.name.length} max={200} />
                </div>
                <input
                  type="text"
                  value={product.name}
                  onChange={(e) => { updateField('name', e.target.value); setErrorFields(prev => { const n = new Set(prev); n.delete('name'); return n; }); }}
                  placeholder="Product name"
                  maxLength={200}
                  className={`w-full px-3 py-2 border ${fieldBorder('name')} rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1`}
                />
                {errorFields.has('name') && <p className="text-xs text-red-600 mt-1">Name is required</p>}
              </div>

              <div>
                <FieldLabel label="Short Description" required />
                <textarea
                  value={product.shortDescription}
                  onChange={(e) => { updateField('shortDescription', e.target.value); setErrorFields(prev => { const n = new Set(prev); n.delete('shortDescription'); return n; }); }}
                  placeholder="A brief summary shown on product cards and listings..."
                  rows={2}
                  maxLength={300}
                  className={`w-full px-3 py-2 border ${fieldBorder('shortDescription')} rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 resize-y`}
                />
                {errorFields.has('shortDescription') && <p className="text-xs text-red-600 mt-1">Short description is required</p>}
              </div>

              <div>
                <FieldLabel label="Description" />
                <RichTextEditor
                  content={product.longDescription}
                  onChange={(html) => updateField('longDescription', html)}
                  placeholder="Product description..."
                  minHeight="160px"
                />
              </div>

              <div>
                <FieldLabel label="Care Description" />
                <p className="text-xs text-stone-400 mb-1.5">Customise per product, or leave the default.</p>
                <textarea
                  value={product.careDescription || `Treat it with love, but not stress.\n\n• Avoid dropping, bending, or scratching\n• Wipe with a soft, damp cloth\n• Avoid chemical exposure (including perfumes or sprays)\n• Store in original packaging to prevent damage or loss`}
                  onChange={(e) => updateField('careDescription', e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 resize-y"
                  placeholder="Care instructions for this product..."
                />
              </div>
            </Card>

            {/* Media */}
            <Card title={<span>Media {errorFields.has('image') && <span className="text-red-500 text-xs font-normal ml-2">At least one image is required</span>}</span>}>
              <MediaSection
                productId={productId}
                media={media}
                onMediaChange={(updatedMedia) => {
                  setMedia(updatedMedia);
                  const primary = updatedMedia.find(m => m.isPrimary);
                  const primaryUrl = primary?.url || updatedMedia[0]?.url || '';
                  setProduct(prev => ({ ...prev, image: primaryUrl }));
                  hasChanges.current = true;
                }}
                accessToken={accessToken}
              />
            </Card>

          </div>

          {/* RIGHT COLUMN (40%) */}
          <div className="lg:col-span-2 space-y-4">

            {/* Status card */}
            <Card title="Status">
              <div className="flex items-center gap-2">
                <StatusBadge status={product.status} />
                {product.publishedAt && (
                  <span className="text-xs text-stone-400">
                    Published {new Date(product.publishedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </Card>

            {/* Pricing */}
            <Card title="Pricing">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel label="Price" required />
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">A$</span>
                    <input
                      type="number"
                      value={product.price}
                      onChange={(e) => { updateField('price', e.target.value); setErrorFields(prev => { const n = new Set(prev); n.delete('price'); return n; }); }}
                      step="0.01"
                      min="0"
                      className={`w-full pl-9 pr-3 py-2 border ${fieldBorder('price')} rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1`}
                    />
                    {errorFields.has('price') && <p className="text-xs text-red-600 mt-1">Price must be greater than $0</p>}
                  </div>
                </div>
                <div>
                  <FieldLabel label="Sale price" />
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">A$</span>
                    <input
                      type="number"
                      value={product.compareAtPrice}
                      onChange={(e) => updateField('compareAtPrice', e.target.value)}
                      step="0.01"
                      min="0"
                      placeholder="Not on sale"
                      className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                    />
                  </div>
                </div>
              </div>
              {product.compareAtPrice && parseFloat(product.compareAtPrice) > 0 && parseFloat(product.compareAtPrice) < parseFloat(product.price) && (
                <p className="text-xs text-green-600">
                  On sale: <span className="line-through text-stone-400">${parseFloat(product.price).toFixed(2)}</span> → ${parseFloat(product.compareAtPrice).toFixed(2)}
                </p>
              )}
            </Card>

            {/* Organisation */}
            <Card title="Organisation">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel label="Product type" />
                  <select
                    value={product.productType}
                    onChange={(e) => {
                      updateField('productType', e.target.value);
                      updateField('category', '');
                    }}
                    disabled={!!product.publishedAt}
                    className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 disabled:opacity-50 disabled:bg-stone-50"
                  >
                    <option value="wearable">Wearable Art</option>
                    <option value="wall-art">Wall Art</option>
                  </select>
                  {product.publishedAt && (
                    <p className="text-xs text-stone-400 mt-1">Cannot change type after publishing.</p>
                  )}
                </div>
                <div>
                  <FieldLabel label="Category" required />
                  <select
                    value={product.category}
                    onChange={(e) => { updateField('category', e.target.value); setErrorFields(prev => { const n = new Set(prev); n.delete('category'); return n; }); }}
                    className={`w-full px-3 py-2 border ${fieldBorder('category')} rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400`}
                  >
                    <option value="">Select category...</option>
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel label="Tags" />
                  <input
                    type="text"
                    value={Array.isArray(product.tags) ? product.tags.join(', ') : ''}
                    onChange={(e) => updateField('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                    placeholder="Comma-separated tags"
                    className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </div>
                <div>
                  <FieldLabel label="Badge" />
                  <select
                    value={BADGES.includes(product.badge) ? product.badge : product.badge ? '__custom' : ''}
                    onChange={(e) => {
                      if (e.target.value === '__custom') return;
                      updateField('badge', e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                  >
                    <option value="">No badge</option>
                    {BADGES.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                    <option value="__custom">Custom...</option>
                  </select>
                  {(product.badge && !BADGES.includes(product.badge)) && (
                    <input
                      type="text"
                      value={product.badge}
                      onChange={(e) => updateField('badge', e.target.value)}
                      placeholder="Custom badge text"
                      className="w-full mt-2 px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  )}
                </div>
              </div>
            </Card>

            {/* Materials & Colours */}
            <Card title="Materials & Colours">
              <TagMultiSelect
                label="Materials"
                selected={product.materials}
                options={DEFAULT_MATERIALS}
                onChange={(values) => updateField('materials', values)}
              />
              <TagMultiSelect
                label="Colours"
                selected={product.colours}
                options={DEFAULT_COLOURS}
                onChange={(values) => updateField('colours', values)}
              />
            </Card>

            {/* Inventory & Shipping - side by side */}
            <div className="grid grid-cols-2 gap-4">
              <Card title="Inventory">
                <div>
                  <FieldLabel label="Quantity" />
                  <input
                    type="number"
                    value={product.quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      if (val > 1) {
                        setPendingQuantity(val);
                        setShowQuantityWarning(true);
                        return;
                      }
                      updateField('quantity', val);
                    }}
                    min="0"
                    className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                  <div className={`mt-1.5 flex items-center gap-1.5 text-xs ${
                    product.quantity <= 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      product.quantity <= 0 ? 'bg-red-500' : 'bg-green-500'
                    }`} />
                    {product.quantity <= 0 ? 'Sold out' : 'In stock'}
                  </div>
                </div>
              </Card>

              <Card title="Shipping">
                <div>
                  <FieldLabel label="Weight (grams)" />
                  <input
                    type="number"
                    value={product.weightGrams || ''}
                    onChange={(e) => updateField('weightGrams', e.target.value ? parseInt(e.target.value) : null)}
                    min="0"
                    placeholder="Weight in grams"
                    className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                  />
                </div>
                {product.productType === 'wall-art' && (
                  <div>
                    <FieldLabel label="Dimensions" />
                    <input
                      type="text"
                      value={product.dimensions}
                      onChange={(e) => updateField('dimensions', e.target.value)}
                      placeholder="e.g., 30cm x 40cm"
                      className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                    />
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Quantity Warning Modal */}
      {showQuantityWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-stone-800">Quantity Warning</h3>
                <p className="mt-1 text-sm text-stone-500">
                  You're setting a quantity of <strong>{pendingQuantity}</strong> for a {product.productType === 'wall-art' ? 'wall art' : 'wearable'} product. Each piece is typically one-of-a-kind. Are you sure you want to proceed?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowQuantityWarning(false); setPendingQuantity(null); }}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pendingQuantity !== null) updateField('quantity', pendingQuantity);
                  setShowQuantityWarning(false);
                  setPendingQuantity(null);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 transition-colors"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
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
            {toast.type === 'success' && product.status === 'active' && product.slug && (
              <a
                href={`/#/${product.productType === 'wall-art' ? 'wall-art' : 'shop'}/${product.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-700 hover:text-green-900 underline underline-offset-2 whitespace-nowrap inline-flex items-center gap-1"
              >
                View on website <ExternalLink size={12} />
              </a>
            )}
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
