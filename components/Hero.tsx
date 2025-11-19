import React from 'react';
import { Link } from 'react-router-dom';

const Hero = () => {
  return (
    <section className="relative min-h-[50vh] w-full flex items-center justify-center overflow-hidden bg-[#FAFAF9] pt-12 pb-6">
      {/* Abstract Design Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large Circle representing Oxygen/Whole */}
        <div className="absolute -right-24 -top-24 w-[350px] h-[350px] rounded-full border-[1px] border-stone-200/60 opacity-60 animate-pulse duration-[10000ms]" />
        <div className="absolute -right-12 -top-12 w-[200px] h-[200px] rounded-full border-[1px] border-stone-300/40 opacity-60" />
        
        {/* Diagonal Line representing Tilt/Action */}
        <div className="absolute top-0 left-1/4 w-[1px] h-full bg-stone-200 transform -skew-x-12 opacity-50" />
        <div className="absolute top-0 right-1/4 w-[1px] h-full bg-stone-200 transform -skew-x-12 opacity-50" />
        
        {/* Organic blob for warmth */}
        <div className="absolute bottom-[-10%] left-[-10%] w-[250px] h-[250px] bg-clay/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto animate-fade-in-up">
        <p className="text-stone-400 text-[9px] md:text-[10px] uppercase tracking-[0.4em] mb-4">Lyne Tilt Studio</p>
        
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-stone-900 mb-4 leading-[1] tracking-tight">
          Art is Oxygen. <br/>
          <span className="italic font-light text-stone-500">Clarity is Power.</span>
        </h1>
        
        {/* Decorative small line */}
        <div className="w-10 h-px bg-stone-300 mx-auto mb-6"></div>

        <p className="text-stone-600 text-sm md:text-base font-light mb-8 max-w-lg mx-auto leading-relaxed">
          Wearable Art + Creative Coaching for People Building Something Meaningful.
        </p>
        
        <div className="flex flex-col md:flex-row gap-4 justify-center w-full md:w-auto items-center">
          <Link
            to="/shop"
            className="bg-stone-900 text-white border border-stone-900 px-8 py-3 text-[10px] md:text-xs uppercase tracking-[0.2em] font-bold hover:bg-white hover:text-stone-900 transition-all min-w-[200px]"
          >
            Shop Collection
          </Link>
          <Link
            to="/coaching"
            className="bg-transparent border border-stone-300 text-stone-900 px-8 py-3 text-[10px] md:text-xs uppercase tracking-[0.2em] font-bold hover:border-stone-900 transition-all min-w-[200px]"
          >
            Book Coaching
          </Link>
        </div>
        
        {/* Connecting Line Animation */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 opacity-50">
          <div className="w-px h-6 bg-gradient-to-b from-stone-300 to-stone-200"></div>
        </div>
      </div>
    </section>
  );
};

export default Hero;