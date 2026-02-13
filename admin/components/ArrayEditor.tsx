import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface ArrayEditorProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}

export function StringArrayEditor({ label, items, onChange, placeholder = 'Enter item...' }: ArrayEditorProps) {
  const addItem = () => {
    onChange([...items, '']);
  };

  const updateItem = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-stone-700">{label}</label>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <GripVertical size={16} className="text-stone-300 cursor-move" />
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-clay focus:border-transparent outline-none text-sm"
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="p-2 text-stone-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addItem}
        className="flex items-center gap-2 text-sm text-clay hover:text-clay-dark transition-colors"
      >
        <Plus size={16} />
        Add Item
      </button>
    </div>
  );
}

interface ObjectArrayEditorProps<T> {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, index: number, updateItem: (updates: Partial<T>) => void) => React.ReactNode;
  createItem: () => T;
  addLabel?: string;
}

export function ObjectArrayEditor<T>({
  label,
  items,
  onChange,
  renderItem,
  createItem,
  addLabel = 'Add Item'
}: ObjectArrayEditorProps<T>) {
  const addItem = () => {
    onChange([...items, createItem()]);
  };

  const updateItem = (index: number, updates: Partial<T>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-stone-700">{label}</label>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="relative border border-stone-200 rounded-lg p-4 bg-stone-50">
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="absolute top-2 right-2 p-1 text-stone-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
            {renderItem(item, index, (updates) => updateItem(index, updates))}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addItem}
        className="flex items-center gap-2 text-sm text-clay hover:text-clay-dark transition-colors"
      >
        <Plus size={16} />
        {addLabel}
      </button>
    </div>
  );
}

// Specialized editor for key-value stats
interface StatItem {
  value: string;
  label: string;
}

interface StatArrayEditorProps {
  label: string;
  items: StatItem[];
  onChange: (items: StatItem[]) => void;
}

export function StatArrayEditor({ label, items, onChange }: StatArrayEditorProps) {
  return (
    <ObjectArrayEditor
      label={label}
      items={items}
      onChange={onChange}
      createItem={() => ({ value: '', label: '' })}
      addLabel="Add Stat"
      renderItem={(item, _, updateItem) => (
        <div className="grid grid-cols-2 gap-3 pr-6">
          <div>
            <label className="block text-xs text-stone-500 mb-1">Value</label>
            <input
              type="text"
              value={item.value}
              onChange={(e) => updateItem({ value: e.target.value })}
              placeholder="e.g., 20+"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-clay focus:border-transparent outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">Label</label>
            <input
              type="text"
              value={item.label}
              onChange={(e) => updateItem({ label: e.target.value })}
              placeholder="e.g., Years Experience"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-clay focus:border-transparent outline-none text-sm"
            />
          </div>
        </div>
      )}
    />
  );
}

// Specialized editor for links
interface LinkItem {
  label: string;
  url: string;
}

interface LinkArrayEditorProps {
  label: string;
  items: LinkItem[];
  onChange: (items: LinkItem[]) => void;
}

export function LinkArrayEditor({ label, items, onChange }: LinkArrayEditorProps) {
  return (
    <ObjectArrayEditor
      label={label}
      items={items}
      onChange={onChange}
      createItem={() => ({ label: '', url: '' })}
      addLabel="Add Link"
      renderItem={(item, _, updateItem) => (
        <div className="grid grid-cols-2 gap-3 pr-6">
          <div>
            <label className="block text-xs text-stone-500 mb-1">Label</label>
            <input
              type="text"
              value={item.label}
              onChange={(e) => updateItem({ label: e.target.value })}
              placeholder="Link text"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-clay focus:border-transparent outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">URL</label>
            <input
              type="text"
              value={item.url}
              onChange={(e) => updateItem({ url: e.target.value })}
              placeholder="/page-url"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-clay focus:border-transparent outline-none text-sm"
            />
          </div>
        </div>
      )}
    />
  );
}
