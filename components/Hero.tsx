import React from 'react';
import { Link } from 'react-router-dom';

const Hero = () => {
  return (
    <section className="relative min-h-[65vh] w-full flex items-center justify-center overflow-hidden py-16">
      {/* Background logic moved to GlobalBackground component for site-wide consistency */}
      
      {/* Main Content Layer */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto flex flex-col items-center">
        
        {/* Top Label */}
        <div className="mb-6 flex flex-col items-center gap-4 animate-fade-in">
             <div className="h-12 w-px bg-gradient-to-b from-stone-300 to-stone-400"></div>
             <p className="text-stone-500 text-[10px] uppercase tracking-[0.5em] font-medium pl-1">Lyne Tilt Studio</p>
        </div>
        
        {/* Headline - Equal Font Sizes */}
        <h1 className="font-serif text-stone-900 mb-8 relative leading-[1.1]">
          <span className="block text-4xl md:text-7xl lg:text-8xl tracking-tighter animate-fade-in-up mix-blend-darken">
            Art is Oxygen.
          </span>
          <span className="block text-4xl md:text-7xl lg:text-8xl italic font-light text-clay mt-2 animate-fade-in-up delay-100 tracking-wide">
            Clarity is Power.
          </span>
        </h1>
        
        {/* Abstract Separator */}
        <div className="flex items-center gap-4 mb-8 opacity-60">
            <span className="h-px w-12 bg-stone-300"></span>
            <div className="w-2 h-2 border border-stone-400 rotate-45"></div>
            <span className="h-px w-12 bg-stone-300"></span>
        </div>

        {/* Subheading */}
        <p className="text-stone-600 text-xs md:text-sm font-light mb-10 max-w-md mx-auto leading-loose tracking-widest animate-fade-in-up delay-200 uppercase">
          Wearable Art <span className="mx-2 text-stone-300">/</span> Strategic Coaching
        </p>
        
        {/* Buttons */}
        <div className="flex flex-col md:flex-row gap-6 justify-center w-full md:w-auto items-center animate-fade-in-up delay-300">
          <Link
            to="/shop"
            className="group relative overflow-hidden bg-stone-900 text-white px-10 py-3 text-[10px] uppercase tracking-[0.25em] font-bold transition-all min-w-[240px] shadow-xl shadow-stone-200/50 hover:shadow-stone-300"
          >
            <span className="relative z-10 group-hover:text-stone-900 transition-colors duration-500">Shop Collection</span>
            <div className="absolute inset-0 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left cubic-bezier(0.19, 1, 0.22, 1)"></div>
          </Link>
          
          <Link
            to="/coaching"
            className="group relative overflow-hidden border border-stone-300 bg-white/50 text-stone-600 px-10 py-3 text-[10px] uppercase tracking-[0.25em] font-bold transition-all min-w-[240px] hover:border-stone-900 backdrop-blur-sm"
          >
            <span className="relative z-10 group-hover:text-white transition-colors duration-500">Book Coaching</span>
            <div className="absolute inset-0 bg-stone-900 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left cubic-bezier(0.19, 1, 0.22, 1)"></div>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Hero;