import React, { useState, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface AccordionSectionProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export default function AccordionSection({
  title,
  description,
  defaultOpen = false,
  children
}: AccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-stone-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 p-3.5 hover:bg-stone-50 transition-colors text-left"
      >
        <ChevronRight
          size={16}
          className={`text-stone-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-90' : ''
          }`}
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-stone-800">{title}</h3>
          {description && (
            <p className="text-xs text-stone-400 mt-0.5">{description}</p>
          )}
        </div>
      </button>
      <div
        className={`transition-all duration-200 ease-in-out ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="px-4 pb-4 pt-2 space-y-4 border-t border-stone-100">
          {children}
        </div>
      </div>
    </div>
  );
}
