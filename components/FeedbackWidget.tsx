import React, { useState, useRef, useEffect } from 'react';
import { MessageSquarePlus, X, Send, CheckCircle } from 'lucide-react';
import { API_BASE } from '../config/api';

type Status = 'idle' | 'open' | 'sending' | 'sent';

export default function FeedbackWidget() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (status === 'open' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [status]);

  // Auto-close after sent
  useEffect(() => {
    if (status === 'sent') {
      const timer = setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setStatus('sending');
    try {
      const page = window.location.hash || window.location.pathname;
      await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'suggestion',
          message: message.trim(),
          page,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      });
      setStatus('sent');
    } catch {
      // Silently fail — don't block the user
      setStatus('open');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setStatus('idle');
      setMessage('');
    }
  };

  // Don't render on login page
  if (window.location.hash === '#/admin/login') return null;

  return (
    <>
      {/* Floating trigger button */}
      {status === 'idle' && (
        <button
          onClick={() => setStatus('open')}
          title="Leave a suggestion"
          className="fixed bottom-5 right-5 z-[90] w-11 h-11 bg-stone-800 hover:bg-stone-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        >
          <MessageSquarePlus size={20} />
        </button>
      )}

      {/* Feedback form popup */}
      {(status === 'open' || status === 'sending') && (
        <div className="fixed bottom-5 right-5 z-[90] w-80 bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden"
          style={{ animation: 'feedbackIn 0.2s ease-out' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-stone-800">
            <div>
              <p className="text-sm font-medium text-white">Leave a suggestion</p>
              <p className="text-[11px] text-stone-400">Your note will be sent to Thalya</p>
            </div>
            <button
              onClick={() => { setStatus('idle'); setMessage(''); }}
              className="text-stone-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What would you like to suggest or change on this page?"
              rows={4}
              disabled={status === 'sending'}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm text-stone-700 placeholder:text-stone-400 resize-none focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 disabled:opacity-50"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-[11px] text-stone-400">
                {window.location.hash.replace('#', '') || '/'}
              </span>
              <button
                onClick={handleSubmit}
                disabled={!message.trim() || status === 'sending'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-white text-sm rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send size={14} />
                {status === 'sending' ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sent confirmation */}
      {status === 'sent' && (
        <div className="fixed bottom-5 right-5 z-[90] w-80 bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden"
          style={{ animation: 'feedbackIn 0.2s ease-out' }}
        >
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <CheckCircle size={32} className="text-green-500 mb-2" />
            <p className="text-sm font-medium text-stone-800">Suggestion sent!</p>
            <p className="text-xs text-stone-400 mt-1">Thanks for your feedback</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes feedbackIn {
          from { transform: translateY(8px) scale(0.96); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}
