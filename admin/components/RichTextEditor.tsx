import React, { useCallback, useState, useRef } from 'react';
import { useEditor, EditorContent, Editor, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Highlighter,
  Minus,
  Upload,
  X,
  Loader2,
  Maximize2,
  Minimize2,
  Smile,
  ChevronsUpDown,
  Plus,
  MessageSquareQuote,
  Type,
  Video,
  AlertCircle,
  MousePointer,
} from 'lucide-react';
import { API_BASE } from '../config/api';
import { useAuth } from '../context/AuthContext';

// Custom Figure node with resizable image and caption
const ResizableImage = Node.create({
  name: 'resizableImage',
  group: 'block',
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      caption: { default: '' },
      width: { default: '100%' },
      alignment: { default: 'center' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-type="resizable-image"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, alt, caption, width, alignment } = HTMLAttributes;
    const alignStyle = alignment === 'left' ? 'margin-right: auto;' :
                       alignment === 'right' ? 'margin-left: auto;' :
                       'margin-left: auto; margin-right: auto;';

    return [
      'figure',
      {
        'data-type': 'resizable-image',
        style: `width: ${width}; ${alignStyle}`,
        class: 'my-4',
      },
      ['img', { src, alt, style: 'width: 100%; border-radius: 0.5rem;' }],
      caption ? ['figcaption', { class: 'text-center text-sm text-stone-500 mt-2 italic' }, caption] : '',
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});

// React component for the image node view
function ImageNodeView({ node, updateAttributes, selected, deleteNode }: NodeViewProps) {
  const { src, alt, caption, width, alignment } = node.attrs;
  const [showControls, setShowControls] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editCaption, setEditCaption] = useState(caption || '');

  const sizes = ['25%', '50%', '75%', '100%'];
  const alignments = [
    { value: 'left', icon: AlignLeft },
    { value: 'center', icon: AlignCenter },
    { value: 'right', icon: AlignRight },
  ];

  const handleSaveCaption = () => {
    updateAttributes({ caption: editCaption });
    setIsEditing(false);
  };

  return (
    <NodeViewWrapper
      className={`relative my-4 ${selected ? 'ring-2 ring-clay ring-offset-2 rounded-lg' : ''}`}
      style={{
        width,
        marginLeft: alignment === 'right' ? 'auto' : alignment === 'center' ? 'auto' : '0',
        marginRight: alignment === 'left' ? 'auto' : alignment === 'center' ? 'auto' : '0',
      }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => !isEditing && setShowControls(false)}
    >
      {/* Image */}
      <img
        src={src}
        alt={alt || ''}
        className="w-full rounded-lg"
        draggable={false}
      />

      {/* Caption */}
      {isEditing ? (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={editCaption}
            onChange={(e) => setEditCaption(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveCaption();
              if (e.key === 'Escape') {
                setEditCaption(caption || '');
                setIsEditing(false);
              }
            }}
            placeholder="Add a caption..."
            autoFocus
            className="flex-1 px-2 py-1 text-sm border border-stone-300 rounded focus:ring-2 focus:ring-clay outline-none"
          />
          <button
            onClick={handleSaveCaption}
            className="px-3 py-1 text-sm bg-clay text-white rounded hover:bg-clay-dark"
          >
            Save
          </button>
        </div>
      ) : caption ? (
        <p
          className="text-center text-sm text-stone-500 mt-2 italic cursor-pointer hover:text-stone-700"
          onClick={() => setIsEditing(true)}
        >
          {caption}
        </p>
      ) : null}

      {/* Controls overlay */}
      {(showControls || selected) && (
        <div className="absolute top-2 left-2 right-2 flex justify-between">
          {/* Size controls */}
          <div className="flex gap-1 bg-white/95 rounded-lg shadow-lg p-1">
            {sizes.map((size) => (
              <button
                key={size}
                onClick={() => updateAttributes({ width: size })}
                className={`px-2 py-1 text-xs rounded transition ${
                  width === size
                    ? 'bg-clay text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          {/* Alignment & actions */}
          <div className="flex gap-1 bg-white/95 rounded-lg shadow-lg p-1">
            {alignments.map(({ value, icon: Icon }) => (
              <button
                key={value}
                onClick={() => updateAttributes({ alignment: value })}
                className={`p-1.5 rounded transition ${
                  alignment === value
                    ? 'bg-clay text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
                title={`Align ${value}`}
              >
                <Icon size={14} />
              </button>
            ))}
            <div className="w-px bg-stone-200 mx-1" />
            <button
              onClick={() => setIsEditing(true)}
              className="px-2 py-1 text-xs text-stone-600 hover:bg-stone-100 rounded"
              title="Add/edit caption"
            >
              Caption
            </button>
            <button
              onClick={deleteNode}
              className="p-1.5 text-red-500 hover:bg-red-50 rounded"
              title="Remove image"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
}

// Callout box node (tip, warning, note, info)
const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',

  addAttributes() {
    return {
      type: { default: 'info' }, // info, tip, warning, note
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const type = HTMLAttributes.type || 'info';
    const icons: Record<string, string> = { info: '\u2139\uFE0F', tip: '\uD83D\uDCA1', warning: '\u26A0\uFE0F', note: '\uD83D\uDCDD' };
    const colors: Record<string, string> = {
      info: 'border-blue-300 bg-blue-50',
      tip: 'border-emerald-300 bg-emerald-50',
      warning: 'border-amber-300 bg-amber-50',
      note: 'border-stone-300 bg-stone-50',
    };
    return ['div', {
      'data-callout': type,
      class: `callout callout-${type} border-l-4 ${colors[type] || colors.info} p-4 my-4 rounded-r-lg`,
      style: `border-left: 4px solid; padding: 1rem; margin: 1rem 0; border-radius: 0 0.5rem 0.5rem 0;`
    }, ['div', { class: 'callout-content' }, 0]];
  },

  addCommands() {
    return {
      setCallout: (type: string) => ({ commands }) => {
        return commands.wrapIn(this.name, { type });
      },
      toggleCallout: (type: string) => ({ commands, state }) => {
        const { $from } = state.selection;
        const node = $from.node(-1);
        if (node?.type.name === 'callout') {
          return commands.lift(this.name);
        }
        return commands.wrapIn(this.name, { type });
      },
    } as any;
  },
});

// Pull Quote node
const PullQuote = Node.create({
  name: 'pullQuote',
  group: 'block',
  content: 'inline*',

  parseHTML() {
    return [{ tag: 'blockquote[data-pull-quote]' }];
  },

  renderHTML() {
    return ['blockquote', {
      'data-pull-quote': 'true',
      style: 'border: none; font-size: 1.5em; font-style: italic; text-align: center; color: #78716c; padding: 2rem 1rem; margin: 2rem 0; border-top: 2px solid #e7e5e4; border-bottom: 2px solid #e7e5e4; font-family: Georgia, serif;'
    }, 0];
  },

  addCommands() {
    return {
      setPullQuote: () => ({ commands }) => {
        return commands.setNode(this.name);
      },
    } as any;
  },
});

// Button/CTA node
const ButtonCTA = Node.create({
  name: 'buttonCta',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      text: { default: 'Click here' },
      url: { default: '#' },
      style: { default: 'primary' }, // primary, outline
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-button-cta]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { text, url, style: btnStyle } = HTMLAttributes;
    const isPrimary = btnStyle === 'primary';
    return ['div', { 'data-button-cta': 'true', style: 'text-align: center; margin: 1.5rem 0;' },
      ['a', {
        href: url,
        style: `display: inline-block; padding: 0.75rem 2rem; border-radius: 0.375rem; font-weight: 500; text-decoration: none; font-size: 0.875rem; ${
          isPrimary
            ? 'background: #1c1917; color: white;'
            : 'border: 1px solid #1c1917; color: #1c1917;'
        }`
      }, text]
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ButtonCTANodeView);
  },
});

// React component for ButtonCTA node view
function ButtonCTANodeView({ node, updateAttributes, selected, deleteNode }: NodeViewProps) {
  const { text, url, style: btnStyle } = node.attrs;
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const [editUrl, setEditUrl] = useState(url);

  const handleSave = () => {
    updateAttributes({ text: editText, url: editUrl });
    setEditing(false);
  };

  return (
    <NodeViewWrapper className={`my-6 text-center ${selected ? 'ring-2 ring-stone-400 ring-offset-2 rounded-lg p-4' : ''}`}>
      {editing ? (
        <div className="inline-flex flex-col gap-2 p-4 bg-stone-50 rounded-lg border border-stone-200">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Button text..."
            className="px-3 py-1.5 text-sm border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          <input
            type="text"
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            placeholder="URL..."
            className="px-3 py-1.5 text-sm border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => updateAttributes({ style: btnStyle === 'primary' ? 'outline' : 'primary' })}
              className="px-3 py-1 text-xs border border-stone-200 rounded-md hover:bg-stone-100"
            >
              {btnStyle === 'primary' ? 'Switch to Outline' : 'Switch to Primary'}
            </button>
            <button onClick={handleSave} className="px-3 py-1 text-xs bg-stone-900 text-white rounded-md">Save</button>
            <button onClick={deleteNode} className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded-md hover:bg-red-50">Delete</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className={`inline-block px-8 py-3 rounded-md font-medium text-sm transition cursor-pointer ${
            btnStyle === 'primary'
              ? 'bg-stone-900 text-white hover:bg-stone-800'
              : 'border border-stone-900 text-stone-900 hover:bg-stone-50'
          }`}
        >
          {text}
        </button>
      )}
    </NodeViewWrapper>
  );
}

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  onClick,
  isActive,
  disabled,
  title,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-2 rounded transition-colors ${
      isActive
        ? 'bg-clay text-white'
        : disabled
        ? 'text-stone-300 cursor-not-allowed'
        : 'text-stone-600 hover:bg-stone-100'
    }`}
  >
    {children}
  </button>
);

const ToolbarDivider = () => (
  <div className="w-px h-6 bg-stone-200 mx-1" />
);

interface FontSizeDropdownProps {
  editor: Editor;
}

const FontSizeDropdown: React.FC<FontSizeDropdownProps> = ({ editor }) => {
  const sizes = [
    { label: 'Small', value: '0.875em' },
    { label: 'Normal', value: '1em' },
    { label: 'Large', value: '1.25em' },
    { label: 'X-Large', value: '1.5em' },
    { label: 'Huge', value: '2em' },
  ];

  const getCurrentSize = () => {
    const style = editor.getAttributes('textStyle').fontSize;
    const found = sizes.find(s => s.value === style);
    return found?.label || 'Normal';
  };

  return (
    <select
      value={getCurrentSize()}
      onChange={(e) => {
        const size = sizes.find(s => s.label === e.target.value);
        if (size) {
          if (size.value === '1em') {
            editor.chain().focus().unsetMark('textStyle').run();
          } else {
            editor.chain().focus().setMark('textStyle', { fontSize: size.value }).run();
          }
        }
      }}
      className="px-2 py-1.5 text-sm border border-stone-300 rounded bg-white hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-clay"
      title="Font Size"
    >
      {sizes.map((size) => (
        <option key={size.value} value={size.label}>
          {size.label}
        </option>
      ))}
    </select>
  );
};

// Custom extension to support fontSize in TextStyle
const CustomTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: element => element.style.fontSize || null,
        renderHTML: attributes => {
          if (!attributes.fontSize) return {};
          return { style: `font-size: ${attributes.fontSize}` };
        },
      },
    };
  },
});

// Line Height extension for paragraphs and headings
import { Extension } from '@tiptap/core';

const LineHeight = Extension.create({
  name: 'lineHeight',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      defaultLineHeight: null,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: this.options.defaultLineHeight,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ commands }) => {
          return this.options.types.every((type: string) =>
            commands.updateAttributes(type, { lineHeight })
          );
        },
      unsetLineHeight:
        () =>
        ({ commands }) => {
          return this.options.types.every((type: string) =>
            commands.resetAttributes(type, 'lineHeight')
          );
        },
    } as any;
  },
});

// Line Height Dropdown
interface LineHeightDropdownProps {
  editor: Editor;
}

const LineHeightDropdown: React.FC<LineHeightDropdownProps> = ({ editor }) => {
  const options = [
    { label: 'Tight', value: '1.2' },
    { label: 'Normal', value: '1.5' },
    { label: 'Relaxed', value: '1.8' },
    { label: 'Loose', value: '2' },
    { label: 'Double', value: '2.5' },
  ];

  const getCurrentValue = () => {
    const attrs = editor.getAttributes('paragraph');
    return attrs.lineHeight || '1.5';
  };

  const currentLabel = options.find(o => o.value === getCurrentValue())?.label || 'Normal';

  return (
    <select
      value={currentLabel}
      onChange={(e) => {
        const option = options.find(o => o.label === e.target.value);
        if (option) {
          if (option.value === '1.5') {
            (editor.commands as any).unsetLineHeight();
          } else {
            (editor.commands as any).setLineHeight(option.value);
          }
          editor.commands.focus();
        }
      }}
      className="px-2 py-1.5 text-sm border border-stone-300 rounded bg-white hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-clay"
      title="Line Spacing"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.label}>
          ↕ {opt.label}
        </option>
      ))}
    </select>
  );
};

// Emoji Picker
const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😊', '🥰', '😍', '🤩', '😘', '😜', '🤗', '🤔', '😎', '🥳', '😇', '🤓', '😱', '😂', '🥺', '😤', '🫶', '🙌', '👏', '✌️'],
  },
  {
    label: 'Nature',
    emojis: ['🌸', '🌺', '🌻', '🌷', '🌹', '🍀', '🌿', '🌱', '🌳', '🌈', '☀️', '⭐', '🌙', '🔥', '💧', '🌊', '🦋', '🐝', '🐦', '🌎'],
  },
  {
    label: 'Objects',
    emojis: ['💡', '🎨', '✏️', '📝', '📖', '🎯', '💎', '🏆', '🎉', '🎁', '🔑', '💌', '📌', '🧩', '🪄', '✨', '💫', '🫧', '🎵', '📸'],
  },
  {
    label: 'Symbols',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💪', '👉', '👈', '☝️', '✅', '❌', '⚡', '💥', '🌟', '➡️', '⬇️'],
  },
  {
    label: 'Hands',
    emojis: ['👋', '🤚', '✋', '🖐️', '👌', '🤌', '✊', '👊', '🤞', '🫰', '🤟', '🤘', '👍', '👎', '👆', '👇', '☝️', '🫵', '💅', '🙏'],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const filteredEmojis = search
    ? EMOJI_CATEGORIES.flatMap(c => c.emojis)
    : EMOJI_CATEGORIES[activeCategory].emojis;

  return (
    <div ref={ref} className="w-72 bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden">
      {/* Search */}
      <div className="p-2 border-b border-stone-100">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emojis..."
          className="w-full px-2.5 py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-clay/30"
          autoFocus
        />
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="flex border-b border-stone-100 px-1">
          {EMOJI_CATEGORIES.map((cat, i) => (
            <button
              key={cat.label}
              onClick={() => setActiveCategory(i)}
              className={`flex-1 py-1.5 text-xs transition ${
                activeCategory === i
                  ? 'text-clay border-b-2 border-clay font-medium'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="p-2 grid grid-cols-8 gap-0.5 max-h-48 overflow-y-auto">
        {filteredEmojis.map((emoji, i) => (
          <button
            key={`${emoji}-${i}`}
            onClick={() => onSelect(emoji)}
            className="p-1.5 text-xl hover:bg-stone-100 rounded-lg transition"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// Image Upload Modal Component
interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (src: string, caption?: string) => void;
}

function ImageUploadModal({ isOpen, onClose, onInsert }: ImageUploadModalProps) {
  const { accessToken } = useAuth();
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setUrl('');
    setCaption('');
    setPreviewUrl(null);
    setError(null);
    setMode('upload');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

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
      const fullUrl = `${baseUrl}${data.url}`;
      setPreviewUrl(fullUrl);
      setUrl(fullUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      uploadFile(file);
    } else {
      setError('Please drop an image file');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleInsert = () => {
    if (url) {
      onInsert(url, caption || undefined);
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <h3 className="text-lg font-medium text-stone-800">Insert Image</h3>
          <button onClick={handleClose} className="p-2 hover:bg-stone-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200">
          <button
            onClick={() => setMode('upload')}
            className={`flex-1 py-3 text-sm font-medium transition ${
              mode === 'upload'
                ? 'text-clay border-b-2 border-clay'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            Upload
          </button>
          <button
            onClick={() => setMode('url')}
            className={`flex-1 py-3 text-sm font-medium transition ${
              mode === 'url'
                ? 'text-clay border-b-2 border-clay'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            From URL
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {mode === 'upload' && !previewUrl && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-clay bg-clay/5'
                  : 'border-stone-300 hover:border-stone-400'
              }`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={32} className="text-clay animate-spin" />
                  <p className="text-sm text-stone-500">Uploading...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 bg-stone-100 rounded-full">
                    <Upload size={28} className="text-stone-400" />
                  </div>
                  <div>
                    <p className="text-stone-600">
                      Drag and drop an image, or{' '}
                      <label className="text-clay cursor-pointer hover:underline">
                        browse
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="sr-only"
                        />
                      </label>
                    </p>
                    <p className="text-xs text-stone-400 mt-1">PNG, JPG, GIF, WEBP up to 5MB</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'upload' && previewUrl && (
            <div className="space-y-3">
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <button
                  onClick={() => {
                    setPreviewUrl(null);
                    setUrl('');
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {mode === 'url' && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Image URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setPreviewUrl(e.target.value);
                }}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-clay focus:border-transparent outline-none"
              />
              {url && (
                <div className="mt-3">
                  <img
                    src={url}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded-lg"
                    onError={() => setError('Failed to load image')}
                  />
                </div>
              )}
            </div>
          )}

          {/* Caption input - shown when we have a URL */}
          {(previewUrl || (mode === 'url' && url)) && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Caption <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption for this image..."
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-clay focus:border-transparent outline-none"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-stone-200 bg-stone-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            disabled={!url}
            className="px-4 py-2 bg-clay text-white rounded-lg hover:bg-clay-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Insert Image
          </button>
        </div>
      </div>
    </div>
  );
}

// Block Insert Dropdown
function BlockInsertMenu({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const blocks = [
    { label: 'Callout - Info', icon: '\u2139\uFE0F', action: () => (editor.commands as any).toggleCallout('info') },
    { label: 'Callout - Tip', icon: '\uD83D\uDCA1', action: () => (editor.commands as any).toggleCallout('tip') },
    { label: 'Callout - Warning', icon: '\u26A0\uFE0F', action: () => (editor.commands as any).toggleCallout('warning') },
    { label: 'Callout - Note', icon: '\uD83D\uDCDD', action: () => (editor.commands as any).toggleCallout('note') },
    { label: 'Pull Quote', icon: '\u275D', action: () => (editor.commands as any).setPullQuote() },
    { label: 'YouTube Video', icon: '\u25B6', action: () => {
      const url = window.prompt('Enter YouTube URL:');
      if (url) editor.commands.setYoutubeVideo({ src: url });
    }},
    { label: 'Button / CTA', icon: '\uD83D\uDD18', action: () => {
      editor.chain().focus().insertContent({ type: 'buttonCta', attrs: { text: 'Click here', url: '#', style: 'primary' } }).run();
    }},
  ];

  return (
    <div className="relative" ref={ref}>
      <ToolbarButton onClick={() => setOpen(!open)} isActive={open} title="Insert Block">
        <Plus size={18} />
      </ToolbarButton>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-lg shadow-xl border border-stone-200 py-1 w-52">
            {blocks.map((block) => (
              <button
                key={block.label}
                onClick={() => { block.action(); setOpen(false); editor.commands.focus(); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50 flex items-center gap-2 transition"
              >
                <span className="text-base w-6 text-center">{block.icon}</span>
                {block.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  minHeight = '300px',
}: RichTextEditorProps) {
  const { accessToken } = useAuth();
  const [showImageModal, setShowImageModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploadingInline, setIsUploadingInline] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-clay underline',
        },
      }),
      ResizableImage,
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Highlight.configure({
        multicolor: false,
      }),
      CustomTextStyle,
      LineHeight,
      Callout,
      PullQuote,
      ButtonCTA,
      Youtube.configure({
        controls: false,
        nocookie: true,
        modestBranding: true,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: `prose prose-stone max-w-none focus:outline-none p-4`,
        style: `min-height: ${minHeight}`,
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer?.files.length) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            uploadAndInsertImage(file);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (const item of items) {
            if (item.type.startsWith('image/')) {
              const file = item.getAsFile();
              if (file) {
                event.preventDefault();
                uploadAndInsertImage(file);
                return true;
              }
            }
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const uploadAndInsertImage = async (file: File) => {
    if (!editor) return;

    setIsUploadingInline(true);

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
        throw new Error('Upload failed');
      }

      const data = await res.json();
      const baseUrl = API_BASE.replace('/api', '');
      const fullUrl = `${baseUrl}${data.url}`;

      editor.chain().focus().insertContent({
        type: 'resizableImage',
        attrs: {
          src: fullUrl,
          width: '100%',
          alignment: 'center',
        },
      }).run();
    } catch (err) {
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingInline(false);
    }
  };

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl || 'https://');

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const handleInsertImage = (src: string, caption?: string) => {
    if (!editor) return;

    editor.chain().focus().insertContent({
      type: 'resizableImage',
      attrs: {
        src,
        caption: caption || '',
        width: '100%',
        alignment: 'center',
      },
    }).run();
  };

  if (!editor) {
    return (
      <div className="border border-stone-300 rounded-lg p-4 min-h-[200px] flex items-center justify-center">
        <div className="text-stone-400">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="border border-stone-300 rounded-lg overflow-hidden bg-white" ref={editorRef}>
      {/* Toolbar */}
      <div className="border-b border-stone-200 bg-stone-50 p-2 flex flex-wrap items-center gap-1">
        {/* Text Style */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold (Ctrl+B)"
        >
          <Bold size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic (Ctrl+I)"
        >
          <Italic size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive('highlight')}
          title="Highlight"
        >
          <Highlighter size={18} />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Font Size */}
        <FontSizeDropdown editor={editor} />

        <ToolbarDivider />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 size={18} />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered size={18} />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Align Left"
        >
          <AlignLeft size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Align Center"
        >
          <AlignCenter size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Align Right"
        >
          <AlignRight size={18} />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Quote */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Quote / Indent"
        >
          <Quote size={18} />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Links & Images */}
        <ToolbarButton
          onClick={setLink}
          isActive={editor.isActive('link')}
          title="Add Link"
        >
          <LinkIcon size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => setShowImageModal(true)}
          title="Add Image"
        >
          <ImageIcon size={18} />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Horizontal Rule */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Line"
        >
          <Minus size={18} />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Block Insert Menu */}
        <BlockInsertMenu editor={editor} />

        <ToolbarDivider />

        {/* Emoji Picker */}
        <div className="relative" ref={emojiButtonRef}>
          <ToolbarButton
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            isActive={showEmojiPicker}
            title="Insert Emoji"
          >
            <Smile size={18} />
          </ToolbarButton>
          {showEmojiPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
              <div className="absolute top-full left-0 mt-1 z-50">
                <EmojiPicker
                  onSelect={(emoji) => {
                    editor.chain().focus().insertContent(emoji).run();
                    setShowEmojiPicker(false);
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* Line Spacing */}
        <LineHeightDropdown editor={editor} />

        <div className="flex-1" />

        {/* Upload indicator */}
        {isUploadingInline && (
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <Loader2 size={16} className="animate-spin" />
            Uploading...
          </div>
        )}

        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (Ctrl+Z)"
        >
          <Undo size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (Ctrl+Y)"
        >
          <Redo size={18} />
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Footer */}
      <div className="border-t border-stone-200 bg-stone-50 px-4 py-2 text-xs text-stone-500 flex justify-between">
        <span>Drag and drop images directly into the editor</span>
        <span>{editor.getText().split(/\s+/).filter(Boolean).length} words</span>
      </div>

      {/* Image Upload Modal */}
      <ImageUploadModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onInsert={handleInsertImage}
      />
    </div>
  );
}

export { useEditor };
