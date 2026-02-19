import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';
import {
  Heart,
  Users,
  ShoppingBag,
  Loader2,
  TrendingUp,
} from 'lucide-react';

interface TopProduct {
  productId: string;
  productName: string;
  productImage: string;
  productPrice: string;
  wishlistCount: number;
}

interface RecentItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  addedAt: string;
  customerName: string;
  customerEmail: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  borderColor,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  borderColor: string;
  accent: string;
}) {
  return (
    <div
      className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-4"
      style={{ borderLeftWidth: '4px', borderLeftColor: borderColor }}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-semibold text-stone-900">{value}</p>
        <p className="text-xs text-stone-500">{label}</p>
      </div>
    </div>
  );
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function WishlistsManager() {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [uniqueCustomers, setUniqueCustomers] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/wishlist/admin/summary`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setTopProducts(data.topProducts || []);
      setRecentActivity(data.recentActivity || []);
      setTotalItems(data.totalItems || 0);
      setUniqueCustomers(data.uniqueCustomers || 0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-serif font-semibold text-stone-900">Wishlists</h1>
        <p className="text-sm text-stone-500 mt-0.5">See what your customers are saving for later.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={Heart}
          label="Total Wishlisted Items"
          value={totalItems}
          borderColor="#e11d48"
          accent="bg-rose-100 text-rose-600"
        />
        <StatCard
          icon={Users}
          label="Customers with Wishlists"
          value={uniqueCustomers}
          borderColor="#6366f1"
          accent="bg-indigo-100 text-indigo-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Items per Customer"
          value={uniqueCustomers > 0 ? (totalItems / uniqueCustomers).toFixed(1) : '0'}
          borderColor="#16a34a"
          accent="bg-green-100 text-green-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Wishlisted Products */}
        <div className="bg-white rounded-lg border border-stone-200">
          <div className="px-4 py-3 border-b border-stone-100">
            <h2 className="text-sm font-semibold text-stone-800">Most Wishlisted Products</h2>
          </div>
          {topProducts.length === 0 ? (
            <div className="p-8 text-center">
              <Heart size={24} className="text-stone-300 mx-auto mb-2" />
              <p className="text-sm text-stone-400">No wishlist data yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {topProducts.map((product) => (
                <div key={product.productId} className="flex items-center gap-3 px-4 py-3">
                  {product.productImage ? (
                    <img
                      src={product.productImage}
                      alt={product.productName}
                      className="w-10 h-10 rounded-md object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-stone-100 flex items-center justify-center">
                      <ShoppingBag size={16} className="text-stone-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{product.productName}</p>
                    <p className="text-xs text-stone-400">${product.productPrice}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-rose-600">
                    <Heart size={14} className="fill-rose-200" />
                    {product.wishlistCount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-stone-200">
          <div className="px-4 py-3 border-b border-stone-100">
            <h2 className="text-sm font-semibold text-stone-800">Recent Activity</h2>
          </div>
          {recentActivity.length === 0 ? (
            <div className="p-8 text-center">
              <Heart size={24} className="text-stone-300 mx-auto mb-2" />
              <p className="text-sm text-stone-400">No recent wishlist activity.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  {item.productImage ? (
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="w-10 h-10 rounded-md object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-stone-100 flex items-center justify-center">
                      <ShoppingBag size={16} className="text-stone-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{item.productName}</p>
                    <p className="text-xs text-stone-400 truncate">
                      {item.customerName} &middot; {item.customerEmail}
                    </p>
                  </div>
                  <span className="text-xs text-stone-400 whitespace-nowrap">
                    {relativeTime(item.addedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
