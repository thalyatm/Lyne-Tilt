import React from 'react';
import { Link } from 'react-router-dom';

const Hero = () => {
  return (
    <section className="relative w-full overflow-hidden flex items-center min-h-[50vh] pt-16 md:pt-20 pb-2 md:pb-3">
      {/* Abstract Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-10 left-20 w-64 h-64 border border-stone-200 rounded-full" />
        <div className="absolute bottom-20 right-10 w-96 h-96 border border-stone-200 rounded-full" />
        <div className="absolute top-1/3 right-1/4 w-2 h-32 bg-stone-200 rotate-45" />
      </div>

      {/* Centered Layout */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
          {/* Left: Image - Centered vertically */}
          <div className="relative flex justify-center items-center">
            <img
              src="https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/25307466-b400-4d67-bb64-8763bd9cc285/5.png?format=2500w"
              alt="Lyne Tilt Art"
              className="w-full max-w-md h-auto object-cover rounded-3xl"
            />
          </div>

          {/* Right: Content - Left aligned */}
          <div className="relative text-left px-6 py-8 flex flex-col items-start justify-center">
            {/* Top Label */}
            <p className="text-stone-500 text-[10px] uppercase tracking-[0.5em] font-medium mb-6 animate-fade-in">Lyne Tilt</p>

            {/* Headline */}
            <h1 className="font-serif text-stone-900 mb-8 relative leading-[1.1]">
              <span className="block text-3xl md:text-5xl lg:text-6xl tracking-tighter animate-fade-in-up mix-blend-darken">
                Art is Oxygen.
              </span>
              <span className="block text-3xl md:text-5xl lg:text-6xl italic font-light text-clay mt-2 animate-fade-in-up delay-100 tracking-wide">
                Clarity is Power.
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-stone-600 text-xs md:text-sm font-light mb-10 max-w-md leading-loose tracking-widest animate-fade-in-up delay-200 uppercase">
              Wearable Art <span className="mx-2 text-stone-300">/</span> Strategic Coaching
            </p>

            {/* Buttons */}
            <div className="flex flex-col md:flex-row gap-6 justify-start w-full md:w-auto items-start animate-fade-in-up delay-300">
              <Link
                to="/shop"
                className="group relative overflow-hidden bg-stone-900 text-white px-10 py-3 text-[10px] uppercase tracking-[0.25em] font-bold transition-all shadow-xl shadow-stone-200/50 hover:shadow-stone-300 text-center"
              >
                <span className="relative z-10 group-hover:text-stone-900 transition-colors duration-500">Shop Collection</span>
                <div className="absolute inset-0 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left cubic-bezier(0.19, 1, 0.22, 1)"></div>
              </Link>

              <Link
                to="/coaching"
                className="group relative overflow-hidden border border-stone-300 bg-white/50 text-stone-600 px-10 py-3 text-[10px] uppercase tracking-[0.25em] font-bold transition-all hover:border-stone-900 backdrop-blur-sm text-center"
              >
                <span className="relative z-10 group-hover:text-white transition-colors duration-500">Book Coaching</span>
                <div className="absolute inset-0 bg-stone-900 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left cubic-bezier(0.19, 1, 0.22, 1)"></div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
