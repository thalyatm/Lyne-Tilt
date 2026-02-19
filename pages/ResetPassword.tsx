import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, KeyRound } from 'lucide-react';
import { API_BASE } from '../config/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'form' | 'loading' | 'success' | 'error'>('form');
  const [message, setMessage] = useState('');

  useEffect(() => { document.title = 'Reset Password | Lyne Tilt'; }, []);

  if (!token) {
    return (
      <div className="min-h-screen pt-32 pb-20 px-6 bg-white/80 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle size={40} className="text-red-600" />
          </div>
          <h1 className="font-serif text-2xl text-stone-900 mb-2">Invalid Reset Link</h1>
          <p className="text-stone-500 mb-8">No reset token was provided. Please request a new password reset.</p>
          <Link to="/" className="inline-block w-full bg-stone-900 text-white py-4 uppercase tracking-widest text-xs font-bold hover:bg-clay transition-colors">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 10) {
      setMessage('Password must be at least 10 characters.');
      setStatus('error');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    try {
      const response = await fetch(`${API_BASE}/customer/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Your password has been reset successfully!');
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to reset password. The link may have expired.');
      }
    } catch {
      setStatus('error');
      setMessage('An error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 bg-white/80 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        {status === 'form' && (
          <>
            <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <KeyRound size={36} className="text-stone-600" />
            </div>
            <h1 className="font-serif text-2xl text-stone-900 mb-2">Reset Your Password</h1>
            <p className="text-stone-500 mb-8">Enter your new password below.</p>
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 10 characters"
                  required
                  minLength={10}
                  className="w-full px-4 py-3 border border-stone-300 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  minLength={10}
                  className="w-full px-4 py-3 border border-stone-300 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900 transition-colors"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-stone-900 text-white py-4 uppercase tracking-widest text-xs font-bold hover:bg-clay transition-colors"
              >
                Reset Password
              </button>
            </form>
          </>
        )}

        {status === 'loading' && (
          <>
            <Loader2 size={48} className="mx-auto text-clay animate-spin mb-6" />
            <h1 className="font-serif text-2xl text-stone-900 mb-2">Resetting password...</h1>
            <p className="text-stone-500">Please wait.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-green-600" />
            </div>
            <h1 className="font-serif text-2xl text-stone-900 mb-2">Password Reset!</h1>
            <p className="text-stone-500 mb-8">{message}</p>
            <Link to="/account" className="inline-block w-full bg-stone-900 text-white py-4 uppercase tracking-widest text-xs font-bold hover:bg-clay transition-colors">
              Log In
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle size={40} className="text-red-600" />
            </div>
            <h1 className="font-serif text-2xl text-stone-900 mb-2">Reset Failed</h1>
            <p className="text-stone-500 mb-8">{message}</p>
            <button
              onClick={() => { setStatus('form'); setMessage(''); }}
              className="inline-block w-full bg-stone-900 text-white py-4 uppercase tracking-widest text-xs font-bold hover:bg-clay transition-colors"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
