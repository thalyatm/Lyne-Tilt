
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
    return `${item.title} (${item.price ?? ''})`;
  };

  const handleClick = () => {
    if (onApply) {
      onApply(getPackageLabel());
    } else {
      navigate('/coaching');
    }
  };

  // Calculate upfront savings for recurring packages
  const getUpfrontInfo = () => {
    if (!item.recurring || !item.priceAmount) return null;
    const monthly = parseFloat(item.priceAmount);
    if (isNaN(monthly)) return null;

    // Determine months from the description (e.g. "6-Month Commitment" or "12-Month Commitment")
    const monthMatch = item.description?.match(/(\d+)-month/i);
    if (!monthMatch) return null;
    const months = parseInt(monthMatch[1]);
    const fullPrice = monthly * months;
    const discountedPrice = Math.round(fullPrice * 0.9); // 10% off
    return { months, fullPrice, discountedPrice };
  };

  const upfront = getUpfrontInfo();

  return (
    <div className={`flex flex-col h-full bg-white border relative card-lift ${isPopular ? 'border-stone-800 shadow-md z-10' : 'border-stone-200'}`}>

      {isPopular && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-clay text-white text-[10px] uppercase tracking-widest font-bold px-4 py-1.5 shadow-sm">
          Most Popular
        </div>
      )}

      <div className="p-5 md:p-6 flex flex-col flex-grow">
        <h3 className="text-xl font-serif text-stone-900 mb-1 text-center">{item.title}</h3>

        {/* Commitment term */}
        <p className="text-center text-xs text-stone-500 uppercase tracking-wider mb-4">
          {item.description}
        </p>

        {/* Summary */}
        {item.summary && (
          <p className="text-center text-sm text-stone-600 leading-relaxed mb-5">
            {item.summary}
          </p>
        )}

        <div className="w-12 h-px bg-stone-200 mx-auto mb-4"></div>

        <ul className="space-y-2 mb-5 flex-grow">
          {item.features.map((feature, idx) => (
            <li key={idx} className="flex items-start text-sm text-stone-600 leading-snug">
              <Check size={14} className={`mt-0.5 mr-2 flex-shrink-0 ${isPopular ? 'text-clay' : 'text-stone-400'}`} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {/* Pricing section */}
        <div className="bg-stone-50 border border-stone-100 p-4 mb-4">
          <p className="text-[10px] uppercase tracking-widest text-stone-400 mb-2 text-center">Investment</p>
          {item.price && (
            <div className="text-center mb-1">
              <span className="text-3xl font-serif text-stone-900">{item.price}</span>
            </div>
          )}
          {upfront && (
            <p className="text-center text-xs text-stone-500 mt-2">
              or save 10% when you pay upfront:{' '}
              <span className="font-semibold text-stone-700">
                ${upfront.discountedPrice.toLocaleString()} total
              </span>
            </p>
          )}
        </div>

        <div className="mt-auto">
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
