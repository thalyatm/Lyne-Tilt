import React, { useState } from 'react';
import { Product } from '../types';
import { Link } from 'react-router-dom';
import { ShoppingBag, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const { addToCart, cart } = useCart();
  const isSoldOut = product.availability === 'Sold out';
  const isInCart = cart.some(item => item.id === product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSoldOut && !isInCart) {
      addToCart(product);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    }
  };

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

        {/* Add to Cart Button */}
        {!isSoldOut && (
          <button
            onClick={handleAddToCart}
            className={`absolute top-2 right-2 z-20 w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300 ${
              isInCart || justAdded
                ? 'bg-green-600 text-white'
                : 'bg-white/90 text-stone-700 hover:bg-clay hover:text-white shadow-sm'
            }`}
            title={isInCart ? 'In cart' : 'Add to cart'}
          >
            {isInCart || justAdded ? <Check size={18} /> : <ShoppingBag size={18} />}
          </button>
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
            alt={`${product.name} - alternate view`}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out scale-105 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
          />
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 pointer-events-none" />

        <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
           <span className="bg-white/95 backdrop-blur-md text-stone-900 px-6 py-3 text-xs uppercase tracking-widest shadow-sm font-bold">View Details</span>
        </div>
      </div>
      
      <div className="text-center group-hover:opacity-80 transition-opacity">
        <h3 className="text-lg font-serif text-stone-900 mb-2">
          {product.name}
        </h3>
        <p className="text-stone-800 font-bold text-base mb-1">${product.price} {product.currency}</p>
        {product.availability && <p className="text-[10px] text-clay font-medium uppercase tracking-wide">{product.availability}</p>}
      </div>
    </Link>
  );
};

export default ProductCard;