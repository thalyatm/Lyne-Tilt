import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { API_BASE } from '../config/api';

// Google Identity Services type declarations
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

// Password validation helpers
const validatePassword = (password: string) => {
  return {
    minLength: password.length >= 10,
    hasUppercase: /[A-Z]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
};

const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    authModalMode,
    closeAuthModal,
    setAuthModalMode,
    login,
    loginWithGoogle,
    register,
    user,
    resendVerification,
  } = useCustomerAuth();

  const [googleLoading, setGoogleLoading] = useState(false);

  // Form states
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [forgotEmail, setForgotEmail] = useState('');

  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);

  // Password validation state
  const passwordValidation = validatePassword(registerData.password);
  const passwordsMatch = registerData.password === registerData.confirmPassword && registerData.confirmPassword !== '';
  const isPasswordValid = passwordValidation.minLength && passwordValidation.hasUppercase && passwordValidation.hasSpecialChar;

  // Google Sign-In initialization
  useEffect(() => {
    // Load Google Identity Services script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  // Initialize Google Sign-In when modal opens
  useEffect(() => {
    if (authModalOpen && (authModalMode === 'login' || authModalMode === 'register') && window.google) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        callback: handleGoogleCallback,
      });
    }
  }, [authModalOpen, authModalMode]);

  const handleGoogleCallback = async (response: { credential: string }) => {
    setGoogleLoading(true);
    setError('');
    try {
      await loginWithGoogle(response.credential);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    if (window.google) {
      window.google.accounts.id.prompt();
    }
  };

  // Reset form when modal closes or mode changes
  useEffect(() => {
    if (!authModalOpen) {
      setLoginData({ email: '', password: '' });
      setRegisterData({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
      setForgotEmail('');
      setError('');
      setSuccessMessage('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setVerificationSent(false);
      setGoogleLoading(false);
    }
  }, [authModalOpen]);

  useEffect(() => {
    setError('');
    setSuccessMessage('');
  }, [authModalMode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(loginData.email, loginData.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Please ensure your password meets all requirements');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await register(registerData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/customer/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });

      if (response.ok) {
        setSuccessMessage('If an account exists with this email, you will receive a password reset link.');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to send reset email');
      }
    } catch {
      setError('Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setError('');
    setIsLoading(true);

    try {
      await resendVerification();
      setVerificationSent(true);
      setTimeout(() => setVerificationSent(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend verification');
    } finally {
      setIsLoading(false);
    }
  };

  if (!authModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
        onClick={closeAuthModal}
      />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-800 transition-colors z-10"
        >
          <X size={24} />
        </button>

        <div className="p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-serif text-xl text-stone-900 tracking-wider mb-1">LYNE TILT STUDIO</h1>
            <div className="w-12 h-px bg-clay mx-auto mt-4 mb-6" />
          </div>

          {/* Error Message */}
          {error && (
            <div aria-live="polite" className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 text-sm flex items-start gap-3">
              <CheckCircle size={18} className="shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {authModalMode === 'login' && (
            <>
              <h2 className="text-center font-serif text-2xl text-stone-900 mb-6">Welcome Back</h2>
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-500 block mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-0 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="email"
                      required
                      className="w-full border-b border-stone-300 py-2 pl-7 focus:border-clay focus:outline-none transition-colors bg-transparent"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-500 block mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-0 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="w-full border-b border-stone-300 py-2 pl-7 pr-10 focus:border-clay focus:outline-none transition-colors bg-transparent"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setAuthModalMode('forgot-password')}
                    className="text-xs text-clay hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-stone-900 text-white py-4 uppercase tracking-[0.2em] text-xs font-bold hover:bg-clay transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Sign In'}
                </button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-stone-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-4 bg-white text-stone-400 uppercase tracking-wider">or</span>
                  </div>
                </div>

                {/* Google Sign-In Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="w-full border border-stone-300 bg-white text-stone-700 py-3.5 flex items-center justify-center gap-3 hover:bg-stone-50 transition-colors disabled:opacity-50"
                >
                  {googleLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                      </svg>
                      <span className="text-sm font-medium">Sign in with Google</span>
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-stone-500 mt-6">
                Don't have an account?{' '}
                <button
                  onClick={() => setAuthModalMode('register')}
                  className="text-clay font-medium hover:underline"
                >
                  Create one
                </button>
              </p>
            </>
          )}

          {/* REGISTER FORM */}
          {authModalMode === 'register' && (
            <>
              <h2 className="text-center font-serif text-2xl text-stone-900 mb-6">Create Account</h2>
              <form onSubmit={handleRegister} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-stone-500 block mb-1">
                      First Name
                    </label>
                    <div className="relative">
                      <User size={18} className="absolute left-0 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        required
                        className="w-full border-b border-stone-300 py-2 pl-7 focus:border-clay focus:outline-none transition-colors bg-transparent"
                        value={registerData.firstName}
                        onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-stone-500 block mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full border-b border-stone-300 py-2 focus:border-clay focus:outline-none transition-colors bg-transparent"
                      value={registerData.lastName}
                      onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-500 block mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-0 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="email"
                      required
                      className="w-full border-b border-stone-300 py-2 pl-7 focus:border-clay focus:outline-none transition-colors bg-transparent"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-500 block mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-0 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="w-full border-b border-stone-300 py-2 pl-7 pr-10 focus:border-clay focus:outline-none transition-colors bg-transparent"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Password Requirements */}
                  {registerData.password && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-stone-500 mb-2">Password must contain:</p>
                      <div className={`text-xs flex items-center gap-2 ${passwordValidation.minLength ? 'text-green-600' : 'text-stone-400'}`}>
                        {passwordValidation.minLength ? <CheckCircle size={12} /> : <span className="w-3 h-3 border border-current rounded-full" />}
                        At least 10 characters
                      </div>
                      <div className={`text-xs flex items-center gap-2 ${passwordValidation.hasUppercase ? 'text-green-600' : 'text-stone-400'}`}>
                        {passwordValidation.hasUppercase ? <CheckCircle size={12} /> : <span className="w-3 h-3 border border-current rounded-full" />}
                        One uppercase letter
                      </div>
                      <div className={`text-xs flex items-center gap-2 ${passwordValidation.hasSpecialChar ? 'text-green-600' : 'text-stone-400'}`}>
                        {passwordValidation.hasSpecialChar ? <CheckCircle size={12} /> : <span className="w-3 h-3 border border-current rounded-full" />}
                        One special character
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-500 block mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-0 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      className={`w-full border-b py-2 pl-7 pr-10 focus:outline-none transition-colors bg-transparent ${
                        registerData.confirmPassword
                          ? passwordsMatch
                            ? 'border-green-500 focus:border-green-500'
                            : 'border-red-500 focus:border-red-500'
                          : 'border-stone-300 focus:border-clay'
                      }`}
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {registerData.confirmPassword && !passwordsMatch && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !isPasswordValid || !passwordsMatch}
                  className="w-full bg-stone-900 text-white py-4 uppercase tracking-[0.2em] text-xs font-bold hover:bg-clay transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Create Account'}
                </button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-stone-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-4 bg-white text-stone-400 uppercase tracking-wider">or</span>
                  </div>
                </div>

                {/* Google Sign-In Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="w-full border border-stone-300 bg-white text-stone-700 py-3.5 flex items-center justify-center gap-3 hover:bg-stone-50 transition-colors disabled:opacity-50"
                >
                  {googleLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                      </svg>
                      <span className="text-sm font-medium">Sign up with Google</span>
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-stone-500 mt-6">
                Already have an account?{' '}
                <button
                  onClick={() => setAuthModalMode('login')}
                  className="text-clay font-medium hover:underline"
                >
                  Sign in
                </button>
              </p>
            </>
          )}

          {/* FORGOT PASSWORD */}
          {authModalMode === 'forgot-password' && (
            <>
              <h2 className="text-center font-serif text-2xl text-stone-900 mb-2">Reset Password</h2>
              <p className="text-center text-sm text-stone-500 mb-6">
                Enter your email and we'll send you a link to reset your password.
              </p>
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-stone-500 block mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-0 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="email"
                      required
                      className="w-full border-b border-stone-300 py-2 pl-7 focus:border-clay focus:outline-none transition-colors bg-transparent"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-stone-900 text-white py-4 uppercase tracking-[0.2em] text-xs font-bold hover:bg-clay transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Send Reset Link'}
                </button>
              </form>

              <p className="text-center text-sm text-stone-500 mt-6">
                <button
                  onClick={() => setAuthModalMode('login')}
                  className="text-clay font-medium hover:underline"
                >
                  Back to sign in
                </button>
              </p>
            </>
          )}

          {/* VERIFICATION PENDING */}
          {authModalMode === 'verification-pending' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-clay/10 text-clay rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail size={32} />
              </div>
              <h2 className="font-serif text-2xl text-stone-900 mb-4">Check Your Inbox</h2>
              <p className="text-stone-600 mb-2">
                We've sent a verification email to:
              </p>
              <p className="text-stone-900 font-medium mb-6">
                {user?.email}
              </p>
              <p className="text-sm text-stone-500 mb-6">
                Click the link in the email to verify your account and access all features.
              </p>

              {verificationSent ? (
                <p className="text-green-600 text-sm mb-4 flex items-center justify-center gap-2">
                  <CheckCircle size={16} />
                  Verification email sent!
                </p>
              ) : (
                <button
                  onClick={handleResendVerification}
                  disabled={isLoading}
                  className="text-clay text-sm font-medium hover:underline disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
                >
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                  Resend verification email
                </button>
              )}

              <button
                onClick={closeAuthModal}
                className="mt-8 text-xs uppercase tracking-widest font-bold text-stone-500 hover:text-stone-800 transition-colors"
              >
                Continue Browsing
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
