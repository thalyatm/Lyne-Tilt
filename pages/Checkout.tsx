import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCart } from '../context/CartContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { Link, useSearchParams } from 'react-router-dom';
import { Trash2, ShoppingBag, Lock, AlertCircle, Mail, Loader2, CreditCard, User, LogIn } from 'lucide-react';
import { API_BASE, STRIPE_PUBLIC_KEY, isStripeConfigured, resolveImageUrl } from '../config/api';
import { trackEvent } from '../lib/analytics';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = STRIPE_PUBLIC_KEY ? loadStripe(STRIPE_PUBLIC_KEY) : null;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Checkout = () => {
  const { cart, removeFromCart, cartTotal, clearCart, addToCart } = useCart();
  const { user, isAuthenticated, isVerified, resendVerification, openAuthModal } = useCustomerAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => { document.title = 'Checkout | Lyne Tilt'; }, []);
  useEffect(() => { trackEvent('checkout_start'); }, []);

  const [verificationSent, setVerificationSent] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestCheckoutChosen, setGuestCheckoutChosen] = useState(false);

  // --- Abandoned cart capture ---
  const capturedEmailRef = useRef<string | null>(null);

  const captureAbandonedCart = useCallback(async (email: string, customerName?: string) => {
    if (!EMAIL_REGEX.test(email) || cart.length === 0) return;
    if (capturedEmailRef.current === email) return;
    capturedEmailRef.current = email;

    try {
      await fetch(`${API_BASE}/abandoned-carts/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          customerName: customerName || undefined,
          items: cart.map(item => ({
            productId: item.id,
            productName: item.name,
            price: String(item.price),
            quantity: item.quantity,
            image: item.image || undefined,
            variant: (item as any).selectedVariant || (item as any).variant || undefined,
          })),
        }),
      });
    } catch {
      // Fire-and-forget: silently ignore errors
    }
  }, [cart]);

  // Auto-capture for authenticated users (they already have an email)
  useEffect(() => {
    if (isAuthenticated && user?.email && cart.length > 0) {
      captureAbandonedCart(user.email, [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined);
    }
  }, [isAuthenticated, user?.email, cart.length, captureAbandonedCart]);

  // --- Cart recovery from ?recover=TOKEN ---
  useEffect(() => {
    const token = searchParams.get('recover');
    if (!token) return;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/abandoned-carts/recover/${token}`);
        if (!res.ok) return;
        const data = await res.json();
        const items = data.items || data.cart?.items || [];
        for (const item of items) {
          addToCart({
            id: item.productId,
            name: item.productName,
            price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
            image: item.image || '',
            currency: 'AUD',
            category: '' as any,
            colours: [],
            shortDescription: '',
            longDescription: '',
            detailImages: [],
          });
        }
        setRecoveryNotice(true);
        setTimeout(() => setRecoveryNotice(false), 5000);
      } catch {
        // Silently ignore recovery errors
      }
      // Remove the recover param from URL
      searchParams.delete('recover');
      setSearchParams(searchParams, { replace: true });
    })();
  }, []); // Run once on mount

  const handleResendVerification = async () => {
    setSendingVerification(true);
    try {
      await resendVerification();
      setVerificationSent(true);
      setTimeout(() => setVerificationSent(false), 5000);
    } catch (error) {
    } finally {
      setSendingVerification(false);
    }
  };

  const handleCheckout = async () => {
    // Block submission if user is logged in but not verified
    if (isAuthenticated && !isVerified) {
      setError('Please verify your email before checkout.');
      return;
    }

    // Require name for guest checkout
    if (!isAuthenticated && !guestName.trim()) {
      setError('Please enter your name to continue.');
      return;
    }

    if (!isStripeConfigured()) {
      setError('Payment system is not configured. Please contact support.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Prepare cart items for the API
      const items = cart.map(item => ({
        id: item.id,
        type: 'product' as const,
        quantity: item.quantity,
      }));

      // Create Stripe Checkout session
      const response = await fetch(`${API_BASE}/checkout/create-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items,
          successUrl: `${window.location.origin}/#/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/#/checkout`,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during checkout');
      setIsProcessing(false);
    }
  };

  // Shipping: flat $15 for physical products under $100, free over $100
  // All products in this store are physical (jewellery/wall art), so shipping always applies once per order
  const hasPhysicalProducts = cart.length > 0;
  const shippingCost = hasPhysicalProducts && cartTotal < 100 ? 15 : 0;
  const totalWithShipping = cartTotal + shippingCost;

  if (cart.length === 0) {
    return (
      <div className="pt-40 pb-24 px-6 max-w-4xl mx-auto text-center">
        <ShoppingBag size={64} className="mx-auto mb-6 text-stone-300" />
        <h1 className="text-4xl font-serif text-stone-900 mb-4">Your Cart is Empty</h1>
        <p className="text-stone-600 mb-8">Add some beautiful pieces to your collection.</p>
        <Link
          to="/shop"
          className="inline-block bg-stone-900 text-white px-8 py-4 uppercase tracking-widest text-xs font-bold hover:bg-clay transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
      <h1 className="text-4xl md:text-5xl font-serif text-stone-900 mb-10">Checkout</h1>

      {/* Email Verification Banner */}
      {isAuthenticated && !isVerified && (
        <div className="mb-8 p-6 bg-amber-50 border border-amber-200 flex items-start gap-4">
          <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={24} />
          <div className="flex-1">
            <h3 className="text-amber-800 font-medium text-lg mb-1">Verify your email to complete checkout</h3>
            <p className="text-amber-700 text-sm mb-4">
              Hi {user?.firstName}, please verify your email address before placing an order. Check your inbox for a verification link.
            </p>
            {verificationSent ? (
              <p className="text-green-600 text-sm flex items-center gap-2">
                <Mail size={16} />
                Verification email sent! Check your inbox.
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={sendingVerification}
                className="inline-flex items-center gap-2 bg-amber-700 text-white px-4 py-2 text-xs uppercase tracking-widest font-bold hover:bg-amber-800 transition-colors disabled:opacity-50"
              >
                {sendingVerification && <Loader2 size={14} className="animate-spin" />}
                Resend Verification Email
              </button>
            )}
          </div>
        </div>
      )}

      {/* Cart Recovery Notice */}
      {recoveryNotice && (
        <div className="mb-8 p-4 bg-green-50 border border-green-200 flex items-center gap-3">
          <ShoppingBag className="text-green-600 shrink-0" size={20} />
          <p className="text-green-800 font-medium text-sm">Your cart has been restored!</p>
        </div>
      )}

      {/* Guest vs Sign In choice */}
      {!isAuthenticated && !guestCheckoutChosen && (
        <div className="mb-8 p-6 bg-white border border-stone-200">
          <h3 className="text-lg font-medium text-stone-900 mb-4">How would you like to checkout?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setGuestCheckoutChosen(true)}
              className="flex flex-col items-center gap-3 p-6 border border-stone-200 hover:border-stone-400 transition-colors text-center group"
            >
              <User size={24} className="text-stone-400 group-hover:text-stone-700 transition-colors" />
              <span className="font-medium text-stone-900">Continue as Guest</span>
              <span className="text-xs text-stone-500">Quick checkout without an account</span>
            </button>
            <button
              onClick={() => openAuthModal('login')}
              className="flex flex-col items-center gap-3 p-6 border border-stone-200 hover:border-clay transition-colors text-center group"
            >
              <LogIn size={24} className="text-stone-400 group-hover:text-clay transition-colors" />
              <span className="font-medium text-stone-900">Sign In</span>
              <span className="text-xs text-stone-500">Collect points and track orders</span>
            </button>
          </div>
        </div>
      )}

      {/* Guest Contact Information */}
      {!isAuthenticated && guestCheckoutChosen && (
        <div className="mb-8 p-6 bg-white border border-stone-200">
          <h3 className="text-lg font-medium text-stone-900 mb-1">Contact Information</h3>
          <p className="text-stone-500 text-sm mb-4">Enter your details so we can send you order updates.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="guest-name" className="block text-xs uppercase tracking-wider text-stone-600 mb-1">Name *</label>
              <input
                id="guest-name"
                type="text"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                placeholder="Your name"
                required
                className="w-full border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:border-stone-900 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="guest-email" className="block text-xs uppercase tracking-wider text-stone-600 mb-1">Email</label>
              <input
                id="guest-email"
                type="email"
                value={guestEmail}
                onChange={e => setGuestEmail(e.target.value)}
                onBlur={() => captureAbandonedCart(guestEmail, guestName || undefined)}
                placeholder="you@example.com (optional)"
                className="w-full border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:border-stone-900 transition-colors"
              />
            </div>
          </div>
          <button
            onClick={() => setGuestCheckoutChosen(false)}
            className="mt-3 text-xs text-stone-500 hover:text-clay transition-colors"
          >
            Want to sign in instead?
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-red-800 font-medium">Checkout Error</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column - Cart Items */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-stone-200 p-6 md:p-8">
            <h2 className="text-2xl font-serif text-stone-900 mb-6">Your Items</h2>

            <div className="space-y-6">
              {cart.map(item => (
                <div key={item.id} className="flex gap-4 pb-6 border-b border-stone-200 last:border-b-0 last:pb-0">
                  <Link to={`/shop/${item.id}`} className="w-24 h-24 bg-stone-200 overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity">
                    <img src={resolveImageUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
                  </Link>
                  <div className="flex-1">
                    <Link to={`/shop/${item.id}`} className="text-lg font-medium text-stone-900 mb-1 hover:text-clay transition-colors">{item.name}</Link>
                    <p className="text-stone-600 mb-2">${item.price} AUD</p>
                    <p className="text-xs text-clay uppercase tracking-wide">One of a kind</p>
                  </div>
                  <div className="text-right flex flex-col justify-between">
                    <p className="font-medium text-stone-900">${item.price.toFixed(2)} AUD</p>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-stone-400 hover:text-red-600 transition-colors self-end"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Secure Payment Note */}
          <div className="mt-6 p-4 bg-stone-50 border border-stone-200 flex items-start gap-3">
            <CreditCard className="text-stone-500 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-stone-700 font-medium text-sm">Secure Payment with Stripe</p>
              <p className="text-stone-500 text-xs mt-1">
                You'll be redirected to Stripe's secure checkout to complete your payment. We never store your card details.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-stone-50 border border-stone-200 p-6 sticky top-32">
            <h2 className="text-2xl font-serif text-stone-900 mb-6">Order Summary</h2>

            {/* Totals */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Subtotal ({cart.length} {cart.length === 1 ? 'piece' : 'pieces'})</span>
                <span className="font-medium text-stone-900">${cartTotal.toFixed(2)} AUD</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Shipping</span>
                <span className="font-medium text-stone-900">
                  {shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)} AUD`}
                </span>
              </div>
              {cartTotal < 100 && (
                <p className="text-xs text-stone-500 italic">
                  Add ${(100 - cartTotal).toFixed(2)} more for free shipping
                </p>
              )}
              <div className="flex justify-between text-lg font-serif pt-3 border-t border-stone-300">
                <span className="text-stone-900">Estimated Total</span>
                <span className="font-bold text-stone-900">${totalWithShipping.toFixed(2)} AUD</span>
              </div>
              <p className="text-xs text-stone-500">
                Final total will be calculated at checkout including applicable taxes.
              </p>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isProcessing || (isAuthenticated && !isVerified) || (!isAuthenticated && !guestCheckoutChosen)}
              className={`w-full py-5 uppercase tracking-[0.2em] text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                isProcessing || (isAuthenticated && !isVerified) || (!isAuthenticated && !guestCheckoutChosen)
                  ? 'bg-stone-400 text-stone-200 cursor-not-allowed'
                  : 'bg-stone-900 text-white hover:bg-clay'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Lock size={16} />
                  {isAuthenticated && !isVerified
                    ? 'Verify Email to Checkout'
                    : 'Proceed to Payment'}
                </>
              )}
            </button>

            <p className="text-xs text-stone-500 text-center mt-4">
              By proceeding, you agree to our Terms of Service and Privacy Policy.
            </p>

            <Link
              to="/shop"
              className="block text-center text-sm text-stone-600 hover:text-clay transition-colors mt-6 link-underline"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
