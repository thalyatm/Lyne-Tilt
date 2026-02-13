import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const Hero = () => {
  const { settings } = useSettings();
  const { hero } = settings;

  return (
    <section className="relative w-full overflow-hidden flex items-center min-h-[50vh] pt-28 md:pt-32 pb-28 md:pb-32">
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
              src={hero.image || "https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/25307466-b400-4d67-bb64-8763bd9cc285/5.png?format=2500w"}
              alt="Lyne Tilt Art"
              className="w-full max-w-md h-auto object-cover rounded-3xl"
            />
          </div>

          {/* Right: Content - Left aligned */}
          <div className="relative text-left px-6 py-8 flex flex-col items-start justify-center">
            {/* Headline */}
            <h1 className="font-serif text-stone-900 mb-6 relative leading-[1.1]">
              <span className="block text-3xl md:text-5xl lg:text-6xl tracking-tighter animate-fade-in-up mix-blend-darken">
                {hero.headline}
              </span>
              <span className="block text-3xl md:text-5xl lg:text-6xl italic font-light text-clay mt-2 animate-fade-in-up delay-100 tracking-wide">
                {hero.tagline}
              </span>
            </h1>

            {/* Value Proposition */}
            <p className="text-stone-600 text-base md:text-lg font-light mb-4 max-w-md leading-relaxed animate-fade-in-up delay-200">
              {hero.subtitle}
            </p>

            {/* Subheading */}
            <p className="text-stone-400 text-xs font-light mb-8 max-w-md leading-relaxed tracking-wide animate-fade-in-up delay-250 uppercase">
              {hero.metaTags}
            </p>

            {/* Buttons - Clear hierarchy */}
            <div className="flex flex-col md:flex-row gap-4 justify-start w-full md:w-auto items-start animate-fade-in-up delay-300">
              <Link
                to={hero.primaryCta.link}
                className="group relative overflow-hidden bg-stone-900 text-white px-10 py-4 text-[10px] uppercase tracking-[0.25em] font-bold transition-all shadow-xl shadow-stone-200/50 hover:shadow-stone-300 text-center"
              >
                <span className="relative z-10 group-hover:text-stone-900 transition-colors duration-500">{hero.primaryCta.text}</span>
                <div className="absolute inset-0 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left cubic-bezier(0.19, 1, 0.22, 1)"></div>
              </Link>

              <Link
                to={hero.secondaryCta.link}
                className="text-stone-500 px-4 py-4 text-[10px] uppercase tracking-[0.2em] font-medium hover:text-stone-900 transition-colors text-center inline-flex items-center gap-2"
              >
                {hero.secondaryCta.text} <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
