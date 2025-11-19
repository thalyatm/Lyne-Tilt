import React, { useState } from 'react';
import { Product } from '../types';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isSoldOut = product.availability === 'Sold out';

  return (
    <Link
      to={`/shop/${product.id}`}
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`relative overflow-hidden bg-stone-200 aspect-[4/5] mb-4 ${isSoldOut ? 'opacity-60 grayscale-[50%]' : ''}`}>
        {product.badge && (
          <span className="absolute top-2 left-2 bg-stone-900/90 text-white px-2 py-1 text-[10px] uppercase tracking-widest z-20">
            {product.badge}
          </span>
        )}

        {isSoldOut && (
          <span className="absolute top-2 right-2 bg-stone-400/90 text-white px-3 py-1 text-[10px] uppercase tracking-widest z-20 font-bold">
            Sold Out
          </span>
        )}

        {/* Primary Image */}
        <img
          src={product.image}
          alt={product.name}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out ${isHovered && product.detailImages.length > 0 ? 'opacity-0' : 'opacity-100'}`}
        />

        {/* Secondary Image (revealed on hover) */}
        {product.detailImages.length > 0 && (
           <img
            src={product.detailImages[0]}
            alt={`${product.name} detail`}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out scale-105 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
          />
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 pointer-events-none" />
        
        <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
           <span className="bg-white/95 backdrop-blur-md text-stone-900 px-6 py-3 text-xs uppercase tracking-widest shadow-sm font-bold">View Details</span>
        </div>
      </div>
      
      <div className="text-center group-hover:opacity-80 transition-opacity">
        {product.rating && (
          <div className="flex justify-center gap-0.5 mb-2 text-stone-800">
             {[...Array(5)].map((_, i) => (
               <Star key={i} size={10} fill={i < Math.round(product.rating!) ? "currentColor" : "none"} className="text-stone-800" />
             ))}
             {product.reviewCount && <span className="text-[10px] text-stone-400 ml-1">({product.reviewCount})</span>}
          </div>
        )}
        <h3 className="text-lg font-serif text-stone-900 mb-1">
          {product.name}
        </h3>
        <p className="text-xs text-stone-500 mb-2 line-clamp-2 px-4 h-8">{product.shortDescription}</p>
        {product.availability && <p className="text-[10px] text-clay mb-1 font-medium uppercase tracking-wide">{product.availability}</p>}
        <p className="text-stone-800 font-bold text-sm">${product.price} {product.currency}</p>
      </div>
    </Link>
  );
};

export default ProductCard;