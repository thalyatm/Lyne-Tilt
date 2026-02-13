import React, { useState } from 'react';
import { Feather } from 'lucide-react';
import { API_BASE } from '../config/api';

const LeadMagnet = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'footer-leadmagnet' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Subscription failed');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-stone-100 text-stone-900 py-8 px-6 border-t border-stone-200">
      <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Left: Title & Description */}
            <div className="md:max-w-md">
              <div className="flex items-center gap-3 mb-2">
                <Feather className="text-clay" size={18} />
                <h3 className="text-lg md:text-xl font-serif text-stone-900">
                  Oxygen Notes
                </h3>
              </div>
              <p className="text-stone-500 text-sm font-light leading-relaxed">
                Honest thoughts, clarity tools, and gently rebellious insight for creatives who want space to breathe and think differently.
              </p>
            </div>

            {/* Right: Form */}
            {!submitted ? (
              <form onSubmit={handleSubmit} className="flex-1 md:max-w-sm">
                <label htmlFor="lead-magnet-email" className="sr-only">Email address</label>
                <div className="flex gap-2">
                   <input
                    type="email"
                    id="lead-magnet-email"
                    placeholder="Your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={submitting}
                    className="flex-1 bg-white border border-stone-300 px-4 py-3 focus:outline-none focus:border-clay text-stone-900 placeholder-stone-400 text-sm transition-colors disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-stone-900 text-white px-6 py-3 uppercase tracking-widest text-[10px] font-bold hover:bg-clay transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? '...' : 'Sign Up'}
                  </button>
                </div>
                {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
              </form>
            ) : (
              <div className="flex items-center gap-3 text-clay">
                <span className="text-lg">✓</span>
                <span className="text-sm font-medium">Welcome! Your first note arrives soon.</span>
              </div>
            )}
          </div>
      </div>
    </section>
  );
};

export default LeadMagnet;