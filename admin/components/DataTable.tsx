import React from 'react';
import { Pencil, Trash2, Plus, Copy, GripVertical, Archive, ArchiveRestore } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  title: string;
  subtitle?: string;
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  onAdd: () => void;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  onDuplicate?: (item: T) => void;
  onArchive?: (item: T) => void;
  isArchived?: (item: T) => boolean;
  getId: (item: T) => string;
  draggable?: boolean;
  onReorder?: (items: T[]) => void;
  addButtonLabel?: string;
  archiveLabel?: string;
  unarchiveLabel?: string;
}

// Sortable row component for drag-and-drop
function SortableRow<T>({
  item,
  columns,
  getId,
  getValue,
  onEdit,
  onDelete,
  onDuplicate,
  onArchive,
  isArchived,
  archiveLabel = 'Archive',
  unarchiveLabel = 'Unarchive',
}: {
  item: T;
  columns: Column<T>[];
  getId: (item: T) => string;
  getValue: (item: T, key: string) => React.ReactNode;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  onDuplicate?: (item: T) => void;
  onArchive?: (item: T) => void;
  isArchived?: (item: T) => boolean;
  archiveLabel?: string;
  unarchiveLabel?: string;
}) {
  const id = getId(item);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'bg-stone-50 shadow-sm' : 'hover:bg-stone-50'}`}
    >
      <td className="px-2 py-3 w-10">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 cursor-grab active:cursor-grabbing hover:bg-stone-100 rounded transition touch-none"
          title="Drag to reorder"
        >
          <GripVertical size={16} className="text-stone-400" />
        </button>
      </td>
      {columns.map((col) => (
        <td key={String(col.key)} className="px-4 py-3 text-sm text-stone-700">
          {col.render ? col.render(item) : getValue(item, String(col.key))}
        </td>
      ))}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {onDuplicate && (
            <button
              onClick={() => onDuplicate(item)}
              className="p-2 text-stone-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
              title="Duplicate"
            >
              <Copy size={16} />
            </button>
          )}
          {onArchive && (
            <button
              onClick={() => onArchive(item)}
              className={`p-2 rounded transition ${
                isArchived?.(item)
                  ? 'text-stone-500 hover:text-green-600 hover:bg-green-50'
                  : 'text-stone-500 hover:text-amber-600 hover:bg-amber-50'
              }`}
              title={isArchived?.(item) ? unarchiveLabel : archiveLabel}
            >
              {isArchived?.(item) ? <ArchiveRestore size={16} /> : <Archive size={16} />}
            </button>
          )}
          <button
            onClick={() => onEdit(item)}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded transition"
            title="Edit"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onDelete(item)}
            className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded transition"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function DataTable<T>({
  title,
  subtitle,
  data,
  columns,
  loading,
  onAdd,
  onEdit,
  onDelete,
  onDuplicate,
  onArchive,
  isArchived,
  getId,
  draggable = false,
  onReorder,
  addButtonLabel = 'Add New',
  archiveLabel = 'Archive',
  unarchiveLabel = 'Unarchive',
}: DataTableProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getValue = (item: T, key: string): React.ReactNode => {
    const keys = key.split('.');
    let value: any = item;
    for (const k of keys) {
      value = value?.[k];
    }
    return value;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && onReorder) {
      const oldIndex = data.findIndex((item) => getId(item) === active.id);
      const newIndex = data.findIndex((item) => getId(item) === over.id);
      const newData = arrayMove(data, oldIndex, newIndex);
      onReorder(newData);
    }
  };

  const renderTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-stone-50/80">
            {draggable && <th className="px-2 py-2.5 w-10"></th>}
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-4 py-2.5 text-left text-[11px] font-medium text-stone-500 uppercase tracking-wider"
              >
                {col.label}
              </th>
            ))}
            <th className="px-4 py-2.5 text-right text-[11px] font-medium text-stone-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {draggable ? (
            <SortableContext
              items={data.map(getId)}
              strategy={verticalListSortingStrategy}
            >
              {data.map((item) => (
                <SortableRow
                  key={getId(item)}
                  item={item}
                  columns={columns}
                  getId={getId}
                  getValue={getValue}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                  onArchive={onArchive}
                  isArchived={isArchived}
                  archiveLabel={archiveLabel}
                  unarchiveLabel={unarchiveLabel}
                />
              ))}
            </SortableContext>
          ) : (
            data.map((item) => (
              <tr key={getId(item)} className={`hover:bg-stone-50 ${isArchived?.(item) ? 'opacity-60' : ''}`}>
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-4 py-3 text-sm text-stone-700">
                    {col.render ? col.render(item) : getValue(item, String(col.key))}
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {onDuplicate && (
                      <button
                        onClick={() => onDuplicate(item)}
                        className="p-2 text-stone-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Duplicate"
                      >
                        <Copy size={16} />
                      </button>
                    )}
                    {onArchive && (
                      <button
                        onClick={() => onArchive(item)}
                        className={`p-2 rounded transition ${
                          isArchived?.(item)
                            ? 'text-stone-500 hover:text-green-600 hover:bg-green-50'
                            : 'text-stone-500 hover:text-amber-600 hover:bg-amber-50'
                        }`}
                        title={isArchived?.(item) ? unarchiveLabel : archiveLabel}
                      >
                        {isArchived?.(item) ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(item)}
                      className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded transition"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(item)}
                      className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="bg-white rounded-lg border border-stone-200">
      <div className="flex items-center justify-between p-4 border-b border-stone-100">
        <div>
          <h2 className="text-lg font-medium text-stone-800">{title}</h2>
          {subtitle && (
            <p className="text-sm text-stone-500 mt-0.5">{subtitle}</p>
          )}
          {draggable && data.length > 1 && (
            <p className="text-xs text-stone-400 mt-0.5">Drag rows to reorder</p>
          )}
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-md hover:bg-stone-800 transition text-sm font-medium"
        >
          <Plus size={18} />
          {addButtonLabel}
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-stone-500">Loading...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-stone-500">No items found</p>
          <button
            onClick={onAdd}
            className="mt-4 text-stone-600 hover:text-stone-900 hover:underline text-sm font-medium"
          >
            Add your first item
          </button>
        </div>
      ) : draggable ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {renderTable()}
        </DndContext>
      ) : (
        renderTable()
      )}
    </div>
  );
}
