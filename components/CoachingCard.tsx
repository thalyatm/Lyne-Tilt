import React from 'react';
import { CoachingPackage } from '../types';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface CoachingCardProps {
  item: CoachingPackage;
}

const CoachingCard: React.FC<CoachingCardProps> = ({ item }) => {
  return (
    <div className="bg-white border border-stone-100 p-8 hover:shadow-xl transition-shadow duration-300 flex flex-col h-full text-center md:text-left">
      <h3 className="text-2xl font-serif text-stone-900 mb-4">{item.title}</h3>
      <p className="text-stone-600 mb-6 flex-grow leading-relaxed">{item.description}</p>
      <div className="mb-8">
        <ul className="text-sm text-stone-500 space-y-2">
          {item.features.map((feature, idx) => (
            <li key={idx} className="flex items-center md:items-start justify-center md:justify-start">
              <span className="mr-2 text-clay text-lg leading-none">•</span> {feature}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-auto pt-4">
        <Link 
          to="/coaching" 
          className="inline-flex items-center justify-center w-full md:w-auto bg-stone-900 text-white px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-clay transition-colors"
        >
          {item.ctaText} <ArrowRight size={14} className="ml-2" />
        </Link>
      </div>
    </div>
  );
};

export default CoachingCard;