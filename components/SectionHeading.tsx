import React from 'react';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  alignment?: 'left' | 'center';
  light?: boolean;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({ title, subtitle, alignment = 'center', light = false }) => {
  const alignClass = alignment === 'center' ? 'text-center' : 'text-left';
  const titleColor = light ? 'text-stone-100' : 'text-stone-800';
  const subColor = light ? 'text-stone-300' : 'text-stone-500';

  return (
    <div className={`mb-10 ${alignClass}`}>
      <h2 className={`text-2xl md:text-3xl font-serif font-medium mb-3 ${titleColor}`}>
        {title}
      </h2>
      {subtitle && (
        <p className={`text-base font-light max-w-2xl mx-auto ${subColor}`}>
          {subtitle}
        </p>
      )}
      <div className={`h-px w-12 bg-clay mt-5 ${alignment === 'center' ? 'mx-auto' : ''}`}></div>
    </div>
  );
};

export default SectionHeading;