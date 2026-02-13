import React from 'react';
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
import { GripVertical } from 'lucide-react';

interface DraggableListProps<T extends { id: string }> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T) => string;
}

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

function SortableItem({ id, children }: SortableItemProps) {
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
    position: isDragging ? 'relative' as const : 'static' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-stretch bg-white border border-stone-200 rounded-lg overflow-hidden transition-shadow ${
        isDragging ? 'shadow-lg ring-2 ring-clay/30' : 'hover:shadow-sm'
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex items-center px-2 bg-stone-50 border-r border-stone-200 cursor-grab active:cursor-grabbing hover:bg-stone-100 transition touch-none"
        title="Drag to reorder"
      >
        <GripVertical size={16} className="text-stone-400" />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export default function DraggableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  keyExtractor = (item) => item.id,
}: DraggableListProps<T>) {
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => keyExtractor(item) === active.id);
      const newIndex = items.findIndex((item) => keyExtractor(item) === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      onReorder(newItems);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map(keyExtractor)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {items.map((item, index) => (
            <SortableItem key={keyExtractor(item)} id={keyExtractor(item)}>
              {renderItem(item, index)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// Simple version for table rows
interface DraggableTableProps<T extends { id: string }> {
  items: T[];
  onReorder: (items: T[]) => void;
  columns: {
    header: string;
    accessor: keyof T | ((item: T) => React.ReactNode);
    className?: string;
  }[];
  onRowClick?: (item: T) => void;
  keyExtractor?: (item: T) => string;
}

function SortableTableRow<T extends { id: string }>({
  id,
  item,
  columns,
  onRowClick,
}: {
  id: string;
  item: T;
  columns: DraggableTableProps<T>['columns'];
  onRowClick?: (item: T) => void;
}) {
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
      className={`${isDragging ? 'bg-clay/5 shadow-lg' : 'hover:bg-stone-50'} ${
        onRowClick ? 'cursor-pointer' : ''
      }`}
      onClick={() => onRowClick?.(item)}
    >
      <td className="px-2 py-3 w-10">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 cursor-grab active:cursor-grabbing hover:bg-stone-100 rounded transition touch-none"
          title="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={16} className="text-stone-400" />
        </button>
      </td>
      {columns.map((col, colIndex) => (
        <td
          key={colIndex}
          className={`px-4 py-3 ${col.className || ''}`}
        >
          {typeof col.accessor === 'function'
            ? col.accessor(item)
            : String(item[col.accessor] ?? '')}
        </td>
      ))}
    </tr>
  );
}

export function DraggableTable<T extends { id: string }>({
  items,
  onReorder,
  columns,
  onRowClick,
  keyExtractor = (item) => item.id,
}: DraggableTableProps<T>) {
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => keyExtractor(item) === active.id);
      const newIndex = items.findIndex((item) => keyExtractor(item) === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      onReorder(newItems);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map(keyExtractor)}
        strategy={verticalListSortingStrategy}
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-200">
              <th className="px-2 py-3 w-10"></th>
              {columns.map((col, index) => (
                <th
                  key={index}
                  className={`px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {items.map((item) => (
              <SortableTableRow
                key={keyExtractor(item)}
                id={keyExtractor(item)}
                item={item}
                columns={columns}
                onRowClick={onRowClick}
              />
            ))}
          </tbody>
        </table>
      </SortableContext>
    </DndContext>
  );
}
