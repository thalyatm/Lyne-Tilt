import React, { useState } from 'react';
import { Send, Save, Eye, EyeOff, Loader2, Clock, AlertCircle } from 'lucide-react';

interface PublishControlsProps {
  isPublished: boolean;
  isSaving: boolean;
  lastSaved?: string;
  onSaveDraft: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  hasChanges?: boolean;
}

export default function PublishControls({
  isPublished,
  isSaving,
  lastSaved,
  onSaveDraft,
  onPublish,
  onUnpublish,
  hasChanges = false,
}: PublishControlsProps) {
  const [showConfirmPublish, setShowConfirmPublish] = useState(false);
  const [showConfirmUnpublish, setShowConfirmUnpublish] = useState(false);

  const formatLastSaved = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handlePublishClick = () => {
    setShowConfirmPublish(true);
  };

  const handleConfirmPublish = () => {
    setShowConfirmPublish(false);
    onPublish();
  };

  const handleUnpublishClick = () => {
    setShowConfirmUnpublish(true);
  };

  const handleConfirmUnpublish = () => {
    setShowConfirmUnpublish(false);
    onUnpublish();
  };

  return (
    <>
      <div className="flex items-center gap-3 p-4 bg-white border-t border-stone-200">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {isPublished ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              <Eye size={12} />
              Published
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
              <EyeOff size={12} />
              Draft
            </span>
          )}
        </div>

        {/* Last Saved */}
        {lastSaved && (
          <div className="flex items-center gap-1.5 text-xs text-stone-400">
            <Clock size={12} />
            <span>Saved {formatLastSaved(lastSaved)}</span>
          </div>
        )}

        {/* Unsaved changes indicator */}
        {hasChanges && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600">
            <AlertCircle size={12} />
            <span>Unsaved changes</span>
          </div>
        )}

        <div className="flex-1" />

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isPublished ? (
            <>
              <button
                type="button"
                onClick={handleUnpublishClick}
                className="flex items-center gap-2 px-3 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition text-sm"
              >
                <EyeOff size={16} />
                Unpublish
              </button>
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-clay text-white rounded-lg hover:bg-clay-dark transition text-sm disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Update
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={isSaving}
                className="flex items-center gap-2 px-3 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition text-sm disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Draft
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handlePublishClick}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm disabled:opacity-50"
              >
                <Send size={16} />
                Publish
              </button>
            </>
          )}
        </div>
      </div>

      {/* Publish Confirmation Modal */}
      {showConfirmPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-full">
                <Send size={20} className="text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-stone-800">Publish this content?</h3>
            </div>
            <p className="text-stone-600 mb-6">
              This will make the content visible to all visitors on your website.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmPublish(false)}
                className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPublish}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Yes, Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unpublish Confirmation Modal */}
      {showConfirmUnpublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-full">
                <EyeOff size={20} className="text-amber-600" />
              </div>
              <h3 className="text-lg font-medium text-stone-800">Unpublish this content?</h3>
            </div>
            <p className="text-stone-600 mb-6">
              This will hide the content from visitors. It will remain as a draft and you can republish it later.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmUnpublish(false)}
                className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUnpublish}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
              >
                Yes, Unpublish
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Simple status badge for use in tables
export function PublishStatusBadge({ isPublished }: { isPublished: boolean }) {
  return isPublished ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
      <Eye size={10} />
      Published
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
      <EyeOff size={10} />
      Draft
    </span>
  );
}
