import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../types';
import { trackEvent } from '../lib/analytics';

interface CartItem extends Product {
  quantity: number;
}

interface CartNotification {
  product: Product;
  timestamp: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
  cartNotification: CartNotification | null;
  dismissNotification: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartNotification, setCartNotification] = useState<CartNotification | null>(null);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('lynetilt_cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('lynetilt_cart', JSON.stringify(cart));
  }, [cart]);

  // Auto-dismiss notification after 4 seconds
  useEffect(() => {
    if (!cartNotification) return;
    const timer = setTimeout(() => setCartNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [cartNotification]);

  const dismissNotification = () => setCartNotification(null);

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      // Each piece is one of a kind - only allow 1 in cart
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart; // Already in cart, don't add again
      }
      // Track outside the updater would lose the duplicate check,
      // so we track here — safe because this only runs when item is actually new
      trackEvent('add_to_cart', {
        entityType: 'product',
        entityId: product.id,
        metadata: { quantity: 1 },
      });
      return [...prevCart, { ...product, quantity: 1 }];
    });
    // Show notification
    setCartNotification({ product, timestamp: Date.now() });
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartTotal,
        cartNotification,
        dismissNotification,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
