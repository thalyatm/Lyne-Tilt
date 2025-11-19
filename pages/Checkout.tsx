import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, Lock } from 'lucide-react';

const Checkout = () => {
  const { cart, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    country: 'Australia',
    phone: '',
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCvv: ''
  });

  const [orderPlaced, setOrderPlaced] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOrderPlaced(true);
    setTimeout(() => {
      clearCart();
      navigate('/');
    }, 3000);
  };

  const shippingCost = cartTotal > 100 ? 0 : 15;
  const totalWithShipping = cartTotal + shippingCost;

  if (cart.length === 0 && !orderPlaced) {
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

  if (orderPlaced) {
    return (
      <div className="pt-40 pb-24 px-6 max-w-4xl mx-auto text-center">
        <div className="bg-green-50 border border-green-200 rounded-lg p-12 mb-8">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-serif text-stone-900 mb-4">Order Confirmed!</h1>
          <p className="text-lg text-stone-600 mb-4">
            Thank you for your purchase. We'll send you an email confirmation shortly.
          </p>
          <p className="text-sm text-stone-500">
            Redirecting to home page...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
      <h1 className="text-4xl md:text-5xl font-serif text-stone-900 mb-10">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column - Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Contact Information */}
            <div className="bg-white border border-stone-200 p-6 md:p-8">
              <h2 className="text-2xl font-serif text-stone-900 mb-6">Contact Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full border border-stone-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-clay focus:border-transparent"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Shipping Information */}
            <div className="bg-white border border-stone-200 p-6 md:p-8">
              <h2 className="text-2xl font-serif text-stone-900 mb-6">Shipping Address</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      required
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full border border-stone-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-clay focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">Last Name *</label>
                    <input
                      type="text"
                      name="lastName"
                      required
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full border border-stone-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-clay focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Street Address *</label>
                  <input
                    type="text"
                    name="address"
                    required
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full border border-stone-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-clay focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">City *</label>
                    <input
                      type="text"
                      name="city"
                      required
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full border border-stone-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-clay focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">State *</label>
                    <input
                      type="text"
                      name="state"
                      required
                      value={formData.state}
                      onChange={handleInputChange}
                      className="w-full border border-stone-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-clay focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">Postcode *</label>
                    <input
                      type="text"
                      name="postcode"
                      required
                      value={formData.postcode}
                      onChange={handleInputChange}
                      className="w-full border border-stone-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-clay focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">Country *</label>
                    <select
                      name="country"
                      required
                      value={formData.country}
                      onChange={handleInputChange}
                      className="w-full border border-stone-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-clay focus:border-transparent"
                    >
                      <option value="Australia">Australia</option>
                      <option value="New Zealand">New Zealand</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Canada">Canada</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full border border-stone-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-clay focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white border border-stone-200 p-6 md:p-8">
              <h2 className="text-2xl font-serif text-stone-900 mb-2 flex items-center gap-2">
                <Lock size={20} /> Payment Details
              </h2>
              <p className="text-xs text-stone-500 mb-6">Your payment information is secure and encrypted.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Card Number *</label>
                  <input
                    type="text"
                    name="cardNumber"
                    required
                    value={formData.cardNumber}
                    onChange={handleInputChange}
                    placeholder="1234 5678 9012 3456"
                    className="w-full border border-stone-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-clay focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Name on Card *</label>
                  <input
                    type="text"
                    name="cardName"
                    required
                    value={formData.cardName}
                    onChange={handleInputChange}
                    className="w-full border border-stone-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-clay focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">Expiry Date *</label>
                    <input
                      type="text"
                      name="cardExpiry"
                      required
                      value={formData.cardExpiry}
                      onChange={handleInputChange}
                      placeholder="MM/YY"
                      className="w-full border border-stone-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-clay focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">CVV *</label>
                    <input
                      type="text"
                      name="cardCvv"
                      required
                      value={formData.cardCvv}
                      onChange={handleInputChange}
                      placeholder="123"
                      className="w-full border border-stone-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-clay focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-stone-900 text-white py-5 uppercase tracking-[0.2em] text-sm font-bold hover:bg-clay transition-colors flex items-center justify-center gap-2"
            >
              <Lock size={16} /> Complete Order - ${totalWithShipping.toFixed(2)} AUD
            </button>
          </form>
        </div>

        {/* Right Column - Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-stone-50 border border-stone-200 p-6 sticky top-32">
            <h2 className="text-2xl font-serif text-stone-900 mb-6">Order Summary</h2>

            {/* Cart Items */}
            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
              {cart.map(item => (
                <div key={item.id} className="flex gap-4 pb-4 border-b border-stone-200">
                  <div className="w-20 h-20 bg-stone-200 overflow-hidden flex-shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-stone-900 mb-1 truncate">{item.name}</h3>
                    <p className="text-xs text-stone-500 mb-2">${item.price} AUD</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 border border-stone-300 flex items-center justify-center hover:border-stone-900 transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 border border-stone-300 flex items-center justify-center hover:border-stone-900 transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="ml-auto text-stone-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-3 pt-4 border-t border-stone-300">
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Subtotal</span>
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
                <span className="text-stone-900">Total</span>
                <span className="font-bold text-stone-900">${totalWithShipping.toFixed(2)} AUD</span>
              </div>
            </div>

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
