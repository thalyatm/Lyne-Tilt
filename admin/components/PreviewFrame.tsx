import React, { useState, useCallback } from 'react';
import { Monitor, Tablet, Smartphone, RefreshCw, ExternalLink, X, Maximize2 } from 'lucide-react';

interface PreviewFrameProps {
  url: string;
  onClose?: () => void;
}

type DeviceSize = 'desktop' | 'tablet' | 'mobile';

const deviceSizes: Record<DeviceSize, { width: string; icon: React.ElementType }> = {
  desktop: { width: '100%', icon: Monitor },
  tablet: { width: '768px', icon: Tablet },
  mobile: { width: '375px', icon: Smartphone },
};

export default function PreviewFrame({ url, onClose }: PreviewFrameProps) {
  const [deviceSize, setDeviceSize] = useState<DeviceSize>('desktop');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleOpenInNewTab = useCallback(() => {
    window.open(url, '_blank');
  }, [url]);

  const frameWidth = deviceSizes[deviceSize].width;

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-stone-900 flex flex-col">
        {/* Fullscreen Header */}
        <div className="bg-stone-800 border-b border-stone-700 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(Object.keys(deviceSizes) as DeviceSize[]).map((size) => {
              const Icon = deviceSizes[size].icon;
              return (
                <button
                  key={size}
                  onClick={() => setDeviceSize(size)}
                  className={`p-2 rounded transition ${
                    deviceSize === size
                      ? 'bg-stone-600 text-white'
                      : 'text-stone-400 hover:text-white hover:bg-stone-700'
                  }`}
                  title={size.charAt(0).toUpperCase() + size.slice(1)}
                >
                  <Icon size={18} />
                </button>
              );
            })}
            <div className="h-4 w-px bg-stone-600 mx-2" />
            <button
              onClick={handleRefresh}
              className="p-2 text-stone-400 hover:text-white hover:bg-stone-700 rounded transition"
              title="Refresh"
            >
              <RefreshCw size={18} />
            </button>
            <button
              onClick={handleOpenInNewTab}
              className="p-2 text-stone-400 hover:text-white hover:bg-stone-700 rounded transition"
              title="Open in new tab"
            >
              <ExternalLink size={18} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-400">{url}</span>
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2 text-stone-400 hover:text-white hover:bg-stone-700 rounded transition"
              title="Exit fullscreen"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Fullscreen Preview */}
        <div className="flex-1 overflow-hidden bg-stone-800 flex items-start justify-center p-4">
          <div
            className="bg-white h-full transition-all duration-300 shadow-2xl"
            style={{ width: frameWidth, maxWidth: '100%' }}
          >
            <iframe
              key={refreshKey}
              src={url}
              className="w-full h-full border-0"
              title="Live Preview"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-stone-100 rounded-lg overflow-hidden border border-stone-200">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {(Object.keys(deviceSizes) as DeviceSize[]).map((size) => {
            const Icon = deviceSizes[size].icon;
            return (
              <button
                key={size}
                onClick={() => setDeviceSize(size)}
                className={`p-1.5 rounded transition ${
                  deviceSize === size
                    ? 'bg-stone-100 text-stone-900'
                    : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'
                }`}
                title={size.charAt(0).toUpperCase() + size.slice(1)}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded transition"
            title="Refresh preview"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded transition"
            title="Fullscreen"
          >
            <Maximize2 size={16} />
          </button>
          <button
            onClick={handleOpenInNewTab}
            className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded transition"
            title="Open in new tab"
          >
            <ExternalLink size={16} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-50 rounded transition ml-1"
              title="Close preview"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-hidden flex items-start justify-center p-3 bg-stone-100">
        <div
          className="bg-white h-full transition-all duration-300 shadow-lg rounded overflow-hidden"
          style={{ width: frameWidth, maxWidth: '100%' }}
        >
          <iframe
            key={refreshKey}
            src={url}
            className="w-full h-full border-0"
            title="Live Preview"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-stone-200 px-3 py-1.5 text-center">
        <span className="text-xs text-stone-400">
          {deviceSize === 'desktop' ? 'Desktop' : deviceSize === 'tablet' ? 'Tablet (768px)' : 'Mobile (375px)'}
        </span>
      </div>
    </div>
  );
}
