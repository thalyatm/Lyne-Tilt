import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { BubbleMenu } from '@tiptap/extension-bubble-menu';
import { MergeTagNode, MERGE_TAGS } from './MergeTagExtension';
import {
  GripVertical,
  X,
  Copy,
  Type,
  Image as ImageIcon,
  MousePointerClick,
  ShoppingBag,
  Minus,
  ArrowUpDown,
  Columns2,
  LayoutTemplate,
  ChevronRight,
  Sparkles,
  FileText,
  Megaphone,
  BookOpen,
  MessageSquareQuote,
  Plus,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  Eye,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  Quote,
  Palette,
  Highlighter,
  RemoveFormatting,
  ChevronDown as ChevronDownIcon,
  Tag,
  Search,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  Bookmark,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface EmailBlock {
  id: string;
  type: 'header' | 'richtext' | 'image' | 'cta' | 'product' | 'testimonial' | 'divider' | 'spacer' | 'twocolumn';
  props: Record<string, any>;
}

export interface EmailSnippet {
  id: string;
  name: string;
  category: string;
  blocks: EmailBlock[];
  createdAt: string;
  updatedAt: string;
}

export interface BlockBuilderProps {
  blocks: EmailBlock[];
  onChange: (blocks: EmailBlock[]) => void;
  onGenerateHtml: () => string;
  apiBase?: string;
  accessToken?: string;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const BRAND_CLAY = '#8d3038';
const BRAND_STONE_50 = '#fafaf9';
const BRAND_STONE_100 = '#f5f5f4';
const BRAND_STONE_200 = '#e7e5e4';
const BRAND_STONE_300 = '#d6d3d1';
const BRAND_STONE_400 = '#a8a29e';
const BRAND_STONE_500 = '#78716c';
const BRAND_STONE_700 = '#44403c';
const BRAND_STONE_900 = '#22292c';

type BlockType = EmailBlock['type'];

interface BlockMeta {
  type: BlockType;
  label: string;
  icon: React.ElementType;
  defaultProps: Record<string, any>;
}

const BLOCK_DEFINITIONS: BlockMeta[] = [
  {
    type: 'header',
    label: 'Header',
    icon: LayoutTemplate,
    defaultProps: {
      brandName: 'LYNE TILT',
      tagline: 'Wearable Art & Creative Coaching',
      bgColor: '#ffffff',
      textColor: BRAND_STONE_900,
    },
  },
  {
    type: 'richtext',
    label: 'Rich Text',
    icon: Type,
    defaultProps: {
      html: '<p>Write your content here...</p>',
    },
  },
  {
    type: 'image',
    label: 'Image',
    icon: ImageIcon,
    defaultProps: {
      src: '',
      alt: '',
      caption: '',
      linkUrl: '',
      width: '100%' as const,
      borderRadius: 8,
    },
  },
  {
    type: 'cta',
    label: 'CTA Button',
    icon: MousePointerClick,
    defaultProps: {
      text: 'Shop Now',
      url: 'https://',
      bgColor: BRAND_CLAY,
      textColor: '#ffffff',
      borderRadius: 6,
      alignment: 'center' as const,
    },
  },
  {
    type: 'product',
    label: 'Product',
    icon: ShoppingBag,
    defaultProps: {
      productId: '',
      productName: 'Product Name',
      productPrice: '$0.00',
      productImage: '',
      productUrl: '',
    },
  },
  {
    type: 'testimonial',
    label: 'Testimonial',
    icon: MessageSquareQuote,
    defaultProps: {
      quote: 'This is an amazing experience!',
      author: 'Happy Customer',
      role: '',
      style: 'default' as const,
    },
  },
  {
    type: 'divider',
    label: 'Divider',
    icon: Minus,
    defaultProps: {
      color: BRAND_STONE_300,
      thickness: 1,
      width: 100,
      margin: 20,
    },
  },
  {
    type: 'spacer',
    label: 'Spacer',
    icon: ArrowUpDown,
    defaultProps: {
      height: 32,
    },
  },
  {
    type: 'twocolumn',
    label: 'Two Column',
    icon: Columns2,
    defaultProps: {
      leftHtml: '<p>Left column content</p>',
      rightHtml: '<p>Right column content</p>',
      ratio: '50-50' as const,
    },
  },
];

const SNIPPET_CATEGORIES = ['Headers', 'Content', 'CTAs', 'Footers', 'Signatures'];

function getBlockMeta(type: BlockType): BlockMeta {
  return BLOCK_DEFINITIONS.find((b) => b.type === type) || BLOCK_DEFINITIONS[0];
}

let idCounter = 0;
function generateBlockId(): string {
  idCounter += 1;
  return `block-${Date.now()}-${idCounter}`;
}

function createBlock(type: BlockType): EmailBlock {
  const meta = getBlockMeta(type);
  return {
    id: generateBlockId(),
    type,
    props: { ...meta.defaultProps },
  };
}

// ─────────────────────────────────────────────
// Template Definitions
// ─────────────────────────────────────────────

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  blocks: () => EmailBlock[];
}

const TEMPLATES: EmailTemplate[] = [
  {
    id: 'product-launch',
    name: 'Product Launch',
    description: 'Announce a new product with hero image and CTA',
    icon: ShoppingBag,
    blocks: () => [
      { id: generateBlockId(), type: 'header', props: { brandName: 'LYNE TILT', tagline: 'Wearable Art & Creative Coaching', bgColor: '#ffffff', textColor: BRAND_STONE_900 } },
      { id: generateBlockId(), type: 'image', props: { src: '', alt: 'New product hero', caption: '', linkUrl: '', width: '100%', borderRadius: 0 } },
      { id: generateBlockId(), type: 'richtext', props: { html: '<h2>Introducing Our Latest Creation</h2><p>We are thrilled to share our newest piece with you. Each item is handcrafted with care and attention to detail.</p>' } },
      { id: generateBlockId(), type: 'product', props: { productId: '', productName: 'New Arrival', productPrice: '$89.00', productImage: '', productUrl: '' } },
      { id: generateBlockId(), type: 'cta', props: { text: 'Shop Now', url: 'https://', bgColor: BRAND_CLAY, textColor: '#ffffff', borderRadius: 6, alignment: 'center' } },
      { id: generateBlockId(), type: 'divider', props: { color: BRAND_STONE_200, thickness: 1, width: 100, margin: 24 } },
      { id: generateBlockId(), type: 'richtext', props: { html: '<p style="text-align:center;font-size:13px;color:#78716c;">Thank you for being part of our creative community.</p>' } },
    ],
  },
  {
    id: 'weekly-digest',
    name: 'Weekly Digest',
    description: 'Multi-section newsletter with curated content',
    icon: BookOpen,
    blocks: () => [
      { id: generateBlockId(), type: 'header', props: { brandName: 'LYNE TILT', tagline: 'Weekly Digest', bgColor: '#ffffff', textColor: BRAND_STONE_900 } },
      { id: generateBlockId(), type: 'richtext', props: { html: '<h2>This Week at Lyne Tilt</h2><p>Here is what has been happening in our studio this week. From new designs to creative insights, we have plenty to share.</p>' } },
      { id: generateBlockId(), type: 'divider', props: { color: BRAND_STONE_200, thickness: 1, width: 60, margin: 16 } },
      { id: generateBlockId(), type: 'richtext', props: { html: '<h3>Studio Update</h3><p>We have been experimenting with new materials and techniques. Stay tuned for exciting new pieces coming soon.</p>' } },
      { id: generateBlockId(), type: 'divider', props: { color: BRAND_STONE_200, thickness: 1, width: 60, margin: 16 } },
      { id: generateBlockId(), type: 'richtext', props: { html: '<h3>Creative Tip</h3><p>Finding your creative voice takes practice. Start with what excites you and let curiosity guide the way.</p>' } },
      { id: generateBlockId(), type: 'cta', props: { text: 'Read More on the Blog', url: 'https://', bgColor: BRAND_CLAY, textColor: '#ffffff', borderRadius: 6, alignment: 'center' } },
    ],
  },
  {
    id: 'coaching-update',
    name: 'Coaching Update',
    description: 'Share coaching news with a testimonial',
    icon: Sparkles,
    blocks: () => [
      { id: generateBlockId(), type: 'header', props: { brandName: 'LYNE TILT', tagline: 'Creative Coaching', bgColor: '#ffffff', textColor: BRAND_STONE_900 } },
      { id: generateBlockId(), type: 'richtext', props: { html: '<h2>Unlock Your Creative Potential</h2><p>Our coaching sessions are designed to help you discover your unique artistic voice. Whether you are a beginner or an experienced maker, there is always more to explore.</p>' } },
      { id: generateBlockId(), type: 'testimonial', props: { quote: 'Working with Lyne completely transformed my approach to art. I now create with confidence and joy.', author: 'Sarah M.', role: 'Coaching Client', style: 'bordered' } },
      { id: generateBlockId(), type: 'cta', props: { text: 'Book a Session', url: 'https://', bgColor: BRAND_CLAY, textColor: '#ffffff', borderRadius: 6, alignment: 'center' } },
    ],
  },
  {
    id: 'announcement',
    name: 'Announcement',
    description: 'Simple centered announcement with CTA',
    icon: Megaphone,
    blocks: () => [
      { id: generateBlockId(), type: 'header', props: { brandName: 'LYNE TILT', tagline: 'Wearable Art & Creative Coaching', bgColor: '#ffffff', textColor: BRAND_STONE_900 } },
      { id: generateBlockId(), type: 'richtext', props: { html: '<h2 style="text-align:center;">Something Special is Coming</h2><p style="text-align:center;">We have an exciting announcement to share with you. Mark your calendar and stay tuned for what is next.</p>' } },
      { id: generateBlockId(), type: 'cta', props: { text: 'Learn More', url: 'https://', bgColor: BRAND_CLAY, textColor: '#ffffff', borderRadius: 6, alignment: 'center' } },
    ],
  },
  {
    id: 'blank',
    name: 'Blank',
    description: 'Start with just a header and text block',
    icon: FileText,
    blocks: () => [
      { id: generateBlockId(), type: 'header', props: { brandName: 'LYNE TILT', tagline: 'Wearable Art & Creative Coaching', bgColor: '#ffffff', textColor: BRAND_STONE_900 } },
      { id: generateBlockId(), type: 'richtext', props: { html: '<p>Start writing your email here...</p>' } },
    ],
  },
];

// ─────────────────────────────────────────────
// Mini TipTap Editor for Rich Text blocks
// ─────────────────────────────────────────────

interface MiniEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  onInsertBlock?: (type: BlockType) => void;
}

function MiniTipTapEditor({ content, onChange, placeholder = 'Write here...', minHeight = '120px', onInsertBlock }: MiniEditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showMergeTagDropdown, setShowMergeTagDropdown] = useState(false);
  const [customColor, setCustomColor] = useState('#000000');

  // Slash command state
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashMenuPos, setSlashMenuPos] = useState({ top: 0, left: 0 });
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const slashMenuRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Slash command items: block types + merge tags
  const slashItems = useMemo(() => {
    const blockItems = BLOCK_DEFINITIONS.map((meta) => ({
      id: `block-${meta.type}`,
      label: meta.label,
      description: `Add ${meta.label.toLowerCase()} block`,
      icon: meta.icon,
      category: 'Blocks' as const,
      action: 'block' as const,
      blockType: meta.type,
    }));
    const tagItems = MERGE_TAGS.map((tag) => ({
      id: `tag-${tag.id}`,
      label: tag.label,
      description: tag.placeholder,
      icon: Tag,
      category: 'Personalization' as const,
      action: 'tag' as const,
      tagId: tag.id,
    }));
    return [...blockItems, ...tagItems];
  }, []);

  const filteredSlashItems = useMemo(() => {
    if (!slashQuery) return slashItems;
    const q = slashQuery.toLowerCase();
    return slashItems.filter(
      (item) => item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
    );
  }, [slashItems, slashQuery]);

  const closeSlashMenu = useCallback(() => {
    setSlashMenuOpen(false);
    setSlashQuery('');
    setSlashSelectedIndex(0);
  }, []);

  // Ref to hold the slash select handler so handleKeyDown can call it without circular dependency
  const slashSelectRef = useRef<(item: typeof slashItems[number]) => void>(() => {});

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-clay underline' },
      }),
      Underline,
      Placeholder.configure({ placeholder }),
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      MergeTagNode,
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-stone prose-sm max-w-none focus:outline-none p-3',
        style: `min-height: ${minHeight}`,
      },
      handleKeyDown: (_view, event) => {
        if (!slashMenuOpen) return false;
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSlashSelectedIndex((prev) => (prev + 1) % Math.max(filteredSlashItems.length, 1));
          return true;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSlashSelectedIndex((prev) => (prev - 1 + Math.max(filteredSlashItems.length, 1)) % Math.max(filteredSlashItems.length, 1));
          return true;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          if (filteredSlashItems[slashSelectedIndex]) {
            slashSelectRef.current(filteredSlashItems[slashSelectedIndex]);
          }
          return true;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          closeSlashMenu();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());

      // Slash command detection
      const { state } = e;
      const { from } = state.selection;
      const textBefore = state.doc.textBetween(Math.max(0, from - 50), from, '\n');
      const slashMatch = textBefore.match(/\/([a-zA-Z0-9 ]*)$/);

      if (slashMatch) {
        setSlashQuery(slashMatch[1]);
        setSlashSelectedIndex(0);
        if (!slashMenuOpen) {
          // Get cursor position for menu placement
          const coords = e.view.coordsAtPos(from);
          const containerRect = editorContainerRef.current?.getBoundingClientRect();
          if (containerRect) {
            setSlashMenuPos({
              top: coords.bottom - containerRect.top + 4,
              left: coords.left - containerRect.left,
            });
          }
          setSlashMenuOpen(true);
        }
      } else if (slashMenuOpen) {
        closeSlashMenu();
      }
    },
  });

  const deleteSlashText = useCallback(() => {
    if (!editor) return;
    const { state } = editor;
    const { from } = state.selection;
    const textBefore = state.doc.textBetween(Math.max(0, from - 50), from, '\n');
    const slashMatch = textBefore.match(/\/([a-zA-Z0-9 ]*)$/);
    if (slashMatch) {
      const deleteFrom = from - slashMatch[0].length;
      editor.chain().focus().deleteRange({ from: deleteFrom, to: from }).run();
    }
  }, [editor]);

  const handleSlashSelect = useCallback((item: typeof slashItems[number]) => {
    deleteSlashText();
    closeSlashMenu();
    if (item.action === 'block' && onInsertBlock && 'blockType' in item) {
      onInsertBlock(item.blockType);
    } else if (item.action === 'tag' && 'tagId' in item && editor) {
      editor.chain().focus().insertContent({
        type: 'mergeTag',
        attrs: { tagId: item.tagId },
      }).run();
    }
  }, [deleteSlashText, closeSlashMenu, onInsertBlock, editor]);

  // Keep the ref in sync so handleKeyDown can call it
  slashSelectRef.current = handleSlashSelect;

  // Close slash menu on click outside
  useEffect(() => {
    if (!slashMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (slashMenuRef.current && !slashMenuRef.current.contains(e.target as Node)) {
        closeSlashMenu();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [slashMenuOpen, closeSlashMenu]);

  // Scroll selected item into view
  useEffect(() => {
    if (!slashMenuOpen || !slashMenuRef.current) return;
    const selected = slashMenuRef.current.querySelector('[data-selected="true"]');
    if (selected) selected.scrollIntoView({ block: 'nearest' });
  }, [slashSelectedIndex, slashMenuOpen]);

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

  if (!editor) return null;

  const textColors = [
    { label: 'Black', value: '#000000' },
    { label: 'Dark Gray', value: '#44403c' },
    { label: 'Clay', value: '#8d3038' },
    { label: 'Navy', value: '#1e3a5f' },
    { label: 'Forest', value: '#2d5016' },
    { label: 'Brown', value: '#6b3a2a' },
    { label: 'Purple', value: '#5b21b6' },
    { label: 'Stone', value: '#78716c' },
  ];

  const highlightColors = [
    { label: 'Yellow', value: '#fef08a' },
    { label: 'Green', value: '#bbf7d0' },
    { label: 'Blue', value: '#bfdbfe' },
    { label: 'Pink', value: '#fecdd3' },
    { label: 'Orange', value: '#fed7aa' },
    { label: 'Purple', value: '#e9d5ff' },
  ];

  const btnClass = (active: boolean) =>
    `p-1.5 rounded transition-colors ${active ? 'bg-clay text-white' : 'text-stone-600 hover:bg-stone-200'}`;

  const bubbleBtnClass = (active: boolean) =>
    `p-1 rounded transition-colors ${active ? 'bg-clay text-white' : 'text-stone-600 hover:bg-stone-200'}`;

  const currentHeadingLevel = editor.isActive('heading', { level: 1 })
    ? '1'
    : editor.isActive('heading', { level: 2 })
      ? '2'
      : editor.isActive('heading', { level: 3 })
        ? '3'
        : '0';

  return (
    <div ref={editorContainerRef} className="relative border border-stone-300 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="border-b border-stone-200 bg-stone-50 p-1.5 flex flex-col gap-1">
        {/* Row 1: Text formatting */}
        <div className="flex items-center gap-0.5 flex-wrap">
          {/* Heading dropdown */}
          <select
            value={currentHeadingLevel}
            onChange={(e) => {
              const level = parseInt(e.target.value);
              if (level === 0) {
                editor.chain().focus().setParagraph().run();
              } else {
                editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run();
              }
            }}
            className="text-xs bg-transparent border border-stone-300 rounded px-1.5 py-1 text-stone-700 focus:outline-none focus:ring-1 focus:ring-clay/40"
            title="Text style"
          >
            <option value="0">Paragraph</option>
            <option value="1">Heading 1</option>
            <option value="2">Heading 2</option>
            <option value="3">Heading 3</option>
          </select>

          <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))} title="Bold">
            <Bold size={14} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))} title="Italic">
            <Italic size={14} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnClass(editor.isActive('underline'))} title="Underline">
            <UnderlineIcon size={14} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass(editor.isActive('strike'))} title="Strikethrough">
            <Strikethrough size={14} />
          </button>

          <div className="w-px h-5 bg-stone-300 mx-0.5" />

          {/* Text color */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setShowColorPicker(!showColorPicker); setShowHighlightPicker(false); }}
              className={btnClass(showColorPicker)}
              title="Text color"
            >
              <Palette size={14} />
            </button>
            {showColorPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
                <div className="absolute top-full left-0 z-50 mt-1 bg-white rounded-lg shadow-lg border border-stone-200 p-2 w-44">
                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {textColors.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => { editor.chain().focus().setColor(c.value).run(); setShowColorPicker(false); }}
                        className="w-7 h-7 rounded border border-stone-300 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 border-t border-stone-200 pt-2">
                    <input
                      type="text"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      placeholder="#000000"
                      className="flex-1 text-xs border border-stone-300 rounded px-1.5 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-clay/40"
                    />
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().setColor(customColor).run(); setShowColorPicker(false); }}
                      className="text-xs px-2 py-1 bg-stone-100 hover:bg-stone-200 rounded transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Highlight */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setShowHighlightPicker(!showHighlightPicker); setShowColorPicker(false); }}
              className={btnClass(editor.isActive('highlight') || showHighlightPicker)}
              title="Highlight"
            >
              <Highlighter size={14} />
            </button>
            {showHighlightPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowHighlightPicker(false)} />
                <div className="absolute top-full left-0 z-50 mt-1 bg-white rounded-lg shadow-lg border border-stone-200 p-2 w-36">
                  <div className="grid grid-cols-3 gap-1.5">
                    {highlightColors.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => { editor.chain().focus().toggleHighlight({ color: c.value }).run(); setShowHighlightPicker(false); }}
                        className="w-7 h-7 rounded border border-stone-300 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="w-px h-5 bg-stone-300 mx-0.5" />

          {/* Text alignment */}
          <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={btnClass(editor.isActive({ textAlign: 'left' }))} title="Align left">
            <AlignLeft size={14} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={btnClass(editor.isActive({ textAlign: 'center' }))} title="Align center">
            <AlignCenter size={14} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={btnClass(editor.isActive({ textAlign: 'right' }))} title="Align right">
            <AlignRight size={14} />
          </button>

          <div className="w-px h-5 bg-stone-300 mx-0.5" />

          {/* Clear formatting */}
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            className="p-1.5 rounded transition-colors text-stone-600 hover:bg-stone-200"
            title="Clear formatting"
          >
            <RemoveFormatting size={14} />
          </button>
        </div>

        {/* Row 2: Insert & structure */}
        <div className="flex items-center gap-0.5 flex-wrap">
          <button type="button" onClick={setLink} className={btnClass(editor.isActive('link'))} title="Link">
            <LinkIcon size={14} />
          </button>

          <div className="w-px h-5 bg-stone-300 mx-0.5" />

          <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnClass(editor.isActive('blockquote'))} title="Blockquote">
            <Quote size={14} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive('bulletList'))} title="Bullet List">
            <List size={14} />
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive('orderedList'))} title="Numbered List">
            <ListOrdered size={14} />
          </button>

          <div className="w-px h-5 bg-stone-300 mx-0.5" />

          <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className="p-1.5 rounded transition-colors text-stone-600 hover:bg-stone-200" title="Horizontal rule">
            <Minus size={14} />
          </button>

          <div className="w-px h-5 bg-stone-300 mx-0.5" />

          {/* Merge tags */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setShowMergeTagDropdown(!showMergeTagDropdown); setShowColorPicker(false); setShowHighlightPicker(false); }}
              className={btnClass(showMergeTagDropdown)}
              title="Insert merge tag"
            >
              <Tag size={14} />
            </button>
            {showMergeTagDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMergeTagDropdown(false)} />
                <div className="absolute top-full left-0 z-50 mt-1 bg-white rounded-lg shadow-lg border border-stone-200 p-1 w-52">
                  {MERGE_TAGS.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        editor.chain().focus().insertContent({
                          type: 'mergeTag',
                          attrs: { tagId: tag.id },
                        }).run();
                        setShowMergeTagDropdown(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100 rounded flex items-center justify-between"
                    >
                      <span>{tag.label}</span>
                      <span className="text-xs text-stone-400 font-mono">{tag.placeholder}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bubble menu for quick formatting on selection */}
      <BubbleMenu editor={editor} tippyOptions={{ duration: 150 }} className="bg-white rounded-lg shadow-lg border border-stone-200 p-1 flex items-center gap-0.5">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={bubbleBtnClass(editor.isActive('bold'))} title="Bold">
          <Bold size={12} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={bubbleBtnClass(editor.isActive('italic'))} title="Italic">
          <Italic size={12} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={bubbleBtnClass(editor.isActive('underline'))} title="Underline">
          <UnderlineIcon size={12} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={bubbleBtnClass(editor.isActive('strike'))} title="Strikethrough">
          <Strikethrough size={12} />
        </button>
        <button type="button" onClick={setLink} className={bubbleBtnClass(editor.isActive('link'))} title="Link">
          <LinkIcon size={12} />
        </button>
      </BubbleMenu>

      <EditorContent editor={editor} />

      {/* Slash command menu */}
      {slashMenuOpen && filteredSlashItems.length > 0 && (
        <div
          ref={slashMenuRef}
          className="absolute z-50 bg-white rounded-lg shadow-lg border border-stone-200 py-1 w-64 max-h-64 overflow-y-auto"
          style={{ top: slashMenuPos.top, left: Math.min(slashMenuPos.left, 200) }}
        >
          <div className="px-2 py-1.5 border-b border-stone-100">
            <div className="flex items-center gap-1.5 text-xs text-stone-400">
              <Search size={11} />
              <span>{slashQuery ? `Filtering: "${slashQuery}"` : 'Type to filter...'}</span>
            </div>
          </div>
          {(() => {
            let lastCategory = '';
            return filteredSlashItems.map((item, idx) => {
              const showCategory = item.category !== lastCategory;
              lastCategory = item.category;
              const Icon = item.icon;
              return (
                <React.Fragment key={item.id}>
                  {showCategory && (
                    <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                      {item.category}
                    </div>
                  )}
                  <button
                    type="button"
                    data-selected={idx === slashSelectedIndex}
                    onClick={() => handleSlashSelect(item)}
                    className={`w-full text-left px-3 py-1.5 flex items-center gap-2.5 text-sm transition-colors ${
                      idx === slashSelectedIndex ? 'bg-clay/10 text-clay' : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <div className={`p-1 rounded ${idx === slashSelectedIndex ? 'bg-clay/20' : 'bg-stone-100'}`}>
                      <Icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.label}</div>
                      <div className="text-[10px] text-stone-400 truncate">{item.description}</div>
                    </div>
                  </button>
                </React.Fragment>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Block Renderers (Canvas Preview)
// ─────────────────────────────────────────────

function HeaderPreview({ props }: { props: Record<string, any> }) {
  return (
    <div
      className="py-6 px-4 text-center"
      style={{ backgroundColor: props.bgColor || '#ffffff' }}
    >
      <h1
        className="text-xl font-serif tracking-widest"
        style={{ color: props.textColor || BRAND_STONE_900, margin: 0 }}
      >
        {props.brandName || 'LYNE TILT'}
      </h1>
      {props.tagline && (
        <p className="text-[10px] tracking-[0.15em] uppercase mt-1.5" style={{ color: BRAND_STONE_500 }}>
          {props.tagline}
        </p>
      )}
    </div>
  );
}

function RichTextPreview({ props }: { props: Record<string, any> }) {
  return (
    <div
      className="prose prose-stone prose-sm max-w-none px-4 py-3"
      dangerouslySetInnerHTML={{ __html: props.html || '<p>Write your content here...</p>' }}
    />
  );
}

function ImagePreview({ props }: { props: Record<string, any> }) {
  return (
    <div className="px-4 py-3">
      {props.src ? (
        <div>
          <img
            src={props.src}
            alt={props.alt || ''}
            className="block mx-auto"
            style={{
              width: props.width || '100%',
              borderRadius: `${props.borderRadius || 0}px`,
              maxWidth: '100%',
            }}
          />
          {props.caption && (
            <p className="text-center text-xs text-stone-500 mt-2 italic">{props.caption}</p>
          )}
        </div>
      ) : (
        <div className="border-2 border-dashed border-stone-300 rounded-lg py-10 text-center text-stone-400">
          <ImageIcon className="mx-auto mb-2" size={28} />
          <p className="text-sm">Add an image URL in settings</p>
        </div>
      )}
    </div>
  );
}

function CtaPreview({ props }: { props: Record<string, any> }) {
  const alignment = props.alignment || 'center';
  const justifyClass = alignment === 'left' ? 'justify-start' : alignment === 'right' ? 'justify-end' : 'justify-center';
  return (
    <div className={`px-4 py-4 flex ${justifyClass}`}>
      <div
        className="inline-block px-6 py-3 text-sm font-medium tracking-wide"
        style={{
          backgroundColor: props.bgColor || BRAND_CLAY,
          color: props.textColor || '#ffffff',
          borderRadius: `${props.borderRadius || 6}px`,
        }}
      >
        {props.text || 'Click Here'}
      </div>
    </div>
  );
}

function ProductPreview({ props }: { props: Record<string, any> }) {
  return (
    <div className="px-4 py-4">
      <div className="border border-stone-200 rounded-lg overflow-hidden flex">
        <div className="w-28 h-28 bg-stone-100 flex-shrink-0 flex items-center justify-center">
          {props.productImage ? (
            <img src={props.productImage} alt={props.productName} className="w-full h-full object-cover" />
          ) : (
            <ShoppingBag size={24} className="text-stone-300" />
          )}
        </div>
        <div className="flex-1 p-3 flex flex-col justify-center">
          <p className="font-medium text-stone-900 text-sm">{props.productName || 'Product Name'}</p>
          <p className="text-clay font-semibold text-sm mt-0.5">{props.productPrice || '$0.00'}</p>
          {props.productUrl && (
            <p className="text-xs text-clay mt-1 underline">View Product</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TestimonialPreview({ props }: { props: Record<string, any> }) {
  const styleVariant = props.style || 'default';
  const borderClasses = styleVariant === 'bordered'
    ? 'border-l-4 border-clay pl-4'
    : styleVariant === 'highlighted'
    ? 'bg-clay/5 rounded-lg p-4'
    : '';

  return (
    <div className="px-4 py-4">
      <div className={borderClasses}>
        <p className="text-stone-700 italic text-sm leading-relaxed">
          &ldquo;{props.quote || 'Your testimonial here...'}&rdquo;
        </p>
        <div className="mt-2">
          <p className="text-sm font-medium text-stone-900">{props.author || 'Author'}</p>
          {props.role && <p className="text-xs text-stone-500">{props.role}</p>}
        </div>
      </div>
    </div>
  );
}

function DividerPreview({ props }: { props: Record<string, any> }) {
  return (
    <div style={{ padding: `${props.margin || 20}px 16px` }}>
      <hr
        style={{
          border: 'none',
          borderTop: `${props.thickness || 1}px solid ${props.color || BRAND_STONE_300}`,
          width: `${props.width || 100}%`,
          margin: '0 auto',
        }}
      />
    </div>
  );
}

function SpacerPreview({ props }: { props: Record<string, any> }) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ height: `${props.height || 32}px` }}
    >
      <span className="absolute text-[10px] text-stone-400 bg-white px-2">{props.height || 32}px</span>
      <div className="w-full border-t border-dashed border-stone-200" />
    </div>
  );
}

function TwoColumnPreview({ props }: { props: Record<string, any> }) {
  const ratio = props.ratio || '50-50';
  const [leftPct, rightPct] = ratio === '60-40' ? [60, 40] : ratio === '40-60' ? [40, 60] : [50, 50];

  return (
    <div className="px-4 py-3 flex gap-3">
      <div style={{ width: `${leftPct}%` }} className="prose prose-stone prose-sm max-w-none">
        <div dangerouslySetInnerHTML={{ __html: props.leftHtml || '<p>Left column</p>' }} />
      </div>
      <div className="w-px bg-stone-200 flex-shrink-0" />
      <div style={{ width: `${rightPct}%` }} className="prose prose-stone prose-sm max-w-none">
        <div dangerouslySetInnerHTML={{ __html: props.rightHtml || '<p>Right column</p>' }} />
      </div>
    </div>
  );
}

function BlockPreview({ block }: { block: EmailBlock }) {
  switch (block.type) {
    case 'header': return <HeaderPreview props={block.props} />;
    case 'richtext': return <RichTextPreview props={block.props} />;
    case 'image': return <ImagePreview props={block.props} />;
    case 'cta': return <CtaPreview props={block.props} />;
    case 'product': return <ProductPreview props={block.props} />;
    case 'testimonial': return <TestimonialPreview props={block.props} />;
    case 'divider': return <DividerPreview props={block.props} />;
    case 'spacer': return <SpacerPreview props={block.props} />;
    case 'twocolumn': return <TwoColumnPreview props={block.props} />;
    default: return <div className="p-4 text-stone-400 text-sm">Unknown block type</div>;
  }
}

// ─────────────────────────────────────────────
// Settings Panel Renderers
// ─────────────────────────────────────────────

interface SettingsProps {
  block: EmailBlock;
  onUpdate: (props: Record<string, any>) => void;
  onInsertBlock?: (type: BlockType) => void;
}

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <label className="block text-xs font-medium text-stone-700 mb-1">
      {label}
      {hint && <span className="font-normal text-stone-400 ml-1">({hint})</span>}
    </label>
  );
}

function TextInput({ label, value, onChange, placeholder, hint }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string }) {
  return (
    <div>
      <FieldLabel label={label} hint={hint} />
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-clay/40 focus:border-clay outline-none transition"
      />
    </div>
  );
}

function NumberInput({ label, value, onChange, min, max, suffix, hint }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; suffix?: string; hint?: string }) {
  return (
    <div>
      <FieldLabel label={label} hint={hint} />
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min || 0}
          max={max || 100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-clay"
        />
        <span className="text-xs text-stone-600 w-12 text-right tabular-nums">{value}{suffix || ''}</span>
      </div>
    </div>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <FieldLabel label={label} />
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border border-stone-300 cursor-pointer p-0"
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 px-3 py-1.5 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-clay/40 focus:border-clay outline-none font-mono"
        />
      </div>
    </div>
  );
}

function SelectInput({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <FieldLabel label={label} />
      <select
        value={value || options[0]?.value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-clay/40 focus:border-clay outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function HeaderSettings({ block, onUpdate }: SettingsProps) {
  const p = block.props;
  return (
    <div className="space-y-4">
      <TextInput label="Brand Name" value={p.brandName} onChange={(v) => onUpdate({ ...p, brandName: v })} />
      <TextInput label="Tagline" value={p.tagline} onChange={(v) => onUpdate({ ...p, tagline: v })} />
      <ColorInput label="Background Color" value={p.bgColor} onChange={(v) => onUpdate({ ...p, bgColor: v })} />
      <ColorInput label="Text Color" value={p.textColor} onChange={(v) => onUpdate({ ...p, textColor: v })} />
    </div>
  );
}

function RichTextSettings({ block, onUpdate, onInsertBlock }: SettingsProps) {
  return (
    <div className="space-y-3">
      <FieldLabel label="Content" />
      <MiniTipTapEditor
        content={block.props.html || ''}
        onChange={(html) => onUpdate({ ...block.props, html })}
        placeholder="Write your content... (type / for commands)"
        minHeight="160px"
        onInsertBlock={onInsertBlock}
      />
    </div>
  );
}

function ImageSettings({ block, onUpdate }: SettingsProps) {
  const p = block.props;
  return (
    <div className="space-y-4">
      <TextInput label="Image URL" value={p.src} onChange={(v) => onUpdate({ ...p, src: v })} placeholder="https://..." />
      <TextInput label="Alt Text" value={p.alt} onChange={(v) => onUpdate({ ...p, alt: v })} placeholder="Describe the image" hint="accessibility" />
      <TextInput label="Caption" value={p.caption} onChange={(v) => onUpdate({ ...p, caption: v })} placeholder="Optional caption" hint="optional" />
      <TextInput label="Link URL" value={p.linkUrl} onChange={(v) => onUpdate({ ...p, linkUrl: v })} placeholder="https://..." hint="optional" />
      <SelectInput label="Width" value={p.width} onChange={(v) => onUpdate({ ...p, width: v })} options={[
        { value: '100%', label: 'Full Width (100%)' },
        { value: '75%', label: 'Three Quarters (75%)' },
        { value: '50%', label: 'Half (50%)' },
      ]} />
      <NumberInput label="Border Radius" value={p.borderRadius || 0} onChange={(v) => onUpdate({ ...p, borderRadius: v })} min={0} max={32} suffix="px" />
    </div>
  );
}

function CtaSettings({ block, onUpdate }: SettingsProps) {
  const p = block.props;
  return (
    <div className="space-y-4">
      <TextInput label="Button Text" value={p.text} onChange={(v) => onUpdate({ ...p, text: v })} />
      <TextInput label="Link URL" value={p.url} onChange={(v) => onUpdate({ ...p, url: v })} placeholder="https://..." />
      <ColorInput label="Button Color" value={p.bgColor} onChange={(v) => onUpdate({ ...p, bgColor: v })} />
      <ColorInput label="Text Color" value={p.textColor} onChange={(v) => onUpdate({ ...p, textColor: v })} />
      <NumberInput label="Border Radius" value={p.borderRadius || 6} onChange={(v) => onUpdate({ ...p, borderRadius: v })} min={0} max={32} suffix="px" />
      <SelectInput label="Alignment" value={p.alignment} onChange={(v) => onUpdate({ ...p, alignment: v })} options={[
        { value: 'left', label: 'Left' },
        { value: 'center', label: 'Center' },
        { value: 'right', label: 'Right' },
      ]} />
    </div>
  );
}

function ProductSettings({ block, onUpdate }: SettingsProps) {
  const p = block.props;
  return (
    <div className="space-y-4">
      <TextInput label="Product Name" value={p.productName} onChange={(v) => onUpdate({ ...p, productName: v })} />
      <TextInput label="Price" value={p.productPrice} onChange={(v) => onUpdate({ ...p, productPrice: v })} placeholder="$0.00" />
      <TextInput label="Product Image URL" value={p.productImage} onChange={(v) => onUpdate({ ...p, productImage: v })} placeholder="https://..." />
      <TextInput label="Product Page URL" value={p.productUrl} onChange={(v) => onUpdate({ ...p, productUrl: v })} placeholder="https://..." />
      <TextInput label="Product ID" value={p.productId} onChange={(v) => onUpdate({ ...p, productId: v })} placeholder="Optional" hint="for tracking" />
    </div>
  );
}

function TestimonialSettings({ block, onUpdate }: SettingsProps) {
  const p = block.props;
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel label="Quote" />
        <textarea
          value={p.quote || ''}
          onChange={(e) => onUpdate({ ...p, quote: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-clay/40 focus:border-clay outline-none resize-none"
          placeholder="Customer testimonial..."
        />
      </div>
      <TextInput label="Author" value={p.author} onChange={(v) => onUpdate({ ...p, author: v })} />
      <TextInput label="Role / Title" value={p.role} onChange={(v) => onUpdate({ ...p, role: v })} hint="optional" />
      <SelectInput label="Style" value={p.style} onChange={(v) => onUpdate({ ...p, style: v })} options={[
        { value: 'default', label: 'Default' },
        { value: 'bordered', label: 'Left Border' },
        { value: 'highlighted', label: 'Highlighted Background' },
      ]} />
    </div>
  );
}

function DividerSettings({ block, onUpdate }: SettingsProps) {
  const p = block.props;
  return (
    <div className="space-y-4">
      <ColorInput label="Color" value={p.color} onChange={(v) => onUpdate({ ...p, color: v })} />
      <NumberInput label="Thickness" value={p.thickness || 1} onChange={(v) => onUpdate({ ...p, thickness: v })} min={1} max={8} suffix="px" />
      <NumberInput label="Width" value={p.width || 100} onChange={(v) => onUpdate({ ...p, width: v })} min={10} max={100} suffix="%" />
      <NumberInput label="Vertical Margin" value={p.margin || 20} onChange={(v) => onUpdate({ ...p, margin: v })} min={4} max={64} suffix="px" />
    </div>
  );
}

function SpacerSettings({ block, onUpdate }: SettingsProps) {
  return (
    <div className="space-y-4">
      <NumberInput label="Height" value={block.props.height || 32} onChange={(v) => onUpdate({ ...block.props, height: v })} min={8} max={120} suffix="px" />
    </div>
  );
}

function TwoColumnSettings({ block, onUpdate, onInsertBlock }: SettingsProps) {
  const p = block.props;
  return (
    <div className="space-y-4">
      <SelectInput label="Column Ratio" value={p.ratio} onChange={(v) => onUpdate({ ...p, ratio: v })} options={[
        { value: '50-50', label: 'Equal (50/50)' },
        { value: '60-40', label: 'Wide Left (60/40)' },
        { value: '40-60', label: 'Wide Right (40/60)' },
      ]} />
      <div>
        <FieldLabel label="Left Column" />
        <MiniTipTapEditor
          content={p.leftHtml || ''}
          onChange={(html) => onUpdate({ ...p, leftHtml: html })}
          placeholder="Left column content..."
          minHeight="80px"
          onInsertBlock={onInsertBlock}
        />
      </div>
      <div>
        <FieldLabel label="Right Column" />
        <MiniTipTapEditor
          content={p.rightHtml || ''}
          onChange={(html) => onUpdate({ ...p, rightHtml: html })}
          placeholder="Right column content..."
          minHeight="80px"
          onInsertBlock={onInsertBlock}
        />
      </div>
    </div>
  );
}

function BlockSettings({ block, onUpdate, onInsertBlock }: SettingsProps) {
  switch (block.type) {
    case 'header': return <HeaderSettings block={block} onUpdate={onUpdate} />;
    case 'richtext': return <RichTextSettings block={block} onUpdate={onUpdate} onInsertBlock={onInsertBlock} />;
    case 'image': return <ImageSettings block={block} onUpdate={onUpdate} />;
    case 'cta': return <CtaSettings block={block} onUpdate={onUpdate} />;
    case 'product': return <ProductSettings block={block} onUpdate={onUpdate} />;
    case 'testimonial': return <TestimonialSettings block={block} onUpdate={onUpdate} />;
    case 'divider': return <DividerSettings block={block} onUpdate={onUpdate} />;
    case 'spacer': return <SpacerSettings block={block} onUpdate={onUpdate} />;
    case 'twocolumn': return <TwoColumnSettings block={block} onUpdate={onUpdate} onInsertBlock={onInsertBlock} />;
    default: return <p className="text-sm text-stone-500">No settings available.</p>;
  }
}

// ─────────────────────────────────────────────
// Sortable Block Wrapper
// ─────────────────────────────────────────────

interface SortableBlockProps {
  block: EmailBlock;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSaveAsSnippet?: () => void;
}

function SortableBlock({ block, isSelected, onSelect, onDelete, onDuplicate, onSaveAsSnippet }: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto' as any,
    opacity: isDragging ? 0.5 : 1,
  };

  const meta = getBlockMeta(block.type);
  const Icon = meta.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-white rounded-lg border-2 transition-all cursor-pointer ${
        isSelected
          ? 'border-clay shadow-md ring-1 ring-clay/20'
          : isDragging
          ? 'border-clay/30 shadow-lg'
          : 'border-stone-200 hover:border-stone-300 hover:shadow-sm'
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Top bar with label, drag handle, actions */}
      <div className={`flex items-center justify-between px-2 py-1 border-b transition-colors ${
        isSelected ? 'bg-clay/5 border-clay/10' : 'bg-stone-50 border-stone-100'
      }`}>
        {/* Left side: drag handle + label */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-1 cursor-grab active:cursor-grabbing hover:bg-stone-200 rounded transition touch-none"
            title="Drag to reorder"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={14} className="text-stone-400" />
          </button>
          <span className={`flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded ${
            isSelected ? 'text-clay bg-clay/10' : 'text-stone-500 bg-stone-100'
          }`}>
            <Icon size={11} />
            {meta.label}
          </span>
        </div>

        {/* Right side: actions */}
        <div className={`flex items-center gap-0.5 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
          {onSaveAsSnippet && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSaveAsSnippet(); }}
              className="p-1 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded transition"
              title="Save as snippet"
            >
              <Bookmark size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-200 rounded transition"
            title="Duplicate block"
          >
            <Copy size={13} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition"
            title="Delete block"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Block Content Preview */}
      <div className="pointer-events-none">
        <BlockPreview block={block} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Template Selector Modal
// ─────────────────────────────────────────────

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (blocks: EmailBlock[]) => void;
}

function TemplateSelector({ isOpen, onClose, onSelect }: TemplateSelectorProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-200">
          <div>
            <h2 className="text-lg font-serif text-stone-900">Choose a Template</h2>
            <p className="text-sm text-stone-500 mt-0.5">Start with a pre-built layout or begin from scratch</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-lg transition"
          >
            <X size={20} className="text-stone-500" />
          </button>
        </div>

        {/* Templates Grid */}
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
          {TEMPLATES.map((template) => {
            const Icon = template.icon;
            return (
              <button
                key={template.id}
                onClick={() => {
                  onSelect(template.blocks());
                  onClose();
                }}
                className="text-left p-4 border border-stone-200 rounded-xl hover:border-clay hover:bg-clay/5 transition group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-stone-100 rounded-lg group-hover:bg-clay/10 transition">
                    <Icon size={20} className="text-stone-500 group-hover:text-clay transition" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-900 group-hover:text-clay transition text-sm">{template.name}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{template.description}</p>
                  </div>
                  <ChevronRight size={16} className="text-stone-300 group-hover:text-clay mt-0.5 transition" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Email HTML Generator
// ─────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderBlockToHtml(block: EmailBlock): string {
  const p = block.props;

  switch (block.type) {
    case 'header':
      return `
        <tr>
          <td style="padding: 30px 40px; border-bottom: 1px solid ${BRAND_STONE_200}; text-align: center; background-color: ${p.bgColor || '#ffffff'};">
            <h1 style="margin: 0; font-size: 24px; font-weight: normal; color: ${p.textColor || BRAND_STONE_900}; letter-spacing: 0.1em; font-family: Georgia, 'Times New Roman', serif;">${escapeHtml(p.brandName || 'LYNE TILT')}</h1>
            ${p.tagline ? `<p style="margin: 8px 0 0; font-size: 11px; color: ${BRAND_STONE_500}; letter-spacing: 0.15em; text-transform: uppercase; font-family: Arial, Helvetica, sans-serif;">${escapeHtml(p.tagline)}</p>` : ''}
          </td>
        </tr>`;

    case 'richtext':
      return `
        <tr>
          <td style="padding: 24px 40px; color: ${BRAND_STONE_700}; font-size: 16px; line-height: 1.7; font-family: Georgia, 'Times New Roman', serif;">
            ${p.html || ''}
          </td>
        </tr>`;

    case 'image': {
      const imgHtml = p.src
        ? `<img src="${escapeHtml(p.src)}" alt="${escapeHtml(p.alt || '')}" style="display: block; max-width: 100%; width: ${p.width || '100%'}; border-radius: ${p.borderRadius || 0}px; margin: 0 auto;" />`
        : '';
      const wrappedImg = p.linkUrl
        ? `<a href="${escapeHtml(p.linkUrl)}" target="_blank">${imgHtml}</a>`
        : imgHtml;
      const captionHtml = p.caption
        ? `<p style="margin: 8px 0 0; font-size: 13px; color: ${BRAND_STONE_500}; text-align: center; font-style: italic; font-family: Georgia, 'Times New Roman', serif;">${escapeHtml(p.caption)}</p>`
        : '';
      return `
        <tr>
          <td style="padding: 16px 40px; text-align: center;">
            ${wrappedImg}
            ${captionHtml}
          </td>
        </tr>`;
    }

    case 'cta': {
      const alignment = p.alignment || 'center';
      const alignStyle = alignment === 'left' ? 'text-align: left;' : alignment === 'right' ? 'text-align: right;' : 'text-align: center;';
      return `
        <tr>
          <td style="padding: 24px 40px; ${alignStyle}">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeHtml(p.url || '#')}" style="height:44px;v-text-anchor:middle;width:200px;" arcsize="${Math.round((p.borderRadius || 6) / 44 * 100)}%" strokecolor="${p.bgColor || BRAND_CLAY}" fillcolor="${p.bgColor || BRAND_CLAY}">
              <w:anchorlock/>
              <center style="color:${p.textColor || '#ffffff'};font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">${escapeHtml(p.text || 'Click Here')}</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <a href="${escapeHtml(p.url || '#')}" target="_blank" style="display: inline-block; padding: 12px 32px; background-color: ${p.bgColor || BRAND_CLAY}; color: ${p.textColor || '#ffffff'}; text-decoration: none; font-size: 14px; font-weight: bold; border-radius: ${p.borderRadius || 6}px; font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.03em;">${escapeHtml(p.text || 'Click Here')}</a>
            <!--<![endif]-->
          </td>
        </tr>`;
    }

    case 'product': {
      return `
        <tr>
          <td style="padding: 16px 40px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid ${BRAND_STONE_200}; border-radius: 8px; overflow: hidden;">
              <tr>
                ${p.productImage ? `<td style="width: 120px; vertical-align: middle;">
                  <a href="${escapeHtml(p.productUrl || '#')}" target="_blank" style="display: block;">
                    <img src="${escapeHtml(p.productImage)}" alt="${escapeHtml(p.productName || '')}" width="120" style="display: block; width: 120px; height: 120px; object-fit: cover;" />
                  </a>
                </td>` : `<td style="width: 120px; background-color: ${BRAND_STONE_100}; vertical-align: middle; text-align: center;">
                  <span style="color: ${BRAND_STONE_400}; font-size: 11px; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 0.05em;">No image</span>
                </td>`}
                <td style="padding: 16px; vertical-align: middle; font-family: Arial, Helvetica, sans-serif;">
                  <p style="margin: 0; font-size: 16px; font-weight: bold; color: ${BRAND_STONE_900};">${escapeHtml(p.productName || 'Product Name')}</p>
                  <p style="margin: 4px 0 0; font-size: 16px; font-weight: bold; color: ${BRAND_CLAY};">${escapeHtml(p.productPrice || '$0.00')}</p>
                  ${p.productUrl ? `<p style="margin: 10px 0 0;"><a href="${escapeHtml(p.productUrl)}" target="_blank" style="color: ${BRAND_CLAY}; text-decoration: underline; font-size: 13px;">View Product</a></p>` : ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    }

    case 'testimonial': {
      const styleVariant = p.style || 'default';
      let tdStyle = `padding: 24px 40px; font-family: Georgia, 'Times New Roman', serif;`;
      let innerStyle = '';
      if (styleVariant === 'bordered') {
        innerStyle = `border-left: 4px solid ${BRAND_CLAY}; padding-left: 20px;`;
      } else if (styleVariant === 'highlighted') {
        innerStyle = `background-color: ${BRAND_CLAY}0d; padding: 20px; border-radius: 8px;`;
      }
      return `
        <tr>
          <td style="${tdStyle}">
            <div style="${innerStyle}">
              <p style="margin: 0; font-size: 16px; font-style: italic; color: ${BRAND_STONE_700}; line-height: 1.6;">&ldquo;${escapeHtml(p.quote || '')}&rdquo;</p>
              <p style="margin: 12px 0 0; font-size: 14px; font-weight: bold; color: ${BRAND_STONE_900}; font-family: Arial, Helvetica, sans-serif;">${escapeHtml(p.author || '')}</p>
              ${p.role ? `<p style="margin: 2px 0 0; font-size: 12px; color: ${BRAND_STONE_500}; font-family: Arial, Helvetica, sans-serif;">${escapeHtml(p.role)}</p>` : ''}
            </div>
          </td>
        </tr>`;
    }

    case 'divider':
      return `
        <tr>
          <td style="padding: ${p.margin || 20}px 40px;">
            <hr style="border: none; border-top: ${p.thickness || 1}px solid ${p.color || BRAND_STONE_300}; width: ${p.width || 100}%; margin: 0 auto;" />
          </td>
        </tr>`;

    case 'spacer':
      return `
        <tr>
          <td style="padding: 0; height: ${p.height || 32}px; line-height: ${p.height || 32}px; font-size: 1px;">&nbsp;</td>
        </tr>`;

    case 'twocolumn': {
      const ratio = p.ratio || '50-50';
      const [leftPct, rightPct] = ratio === '60-40' ? [60, 40] : ratio === '40-60' ? [40, 60] : [50, 50];
      const totalWidth = 520; // 600 - 80px padding
      const leftW = Math.round(totalWidth * leftPct / 100);
      const rightW = totalWidth - leftW;
      return `
        <tr>
          <td style="padding: 16px 40px;">
            <!--[if mso]>
            <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
            <td width="${leftW}" valign="top">
            <![endif]-->
            <div style="display: inline-block; width: ${leftPct}%; vertical-align: top; font-family: Georgia, 'Times New Roman', serif; font-size: 15px; line-height: 1.6; color: ${BRAND_STONE_700};">
              ${p.leftHtml || ''}
            </div>
            <!--[if mso]>
            </td><td width="${rightW}" valign="top">
            <![endif]-->
            <div style="display: inline-block; width: ${rightPct}%; vertical-align: top; font-family: Georgia, 'Times New Roman', serif; font-size: 15px; line-height: 1.6; color: ${BRAND_STONE_700};">
              ${p.rightHtml || ''}
            </div>
            <!--[if mso]>
            </td></tr></table>
            <![endif]-->
          </td>
        </tr>`;
    }

    default:
      return '';
  }
}

export function generateEmailHtml(blocks: EmailBlock[]): string {
  const rawBodyRows = blocks.map(renderBlockToHtml).join('\n');
  // Strip merge tag span wrappers, keeping just the {{tag}} placeholder for email sending
  const bodyRows = rawBodyRows.replace(/<span[^>]*data-merge-tag="[^"]*"[^>]*>([^<]*)<\/span>/g, '$1');

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Lyne Tilt</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset */
    body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
    a { color: ${BRAND_CLAY}; }
    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      .email-bg { background-color: #1a1a1a !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND_STONE_100}; font-family: Georgia, 'Times New Roman', serif;">
  <!-- Preheader spacer -->
  <div style="display: none; max-height: 0; overflow: hidden;">&nbsp;</div>

  <!-- Email wrapper -->
  <table class="email-bg" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${BRAND_STONE_100};">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <!-- Main container -->
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; border: 1px solid ${BRAND_STONE_200};">
          ${bodyRows}

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: ${BRAND_STONE_50}; border-top: 1px solid ${BRAND_STONE_200}; text-align: center; font-family: Arial, Helvetica, sans-serif;">
              <p style="margin: 0; font-size: 12px; color: ${BRAND_STONE_500};">
                <a href="#" style="color: ${BRAND_CLAY}; text-decoration: none; margin: 0 10px;">Shop</a>
                <a href="#" style="color: ${BRAND_CLAY}; text-decoration: none; margin: 0 10px;">Coaching</a>
                <a href="#" style="color: ${BRAND_CLAY}; text-decoration: none; margin: 0 10px;">Learn</a>
              </p>
              <p style="margin: 16px 0 0; font-size: 11px; color: ${BRAND_STONE_400};">Australia-based &middot; Est. 2023</p>
              <p style="margin: 12px 0 0; font-size: 11px; color: ${BRAND_STONE_400};">
                <a href="{{unsubscribe_url}}" style="color: ${BRAND_STONE_400}; text-decoration: underline;">Unsubscribe</a>
                &nbsp;&middot;&nbsp;
                <a href="{{preferences_url}}" style="color: ${BRAND_STONE_400}; text-decoration: underline;">Manage Preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─────────────────────────────────────────────
// Main BlockBuilder Component
// ─────────────────────────────────────────────

export default function BlockBuilder({ blocks, onChange, onGenerateHtml, apiBase, accessToken }: BlockBuilderProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [darkPreview, setDarkPreview] = useState(false);
  const [snippetSaveBlockId, setSnippetSaveBlockId] = useState<string | null>(null);
  const [insertPointIndex, setInsertPointIndex] = useState<number | null>(null);
  const [leftPanelTab, setLeftPanelTab] = useState<'blocks' | 'snippets'>('blocks');
  const [snippets, setSnippets] = useState<EmailSnippet[]>([]);
  const [snippetsLoaded, setSnippetsLoaded] = useState(false);
  const [snippetName, setSnippetName] = useState('');
  const [snippetCategory, setSnippetCategory] = useState('Content');
  const [showSnippetDialog, setShowSnippetDialog] = useState(false);

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedBlockId) || null,
    [blocks, selectedBlockId]
  );

  // ── Snippets API ──
  const fetchSnippets = useCallback(async () => {
    if (!apiBase || !accessToken) return;
    try {
      const res = await fetch(`${apiBase}/newsletter/snippets`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) setSnippets(await res.json());
    } catch { /* ignore */ }
    finally { setSnippetsLoaded(true); }
  }, [apiBase, accessToken]);

  useEffect(() => {
    if (leftPanelTab === 'snippets' && !snippetsLoaded) fetchSnippets();
  }, [leftPanelTab, snippetsLoaded, fetchSnippets]);

  const saveSnippet = useCallback(async (name: string, category: string, snippetBlocks: EmailBlock[]) => {
    if (!apiBase || !accessToken) return;
    try {
      const res = await fetch(`${apiBase}/newsletter/snippets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ name, category, blocks: snippetBlocks }),
      });
      if (res.ok) fetchSnippets();
    } catch { /* ignore */ }
  }, [apiBase, accessToken, fetchSnippets]);

  const deleteSnippet = useCallback(async (id: string) => {
    if (!apiBase || !accessToken || !confirm('Delete this snippet?')) return;
    try {
      await fetch(`${apiBase}/newsletter/snippets/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      fetchSnippets();
    } catch { /* ignore */ }
  }, [apiBase, accessToken, fetchSnippets]);

  const insertSnippetBlocks = useCallback((snippetBlocks: EmailBlock[]) => {
    const copied = snippetBlocks.map(b => ({
      ...b,
      id: generateBlockId(),
      props: { ...b.props },
    }));
    onChange([...blocks, ...copied]);
  }, [blocks, onChange]);

  // Handle save-as-snippet trigger
  useEffect(() => {
    if (snippetSaveBlockId) {
      setShowSnippetDialog(true);
      setSnippetName('');
      setSnippetCategory('Content');
    }
  }, [snippetSaveBlockId]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onChange(arrayMove(blocks, oldIndex, newIndex));
      }
    }
  }, [blocks, onChange]);

  const addBlock = useCallback((type: BlockType) => {
    const newBlock = createBlock(type);
    onChange([...blocks, newBlock]);
    setSelectedBlockId(newBlock.id);
  }, [blocks, onChange]);

  // Insert block after a specific block (for slash commands)
  const insertBlockAfter = useCallback((afterId: string, type: BlockType) => {
    const idx = blocks.findIndex((b) => b.id === afterId);
    const newBlock = createBlock(type);
    const newBlocks = [...blocks];
    newBlocks.splice(idx + 1, 0, newBlock);
    onChange(newBlocks);
    setSelectedBlockId(newBlock.id);
  }, [blocks, onChange]);

  // Insert block at a specific index (for insertion points)
  const insertBlockAtIndex = useCallback((index: number, type: BlockType) => {
    const newBlock = createBlock(type);
    const newBlocks = [...blocks];
    newBlocks.splice(index, 0, newBlock);
    onChange(newBlocks);
    setSelectedBlockId(newBlock.id);
    setInsertPointIndex(null);
  }, [blocks, onChange]);

  const deleteBlock = useCallback((id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  }, [blocks, onChange, selectedBlockId]);

  const duplicateBlock = useCallback((id: string) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const original = blocks[idx];
    const duplicate: EmailBlock = {
      id: generateBlockId(),
      type: original.type,
      props: { ...original.props },
    };
    const newBlocks = [...blocks];
    newBlocks.splice(idx + 1, 0, duplicate);
    onChange(newBlocks);
    setSelectedBlockId(duplicate.id);
  }, [blocks, onChange]);

  const updateBlockProps = useCallback((id: string, newProps: Record<string, any>) => {
    onChange(blocks.map((b) => b.id === id ? { ...b, props: newProps } : b));
  }, [blocks, onChange]);

  const handleTemplateSelect = useCallback((templateBlocks: EmailBlock[]) => {
    onChange(templateBlocks);
    setSelectedBlockId(null);
  }, [onChange]);

  const handleCanvasClick = useCallback(() => {
    setSelectedBlockId(null);
  }, []);

  const draggedBlock = useMemo(
    () => blocks.find((b) => b.id === activeId) || null,
    [blocks, activeId]
  );

  // ── Empty state ──
  if (blocks.length === 0) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[500px] bg-stone-50 border-2 border-dashed border-stone-300 rounded-xl">
          <div className="text-center max-w-md px-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-clay/10 rounded-2xl flex items-center justify-center">
              <LayoutTemplate size={28} className="text-clay" />
            </div>
            <h3 className="text-lg font-serif text-stone-900 mb-2">Start Building Your Email</h3>
            <p className="text-sm text-stone-500 mb-6">
              Choose a template to get started quickly, or add blocks one at a time to build your email from scratch.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowTemplateSelector(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-clay text-white rounded-lg hover:bg-clay-dark transition text-sm font-medium"
              >
                <LayoutTemplate size={16} />
                Choose Template
              </button>
              <button
                onClick={() => addBlock('header')}
                className="flex items-center gap-2 px-5 py-2.5 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-100 transition text-sm font-medium"
              >
                <Plus size={16} />
                Start Blank
              </button>
            </div>
          </div>
        </div>
        <TemplateSelector
          isOpen={showTemplateSelector}
          onClose={() => setShowTemplateSelector(false)}
          onSelect={handleTemplateSelect}
        />
      </>
    );
  }

  // ── Main builder UI ──
  return (
    <>
      <div className="flex gap-4 min-h-[600px]" onClick={handleCanvasClick}>
        {/* ── Left Panel: Block Palette + Snippets ── */}
        <div className="w-[200px] flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-4">
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              {/* Tab header */}
              <div className="flex border-b border-stone-100">
                <button
                  onClick={() => setLeftPanelTab('blocks')}
                  className={`flex-1 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                    leftPanelTab === 'blocks' ? 'text-clay bg-clay/5 border-b-2 border-clay' : 'text-stone-500 hover:text-stone-700 bg-stone-50'
                  }`}
                >
                  Blocks
                </button>
                <button
                  onClick={() => setLeftPanelTab('snippets')}
                  className={`flex-1 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                    leftPanelTab === 'snippets' ? 'text-clay bg-clay/5 border-b-2 border-clay' : 'text-stone-500 hover:text-stone-700 bg-stone-50'
                  }`}
                >
                  Snippets
                </button>
              </div>

              {/* Tab content */}
              {leftPanelTab === 'blocks' ? (
                <div className="p-2 grid grid-cols-2 gap-1.5">
                  {BLOCK_DEFINITIONS.map((meta) => {
                    const Icon = meta.icon;
                    return (
                      <button
                        key={meta.type}
                        onClick={() => addBlock(meta.type)}
                        className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-transparent hover:border-clay/30 hover:bg-clay/5 transition group"
                        title={`Add ${meta.label}`}
                      >
                        <div className="p-1.5 bg-stone-100 rounded-md group-hover:bg-clay/10 transition">
                          <Icon size={15} className="text-stone-500 group-hover:text-clay transition" />
                        </div>
                        <span className="text-[10px] font-medium text-stone-600 group-hover:text-clay transition leading-tight text-center">
                          {meta.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-2">
                  {!snippetsLoaded ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-5 h-5 border-2 border-stone-300 border-t-clay rounded-full animate-spin" />
                    </div>
                  ) : snippets.length === 0 ? (
                    <div className="text-center py-6 px-3">
                      <Bookmark size={24} className="mx-auto text-stone-300 mb-2" />
                      <p className="text-xs text-stone-500">No saved snippets yet.</p>
                      <p className="text-[10px] text-stone-400 mt-1">Save blocks from the canvas using the bookmark icon.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {snippets.map((snippet) => (
                        <div
                          key={snippet.id}
                          className="group relative p-2 rounded-lg border border-stone-200 hover:border-clay/30 hover:bg-clay/5 transition cursor-pointer"
                          onClick={() => insertSnippetBlocks(snippet.blocks)}
                          title="Click to insert"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-stone-700 truncate">{snippet.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded font-medium">
                                  {snippet.category}
                                </span>
                                <span className="text-[9px] text-stone-400">
                                  {snippet.blocks.length} block{snippet.blocks.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); deleteSnippet(snippet.id); }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-stone-400 hover:text-red-500 transition"
                              title="Delete snippet"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Template + Preview buttons */}
            <div className="mt-3 space-y-2">
              <button
                onClick={() => setShowTemplateSelector(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50 transition"
              >
                <LayoutTemplate size={13} />
                Templates
              </button>
              <button
                onClick={() => setShowHtmlPreview(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50 transition"
              >
                <Eye size={13} />
                Preview HTML
              </button>
            </div>
          </div>
        </div>

        {/* ── Center Panel: Canvas ── */}
        <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
          <div
            className="bg-stone-100 rounded-xl p-4 min-h-[600px]"
            onClick={handleCanvasClick}
          >
            {/* Canvas header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                Email Canvas
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-400">
                  {blocks.length} block{blocks.length !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center bg-white rounded-md border border-stone-200 p-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('desktop')}
                    className={`p-1 rounded transition-colors ${previewMode === 'desktop' ? 'bg-clay text-white' : 'text-stone-400 hover:text-stone-600'}`}
                    title="Desktop preview"
                  >
                    <Monitor size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('mobile')}
                    className={`p-1 rounded transition-colors ${previewMode === 'mobile' ? 'bg-clay text-white' : 'text-stone-400 hover:text-stone-600'}`}
                    title="Mobile preview"
                  >
                    <Smartphone size={13} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setDarkPreview(!darkPreview)}
                  className={`p-1 rounded border transition-colors ${darkPreview ? 'bg-stone-800 text-amber-300 border-stone-600' : 'bg-white text-stone-400 border-stone-200 hover:text-stone-600'}`}
                  title={darkPreview ? 'Light preview' : 'Dark preview'}
                >
                  {darkPreview ? <Sun size={13} /> : <Moon size={13} />}
                </button>
              </div>
            </div>

            {/* Email preview container */}
            <div
              className={`mx-auto rounded-lg shadow-sm border overflow-hidden transition-all ${
                darkPreview ? 'bg-gray-900 border-gray-700' : 'bg-white border-stone-200'
              }`}
              style={{ maxWidth: previewMode === 'mobile' ? '375px' : '600px' }}
            >
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={blocks.map((b) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div>
                    {blocks.map((block, idx) => (
                      <React.Fragment key={block.id}>
                        {/* Insertion point between blocks */}
                        <div
                          className="group/insert relative h-2 -my-1 z-10 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInsertPointIndex(insertPointIndex === idx ? null : idx);
                          }}
                        >
                          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 bg-transparent group-hover/insert:bg-clay/40 transition-colors rounded" />
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/insert:opacity-100 transition-opacity">
                            <div className="w-5 h-5 rounded-full bg-clay text-white flex items-center justify-center shadow-sm">
                              <Plus size={11} />
                            </div>
                          </div>
                        </div>
                        {/* Insertion point picker */}
                        {insertPointIndex === idx && (
                          <div className="mx-4 mb-1 p-2 bg-white rounded-lg border border-clay/20 shadow-sm flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                            {BLOCK_DEFINITIONS.map((meta) => {
                              const BIcon = meta.icon;
                              return (
                                <button
                                  key={meta.type}
                                  type="button"
                                  onClick={() => insertBlockAtIndex(idx, meta.type)}
                                  className="flex items-center gap-1 px-2 py-1 text-[10px] text-stone-600 hover:bg-clay/10 hover:text-clay rounded transition"
                                  title={meta.label}
                                >
                                  <BIcon size={11} />
                                  {meta.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <SortableBlock
                          block={block}
                          isSelected={selectedBlockId === block.id}
                          onSelect={() => setSelectedBlockId(block.id)}
                          onDelete={() => deleteBlock(block.id)}
                          onDuplicate={() => duplicateBlock(block.id)}
                          onSaveAsSnippet={() => setSnippetSaveBlockId(block.id)}
                        />
                      </React.Fragment>
                    ))}
                  </div>
                </SortableContext>

                <DragOverlay>
                  {draggedBlock ? (
                    <div className="bg-white rounded-lg border-2 border-clay shadow-xl opacity-90 max-w-[600px]">
                      <BlockPreview block={draggedBlock} />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>

              {/* Add block inline button */}
              <div className="p-3 border-t border-stone-100">
                <button
                  onClick={() => addBlock('richtext')}
                  className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-stone-300 rounded-lg text-xs text-stone-400 hover:text-clay hover:border-clay transition"
                >
                  <Plus size={13} />
                  Add Block
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Panel: Settings ── */}
        <div className="w-[280px] flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-4">
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              {selectedBlock ? (
                <>
                  {/* Settings header */}
                  <div className="px-4 py-3 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const meta = getBlockMeta(selectedBlock.type);
                        const Icon = meta.icon;
                        return (
                          <>
                            <Icon size={14} className="text-clay" />
                            <h3 className="text-sm font-semibold text-stone-800">{meta.label} Settings</h3>
                          </>
                        );
                      })()}
                    </div>
                    <button
                      onClick={() => setSelectedBlockId(null)}
                      className="p-1 hover:bg-stone-200 rounded transition"
                    >
                      <X size={14} className="text-stone-400" />
                    </button>
                  </div>

                  {/* Settings body */}
                  <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                    <BlockSettings
                      block={selectedBlock}
                      onUpdate={(newProps) => updateBlockProps(selectedBlock.id, newProps)}
                      onInsertBlock={(type) => insertBlockAfter(selectedBlock.id, type)}
                    />
                  </div>

                  {/* Settings footer actions */}
                  <div className="px-4 py-3 border-t border-stone-100 bg-stone-50 flex items-center gap-2">
                    <button
                      onClick={() => duplicateBlock(selectedBlock.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-100 transition"
                    >
                      <Copy size={12} />
                      Duplicate
                    </button>
                    <button
                      onClick={() => deleteBlock(selectedBlock.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition"
                    >
                      <X size={12} />
                      Delete
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-stone-100 rounded-xl flex items-center justify-center">
                    <MousePointerClick size={20} className="text-stone-400" />
                  </div>
                  <p className="text-sm font-medium text-stone-700">No Block Selected</p>
                  <p className="text-xs text-stone-500 mt-1">Click a block in the canvas to edit its settings</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Template Selector Modal */}
      <TemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelect={handleTemplateSelect}
      />

      {/* Save Snippet Dialog */}
      {showSnippetDialog && snippetSaveBlockId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowSnippetDialog(false); setSnippetSaveBlockId(null); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-stone-200">
              <h2 className="text-lg font-serif text-stone-900">Save as Snippet</h2>
              <p className="text-xs text-stone-500 mt-1">Save this block for reuse in other emails.</p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Snippet Name</label>
                <input
                  type="text"
                  value={snippetName}
                  onChange={(e) => setSnippetName(e.target.value)}
                  placeholder="e.g., Welcome Header"
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-clay/40 focus:border-clay outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Category</label>
                <select
                  value={snippetCategory}
                  onChange={(e) => setSnippetCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white focus:ring-2 focus:ring-clay/40 focus:border-clay outline-none"
                >
                  {SNIPPET_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-end gap-2">
              <button
                onClick={() => { setShowSnippetDialog(false); setSnippetSaveBlockId(null); }}
                className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const block = blocks.find((b) => b.id === snippetSaveBlockId);
                  if (block && snippetName.trim()) {
                    saveSnippet(snippetName.trim(), snippetCategory, [block]);
                    setShowSnippetDialog(false);
                    setSnippetSaveBlockId(null);
                  }
                }}
                disabled={!snippetName.trim()}
                className="px-4 py-2 text-sm font-medium bg-clay text-white rounded-lg hover:bg-clay/90 transition disabled:opacity-50"
              >
                Save Snippet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HTML Preview Modal */}
      {showHtmlPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowHtmlPreview(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-stone-200 flex-shrink-0">
              <h2 className="text-lg font-serif text-stone-900">Email HTML Preview</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const html = generateEmailHtml(blocks);
                    navigator.clipboard.writeText(html);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-100 transition"
                >
                  Copy HTML
                </button>
                <button
                  onClick={() => setShowHtmlPreview(false)}
                  className="p-2 hover:bg-stone-100 rounded-lg transition"
                >
                  <X size={18} className="text-stone-500" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-stone-50">
              <div className="max-w-[640px] mx-auto">
                <iframe
                  srcDoc={generateEmailHtml(blocks)}
                  className="w-full bg-white border border-stone-200 rounded-lg"
                  style={{ height: '800px' }}
                  title="Email Preview"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
