
import React from 'react';
import { Link } from 'react-router-dom';

// Custom Aesthetic Icons

const ChessPawnIcon = ({ size = 40, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.2" 
    strokeLinecap="square" 
    strokeLinejoin="miter" 
    className={className}
  >
    {/* Minimalist Geometric Pawn */}
    <circle cx="12" cy="5" r="2.5" />
    <path d="M12 7.5V10" />
    <path d="M9 10H15" />
    <path d="M9.5 10L8 18H16L14.5 10" />
    <path d="M6 21H18" />
    <path d="M8 18L6 21" />
    <path d="M16 18L18 21" />
  </svg>
);

const WearableArtIcon = ({ size = 40, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2" 
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Structured Mobile / Earring Art */}
    <path d="M12 2V5" />
    <circle cx="12" cy="8" r="3" />
    <path d="M12 11V15" />
    <path d="M9 18C9 16.3431 10.3431 15 12 15C13.6569 15 15 16.3431 15 18V21" />
  </svg>
);

const SplitPath = () => {
  return (
    <section className="w-full">
      {/* Reduced min-height to make it approx 1/3 shorter */}
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[380px]">
        {/* Shop Side - Stone 500 background */}
        <div className="relative group flex flex-col items-center justify-center text-center p-10 bg-stone-500 hover:bg-stone-600 transition-colors duration-700 border-b md:border-b-0 md:border-r border-stone-400/20">
            <div className="mb-6 text-stone-200 group-hover:text-white transition-colors duration-500 transform group-hover:-translate-y-2 scale-110">
                <WearableArtIcon size={56} />
            </div>
            <p className="text-stone-300 text-[9px] uppercase tracking-[0.3em] mb-3">Handmade jewellery collection</p>
            <h2 className="text-3xl md:text-4xl font-serif text-stone-100 mb-4">Wearable Art</h2>
            <div className="w-12 h-px bg-stone-300/50 mb-6 group-hover:w-24 transition-all duration-700"></div>
            <p className="text-stone-200 mb-8 max-w-xs font-light leading-loose text-sm md:text-base">
              Objects of contemplation. <br/>Earth-toned ceramics and structured metals.
            </p>
            <Link
              to="/shop"
              className="inline-block border border-stone-300 text-stone-100 px-8 py-3 text-[9px] uppercase tracking-[0.25em] font-bold hover:bg-white hover:text-stone-900 transition-all hover:scale-105"
            >
              View Collection
            </Link>
        </div>

        {/* Coaching Side - Dark Stone 900 */}
        <div className="relative group flex flex-col items-center justify-center text-center p-10 bg-stone-900 hover:bg-[#111] transition-colors duration-700">
            <div className="mb-6 text-stone-400 group-hover:text-clay transition-colors duration-500 transform group-hover:-translate-y-2 scale-110">
               <ChessPawnIcon size={56} />
            </div>
             {/* Lightened text for better readability */}
             <p className="text-stone-400 text-[9px] uppercase tracking-[0.3em] mb-3">For creative founders</p>
            <h2 className="text-3xl md:text-4xl font-serif text-stone-100 mb-4">Strategic Coaching</h2>
            <div className="w-12 h-px bg-stone-700 mb-6 group-hover:w-24 transition-all duration-700"></div>
            {/* Lightened description text */}
            <p className="text-stone-300 mb-8 max-w-xs font-light leading-loose text-sm md:text-base">
              Move from chaos to clarity. <br/>Systems and psychology for the artist.
            </p>
             {/* Lighter button text and border */}
             <Link
              to="/coaching"
              className="inline-block border border-stone-600 text-stone-300 px-8 py-3 text-[9px] uppercase tracking-[0.25em] font-bold hover:border-clay hover:text-clay transition-all hover:scale-105"
            >
              Explore Coaching
            </Link>
        </div>
      </div>
    </section>
  );
};

export default SplitPath;
