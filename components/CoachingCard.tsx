
import React from 'react';
import { CoachingPackage } from '../types';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CoachingCardProps {
  item: CoachingPackage;
  onApply?: (packageName: string) => void;
}

const CoachingCard: React.FC<CoachingCardProps> = ({ item, onApply }) => {
  const isPopular = item.badge === 'MOST POPULAR';
  const navigate = useNavigate();

  const getPackageLabel = () => {
    if (item.title === 'Single Session') return 'Single Session ($250)';
    if (item.title === 'Monthly Coaching') return 'Monthly Coaching ($800/month)';
    if (item.title === 'Creative Intensive') return 'Creative Intensive ($2,200)';
    return item.title;
  };

  const handleClick = () => {
    if (onApply) {
      onApply(getPackageLabel());
    } else {
      navigate('/coaching');
    }
  };

  return (
    <div className={`flex flex-col h-full bg-white border relative card-lift ${isPopular ? 'border-stone-800 shadow-md z-10' : 'border-stone-200'}`}>

      {isPopular && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-clay text-white text-[10px] uppercase tracking-widest font-bold px-4 py-1.5 shadow-sm">
          Most Popular
        </div>
      )}

      <div className="p-5 md:p-6 flex flex-col flex-grow">
        <h3 className="text-xl font-serif text-stone-900 mb-2 text-center">{item.title}</h3>

        {item.price && (
          <div className="text-center mb-2">
            <span className="text-4xl md:text-5xl font-serif text-stone-900">{item.price}</span>
          </div>
        )}

        <p className="text-center text-xs text-stone-500 uppercase tracking-wider mb-3 h-6">
          {item.description}
        </p>

        <div className="w-12 h-px bg-stone-200 mx-auto mb-3"></div>

        <ul className="space-y-1.5 mb-4 flex-grow">
          {item.features.map((feature, idx) => (
            <li key={idx} className="flex items-start text-sm text-stone-600 leading-snug">
              <Check size={14} className={`mt-0.5 mr-2 flex-shrink-0 ${isPopular ? 'text-clay' : 'text-stone-400'}`} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-2">
          <button
            onClick={handleClick}
            aria-label={`Learn more about ${item.title}`}
            className="flex items-center justify-center w-full py-3 text-[10px] uppercase tracking-widest font-bold transition-colors border bg-clay text-white border-clay hover:bg-clay-dark"
          >
            {item.ctaText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoachingCard;
