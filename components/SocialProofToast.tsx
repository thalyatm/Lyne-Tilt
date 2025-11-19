import React, { useState, useEffect } from 'react';

const SocialProofToast = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show after 5 seconds
    const timer = setTimeout(() => setVisible(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-6 z-40 bg-white border border-stone-200 shadow-lg p-4 flex items-start gap-3 max-w-xs animate-fade-in-up rounded-sm">
      <div className="w-10 h-10 bg-stone-100 flex items-center justify-center shrink-0">
        <span className="text-xs font-serif font-bold text-stone-600">KP</span>
      </div>
      <div>
        <p className="text-xs text-stone-800 font-medium">Kate from Perth</p>
        <p className="text-xs text-stone-500">joined Concept to Create workshop</p>
        <p className="text-[10px] text-stone-400 mt-1">31 minutes ago</p>
      </div>
      <button 
        onClick={() => setVisible(false)} 
        className="text-stone-400 hover:text-stone-800 absolute top-2 right-2"
      >
        ×
      </button>
    </div>
  );
};

export default SocialProofToast;