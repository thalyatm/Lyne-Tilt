import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { Truck, RefreshCw, ShieldCheck, Plus, Minus, Check, Loader2, Star, ChevronDown, BellRing } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { API_BASE, resolveImageUrl } from '../config/api';
import { trackEvent } from '../lib/analytics';
import { Product, ProductCategory } from '../types';

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

// Review types
interface Review {
  id: string;
  customerName: string;
  rating: number;
  title?: string;
  body?: string;
  verifiedPurchase?: boolean;
  adminResponse?: string;
  createdAt: string;
}

interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  distribution: { [key: number]: number };
}

// Star rating display
const StarRating = ({ rating, size = 16 }: { rating: number; size?: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        size={size}
        className={star <= rating ? 'text-amber-400 fill-amber-400' : 'text-stone-300'}
      />
    ))}
  </div>
);

// Interactive star selector for the form
const StarSelector = ({ rating, onChange }: { rating: number; onChange: (r: number) => void }) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            size={24}
            className={
              star <= (hover || rating)
                ? 'text-amber-400 fill-amber-400'
                : 'text-stone-300'
            }
          />
        </button>
      ))}
    </div>
  );
};

// Rating distribution bar
const RatingBar = ({ star, count, total }: { star: number; count: number; total: number }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-6 text-right text-stone-500">{star}</span>
      <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />
      <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-8 text-right text-stone-400 text-xs">{count}</span>
    </div>
  );
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isWallArt = location.pathname.startsWith('/wall-art');
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [openSection, setOpenSection] = useState<string | null>('description');
  const [addedToCart, setAddedToCart] = useState(false);
  const { addToCart } = useCart();
  const { settings } = useSettings();
  const { productDetail } = settings;

  // Review state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ customerName: '', customerEmail: '', rating: 0, title: '', body: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewError, setReviewError] = useState('');

  // Waitlist state
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [waitlistError, setWaitlistError] = useState('');
  const [waitlistCount, setWaitlistCount] = useState(0);

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
          const images = data.media?.length
            ? data.media.map((m: any) => m.url)
            : (data.detailImages || []);

          setProduct({
            id: data.slug || data.id,
            name: data.name,
            price: parseFloat(data.price),
            currency: data.currency || 'AUD',
            category: data.category as ProductCategory,
            colours: [],
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

  // Fetch reviews when product is available
  useEffect(() => {
    if (!id) return;
    const fetchReviews = async () => {
      try {
        const response = await fetch(`${API_BASE}/reviews/product/${id}`);
        if (response.ok) {
          const data = await response.json();
          setReviews(data.reviews || []);
          setReviewSummary(data.summary || null);
        }
      } catch {
        // Reviews are non-critical; silently fail
      }
    };
    fetchReviews();
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

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError('');
    if (reviewForm.rating === 0) {
      setReviewError('Please select a star rating.');
      return;
    }
    if (!reviewForm.customerName.trim() || !reviewForm.customerEmail.trim()) {
      setReviewError('Name and email are required.');
      return;
    }
    setReviewSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/reviews/product/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: reviewForm.customerName.trim(),
          customerEmail: reviewForm.customerEmail.trim(),
          rating: reviewForm.rating,
          title: reviewForm.title.trim() || undefined,
          body: reviewForm.body.trim() || undefined,
        }),
      });
      if (response.ok) {
        setReviewSuccess(true);
        setReviewForm({ customerName: '', customerEmail: '', rating: 0, title: '', body: '' });
        setShowReviewForm(false);
      } else {
        const data = await response.json().catch(() => ({}));
        setReviewError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setReviewError('Unable to submit review. Please try again later.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleAddToCart = () => {
    addToCart(product);
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

  return (
    <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
      {/* Breadcrumbs */}
      <div className="mb-6 md:mb-10 text-[10px] uppercase tracking-[0.2em] text-stone-400">
        <Link to="/" className="hover:text-stone-800 transition-colors">Home</Link>
        <span className="mx-2">/</span>
        <Link to={isWallArt ? "/wall-art" : "/shop"} className="hover:text-stone-800 transition-colors">{isWallArt ? 'Wall Art' : 'Shop'}</Link>
        <span className="mx-2">/</span>
        <span className="text-stone-800">{product.category}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-20">
        {/* Gallery (Left 7 cols) */}
        <div className="lg:col-span-7 space-y-3">
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

        {/* Info (Right 5 cols) */}
        <div className="lg:col-span-5 lg:sticky lg:top-32 h-fit">
          <h1 className="text-3xl md:text-5xl font-serif text-stone-900 mb-3">{product.name}</h1>
          <p className="text-xl font-light text-stone-500 mb-2">${product.price}</p>
          {reviewSummary && reviewSummary.totalReviews > 0 && (
            <div className="flex items-center gap-2 mb-8">
              <StarRating rating={Math.round(reviewSummary.averageRating)} size={16} />
              <span className="text-sm text-stone-400">({reviewSummary.totalReviews} {reviewSummary.totalReviews === 1 ? 'review' : 'reviews'})</span>
            </div>
          )}
          {(!reviewSummary || reviewSummary.totalReviews === 0) && <div className="mb-6" />}
          
          <p className="italic text-lg text-stone-600 mb-8 font-serif border-l-2 border-clay pl-6 py-1">
            {product.shortDescription}
          </p>

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
                  <Check size={16} /> Added to Cart
                </>
              ) : (
                'Add to Cart'
              )}
            </button>
          )}

          {/* Accordions */}
          <div className="border-t border-stone-200">
            <AccordionItem 
              title="The Story" 
              isOpen={openSection === 'description'} 
              onClick={() => toggleSection('description')}
            >
              {product.longDescription}
            </AccordionItem>

            <AccordionItem
              title="Materials & Care"
              isOpen={openSection === 'materials'}
              onClick={() => toggleSection('materials')}
            >
              <p>{productDetail.materialsAndCare || "Handcrafted with intention using ethically sourced materials. To maintain the unique finish of your piece, avoid direct contact with perfumes, lotions, and water. Store in a dry place when not in use."}</p>
            </AccordionItem>

            <AccordionItem
              title="Shipping & Returns"
              isOpen={openSection === 'shipping'}
              onClick={() => toggleSection('shipping')}
            >
              {productDetail.shippingAndReturns ? (
                <p>{productDetail.shippingAndReturns}</p>
              ) : (
                <ul className="space-y-3">
                  <li className="flex items-center gap-3"><Truck size={16} className="text-stone-400" /> Free shipping within Australia (1-3 days).</li>
                  <li className="flex items-center gap-3"><Truck size={16} className="text-stone-400" /> International shipping available via DHL.</li>
                  <li className="flex items-center gap-3"><RefreshCw size={16} className="text-stone-400" /> 14-day change of mind returns.</li>
                </ul>
              )}
            </AccordionItem>
          </div>
          
          <div className="mt-10 pt-6 border-t border-stone-100 text-center">
            <p className="text-xs text-stone-400 flex items-center justify-center gap-2 uppercase tracking-widest">
               <ShieldCheck size={14} /> Handmade in Brisbane
            </p>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      {(reviews.length > 0 || reviewSuccess) && (
        <div className="mt-20 pt-16 border-t border-stone-200">
          <h2 className="text-2xl md:text-3xl font-serif text-stone-900 mb-10">Customer Reviews</h2>

          {/* Summary Bar */}
          {reviewSummary && reviewSummary.totalReviews > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12 pb-12 border-b border-stone-100">
              {/* Average Rating */}
              <div className="flex flex-col items-center md:items-start gap-2">
                <div className="text-5xl font-light text-stone-900">{reviewSummary.averageRating.toFixed(1)}</div>
                <StarRating rating={Math.round(reviewSummary.averageRating)} size={20} />
                <p className="text-sm text-stone-400 mt-1">
                  Based on {reviewSummary.totalReviews} {reviewSummary.totalReviews === 1 ? 'review' : 'reviews'}
                </p>
              </div>

              {/* Distribution Bars */}
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => (
                  <RatingBar
                    key={star}
                    star={star}
                    count={reviewSummary.distribution[star] || 0}
                    total={reviewSummary.totalReviews}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Write a Review Button + Form */}
          <div className="mb-12">
            {reviewSuccess && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded">
                Thank you! Your review will appear after approval.
              </div>
            )}

            <button
              onClick={() => { setShowReviewForm(!showReviewForm); setReviewError(''); }}
              className="flex items-center gap-2 text-sm uppercase tracking-[0.15em] text-stone-600 hover:text-clay transition-colors"
            >
              <ChevronDown size={16} className={`transition-transform duration-300 ${showReviewForm ? 'rotate-180' : ''}`} />
              Write a Review
            </button>

            {showReviewForm && (
              <form onSubmit={handleReviewSubmit} className="mt-6 max-w-lg space-y-5 p-6 bg-stone-50 border border-stone-100">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">Your Rating *</label>
                  <StarSelector rating={reviewForm.rating} onChange={(r) => setReviewForm({ ...reviewForm, rating: r })} />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">Name *</label>
                  <input
                    type="text"
                    value={reviewForm.customerName}
                    onChange={(e) => setReviewForm({ ...reviewForm, customerName: e.target.value })}
                    className="w-full px-4 py-3 border border-stone-200 bg-white text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:border-clay transition-colors"
                    placeholder="Your name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">Email *</label>
                  <input
                    type="email"
                    value={reviewForm.customerEmail}
                    onChange={(e) => setReviewForm({ ...reviewForm, customerEmail: e.target.value })}
                    className="w-full px-4 py-3 border border-stone-200 bg-white text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:border-clay transition-colors"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">Title</label>
                  <input
                    type="text"
                    value={reviewForm.title}
                    onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                    className="w-full px-4 py-3 border border-stone-200 bg-white text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:border-clay transition-colors"
                    placeholder="Summarize your experience"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">Review</label>
                  <textarea
                    value={reviewForm.body}
                    onChange={(e) => setReviewForm({ ...reviewForm, body: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border border-stone-200 bg-white text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:border-clay transition-colors resize-none"
                    placeholder="Share your thoughts about this product..."
                  />
                </div>

                {reviewError && (
                  <p className="text-sm text-red-600">{reviewError}</p>
                )}

                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="px-8 py-3 bg-stone-900 text-white text-xs uppercase tracking-[0.2em] font-bold hover:bg-clay transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {reviewSubmitting && <Loader2 size={14} className="animate-spin" />}
                  Submit Review
                </button>
              </form>
            )}
          </div>

          {/* Review List */}
          <div className="space-y-8">
            {reviews.map((review) => (
              <div key={review.id} className="pb-8 border-b border-stone-100 last:border-0">
                <div className="flex items-center gap-3 mb-2">
                  <StarRating rating={review.rating} size={14} />
                  <span className="text-sm font-medium text-stone-700">{review.customerName}</span>
                  {review.verifiedPurchase && (
                    <span className="text-[10px] uppercase tracking-widest text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                      Verified Purchase
                    </span>
                  )}
                </div>
                {review.title && (
                  <h4 className="font-semibold text-stone-800 mb-1">{review.title}</h4>
                )}
                {review.body && (
                  <p className="text-sm text-stone-600 leading-relaxed mb-2">{review.body}</p>
                )}
                <p className="text-xs text-stone-400">
                  {new Date(review.createdAt).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                {review.adminResponse && (
                  <div className="mt-4 ml-4 pl-4 border-l-2 border-clay/30 bg-stone-50 p-4">
                    <p className="text-xs uppercase tracking-widest text-clay font-semibold mb-1">Response from Lyne Tilt</p>
                    <p className="text-sm text-stone-600 leading-relaxed">{review.adminResponse}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Write a Review (when no reviews exist yet) */}
      {reviews.length === 0 && !reviewSuccess && (
        <div className="mt-20 pt-16 border-t border-stone-200">
          <h2 className="text-2xl md:text-3xl font-serif text-stone-900 mb-6">Customer Reviews</h2>
          <p className="text-sm text-stone-400 mb-6">No reviews yet. Be the first to share your experience.</p>

          <button
            onClick={() => { setShowReviewForm(!showReviewForm); setReviewError(''); }}
            className="flex items-center gap-2 text-sm uppercase tracking-[0.15em] text-stone-600 hover:text-clay transition-colors"
          >
            <ChevronDown size={16} className={`transition-transform duration-300 ${showReviewForm ? 'rotate-180' : ''}`} />
            Write a Review
          </button>

          {showReviewForm && (
            <form onSubmit={handleReviewSubmit} className="mt-6 max-w-lg space-y-5 p-6 bg-stone-50 border border-stone-100">
              <div>
                <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">Your Rating *</label>
                <StarSelector rating={reviewForm.rating} onChange={(r) => setReviewForm({ ...reviewForm, rating: r })} />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">Name *</label>
                <input
                  type="text"
                  value={reviewForm.customerName}
                  onChange={(e) => setReviewForm({ ...reviewForm, customerName: e.target.value })}
                  className="w-full px-4 py-3 border border-stone-200 bg-white text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:border-clay transition-colors"
                  placeholder="Your name"
                  required
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">Email *</label>
                <input
                  type="email"
                  value={reviewForm.customerEmail}
                  onChange={(e) => setReviewForm({ ...reviewForm, customerEmail: e.target.value })}
                  className="w-full px-4 py-3 border border-stone-200 bg-white text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:border-clay transition-colors"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">Title</label>
                <input
                  type="text"
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                  className="w-full px-4 py-3 border border-stone-200 bg-white text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:border-clay transition-colors"
                  placeholder="Summarize your experience"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">Review</label>
                <textarea
                  value={reviewForm.body}
                  onChange={(e) => setReviewForm({ ...reviewForm, body: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-stone-200 bg-white text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:border-clay transition-colors resize-none"
                  placeholder="Share your thoughts about this product..."
                />
              </div>

              {reviewError && (
                <p className="text-sm text-red-600">{reviewError}</p>
              )}

              <button
                type="submit"
                disabled={reviewSubmitting}
                className="px-8 py-3 bg-stone-900 text-white text-xs uppercase tracking-[0.2em] font-bold hover:bg-clay transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {reviewSubmitting && <Loader2 size={14} className="animate-spin" />}
                Submit Review
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductDetail;