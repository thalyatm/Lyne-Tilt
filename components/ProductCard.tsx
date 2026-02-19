import React, { useState } from 'react';
import { Product } from '../types';
import { Link } from 'react-router-dom';
import { ShoppingBag, Check, Heart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { resolveImageUrl } from '../config/api';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const { addToCart, removeFromCart, cart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { isAuthenticated, openAuthModal } = useCustomerAuth();
  const isSoldOut = product.availability === 'Sold out';
  const isInCart = cart.some(item => item.id === product.id);
  const isOnSale = product.compareAtPrice && product.compareAtPrice < product.price;
  const wishlisted = isInWishlist(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSoldOut) {
      if (isInCart) {
        removeFromCart(product.id);
      } else {
        // Use sale price if applicable
        const effectiveProduct = isOnSale
          ? { ...product, price: product.compareAtPrice! }
          : product;
        addToCart(effectiveProduct);
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 2000);
      }
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
        {(product.badge || isOnSale) && (
          <span className={`absolute top-2 left-2 text-white px-2 py-1 text-[10px] uppercase tracking-widest z-10 ${isOnSale && !product.badge ? 'bg-clay/90' : 'bg-stone-900/90'}`}>
            {product.badge || 'Sale'}
          </span>
        )}

        {isSoldOut && (
          <span className="absolute top-2 right-2 bg-stone-400/90 text-white px-3 py-1 text-[10px] uppercase tracking-widest z-10 font-bold">
            Sold Out
          </span>
        )}

        {/* Wishlist + Cart Buttons */}
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isAuthenticated) {
                openAuthModal('login');
                return;
              }
              toggleWishlist(product.id);
            }}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300 ${
              wishlisted
                ? 'bg-clay text-white'
                : 'bg-white/90 text-stone-700 hover:bg-clay hover:text-white shadow-sm'
            }`}
            title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart size={18} className={wishlisted ? 'fill-white' : ''} />
          </button>
          {!isSoldOut && (
            <button
              onClick={handleAddToCart}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300 ${
                isInCart || justAdded
                  ? 'bg-green-600 text-white'
                  : 'bg-white/90 text-stone-700 hover:bg-clay hover:text-white shadow-sm'
              }`}
              title={isInCart ? 'Remove from cart' : 'Add to cart'}
            >
              {isInCart || justAdded ? <Check size={18} /> : <ShoppingBag size={18} />}
            </button>
          )}
        </div>

        {/* Primary Image */}
        <img
          src={resolveImageUrl(product.image)}
          alt={product.name}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out ${isHovered && product.detailImages.length > 0 ? 'opacity-0' : 'opacity-100'}`}
        />

        {/* Secondary Image (revealed on hover) */}
        {product.detailImages.length > 0 && (
           <img
            src={resolveImageUrl(product.detailImages[0])}
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
        {isOnSale ? (
          <p className="text-base mb-1">
            <span className="line-through text-stone-400 font-normal mr-2">${product.price}</span>
            <span className="text-clay font-bold">${product.compareAtPrice} {product.currency}</span>
          </p>
        ) : (
          <p className="text-stone-800 font-bold text-base mb-1">${product.price} {product.currency}</p>
        )}
        {product.availability && <p className="text-[10px] text-clay font-medium uppercase tracking-wide">{product.availability}</p>}
      </div>
    </Link>
  );
};

export default ProductCard;