import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface HelpTooltipProps {
  content: string;
  title?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md';
}

export default function HelpTooltip({
  content,
  title,
  position = 'top',
  size = 'sm',
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-stone-700 border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-stone-700 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-stone-700 border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-stone-700 border-y-transparent border-l-transparent',
  };

  const iconSize = size === 'sm' ? 14 : 16;

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className={`text-stone-400 hover:text-stone-600 transition ${
          size === 'sm' ? 'p-0.5' : 'p-1'
        }`}
        aria-label="Help"
      >
        <HelpCircle size={iconSize} />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 ${positionClasses[position]} w-64`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-stone-700 text-white text-sm rounded-lg shadow-lg p-3">
            {title && (
              <div className="font-medium mb-1">{title}</div>
            )}
            <div className="text-stone-200 leading-relaxed">{content}</div>
          </div>
          {/* Arrow */}
          <div
            className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`}
          />
        </div>
      )}
    </div>
  );
}

// Inline help with label
interface FieldHelpProps {
  label: string;
  help: string;
  htmlFor?: string;
  required?: boolean;
}

export function FieldLabel({ label, help, htmlFor, required }: FieldHelpProps) {
  return (
    <div className="flex items-center gap-1 mb-1">
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-stone-700"
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <HelpTooltip content={help} />
    </div>
  );
}
