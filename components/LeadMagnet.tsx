import React, { useState } from 'react';
import { Mail, Feather } from 'lucide-react';

const LeadMagnet = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // API call would go here
  };

  return (
    <section className="bg-stone-900 text-white py-12 px-6">
      <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Feather className="text-white" size={24} />
            <h3 className="text-2xl md:text-3xl font-serif text-white">
              Beautifully Uncommercial Updates
            </h3>
          </div>
          
          <div className="space-y-4 mb-8 max-w-2xl mx-auto text-stone-300 text-sm md:text-base font-light leading-loose">
            <p>
              <strong className="text-white font-medium uppercase tracking-wide text-xs">Oxygen Notes:</strong> Honest thoughts, clarity tools, gratitude, and gently rebellious insight occasionally dispatched to your inbox with care and curation.
            </p>
            <p>
              Whether you’re growing a business, reclaiming your creative voice, or just want space to breathe and think differently, these notes are for you.
            </p>
          </div>
          
          {!submitted ? (
            <form onSubmit={handleSubmit} className="max-w-md mx-auto">
              <div className="flex flex-col gap-4">
                 <input 
                  type="email" 
                  id="email" 
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  className="w-full bg-stone-800 border border-stone-700 p-4 text-center focus:outline-none focus:border-clay text-white placeholder-stone-500 text-sm transition-colors" 
                />
                <button type="submit" className="w-full bg-white text-stone-900 py-4 uppercase tracking-widest text-[10px] font-bold hover:bg-clay hover:text-white transition-colors flex items-center justify-center gap-2">
                  Sign Up
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-stone-800 p-8 shadow-lg text-center max-w-md mx-auto border border-stone-700">
              <div className="w-10 h-10 bg-clay/20 text-clay rounded-full flex items-center justify-center mx-auto mb-3">
                ✓
              </div>
              <h4 className="text-lg font-serif text-white mb-2">Welcome to Oxygen Notes</h4>
              <p className="text-stone-400 text-sm">Your first update will arrive shortly.</p>
            </div>
          )}
      </div>
    </section>
  );
};

export default LeadMagnet;