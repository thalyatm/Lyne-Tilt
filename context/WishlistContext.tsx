import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../config/api';
import { useCustomerAuth } from './CustomerAuthContext';

interface WishlistContextType {
  wishlistIds: Set<string>;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<void>;
  wishlistCount: number;
}

const WishlistContext = createContext<WishlistContextType>({
  wishlistIds: new Set(),
  isInWishlist: () => false,
  toggleWishlist: async () => {},
  wishlistCount: 0,
});

export const useWishlist = () => useContext(WishlistContext);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { accessToken, isAuthenticated } = useCustomerAuth();
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

  const fetchIds = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${API_BASE}/wishlist/ids`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWishlistIds(new Set(data.productIds));
      }
    } catch {
      // Silently fail
    }
  }, [accessToken]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchIds();
    } else {
      setWishlistIds(new Set());
    }
  }, [isAuthenticated, fetchIds]);

  const isInWishlist = (productId: string) => wishlistIds.has(productId);

  const toggleWishlist = async (productId: string) => {
    if (!accessToken) return;

    const wasIn = wishlistIds.has(productId);

    // Optimistic update
    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (wasIn) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });

    try {
      if (wasIn) {
        await fetch(`${API_BASE}/wishlist/${productId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } else {
        await fetch(`${API_BASE}/wishlist`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ productId }),
        });
      }
    } catch {
      // Revert on failure
      setWishlistIds((prev) => {
        const next = new Set(prev);
        if (wasIn) {
          next.add(productId);
        } else {
          next.delete(productId);
        }
        return next;
      });
    }
  };

  return (
    <WishlistContext.Provider value={{ wishlistIds, isInWishlist, toggleWishlist, wishlistCount: wishlistIds.size }}>
      {children}
    </WishlistContext.Provider>
  );
};
