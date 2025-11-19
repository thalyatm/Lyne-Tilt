import React, { useState } from 'react';
import { Mail } from 'lucide-react';

const LeadMagnet = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // API call would go here
  };

  return (
    <section className="bg-stone-200 py-16 px-6">
      <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-2xl font-serif text-stone-800 mb-3">
            Get 7 Creative Prompts
          </h3>
          <p className="text-stone-600 mb-6 text-base leading-relaxed max-w-lg mx-auto">
            Receive a free downloadable PDF with powerful prompts designed to reignite your creative practice.
          </p>
          
          {!submitted ? (
            <form onSubmit={handleSubmit} className="max-w-sm mx-auto">
              <div className="flex flex-col gap-3">
                 <input 
                  type="email" 
                  id="email" 
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  className="w-full bg-white border border-stone-300 p-3 text-center focus:outline-none focus:border-clay text-sm" 
                />
                <button type="submit" className="w-full bg-stone-800 text-white py-3 uppercase tracking-widest text-[10px] font-bold hover:bg-clay transition-colors flex items-center justify-center gap-2">
                  <Mail size={14} /> Send Me The Prompts
                </button>
              </div>
              <p className="text-[10px] text-stone-500 mt-3">No spam. Just creativity & clarity.</p>
            </form>
          ) : (
            <div className="bg-white p-6 shadow-lg text-center max-w-md mx-auto">
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                ✓
              </div>
              <h4 className="text-lg font-serif text-stone-800 mb-1">It's on the way!</h4>
              <p className="text-stone-600 text-sm">Check your inbox.</p>
            </div>
          )}
      </div>
    </section>
  );
};

export default LeadMagnet;