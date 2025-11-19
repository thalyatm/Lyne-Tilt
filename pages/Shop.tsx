
import React, { useState } from 'react';
import { PRODUCTS } from '../constants';
import { ProductCategory } from '../types';
import ProductCard from '../components/ProductCard';

const Shop = () => {
  const [filter, setFilter] = useState<ProductCategory>(ProductCategory.All);

  const filteredProducts = filter === ProductCategory.All 
    ? PRODUCTS 
    : PRODUCTS.filter(p => p.category === filter);

  const categories = Object.values(ProductCategory);

  return (
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-screen">
      {/* Custom Header for Shop Page */}
      <div className="mb-10 text-center">
        <h1 className="text-5xl md:text-6xl font-serif font-medium mb-3 text-clay">
          The Collection
        </h1>
        <p className="text-base font-light max-w-2xl mx-auto text-stone-500">
          Wearable artifacts for the modern creative.
        </p>
        <div className="h-px w-12 bg-stone-900 mt-5 mx-auto"></div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap justify-center gap-6 mb-16">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`text-sm uppercase tracking-widest pb-1 transition-colors ${
              filter === cat 
                ? 'border-b border-stone-800 text-stone-900' 
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
        {filteredProducts.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      
      {filteredProducts.length === 0 && (
        <div className="text-center py-20 text-stone-400">
          No items found in this category.
        </div>
      )}
    </div>
  );
};

export default Shop;
