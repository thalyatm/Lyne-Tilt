import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, X, Send } from 'lucide-react';
import { API_BASE } from '../config/api';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning';
  message: string;
  shared?: boolean;
  sharing?: boolean;
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, type, message }]);

    const duration = type === 'error' ? 12000 : type === 'warning' ? 6000 : 4000;
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const shareError = useCallback(async (id: string, message: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, sharing: true } : t));
    try {
      const page = window.location.hash || window.location.pathname;
      await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'error',
          message,
          page,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      });
      setToasts(prev => prev.map(t => t.id === id ? { ...t, shared: true, sharing: false } : t));
    } catch {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, sharing: false } : t));
    }
  }, []);

  const value: ToastContextType = {
    success: (msg) => addToast('success', msg),
    error: (msg) => addToast('error', msg),
    warning: (msg) => addToast('warning', msg),
  };

  const iconMap = {
    success: <CheckCircle size={18} className="text-green-600 shrink-0" />,
    error: <XCircle size={18} className="text-red-600 shrink-0" />,
    warning: <AlertTriangle size={18} className="text-amber-600 shrink-0" />,
  };

  const borderMap = {
    success: 'border-l-green-500',
    error: 'border-l-red-500',
    warning: 'border-l-amber-500',
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`bg-white rounded-lg shadow-lg border border-stone-200 border-l-4 ${borderMap[toast.type]} p-3 flex flex-col gap-2 animate-in slide-in-from-right`}
            style={{ animation: 'slideIn 0.2s ease-out' }}
          >
            <div className="flex items-start gap-2.5">
              {iconMap[toast.type]}
              <p className="text-sm text-stone-700 flex-1">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-stone-400 hover:text-stone-600 shrink-0"
              >
                <X size={14} />
              </button>
            </div>

            {/* Share with Thalya — error toasts only */}
            {toast.type === 'error' && (
              <div className="pl-7">
                {toast.shared ? (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle size={12} /> Sent to Thalya
                  </span>
                ) : (
                  <button
                    onClick={() => shareError(toast.id, toast.message)}
                    disabled={toast.sharing}
                    className="text-xs text-stone-400 hover:text-clay flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <Send size={12} />
                    {toast.sharing ? 'Sending...' : 'Share with Thalya'}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
