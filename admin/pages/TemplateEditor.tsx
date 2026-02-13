import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, GripVertical, Type, AlignLeft, Image as ImageIcon, MousePointer, Minus, ChevronUp, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE } from '../config/api';

type BlockType = 'heading' | 'text' | 'image' | 'button' | 'divider';

interface Block {
  id: string;
  type: BlockType;
  content?: string;
  level?: 'h1' | 'h2' | 'h3';
  alt?: string;
  url?: string;
}

interface Template {
  id?: string;
  name: string;
  description: string;
  blocks: Block[];
  category: string;
}

const CATEGORIES = ['Custom', 'Marketing', 'Newsletter', 'Coaching', 'General'];

export default function TemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<Template>({
    name: '',
    description: '',
    blocks: [],
    category: 'Custom'
  });

  useEffect(() => {
    if (id) {
      fetchTemplate();
    }
  }, [id]);

  const fetchTemplate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/templates/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch template');
      }

      const data = await response.json();
      setTemplate(data);
    } catch (error) {
      toast.error('Failed to load template');
      navigate('/admin/templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!template.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    setSaving(true);
    try {
      const url = id
        ? `${API_BASE}/templates/${id}`
        : `${API_BASE}/templates`;

      const method = id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(template)
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      toast.success(`Template ${id ? 'updated' : 'created'} successfully`);
      navigate('/admin/templates');
    } catch (error) {
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const addBlock = (type: BlockType) => {
    const newBlock: Block = {
      id: crypto.randomUUID(),
      type,
      content: '',
      ...(type === 'heading' && { level: 'h2' }),
      ...(type === 'image' && { alt: '', url: '' }),
      ...(type === 'button' && { url: '' })
    };

    setTemplate(prev => ({
      ...prev,
      blocks: [...prev.blocks, newBlock]
    }));
  };

  const removeBlock = (id: string) => {
    setTemplate(prev => ({
      ...prev,
      blocks: prev.blocks.filter(block => block.id !== id)
    }));
  };

  const updateBlock = (id: string, updates: Partial<Block>) => {
    setTemplate(prev => ({
      ...prev,
      blocks: prev.blocks.map(block =>
        block.id === id ? { ...block, ...updates } : block
      )
    }));
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    setTemplate(prev => {
      const blocks = [...prev.blocks];
      const index = blocks.findIndex(block => block.id === id);

      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === blocks.length - 1) return prev;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      [blocks[index], blocks[newIndex]] = [blocks[newIndex], blocks[index]];

      return { ...prev, blocks };
    });
  };

  const renderBlockPreview = (block: Block) => {
    switch (block.type) {
      case 'heading':
        const HeadingTag = block.level || 'h2';
        const headingSize = {
          h1: 'text-3xl',
          h2: 'text-2xl',
          h3: 'text-xl'
        }[block.level || 'h2'];

        return (
          <HeadingTag
            className={`font-serif ${headingSize} font-bold text-stone-800`}
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {block.content || 'Heading preview'}
          </HeadingTag>
        );

      case 'text':
        return (
          <p className="text-stone-600 leading-relaxed">
            {block.content || 'Text content preview'}
          </p>
        );

      case 'image':
        if (block.url) {
          return (
            <img
              src={block.url}
              alt={block.alt || ''}
              className="max-w-full h-auto rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          );
        }
        return (
          <div className="bg-stone-100 border-2 border-dashed border-stone-300 rounded-lg p-12 flex flex-col items-center justify-center">
            <ImageIcon className="w-12 h-12 text-stone-400 mb-2" />
            <span className="text-stone-500 text-sm">Image placeholder</span>
          </div>
        );

      case 'button':
        return (
          <button
            className="px-6 py-3 rounded-lg font-semibold text-white"
            style={{ backgroundColor: '#8d3038' }}
          >
            {block.content || 'Button text'}
          </button>
        );

      case 'divider':
        return <hr className="border-stone-200" />;

      default:
        return null;
    }
  };

  const renderBlockEditor = (block: Block) => {
    switch (block.type) {
      case 'heading':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Heading Text
              </label>
              <input
                type="text"
                value={block.content || ''}
                onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-400 focus:border-transparent"
                placeholder="Enter heading text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Level
              </label>
              <select
                value={block.level || 'h2'}
                onChange={(e) => updateBlock(block.id, { level: e.target.value as 'h1' | 'h2' | 'h3' })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-400 focus:border-transparent"
              >
                <option value="h1">H1 - Large</option>
                <option value="h2">H2 - Medium</option>
                <option value="h3">H3 - Small</option>
              </select>
            </div>
          </div>
        );

      case 'text':
        return (
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Paragraph Content
            </label>
            <textarea
              value={block.content || ''}
              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-400 focus:border-transparent"
              placeholder="Enter paragraph text"
            />
          </div>
        );

      case 'image':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Image URL
              </label>
              <input
                type="url"
                value={block.url || ''}
                onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-400 focus:border-transparent"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Alt Text
              </label>
              <input
                type="text"
                value={block.alt || ''}
                onChange={(e) => updateBlock(block.id, { alt: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-400 focus:border-transparent"
                placeholder="Describe the image"
              />
            </div>
          </div>
        );

      case 'button':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Button Text
              </label>
              <input
                type="text"
                value={block.content || ''}
                onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-400 focus:border-transparent"
                placeholder="Click here"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Button URL
              </label>
              <input
                type="url"
                value={block.url || ''}
                onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-400 focus:border-transparent"
                placeholder="https://example.com"
              />
            </div>
          </div>
        );

      case 'divider':
        return (
          <div className="text-sm text-stone-500 italic">
            Visual separator (no content required)
          </div>
        );

      default:
        return null;
    }
  };

  const getBlockIcon = (type: BlockType) => {
    switch (type) {
      case 'heading': return <Type className="w-4 h-4" />;
      case 'text': return <AlignLeft className="w-4 h-4" />;
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'button': return <MousePointer className="w-4 h-4" />;
      case 'divider': return <Minus className="w-4 h-4" />;
    }
  };

  const getBlockLabel = (type: BlockType) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading template...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/templates')}
            className="flex items-center gap-2 text-stone-600 hover:text-stone-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Templates
          </button>
          <h1
            className="text-4xl font-bold text-stone-800 font-serif"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {id ? 'Edit Template' : 'New Template'}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Template Info */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={template.name}
                  onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-400 focus:border-transparent"
                  placeholder="e.g., Welcome Email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Description
                </label>
                <textarea
                  value={template.description}
                  onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-400 focus:border-transparent"
                  placeholder="Optional description of this template"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Category
                </label>
                <select
                  value={template.category}
                  onChange={(e) => setTemplate(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-400 focus:border-transparent"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Block Builder */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
              <h2
                className="text-2xl font-bold text-stone-800 mb-4 font-serif"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Content Blocks
              </h2>

              <div className="space-y-4">
                {template.blocks.map((block, index) => (
                  <div
                    key={block.id}
                    className="bg-stone-50 border border-stone-200 rounded-lg p-4"
                  >
                    {/* Block Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <GripVertical className="w-5 h-5 text-stone-400" />
                      <span className="flex items-center gap-2 px-3 py-1 bg-white border border-stone-200 rounded-full text-sm font-medium text-stone-700">
                        {getBlockIcon(block.type)}
                        {getBlockLabel(block.type)}
                      </span>
                      <div className="ml-auto flex items-center gap-2">
                        <button
                          onClick={() => moveBlock(block.id, 'up')}
                          disabled={index === 0}
                          className="p-1 text-stone-500 hover:text-stone-700 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveBlock(block.id, 'down')}
                          disabled={index === template.blocks.length - 1}
                          className="p-1 text-stone-500 hover:text-stone-700 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeBlock(block.id)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Block Editor */}
                    {renderBlockEditor(block)}
                  </div>
                ))}

                {template.blocks.length === 0 && (
                  <div className="text-center py-8 text-stone-500">
                    No blocks added yet. Add your first block below.
                  </div>
                )}
              </div>

              {/* Add Block Buttons */}
              <div className="mt-6 pt-6 border-t border-stone-200">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => addBlock('heading')}
                    className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors"
                  >
                    <Type className="w-4 h-4" />
                    Heading
                  </button>
                  <button
                    onClick={() => addBlock('text')}
                    className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors"
                  >
                    <AlignLeft className="w-4 h-4" />
                    Text
                  </button>
                  <button
                    onClick={() => addBlock('image')}
                    className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Image
                  </button>
                  <button
                    onClick={() => addBlock('button')}
                    className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors"
                  >
                    <MousePointer className="w-4 h-4" />
                    Button
                  </button>
                  <button
                    onClick={() => addBlock('divider')}
                    className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                    Divider
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/admin/templates')}
                className="px-6 py-3 border border-stone-300 text-stone-700 rounded-lg font-semibold hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!template.name.trim() || saving}
                className="px-6 py-3 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#8d3038' }}
              >
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
                <h2
                  className="text-2xl font-bold text-stone-800 mb-4 font-serif"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  Preview
                </h2>

                <div className="mb-4 pb-4 border-b border-stone-200">
                  <div className="text-sm text-stone-600">
                    <span className="font-medium">{template.blocks.length}</span> block{template.blocks.length !== 1 ? 's' : ''}
                  </div>
                </div>

                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {template.blocks.length === 0 ? (
                    <div className="text-center py-12 text-stone-400 text-sm">
                      Add blocks to see preview
                    </div>
                  ) : (
                    template.blocks.map(block => (
                      <div key={block.id} className="preview-block">
                        {renderBlockPreview(block)}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
