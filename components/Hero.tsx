import React from 'react';
import { Link } from 'react-router-dom';

const Hero = () => {
  return (
    <section className="relative min-h-[65vh] w-full flex items-center justify-center overflow-hidden bg-[#FAFAF9] py-16">
      {/* Abstract Background Art */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none">
        {/* Geometric Interplay - More circles for balance */}
        <div className="absolute top-[15%] right-[10%] w-96 h-96 rounded-full border-[0.5px] border-stone-300/40 animate-[spin_120s_linear_infinite]"></div>
        <div className="absolute top-[25%] right-[15%] w-64 h-64 rounded-full border border-stone-300/20 animate-[spin_90s_linear_infinite_reverse]"></div>
        
        {/* Added Left/Bottom circles */}
        <div className="absolute bottom-[10%] left-[5%] w-80 h-80 rounded-full border-[0.5px] border-stone-300/30 animate-[spin_100s_linear_infinite]"></div>
        <div className="absolute top-[40%] left-[15%] w-48 h-48 rounded-full border border-stone-300/10 animate-[spin_80s_linear_infinite_reverse]"></div>
        <div className="absolute -bottom-[10%] right-[30%] w-[500px] h-[500px] rounded-full border-[0.5px] border-stone-200/40 animate-[spin_140s_linear_infinite]"></div>
        
        {/* Soft Focus Blur */}
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-clay/5 rounded-full blur-3xl mix-blend-multiply"></div>
      </div>

      {/* Main Content Layer */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto flex flex-col items-center">
        
        {/* Top Label */}
        <div className="mb-6 flex flex-col items-center gap-4 animate-fade-in">
             <div className="h-12 w-px bg-gradient-to-b from-stone-200 to-stone-400"></div>
             <p className="text-stone-500 text-[10px] uppercase tracking-[0.5em] font-medium pl-1">Lyne Tilt Studio</p>
        </div>
        
        {/* Headline - Equal Font Sizes */}
        <h1 className="font-serif text-stone-900 mb-8 relative leading-[1.1]">
          <span className="block text-4xl md:text-7xl lg:text-8xl tracking-tighter animate-fade-in-up mix-blend-darken">
            Art is Oxygen.
          </span>
          <span className="block text-4xl md:text-7xl lg:text-8xl italic font-light text-stone-400 mt-2 animate-fade-in-up delay-100 tracking-wide">
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
          Wearable Artifacts <span className="mx-2 text-stone-300">/</span> Strategic Coaching
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
            className="group relative overflow-hidden border border-stone-300 bg-transparent text-stone-600 px-10 py-3 text-[10px] uppercase tracking-[0.25em] font-bold transition-all min-w-[240px] hover:border-stone-900"
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