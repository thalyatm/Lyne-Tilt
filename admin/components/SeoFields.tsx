import React from 'react';
import { Search, MessageSquare, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { ImageUploadField } from './FormModal';

interface SeoFieldsProps {
  title: string;
  description: string;
  image?: string;
  slug?: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onImageChange?: (value: string) => void;
  onSlugChange?: (value: string) => void;
  showSlug?: boolean;
  showImage?: boolean;
  baseUrl?: string;
}

export default function SeoFields({
  title,
  description,
  image,
  slug,
  onTitleChange,
  onDescriptionChange,
  onImageChange,
  onSlugChange,
  showSlug = false,
  showImage = true,
  baseUrl = '',
}: SeoFieldsProps) {
  const titleMax = 60;
  const descMax = 160;
  const titleLength = title?.length || 0;
  const descLength = description?.length || 0;

  const getCharCountClass = (current: number, max: number) => {
    const ratio = current / max;
    if (ratio >= 1) return 'text-red-500';
    if (ratio >= 0.9) return 'text-amber-500';
    return 'text-stone-400';
  };

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
            <Search size={14} />
            Page Title
          </label>
          <span className={`text-xs ${getCharCountClass(titleLength, titleMax)}`}>
            {titleLength}/{titleMax}
          </span>
        </div>
        <input
          type="text"
          value={title || ''}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Page title for search engines"
          maxLength={titleMax + 10}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-clay focus:border-transparent outline-none ${
            titleLength > titleMax ? 'border-red-300' : 'border-stone-300'
          }`}
        />
        <p className="text-xs text-stone-400 mt-1">
          Appears in search results and browser tabs. Keep it concise and descriptive.
        </p>
      </div>

      {/* Meta Description */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
            <MessageSquare size={14} />
            Meta Description
          </label>
          <span className={`text-xs ${getCharCountClass(descLength, descMax)}`}>
            {descLength}/{descMax}
          </span>
        </div>
        <textarea
          value={description || ''}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="A brief description of this page for search engines"
          rows={3}
          maxLength={descMax + 20}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-clay focus:border-transparent outline-none resize-none ${
            descLength > descMax ? 'border-red-300' : 'border-stone-300'
          }`}
        />
        <p className="text-xs text-stone-400 mt-1">
          Appears under the title in search results. Summarize the page content.
        </p>
      </div>

      {/* URL Slug */}
      {showSlug && onSlugChange && (
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-stone-700 mb-1">
            <LinkIcon size={14} />
            URL Slug
          </label>
          <div className="flex items-center">
            {baseUrl && (
              <span className="text-sm text-stone-400 bg-stone-50 px-3 py-2 border border-r-0 border-stone-300 rounded-l-lg">
                {baseUrl}/
              </span>
            )}
            <input
              type="text"
              value={slug || ''}
              onChange={(e) => {
                // Auto-format slug
                const formatted = e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, '-')
                  .replace(/-+/g, '-')
                  .replace(/^-|-$/g, '');
                onSlugChange(formatted);
              }}
              placeholder="page-url-slug"
              className={`flex-1 px-3 py-2 border border-stone-300 focus:ring-2 focus:ring-clay focus:border-transparent outline-none ${
                baseUrl ? 'rounded-r-lg' : 'rounded-lg'
              }`}
            />
          </div>
          <p className="text-xs text-stone-400 mt-1">
            The URL path for this page. Use lowercase letters, numbers, and hyphens only.
          </p>
        </div>
      )}

      {/* Social Image */}
      {showImage && onImageChange && (
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-stone-700 mb-1">
            <ImageIcon size={14} />
            Social Sharing Image
          </label>
          <ImageUploadField
            value={image || ''}
            onChange={onImageChange}
            compact
          />
          <p className="text-xs text-stone-400 mt-1">
            Image shown when shared on social media. Recommended: 1200x630 pixels.
          </p>
        </div>
      )}

      {/* Preview */}
      <div className="mt-6 p-4 bg-stone-50 rounded-lg border border-stone-200">
        <p className="text-xs text-stone-500 uppercase tracking-wider mb-3">Search Preview</p>
        <div className="bg-white p-3 rounded border border-stone-200">
          <div className="text-blue-600 text-lg hover:underline cursor-pointer truncate">
            {title || 'Page Title'}
          </div>
          <div className="text-green-700 text-sm">
            {baseUrl || 'yoursite.com'}{slug ? `/${slug}` : ''}
          </div>
          <div className="text-stone-600 text-sm mt-1 line-clamp-2">
            {description || 'Add a meta description to see how this page will appear in search results.'}
          </div>
        </div>
      </div>
    </div>
  );
}
