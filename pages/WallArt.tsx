
import React, { useState, useEffect } from 'react';
import { WallArtCategory, ProductColour, PriceRange, Availability, WallArtProduct, Product } from '../types';
import { Link } from 'react-router-dom';
import { ShoppingBag, Loader2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import FilterDropdown from '../components/FilterDropdown';
import { API_BASE } from '../config/api';

const WallArt = () => {
  const [wallArtProducts, setWallArtProducts] = useState<WallArtProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<WallArtCategory>(WallArtCategory.All);
  const [colourFilter, setColourFilter] = useState<ProductColour>(ProductColour.All);
  const [priceFilter, setPriceFilter] = useState<PriceRange>(PriceRange.All);
  const [availabilityFilter, setAvailabilityFilter] = useState<Availability>(Availability.All);
  const { addToCart } = useCart();

  useEffect(() => { document.title = 'Wall Art | Lyne Tilt'; }, []);

  useEffect(() => {
    const fetchWallArt = async () => {
      try {
        const response = await fetch(`${API_BASE}/products?productType=wall-art&limit=100`);
        if (!response.ok) throw new Error('API error');
        const data = await response.json();
        const items = data.products || data;
        const mapped: WallArtProduct[] = items.map((p: any) => ({
          id: p.slug || p.id,
          name: p.name,
          price: parseFloat(p.price),
          currency: p.currency || 'AUD',
          category: p.category as WallArtCategory,
          colours: [],
          shortDescription: p.shortDescription || '',
          longDescription: p.longDescription || '',
          dimensions: p.dimensions,
          image: p.image,
          detailImages: p.detailImages || [],
          badge: p.badge,
          availability: p.availability || 'In stock',
        }));
        setWallArtProducts(mapped);
        setError(null);
      } catch (err) {
        setError('Unable to load wall art. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchWallArt();
  }, []);

  // Filter by category
  const filterByCategory = (products: WallArtProduct[]) => {
    if (categoryFilter === WallArtCategory.All) return products;
    return products.filter(p => p.category === categoryFilter);
  };

  // Filter by colour
  const filterByColour = (products: WallArtProduct[]) => {
    if (colourFilter === ProductColour.All) return products;
    return products.filter(p => p.colours.includes(colourFilter));
  };

  // Filter by price range
  const filterByPrice = (products: WallArtProduct[]) => {
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
  const filterByAvailability = (products: WallArtProduct[]) => {
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
        filterByCategory(wallArtProducts)
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

  const categories = Object.values(WallArtCategory);
  const colours = Object.values(ProductColour);
  const priceRanges = Object.values(PriceRange);
  const availabilities = Object.values(Availability);

  // Check if any filters are active
  const hasActiveFilters =
    categoryFilter !== WallArtCategory.All ||
    colourFilter !== ProductColour.All ||
    priceFilter !== PriceRange.All ||
    availabilityFilter !== Availability.All;

  const clearAllFilters = () => {
    setCategoryFilter(WallArtCategory.All);
    setColourFilter(ProductColour.All);
    setPriceFilter(PriceRange.All);
    setAvailabilityFilter(Availability.All);
  };

  const handleAddToCart = (product: WallArtProduct) => {
    addToCart(product as unknown as Product);
  };

  const isSoldOut = (product: WallArtProduct) => product.availability === 'Sold out';

  return (
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-screen">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-5xl md:text-6xl font-serif font-medium mb-3 text-clay">
          Wall Art
        </h1>
        <p className="text-base font-light max-w-2xl mx-auto text-stone-500">
          Original artworks and limited edition prints - made with intention.
        </p>
        <div className="h-px w-12 bg-stone-900 mt-5 mx-auto"></div>
      </div>

      {/* Category Filter - Tab Style */}
      <div className="flex flex-wrap justify-center gap-6 mb-8">
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
      <div className="flex flex-wrap justify-center gap-4 mb-8">
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
          {sortedProducts.length} {sortedProducts.length === 1 ? 'piece' : 'pieces'}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
        {sortedProducts.map(product => (
          <div key={product.id} className="group">
            {/* Image */}
            <Link to={`/wall-art/${product.id}`} className="block relative overflow-hidden aspect-[4/5] bg-stone-100 mb-4">
              <img
                src={product.image}
                alt={product.name}
                className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${isSoldOut(product) ? 'opacity-60' : ''}`}
              />
              {product.badge && (
                <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[9px] uppercase tracking-widest font-bold text-stone-900 px-2 py-1">
                  {product.badge}
                </span>
              )}
              {isSoldOut(product) && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-stone-900/80 text-white text-xs uppercase tracking-widest px-4 py-2">
                    Sold Out
                  </span>
                </div>
              )}
            </Link>

            {/* Details */}
            <div className="text-center">
              <Link to={`/wall-art/${product.id}`}>
                <h3 className="font-serif text-lg text-stone-900 mb-1 group-hover:text-clay transition-colors">
                  {product.name}
                </h3>
              </Link>
              <p className="text-sm text-stone-500 mb-1">{product.shortDescription}</p>
              {product.dimensions && (
                <p className="text-xs text-stone-400 mb-2">{product.dimensions}</p>
              )}
              <p className="text-lg font-medium text-stone-900 mb-3">${product.price} {product.currency}</p>

              {!isSoldOut(product) ? (
                <button
                  onClick={() => handleAddToCart(product)}
                  className="inline-flex items-center gap-2 bg-stone-900 text-white px-6 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-clay transition-colors"
                >
                  <ShoppingBag size={14} />
                  Add to Cart
                </button>
              ) : (
                <button
                  disabled
                  className="inline-flex items-center gap-2 bg-stone-300 text-stone-500 px-6 py-2 text-[10px] uppercase tracking-widest font-bold cursor-not-allowed"
                >
                  Sold Out
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="text-center py-20">
          <Loader2 className="animate-spin text-stone-400 mx-auto" size={32} />
        </div>
      )}

      {error && (
        <div className="text-center py-20 text-red-500">
          {error}
        </div>
      )}

      {!loading && !error && sortedProducts.length === 0 && (
        <div className="text-center py-20 text-stone-400">
          No pieces found matching your filters.
        </div>
      )}
    </div>
  );
};

export default WallArt;
