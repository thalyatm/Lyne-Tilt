import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { API_BASE } from '../config/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { refreshUser, isAuthenticated } = useCustomerAuth();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => { document.title = 'Verify Email | Lyne Tilt'; }, []);

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. No token provided.');
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/customer/verify-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage('Your email has been verified successfully!');
          // Refresh user data if logged in
          if (isAuthenticated) {
            await refreshUser();
          }
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed. The link may have expired.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred during verification. Please try again.');
      }
    };

    verifyEmail();
  }, [token, isAuthenticated, refreshUser]);

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 bg-white/80 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 size={48} className="mx-auto text-clay animate-spin mb-6" />
            <h1 className="font-serif text-2xl text-stone-900 mb-2">Verifying your email...</h1>
            <p className="text-stone-500">Please wait while we verify your email address.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-green-600" />
            </div>
            <h1 className="font-serif text-2xl text-stone-900 mb-2">Email Verified!</h1>
            <p className="text-stone-500 mb-8">{message}</p>
            <div className="space-y-4">
              {isAuthenticated ? (
                <Link
                  to="/account"
                  className="inline-block w-full bg-stone-900 text-white py-4 uppercase tracking-widest text-xs font-bold hover:bg-clay transition-colors"
                >
                  Go to My Account
                </Link>
              ) : (
                <Link
                  to="/"
                  className="inline-block w-full bg-stone-900 text-white py-4 uppercase tracking-widest text-xs font-bold hover:bg-clay transition-colors"
                >
                  Continue Shopping
                </Link>
              )}
              <Link
                to="/shop"
                className="inline-block w-full border border-stone-300 text-stone-600 py-4 uppercase tracking-widest text-xs font-bold hover:border-stone-900 hover:text-stone-900 transition-colors"
              >
                Explore Collection
              </Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle size={40} className="text-red-600" />
            </div>
            <h1 className="font-serif text-2xl text-stone-900 mb-2">Verification Failed</h1>
            <p className="text-stone-500 mb-8">{message}</p>
            <div className="space-y-4">
              <Link
                to="/"
                className="inline-block w-full bg-stone-900 text-white py-4 uppercase tracking-widest text-xs font-bold hover:bg-clay transition-colors"
              >
                Return Home
              </Link>
              <Link
                to="/contact"
                className="inline-block w-full border border-stone-300 text-stone-600 py-4 uppercase tracking-widest text-xs font-bold hover:border-stone-900 hover:text-stone-900 transition-colors"
              >
                Contact Support
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
