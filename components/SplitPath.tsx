
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Hand, Compass, BookOpen } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

interface PathCardProps {
  icon: React.ReactNode;
  label: string;
  title: string;
  description: string;
  linkText: string;
  linkTo: string;
  variant: 'light' | 'dark' | 'accent';
}

const PathCard: React.FC<PathCardProps> = ({
  icon,
  label,
  title,
  description,
  linkText,
  linkTo,
  variant
}) => {
  const variants = {
    light: {
      bg: 'bg-stone-100',
      hoverBg: 'hover:bg-stone-200',
      cardBorder: 'border-stone-300',
      labelColor: 'text-stone-500',
      titleColor: 'text-stone-900',
      descColor: 'text-stone-600',
      iconColor: 'text-stone-400 group-hover:text-stone-600',
      lineColor: 'bg-stone-300',
      buttonBorder: 'border-stone-400',
      buttonText: 'text-stone-700',
      buttonHover: 'hover:bg-stone-900 hover:text-white hover:border-stone-900',
    },
    dark: {
      bg: 'bg-stone-900',
      hoverBg: 'hover:bg-stone-800',
      cardBorder: 'border-stone-950',
      labelColor: 'text-stone-500',
      titleColor: 'text-stone-100',
      descColor: 'text-stone-400',
      iconColor: 'text-stone-600 group-hover:text-stone-400',
      lineColor: 'bg-stone-700',
      buttonBorder: 'border-stone-600',
      buttonText: 'text-stone-300',
      buttonHover: 'hover:bg-white hover:text-stone-900 hover:border-white',
    },
    accent: {
      bg: 'bg-clay',
      hoverBg: 'hover:bg-clay-dark',
      cardBorder: 'border-clay-dark',
      labelColor: 'text-white/60',
      titleColor: 'text-white',
      descColor: 'text-white/80',
      iconColor: 'text-white/50 group-hover:text-white/80',
      lineColor: 'bg-white/30',
      buttonBorder: 'border-white/50',
      buttonText: 'text-white',
      buttonHover: 'hover:bg-white hover:text-clay hover:border-white',
    }
  };

  const v = variants[variant];

  return (
    <div className={`group relative flex flex-col items-center justify-center text-center p-8 md:p-12 ${v.bg} ${v.hoverBg} transition-all duration-500 shadow-lg hover:shadow-xl rounded-2xl border ${v.cardBorder}`}>
      {/* Icon */}
      <div className={`mb-6 ${v.iconColor} transition-all duration-500 transform group-hover:-translate-y-1`}>
        {icon}
      </div>

      {/* Label */}
      <p className={`${v.labelColor} text-[9px] uppercase tracking-[0.3em] mb-3`}>
        {label}
      </p>

      {/* Title */}
      <h2 className={`text-2xl md:text-3xl font-serif ${v.titleColor} mb-4`}>
        {title}
      </h2>

      {/* Decorative Line */}
      <div className={`w-10 h-px ${v.lineColor} mb-5 group-hover:w-16 transition-all duration-500`}></div>

      {/* Description */}
      <p className={`${v.descColor} mb-8 max-w-xs font-light leading-relaxed text-sm`}>
        {description}
      </p>

      {/* CTA Button */}
      <Link
        to={linkTo}
        className={`inline-flex items-center gap-2 border ${v.buttonBorder} ${v.buttonText} px-6 py-3 text-[9px] uppercase tracking-[0.2em] font-bold ${v.buttonHover} transition-all duration-300 group-hover:scale-105`}
      >
        {linkText}
        <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
};

const SplitPath = () => {
  const { settings } = useSettings();
  const { splitPath } = settings;

  // Icons mapped to card index
  const icons = [
    <Hand size={40} strokeWidth={1} />,
    <Compass size={40} strokeWidth={1} />,
    <BookOpen size={40} strokeWidth={1} />
  ];

  const variants: ('light' | 'dark' | 'accent')[] = ['light', 'dark', 'accent'];

  return (
    <section className="w-full bg-white">
      {/* Section Header */}
      <div className="py-10 text-center">
        <h2 className="text-2xl md:text-3xl font-serif text-stone-800">
          {splitPath.title}
        </h2>
      </div>

      {/* Three Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6 pb-12 max-w-7xl mx-auto">
        {splitPath.cards.map((card, index) => (
          <PathCard
            key={index}
            icon={icons[index] || icons[0]}
            label={card.label}
            title={card.title}
            description={card.description}
            linkText={card.linkText}
            linkTo={card.linkUrl}
            variant={variants[index] || 'light'}
          />
        ))}
      </div>
    </section>
  );
};

export default SplitPath;
