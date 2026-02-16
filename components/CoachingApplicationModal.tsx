import React, { useState, useEffect } from 'react';
import { X, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { API_BASE } from '../config/api';

interface CoachingApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedPackage?: string;
}

const CoachingApplicationModal: React.FC<CoachingApplicationModalProps> = ({ isOpen, onClose, preselectedPackage }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    creativeWork: '',
    reason: '',
    package: 'Not sure yet',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Update package when modal opens with preselected value
  useEffect(() => {
    if (isOpen && preselectedPackage) {
      setFormData(prev => ({ ...prev, package: preselectedPackage }));
    }
  }, [isOpen, preselectedPackage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/coaching/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          reason: formData.reason,
          package: formData.package,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Something went wrong');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setError('');
    setFormData({ name: '', email: '', phone: '', creativeWork: '', reason: '', package: 'Not sure yet' });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 pt-24 pb-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up rounded-2xl">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-800 transition-colors z-10"
        >
          <X size={24} />
        </button>

        {submitted ? (
          /* Success State */
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-clay/10 text-clay rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} />
            </div>
            <h3 className="font-serif text-2xl text-stone-900 mb-4">Application Received</h3>
            <p className="text-stone-600 mb-6">
              Thank you for your interest in coaching. I'll review your application and be in touch within 2-3 business days to schedule your free discovery call.
            </p>
            <p className="font-serif italic text-clay"> - Lyne</p>
            <button
              onClick={handleClose}
              className="mt-8 text-xs uppercase tracking-widest font-bold text-stone-500 hover:text-stone-800 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          /* Form */
          <div className="p-8 md:p-10">
            <div className="text-center mb-8">
              <p className="text-xs uppercase tracking-[0.3em] text-stone-400 mb-2">Complimentary Discovery Call</p>
              <h2 className="font-serif text-2xl md:text-3xl text-stone-900 mb-3">
                Let's Start a Conversation
              </h2>
              <p className="text-sm text-stone-500 max-w-md mx-auto">
                To ensure we're the right fit, all coaching engagements begin with a 15-minute discovery call. Tell me a little about yourself so I can make our conversation as valuable as possible.
              </p>
            </div>

            {formData.package && formData.package !== 'Not sure yet' && (
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 mb-2">
                <p className="text-[10px] uppercase tracking-widest text-stone-400">Enquiring about</p>
                <p className="text-sm font-medium text-stone-900">{formData.package}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name, Email & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-stone-500 block mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    className="w-full border-b border-stone-300 py-2 focus:border-clay focus:outline-none transition-colors bg-transparent"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="text-xs font-bold uppercase tracking-widest text-stone-500 block mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    required
                    className="w-full border-b border-stone-300 py-2 focus:border-clay focus:outline-none transition-colors bg-transparent"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-stone-500 block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  className="w-full border-b border-stone-300 py-2 focus:border-clay focus:outline-none transition-colors bg-transparent"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>

              {/* Reason */}
              <div>
                <label htmlFor="reason" className="text-xs font-bold uppercase tracking-widest text-stone-500 block mb-1">
                  What brings you here? <span className="text-stone-400 normal-case font-normal">(optional)</span>
                </label>
                <textarea
                  id="reason"
                  rows={3}
                  placeholder="Tell me a little about what you're hoping to get from coaching..."
                  className="w-full border border-stone-300 p-3 focus:border-clay focus:outline-none transition-colors bg-stone-50 resize-none mt-1 placeholder:text-stone-300"
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 border border-red-200">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-stone-900 text-white py-4 uppercase tracking-[0.2em] text-xs font-bold hover:bg-clay transition-colors flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed rounded-full"
              >
                <Send size={14} />
                {submitting ? 'Submitting...' : 'Request Discovery Call'}
              </button>

              <p className="text-center text-[10px] text-stone-400 mt-4">
                Your information is kept confidential and only used to prepare for our conversation.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoachingApplicationModal;
