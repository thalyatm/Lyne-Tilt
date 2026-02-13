import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Package, Loader2, AlertCircle } from 'lucide-react';
import { API_BASE } from '../config/api';
import { useCart } from '../context/CartContext';

interface OrderDetails {
  id: string;
  status: string;
  customerEmail: string | null;
  amountTotal: number | null;
  currency: string | null;
  lineItems: Array<{
    description: string;
    quantity: number;
    amountTotal: number;
  }>;
}

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { clearCart } = useCart();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);

  useEffect(() => { document.title = 'Order Confirmed | Lyne Tilt'; }, []);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!sessionId) {
        setError('No order session found.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/checkout/session/${sessionId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch order details');
        }

        const data = await response.json();
        setOrderDetails(data);

        // Clear the cart after successful payment
        clearCart();
      } catch (err) {
        setError('Unable to load order details. Your order was still processed successfully.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [sessionId, clearCart]);

  if (loading) {
    return (
      <div className="pt-40 pb-24 px-6 max-w-4xl mx-auto text-center">
        <Loader2 size={48} className="mx-auto mb-6 text-clay animate-spin" />
        <h1 className="text-2xl font-serif text-stone-900">Loading order details...</h1>
      </div>
    );
  }

  return (
    <div className="pt-40 pb-24 px-6 max-w-4xl mx-auto">
      <div className="bg-white border border-stone-200 p-8 md:p-12 text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-600" />
        </div>

        <h1 className="text-3xl md:text-4xl font-serif text-stone-900 mb-4">
          Thank You for Your Order!
        </h1>

        <p className="text-stone-600 mb-8 max-w-md mx-auto">
          Your payment was successful. We'll send you an email confirmation with your order details shortly.
        </p>

        {error && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 flex items-start gap-3 text-left max-w-md mx-auto">
            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <p className="text-amber-700 text-sm">{error}</p>
          </div>
        )}

        {/* Order Details */}
        {orderDetails && (
          <div className="bg-stone-50 border border-stone-200 p-6 mb-8 text-left max-w-md mx-auto">
            <h2 className="font-serif text-lg text-stone-900 mb-4 flex items-center gap-2">
              <Package size={20} className="text-clay" />
              Order Summary
            </h2>

            {orderDetails.lineItems && orderDetails.lineItems.length > 0 && (
              <div className="space-y-2 mb-4 pb-4 border-b border-stone-200">
                {orderDetails.lineItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-stone-600">
                      {item.description} × {item.quantity}
                    </span>
                    <span className="text-stone-900 font-medium">
                      ${(item.amountTotal / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {orderDetails.amountTotal && (
              <div className="flex justify-between font-medium">
                <span className="text-stone-900">Total Paid</span>
                <span className="text-stone-900">
                  ${(orderDetails.amountTotal / 100).toFixed(2)} {orderDetails.currency?.toUpperCase()}
                </span>
              </div>
            )}

            {orderDetails.customerEmail && (
              <p className="text-xs text-stone-500 mt-4">
                Confirmation sent to: {orderDetails.customerEmail}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/shop"
            className="inline-block bg-stone-900 text-white px-8 py-4 uppercase tracking-widest text-xs font-bold hover:bg-clay transition-colors"
          >
            Continue Shopping
          </Link>
          {/* Only show account link if we have auth context later */}
          <Link
            to="/"
            className="inline-block border border-stone-300 text-stone-600 px-8 py-4 uppercase tracking-widest text-xs font-bold hover:border-stone-900 hover:text-stone-900 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSuccess;
