
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const SplitPath = () => {
  const { settings } = useSettings();
  const { splitPath } = settings;

  return (
    <section className="w-full py-16 md:py-24 px-6 bg-stone-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-serif text-stone-900 text-center mb-8 md:mb-14">
          {splitPath.title}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {splitPath.cards.map((card, index) => (
            <div
              key={index}
              className="group flex flex-col bg-white border border-stone-200 rounded-2xl p-5 md:p-6 text-center md:text-left items-center md:items-start hover:border-stone-300 hover:shadow-lg transition-all duration-500"
            >
              {/* Clay accent line + label */}
              <div className="mb-3">
                <div className="w-6 h-[2px] bg-clay/40 group-hover:w-10 group-hover:bg-clay transition-all duration-500 mb-3 mx-auto md:mx-0" />
                <p className="text-[10px] uppercase tracking-[0.25em] text-stone-400">
                  {card.label}
                </p>
              </div>

              {/* Title */}
              <h3 className="text-2xl font-serif text-stone-900 mb-2 group-hover:text-clay transition-colors duration-300">
                {card.title}
              </h3>

              {/* Divider */}
              <div className="h-px w-full bg-stone-200 mb-3" />

              {/* Description */}
              <p className="text-sm font-light text-stone-500 leading-relaxed mb-5 flex-grow">
                {card.description}
              </p>

              {/* Link */}
              <Link
                to={card.linkUrl}
                className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-stone-900 hover:text-clay transition-colors duration-300 mt-auto"
              >
                {card.linkText}
                <ArrowRight size={12} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SplitPath;
