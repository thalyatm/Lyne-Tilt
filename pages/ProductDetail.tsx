import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { ShieldCheck, Plus, Minus, Check, Loader2, BellRing } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { API_BASE, resolveImageUrl } from '../config/api';
import { trackEvent } from '../lib/analytics';
import { Product, ProductCategory } from '../types';

const DEFAULT_CARE_DESCRIPTION = `Treat it with love, but not stress.\n\n• Avoid dropping, bending, or scratching\n• Wipe with a soft, damp cloth\n• Avoid chemical exposure (including perfumes or sprays)\n• Store in original packaging to prevent damage or loss`;

const AccordionItem = ({ title, children, isOpen, onClick }: any) => (
  <div className="border-b border-stone-200">
    <button
      className="w-full py-5 flex justify-between items-center text-left group outline-none"
      onClick={onClick}
    >
      <span className="font-serif text-stone-800 text-lg group-hover:text-clay transition-colors">{title}</span>
      {isOpen ? <Minus size={16} className="text-clay" /> : <Plus size={16} className="text-stone-400 group-hover:text-clay transition-colors" />}
    </button>
    <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-96 opacity-100 mb-6' : 'max-h-0 opacity-0'}`}>
      <div className="text-sm text-stone-600 leading-relaxed pr-4">
        {children}
      </div>
    </div>
  </div>
);

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isWallArt = location.pathname.startsWith('/wall-art');
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [openSection, setOpenSection] = useState<string | null>('description');
  const [addedToCart, setAddedToCart] = useState(false);
  const { addToCart } = useCart();

  // Waitlist state
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [waitlistError, setWaitlistError] = useState('');
  const [waitlistCount, setWaitlistCount] = useState(0);

  // Care description from API
  const [careDescription, setCareDescription] = useState<string | null>(null);

  useEffect(() => {
    if (product) document.title = `${product.name} | Lyne Tilt`;
  }, [product]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchProduct = async () => {
      try {
        // Use unified products endpoint for both types
        const response = await fetch(`${API_BASE}/products/${id}`);
        if (response.ok) {
          const data = await response.json();

          // Handle slug redirects
          if (data.redirect) {
            const basePath = isWallArt ? '/wall-art' : '/shop';
            window.location.hash = `${basePath}/${data.slug}`;
            return;
          }

          // Use media array if available, fall back to detailImages
          // Filter out the primary image so it doesn't show twice
          const primaryUrl = data.media?.find((m: any) => m.isPrimary)?.url || data.image;
          const images = data.media?.length
            ? data.media.filter((m: any) => m.url !== primaryUrl).map((m: any) => m.url)
            : (data.detailImages || []).filter((img: string) => img !== data.image);

          setCareDescription(data.careDescription || null);

          setProduct({
            id: data.slug || data.id,
            name: data.name,
            price: parseFloat(data.price),
            compareAtPrice: data.compareAtPrice ? parseFloat(data.compareAtPrice) : undefined,
            currency: data.currency || 'AUD',
            category: data.category as ProductCategory,
            colours: [],
            materials: Array.isArray(data.materials) ? data.materials : [],
            shortDescription: data.shortDescription || '',
            longDescription: data.longDescription || '',
            image: data.image,
            detailImages: images,
            badge: data.badge,
            availability: data.availability || 'In stock',
          });
          trackEvent('product_view', { entityType: 'product', entityId: data.slug || data.id });
        } else {
          throw new Error('API error');
        }
      } catch (error) {
        // Product will remain null, showing "not found" state
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  // Fetch waitlist count when product is sold out
  useEffect(() => {
    if (product && product.availability === 'Sold out') {
      fetch(`${API_BASE}/waitlist/product/${product.id}/count`)
        .then(r => r.json())
        .then(d => setWaitlistCount(d.count))
        .catch(() => {});
    }
  }, [product]);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail.trim()) return;
    setWaitlistSubmitting(true);
    setWaitlistError('');
    try {
      const response = await fetch(`${API_BASE}/waitlist/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product!.id,
          email: waitlistEmail.trim(),
          customerName: waitlistName.trim() || undefined,
        }),
      });
      if (response.ok) {
        setWaitlistSuccess(true);
        setWaitlistCount(prev => prev + 1);
        setWaitlistEmail('');
        setWaitlistName('');
      } else {
        const data = await response.json().catch(() => ({}));
        setWaitlistError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setWaitlistError('Unable to join waitlist. Please try again later.');
    } finally {
      setWaitlistSubmitting(false);
    }
  };

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleAddToCart = () => {
    // Use sale price if applicable
    const effectiveProduct = product.compareAtPrice && product.compareAtPrice < product.price
      ? { ...product, price: product.compareAtPrice }
      : product;
    addToCart(effectiveProduct);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 3000);
  };

  if (loading) {
    return (
      <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-stone-400" size={32} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto text-center">
        <h1 className="text-2xl font-serif text-stone-900 mb-4">Product not found</h1>
        <Link to={isWallArt ? "/wall-art" : "/shop"} className="text-clay hover:underline">{isWallArt ? 'Back to Wall Art' : 'Back to Shop'}</Link>
      </div>
    );
  }

  // Resolve care text: per-product override > default
  const careText = careDescription || DEFAULT_CARE_DESCRIPTION;

  return (
    <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
      {/* Breadcrumbs */}
      <div className="mb-6 md:mb-10 text-[10px] uppercase tracking-[0.2em] text-stone-400">
        <Link to="/" className="hover:text-stone-800 transition-colors">Home</Link>
        <span className="mx-2">/</span>
        <Link to={isWallArt ? "/wall-art" : "/shop"} className="hover:text-stone-800 transition-colors">{isWallArt ? 'Wall Art' : 'Shop'}</Link>
        <span className="mx-2">/</span>
        <Link to={`${isWallArt ? '/wall-art' : '/shop'}?category=${product.category}`} className="hover:text-stone-800 transition-colors">{product.category}</Link>
        <span className="mx-2">/</span>
        <span className="text-stone-800">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Gallery (Left column) */}
        <div className="space-y-3 mx-auto lg:mx-0 max-w-lg">
          <div className="aspect-[4/5] bg-stone-100 overflow-hidden">
            <img src={resolveImageUrl(product.image)} alt={product.name} className="w-full h-full object-cover" />
          </div>
          {product.detailImages.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {product.detailImages.map((img, idx) => (
                <div key={idx} className="aspect-square bg-stone-100 overflow-hidden cursor-zoom-in">
                  <img src={resolveImageUrl(img)} alt={`${product.name} detail`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info (Right column) */}
        <div className="lg:sticky lg:top-32 h-fit">
          <h1 className="text-2xl md:text-3xl font-serif text-stone-900 mb-3">{product.name}</h1>
          {product.compareAtPrice && product.compareAtPrice < product.price ? (
            <div className="flex items-center gap-3 mb-6">
              <span className="text-lg font-light text-stone-400 line-through">${product.price}</span>
              <span className="text-lg font-bold text-clay">${product.compareAtPrice}</span>
              <span className="text-xs bg-clay/10 text-clay px-2 py-0.5 rounded-full font-medium uppercase tracking-wide">Sale</span>
            </div>
          ) : (
            <p className="text-lg font-light text-stone-500 mb-6">${product.price}</p>
          )}

          {product.availability === 'Sold out' ? (
            <div className="mb-10">
              {/* Sold Out label */}
              <div className="w-full py-5 uppercase tracking-[0.2em] text-xs font-bold bg-stone-200 text-stone-500 flex items-center justify-center cursor-not-allowed">
                Sold Out
              </div>

              {/* Notify Me section */}
              <div className="mt-6 p-6 bg-stone-50 border border-stone-200">
                {waitlistSuccess ? (
                  <div className="text-center py-2">
                    <BellRing size={20} className="mx-auto text-clay mb-3" />
                    <p className="text-sm text-stone-700 font-medium mb-1">We'll email you when this is back in stock!</p>
                    {waitlistCount > 0 && (
                      <p className="text-xs text-stone-400 mt-2">{waitlistCount} {waitlistCount === 1 ? 'person is' : 'people are'} waiting for this</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <BellRing size={16} className="text-clay" />
                      <span className="text-sm font-medium text-stone-700">Notify Me When Available</span>
                    </div>
                    <form onSubmit={handleWaitlistSubmit}>
                      <div className="flex flex-col sm:flex-row gap-3 mb-3">
                        <input
                          type="email"
                          value={waitlistEmail}
                          onChange={(e) => setWaitlistEmail(e.target.value)}
                          placeholder="Your email *"
                          required
                          className="flex-1 px-4 py-3 border border-stone-200 bg-white text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-clay transition-colors"
                        />
                        <input
                          type="text"
                          value={waitlistName}
                          onChange={(e) => setWaitlistName(e.target.value)}
                          placeholder="Name (optional)"
                          className="sm:w-40 px-4 py-3 border border-stone-200 bg-white text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-clay transition-colors"
                        />
                      </div>
                      {waitlistError && (
                        <p className="text-xs text-red-600 mb-3">{waitlistError}</p>
                      )}
                      <button
                        type="submit"
                        disabled={waitlistSubmitting}
                        className="w-full py-3 bg-clay text-white text-xs uppercase tracking-[0.2em] font-bold hover:bg-clay/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {waitlistSubmitting ? <Loader2 size={14} className="animate-spin" /> : <BellRing size={14} />}
                        Notify Me
                      </button>
                    </form>
                    {waitlistCount > 0 && (
                      <p className="text-xs text-stone-400 text-center mt-3">{waitlistCount} {waitlistCount === 1 ? 'person is' : 'people are'} waiting for this</p>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={handleAddToCart}
              className={`w-full py-5 uppercase tracking-[0.2em] text-xs font-bold transition-all mb-10 shadow-sm hover:shadow-md flex items-center justify-center gap-2 ${
                addedToCart
                  ? 'bg-green-600 text-white'
                  : 'bg-stone-900 text-white hover:bg-clay'
              }`}
            >
              {addedToCart ? (
                <>
                  <Check size={16} /> Added to Bag
                </>
              ) : (
                'Add to Bag'
              )}
            </button>
          )}

          {/* Accordions */}
          <div className="border-t border-stone-200">
            <AccordionItem
              title="Description"
              isOpen={openSection === 'description'}
              onClick={() => toggleSection('description')}
            >
              <div dangerouslySetInnerHTML={{ __html: product.longDescription }} />
            </AccordionItem>

            <AccordionItem
              title="Materials & Care"
              isOpen={openSection === 'materials'}
              onClick={() => toggleSection('materials')}
            >
              <div className="space-y-3">
                {product.materials && product.materials.length > 0 && (
                  <div>
                    <span className="text-xs uppercase tracking-wider text-stone-400 block mb-1.5">Materials</span>
                    <div className="flex flex-wrap gap-1.5">
                      {product.materials.map((mat, i) => (
                        <span key={i} className="text-xs bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full">{mat}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="whitespace-pre-line">{careText}</div>
              </div>
            </AccordionItem>

            <AccordionItem
              title="Shipping & Returns"
              isOpen={openSection === 'shipping'}
              onClick={() => toggleSection('shipping')}
            >
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-stone-700 mb-1">Processing</p>
                  <p>Please allow 5–10 working days for processing. Custom orders may take longer.</p>
                </div>
                <div>
                  <p className="font-medium text-stone-700 mb-1">Domestic Shipping (Jewellery)</p>
                  <p>Flat rate: $12.50 via tracked Australia Post. Local pick-up also available.</p>
                </div>
                <div>
                  <p className="font-medium text-stone-700 mb-1">International Shipping (Jewellery)</p>
                  <p>Flat rate: $25.50 for orders under $200 AUD.</p>
                </div>
                {isWallArt && (
                  <div>
                    <p className="font-medium text-stone-700 mb-1">Artwork Shipping</p>
                    <p>Varies by size and destination. See listing for details. Pick-up also available.</p>
                  </div>
                )}
                <div>
                  <p className="font-medium text-stone-700 mb-1">Returns</p>
                  <p>30-day return and refund policy on undamaged items. Jewellery returns incur a $15 processing fee. Earrings incur an additional $15 hygiene fee. Items must be returned undamaged in original packaging. Return shipping is the buyer's responsibility.</p>
                </div>
              </div>
            </AccordionItem>
          </div>

          <div className="mt-10 pt-6 border-t border-stone-100 text-center">
            <p className="text-xs text-stone-400 flex items-center justify-center gap-2 uppercase tracking-widest">
               <ShieldCheck size={14} /> Handmade in Brisbane
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
