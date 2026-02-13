import React, { useState, useCallback } from 'react';
import { X, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { API_BASE } from '../config/api';
import { useAuth } from '../context/AuthContext';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'url' | 'array' | 'checkboxes' | 'image' | 'images';
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  rows?: number;
}

interface FormModalProps {
  isOpen: boolean;
  title: string;
  fields: FormField[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
  compact?: boolean;
}

export function ImageUploadField({ value, onChange, required, compact }: ImageUploadFieldProps) {
  const { accessToken } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File) => {
    setError(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Upload failed');
      }

      const data = await res.json();
      // Construct full URL for the uploaded image
      const baseUrl = API_BASE.replace('/api', '');
      onChange(`${baseUrl}${data.url}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      uploadFile(file);
    } else {
      setError('Please drop an image file');
    }
  }, [accessToken]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleRemove = () => {
    onChange('');
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative group">
          <img
            src={value}
            alt="Uploaded"
            className={`object-cover rounded-lg border border-stone-200 ${compact ? 'w-full h-32' : 'w-full h-48'}`}
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg text-center transition-colors ${
            compact ? 'p-4' : 'p-8'
          } ${
            isDragging
              ? 'border-stone-400 bg-stone-50'
              : 'border-stone-300 hover:border-stone-400'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={compact ? 20 : 32} className="text-stone-500 animate-spin" />
              <p className="text-sm text-stone-500">Uploading...</p>
            </div>
          ) : (
            <>
              <div className={`flex items-center gap-3 ${compact ? 'flex-row' : 'flex-col'}`}>
                <div className={`bg-stone-100 rounded-full ${compact ? 'p-2' : 'p-3'}`}>
                  <Upload size={compact ? 18 : 24} className="text-stone-400" />
                </div>
                <div className={compact ? 'text-left' : 'text-center'}>
                  <p className="text-sm text-stone-600">
                    {compact ? 'Drop image or ' : 'Drag and drop an image here, or '}
                    <label className="text-stone-700 font-medium cursor-pointer hover:underline">
                      browse
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="sr-only"
                      />
                    </label>
                  </p>
                  {!compact && <p className="text-xs text-stone-400 mt-1">PNG, JPG, GIF, WEBP up to 5MB</p>}
                </div>
              </div>
            </>
          )}
        </div>
      )}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      {/* Hidden input for URL fallback */}
      <input
        type="hidden"
        value={value}
        required={required}
      />
    </div>
  );
}

interface MultiImageUploadFieldProps {
  values: string[];
  onChange: (urls: string[]) => void;
}

function MultiImageUploadField({ values, onChange }: MultiImageUploadFieldProps) {
  const { accessToken } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File) => {
    setError(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Upload failed');
      }

      const data = await res.json();
      const baseUrl = API_BASE.replace('/api', '');
      const newUrl = `${baseUrl}${data.url}`;
      onChange([...values, newUrl]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      setError('Please drop image files');
      return;
    }

    // Upload files sequentially
    imageFiles.forEach(file => uploadFile(file));
  }, [accessToken, values]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => uploadFile(file));
  };

  const handleRemove = (index: number) => {
    const newValues = [...values];
    newValues.splice(index, 1);
    onChange(newValues);
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newValues = [...values];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= values.length) return;
    [newValues[index], newValues[newIndex]] = [newValues[newIndex], newValues[index]];
    onChange(newValues);
  };

  return (
    <div className="space-y-3">
      {/* Existing images grid */}
      {values.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {values.map((url, index) => (
            <div key={index} className="relative group aspect-square">
              <img
                src={url}
                alt={`Detail ${index + 1}`}
                className="w-full h-full object-cover rounded-lg border border-stone-200"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => moveImage(index, 'up')}
                    className="p-1.5 bg-white text-stone-700 rounded hover:bg-stone-100"
                    title="Move left"
                  >
                    ←
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600"
                  title="Remove"
                >
                  <X size={14} />
                </button>
                {index < values.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveImage(index, 'down')}
                    className="p-1.5 bg-white text-stone-700 rounded hover:bg-stone-100"
                    title="Move right"
                  >
                    →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-stone-400 bg-stone-50'
            : 'border-stone-300 hover:border-stone-400'
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
              <ImageIcon size={20} className="text-stone-400" />
            </div>
            <p className="text-sm text-stone-600">
              Drag and drop images, or{' '}
              <label className="text-stone-700 font-medium cursor-pointer hover:underline">
                browse
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="sr-only"
                />
              </label>
            </p>
            <p className="text-xs text-stone-400">
              {values.length} image{values.length !== 1 ? 's' : ''} added
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}

export default function FormModal({
  isOpen,
  title,
  fields,
  values,
  onChange,
  onSubmit,
  onClose,
  isLoading,
  submitLabel = 'Save',
}: FormModalProps) {
  if (!isOpen) return null;

  const handleArrayChange = (name: string, index: number, value: string) => {
    const arr = [...(values[name] || [])];
    arr[index] = value;
    onChange(name, arr);
  };

  const addArrayItem = (name: string) => {
    const arr = [...(values[name] || []), ''];
    onChange(name, arr);
  };

  const removeArrayItem = (name: string, index: number) => {
    const arr = [...(values[name] || [])];
    arr.splice(index, 1);
    onChange(name, arr);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg border border-stone-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-lg">
        <div className="flex items-center justify-between p-4 border-b border-stone-100">
          <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>

              {field.type === 'textarea' ? (
                <textarea
                  value={values[field.name] || ''}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  required={field.required}
                  placeholder={field.placeholder}
                  rows={field.rows || 4}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 transition resize-none"
                />
              ) : field.type === 'select' ? (
                <select
                  value={values[field.name] || ''}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  required={field.required}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 transition"
                >
                  <option value="">Select...</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === 'checkboxes' ? (
                <div className="flex flex-wrap gap-3">
                  {field.options?.map((opt) => {
                    const currentValues = (values[field.name] || '').split(',').map((v: string) => v.trim()).filter(Boolean);
                    const isChecked = currentValues.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition ${
                          isChecked
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            let newValues: string[];
                            if (e.target.checked) {
                              newValues = [...currentValues, opt.value];
                            } else {
                              newValues = currentValues.filter((v: string) => v !== opt.value);
                            }
                            onChange(field.name, newValues.join(', '));
                          }}
                          className="sr-only"
                        />
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              ) : field.type === 'array' ? (
                <div className="space-y-2">
                  {(values[field.name] || []).map((item: string, index: number) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => handleArrayChange(field.name, index, e.target.value)}
                        placeholder={field.placeholder}
                        className="flex-1 px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 transition"
                      />
                      <button
                        type="button"
                        onClick={() => removeArrayItem(field.name, index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addArrayItem(field.name)}
                    className="text-sm text-stone-500 hover:text-stone-700"
                  >
                    + Add item
                  </button>
                </div>
              ) : field.type === 'image' ? (
                <ImageUploadField
                  value={values[field.name] || ''}
                  onChange={(url) => onChange(field.name, url)}
                  required={field.required}
                />
              ) : field.type === 'images' ? (
                <MultiImageUploadField
                  values={values[field.name] || []}
                  onChange={(urls) => onChange(field.name, urls)}
                />
              ) : (
                <input
                  type={field.type}
                  value={values[field.name] || ''}
                  onChange={(e) =>
                    onChange(
                      field.name,
                      field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                    )
                  }
                  required={field.required}
                  placeholder={field.placeholder}
                  step={field.type === 'number' ? 'any' : undefined}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 transition"
                />
              )}
            </div>
          ))}
        </form>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-md transition"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={isLoading}
            className="px-4 py-2 text-sm bg-stone-900 text-white rounded-md hover:bg-stone-800 transition disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
