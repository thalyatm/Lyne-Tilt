import React from 'react';
import { Link } from 'react-router-dom';

const ChessKnightIcon = ({ size = 40, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Cleaner Knight profile */}
    <path d="M19 17c0-4-2-6-4-7 1-2 1-3 1-3s-4-1-6 2c-1.5 2.5-1.5 5-1.5 5l-3 1v3h15v-1z" />
    <path d="M8 21h8" />
    <circle cx="13.5" cy="9.5" r="1" fill="currentColor" />
    <path d="M11 5c-2 0-4 2-4 5" />
  </svg>
);

const WearableArtIcon = ({ size = 40, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Abstract Mobile / Earring Structure */}
    <circle cx="12" cy="17" r="3" />
    <path d="M12 14v-8" />
    <path d="M7 6h10" />
    <path d="M7 6c0 3 2 4 2 4" />
    <path d="M17 6c0 3-2 4-2 4" />
  </svg>
);

const SplitPath = () => {
  return (
    <section className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 min-h-[400px]">
        {/* Shop Side - Light/Warm Design */}
        <div className="relative group flex flex-col items-center justify-center text-center p-10 bg-[#F5F5F4] hover:bg-[#EFEEEC] transition-colors duration-500 border-b md:border-b-0 md:border-r border-stone-200">
            <div className="mb-6 text-stone-400 group-hover:text-clay transition-colors duration-500 transform group-hover:-translate-y-1">
                <WearableArtIcon size={48} />
            </div>
            <p className="text-stone-500 text-[10px] uppercase tracking-widest mb-2">Handmade jewellery collection</p>
            <h2 className="text-2xl md:text-3xl font-serif text-stone-900 mb-4">Wearable Art</h2>
            <div className="w-12 h-px bg-stone-300 mb-4 group-hover:w-24 transition-all duration-500"></div>
            <p className="text-stone-600 mb-6 max-w-sm leading-relaxed">Discover unique handcrafted pieces that blend artistry with wearability</p>
            <Link to="/shop" className="inline-block px-8 py-3 bg-clay text-white rounded hover:bg-clay-dark transition-colors duration-300">
                Explore Collection
            </Link>
        </div>

        {/* Coaching Side - Minimalist/Strategic Design */}
        <div className="relative group flex flex-col items-center justify-center text-center p-10 bg-stone-50 hover:bg-stone-100 transition-colors duration-500">
            <div className="mb-6 text-stone-400 group-hover:text-stone-700 transition-colors duration-500 transform group-hover:-translate-y-1">
                <ChessKnightIcon size={48} />
            </div>
            <p className="text-stone-500 text-[10px] uppercase tracking-widest mb-2">Strategic creative development</p>
            <h2 className="text-2xl md:text-3xl font-serif text-stone-900 mb-4">Creative Coaching</h2>
            <div className="w-12 h-px bg-stone-300 mb-4 group-hover:w-24 transition-all duration-500"></div>
            <p className="text-stone-600 mb-6 max-w-sm leading-relaxed">Unlock your creative potential through personalized strategic guidance</p>
            <Link to="/coaching" className="inline-block px-8 py-3 bg-stone-800 text-white rounded hover:bg-stone-900 transition-colors duration-300">
                Learn More
            </Link>
        </div>
      </div>
    </section>
  );
};

export default SplitPath;
