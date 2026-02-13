import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      if (message.includes('Invalid credentials')) {
        setError('That email or password doesn\'t look right. Please try again.');
      } else if (message.includes('fetch') || message.includes('network')) {
        setError('Can\'t connect to the server. Please check your internet connection and try again.');
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif text-stone-800">Lyne Tilt</h1>
          <p className="text-stone-400 mt-2 text-sm">Sign in to manage your site</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm flex items-start gap-2.5">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-stone-600 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-clay/20 focus:border-clay outline-none transition text-stone-800"
                placeholder="your@email.com"
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-stone-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-clay/20 focus:border-clay outline-none transition text-stone-800 pr-11"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-clay text-white rounded-xl hover:bg-clay/90 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-stone-400 hover:text-clay transition">
            &larr; Back to website
          </a>
        </div>
      </div>
    </div>
  );
}
