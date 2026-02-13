
import React, { useState, useEffect, useCallback } from 'react';

interface SubNavItem {
  id: string;
  label: string;
}

interface SubNavProps {
  items: SubNavItem[];
}

const SubNav: React.FC<SubNavProps> = ({ items }) => {
  const [activeSection, setActiveSection] = useState<string>(items[0]?.id || '');

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    items.forEach(item => {
      const element = document.getElementById(item.id);
      if (element) {
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              setActiveSection(item.id);
            }
          },
          { threshold: 0.15, rootMargin: '-140px 0px -50% 0px' }
        );
        observer.observe(element);
        observers.push(observer);
      }
    });

    return () => observers.forEach(o => o.disconnect());
  }, [items]);

  const scrollToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 130;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
    }
  }, []);

  return (
    <div className="fixed left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-stone-200 z-40 top-[72px]">
      <div className="max-w-7xl mx-auto px-6">
        <nav className="flex justify-center gap-8 py-3 overflow-x-auto scrollbar-hide">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`text-[10px] uppercase tracking-widest font-medium transition-colors whitespace-nowrap relative pb-1 ${
                activeSection === item.id
                  ? 'text-clay'
                  : 'text-stone-500 hover:text-clay'
              }`}
            >
              {item.label}
              <span
                className={`absolute bottom-0 left-0 w-full h-0.5 bg-clay transition-all duration-300 ${
                  activeSection === item.id ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
                }`}
              />
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default SubNav;
