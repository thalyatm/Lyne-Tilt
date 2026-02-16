
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductCategory, ProductColour, PriceRange, Availability, Product } from '../types';
import ProductCard from '../components/ProductCard';
import FilterDropdown from '../components/FilterDropdown';
import { API_BASE } from '../config/api';

const Shop = () => {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { document.title = 'Shop Wearable Art | Lyne Tilt'; }, []);

  const getInitialCategory = (): ProductCategory => {
    if (categoryParam && Object.values(ProductCategory).includes(categoryParam as ProductCategory)) {
      return categoryParam as ProductCategory;
    }
    return ProductCategory.All;
  };

  const [categoryFilter, setCategoryFilter] = useState<ProductCategory>(getInitialCategory());

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_BASE}/products?productType=wearable&limit=100`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        const items = data.products || data;
        // Map API response to match frontend Product type
        const mappedProducts: Product[] = items.map((p: any) => ({
          id: p.slug || p.id,
          name: p.name,
          price: parseFloat(p.price),
          currency: p.currency || 'AUD',
          category: p.category as ProductCategory,
          colours: [],
          shortDescription: p.shortDescription || '',
          longDescription: p.longDescription || '',
          image: p.image,
          detailImages: p.detailImages || [],
          badge: p.badge,
          availability: p.availability || 'In stock',
        }));
        setProducts(mappedProducts);
        setError(null);
      } catch (err) {
        setError('Unable to load products. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Update filter when URL param changes
  useEffect(() => {
    if (categoryParam && Object.values(ProductCategory).includes(categoryParam as ProductCategory)) {
      setCategoryFilter(categoryParam as ProductCategory);
    }
  }, [categoryParam]);
  const [colourFilter, setColourFilter] = useState<ProductColour>(ProductColour.All);
  const [priceFilter, setPriceFilter] = useState<PriceRange>(PriceRange.All);
  const [availabilityFilter, setAvailabilityFilter] = useState<Availability>(Availability.All);

  // Filter by category
  const filterByCategory = (products: Product[]) => {
    if (categoryFilter === ProductCategory.All) return products;
    return products.filter(p => p.category === categoryFilter);
  };

  // Filter by colour
  const filterByColour = (products: Product[]) => {
    if (colourFilter === ProductColour.All) return products;
    return products.filter(p => p.colours.includes(colourFilter));
  };

  // Filter by price range
  const filterByPrice = (products: Product[]) => {
    switch (priceFilter) {
      case PriceRange.Under60:
        return products.filter(p => p.price < 60);
      case PriceRange.From60To75:
        return products.filter(p => p.price >= 60 && p.price <= 75);
      case PriceRange.From75To100:
        return products.filter(p => p.price > 75 && p.price <= 100);
      case PriceRange.Over100:
        return products.filter(p => p.price > 100);
      default:
        return products;
    }
  };

  // Filter by availability
  const filterByAvailability = (products: Product[]) => {
    switch (availabilityFilter) {
      case Availability.InStock:
        return products.filter(p => p.availability !== 'Sold out');
      case Availability.SoldOut:
        return products.filter(p => p.availability === 'Sold out');
      default:
        return products;
    }
  };

  // Apply all filters
  const filteredProducts = filterByAvailability(
    filterByPrice(
      filterByColour(
        filterByCategory(products)
      )
    )
  );

  // Sort products: in stock first, then sold out
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const aInStock = a.availability !== 'Sold out';
    const bInStock = b.availability !== 'Sold out';
    if (aInStock && !bInStock) return -1;
    if (!aInStock && bInStock) return 1;
    return 0;
  });

  const categories = Object.values(ProductCategory);
  const colours = Object.values(ProductColour);
  const priceRanges = Object.values(PriceRange);
  const availabilities = Object.values(Availability);

  // Check if any filters are active
  const hasActiveFilters =
    categoryFilter !== ProductCategory.All ||
    colourFilter !== ProductColour.All ||
    priceFilter !== PriceRange.All ||
    availabilityFilter !== Availability.All;

  const clearAllFilters = () => {
    setCategoryFilter(ProductCategory.All);
    setColourFilter(ProductColour.All);
    setPriceFilter(PriceRange.All);
    setAvailabilityFilter(Availability.All);
  };

  return (
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-screen">
      {/* Custom Header for Shop Page */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-serif font-medium mb-3 text-clay">
          Wearable Art
        </h1>
        <p className="text-base font-light max-w-2xl mx-auto text-stone-500">
          Unique small batch art - made with intention.
        </p>
        <div className="h-px w-12 bg-stone-900 mt-5 mx-auto"></div>
      </div>

      {/* Category Filter - Tab Style */}
      <div className="flex flex-wrap justify-center gap-3 md:gap-6 mb-8">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`text-sm uppercase tracking-widest pb-1 transition-colors ${
              categoryFilter === cat
                ? 'border-b border-stone-800 text-stone-900'
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Dropdown Filters */}
      <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-8 relative z-20">
        <FilterDropdown
          label="Colour"
          value={colourFilter}
          options={colours}
          onChange={(v) => setColourFilter(v as ProductColour)}
        />
        <FilterDropdown
          label="Price"
          value={priceFilter}
          options={priceRanges}
          onChange={(v) => setPriceFilter(v as PriceRange)}
        />
        <FilterDropdown
          label="Availability"
          value={availabilityFilter}
          options={availabilities}
          onChange={(v) => setAvailabilityFilter(v as Availability)}
        />
      </div>

      {/* Clear Filters & Results Count */}
      <div className="flex justify-center items-center gap-4 mb-10">
        <span className="text-sm text-stone-500">
          {sortedProducts.length} {sortedProducts.length === 1 ? 'item' : 'items'}
        </span>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-stone-500 hover:text-stone-800 underline underline-offset-2 transition-colors"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
        {sortedProducts.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {loading && (
        <div className="text-center py-20 text-stone-400">
          Loading products...
        </div>
      )}

      {error && (
        <div className="text-center py-20 text-red-500">
          Error loading products: {error}
        </div>
      )}

      {!loading && !error && sortedProducts.length === 0 && (
        <div className="text-center py-20 text-stone-400">
          No items found matching your filters.
        </div>
      )}
    </div>
  );
};

export default Shop;
