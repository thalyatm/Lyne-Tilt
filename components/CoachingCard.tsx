import React from 'react';
import { CoachingPackage } from '../types';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';

interface CoachingCardProps {
  item: CoachingPackage;
}

const CoachingCard: React.FC<CoachingCardProps> = ({ item }) => {
  const isPopular = item.badge === 'MOST POPULAR';

  return (
    <div className={`flex flex-col h-full bg-white border relative transition-all duration-300 hover:shadow-xl ${isPopular ? 'border-stone-800 shadow-md z-10' : 'border-stone-200'}`}>
      
      {isPopular && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-stone-900 text-white text-[10px] uppercase tracking-widest font-bold px-4 py-1.5 shadow-sm">
          Most Popular
        </div>
      )}

      <div className="p-8 md:p-10 flex flex-col flex-grow">
        <h3 className="text-xl font-serif text-stone-900 mb-4 text-center">{item.title}</h3>
        
        {item.price && (
          <div className="text-center mb-2">
            <span className="text-4xl md:text-5xl font-serif text-stone-900">{item.price}</span>
          </div>
        )}
        
        <p className="text-center text-xs text-stone-500 uppercase tracking-wider mb-8 h-6">
          {item.description}
        </p>

        <div className="w-12 h-px bg-stone-200 mx-auto mb-8"></div>

        <ul className="space-y-4 mb-8 flex-grow">
          {item.features.map((feature, idx) => (
            <li key={idx} className="flex items-start text-sm text-stone-600 leading-relaxed">
              <Check size={14} className={`mt-1 mr-3 flex-shrink-0 ${isPopular ? 'text-stone-900' : 'text-clay'}`} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-4">
          <Link 
            to="/coaching" 
            className={`flex items-center justify-center w-full py-4 text-[10px] uppercase tracking-widest font-bold transition-colors border ${
              isPopular 
                ? 'bg-stone-900 text-white border-stone-900 hover:bg-white hover:text-stone-900' 
                : 'bg-transparent text-stone-900 border-stone-300 hover:border-stone-900'
            }`}
          >
            {item.ctaText}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CoachingCard;