import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const Hero = () => {
  const { settings } = useSettings();
  const { hero } = settings;

  return (
    <section className="relative w-full overflow-hidden flex items-center lg:items-start min-h-[50vh] lg:min-h-[95vh] xl:min-h-[110vh] pt-28 md:pt-32 lg:pt-[14vh] xl:pt-[16vh] pb-28 md:pb-32">
      {/* Abstract Background Elements */}
      <div className="absolute inset-x-0 top-0 h-[60%] overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-10 left-20 w-64 h-64 border border-stone-200 rounded-full" />
        <div className="absolute top-1/3 right-1/4 w-2 h-32 bg-stone-200 rotate-45" />
      </div>

      {/* Centered Layout */}
      <div className="relative z-10 max-w-[90rem] mx-auto px-6 lg:px-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-0 items-center w-full">
          {/* Left: Image - Centered vertically */}
          <div className="relative flex justify-center items-center">
            <img
              src={hero.image || "https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/25307466-b400-4d67-bb64-8763bd9cc285/5.png?format=2500w"}
              alt="Lyne Tilt Art"
              className="w-full max-w-[280px] md:max-w-md lg:max-w-xs xl:max-w-md h-auto object-cover rounded-3xl"
            />
          </div>

          {/* Right: Content - Left aligned */}
          <div className="relative text-center lg:text-left px-6 lg:px-0 py-8 flex flex-col items-center lg:items-start justify-center">
            {/* Headline */}
            <h1 className="font-serif text-stone-900 mb-6 relative leading-[1.1]">
              <span className="block text-4xl md:text-5xl lg:text-4xl xl:text-6xl tracking-tighter animate-fade-in-up mix-blend-darken">
                {hero.headline}
              </span>
              <span className="block text-4xl md:text-5xl lg:text-4xl xl:text-6xl italic font-light text-clay mt-2 animate-fade-in-up delay-100 tracking-wide">
                {hero.tagline}
              </span>
            </h1>

            {/* Value Proposition */}
            <p className="text-stone-600 text-base md:text-lg lg:text-lg font-light mb-4 max-w-lg leading-relaxed animate-fade-in-up delay-200">
              {hero.subtitle}
            </p>

            {/* Subheading */}
            <p className="text-stone-400 text-xs lg:text-sm font-light mb-8 max-w-lg leading-relaxed tracking-wide animate-fade-in-up delay-250 uppercase">
              {hero.metaTags}
            </p>

            {/* CTA */}
            <div className="animate-fade-in-up delay-300">
              <Link
                to="/coaching"
                className="group relative overflow-hidden bg-stone-900 text-white px-8 py-3 md:px-10 md:py-4 text-[10px] uppercase tracking-[0.25em] font-bold transition-all shadow-xl shadow-stone-200/50 hover:shadow-stone-300 text-center inline-flex items-center gap-3 rounded-lg"
              >
                <span className="relative z-10 group-hover:text-white transition-colors duration-500">Book a 15-Minute Strategy Call</span>
                <ArrowRight size={12} className="relative z-10" />
                <div className="absolute inset-0 bg-clay transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator - bottom center */}
      <div className="hidden lg:flex absolute bottom-[9vh] xl:bottom-[11vh] left-1/2 -translate-x-1/2 z-20">
        <div className="flex flex-col items-center gap-2 animate-bounce-gentle">
          <span className="text-[9px] uppercase tracking-[0.3em] text-stone-400 font-light">Scroll</span>
          <div className="w-5 h-8 border border-stone-300 rounded-full flex justify-center pt-1.5">
            <div className="w-1 h-2 bg-stone-400 rounded-full animate-scroll-dot" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
