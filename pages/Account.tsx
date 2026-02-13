import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { User, Package, Heart, MapPin, Lock, Mail, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useCustomerAuth } from '../context/CustomerAuthContext';

type TabType = 'profile' | 'orders' | 'wishlist' | 'addresses';

const Account = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, isVerified, logout, openAuthModal, resendVerification, refreshUser } = useCustomerAuth();

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [verificationSent, setVerificationSent] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);

  useEffect(() => { document.title = 'My Account | Lyne Tilt'; }, []);

  // Set active tab from URL params
  useEffect(() => {
    const tab = searchParams.get('tab') as TabType;
    if (tab && ['profile', 'orders', 'wishlist', 'addresses'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Redirect to home if not authenticated (after loading)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      openAuthModal('login');
      navigate('/');
    }
  }, [isLoading, isAuthenticated, navigate, openAuthModal]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 pb-20 px-6 flex items-center justify-center">
        <Loader2 className="animate-spin text-clay" size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const tabs = [
    { id: 'profile' as TabType, label: 'Profile', icon: User },
    { id: 'orders' as TabType, label: 'Orders', icon: Package },
    { id: 'wishlist' as TabType, label: 'Wishlist', icon: Heart },
    { id: 'addresses' as TabType, label: 'Addresses', icon: MapPin },
  ];

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 bg-white/80">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-serif text-stone-900 mb-2">My Account</h1>
          <p className="text-stone-500">Welcome back, {user?.firstName}</p>
        </div>

        {/* Email Verification Banner */}
        {!isVerified && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-sm flex items-start gap-4">
            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-amber-800 font-medium mb-1">Verify your email</p>
              <p className="text-amber-700 text-sm mb-3">
                Please verify your email address to access all account features and complete purchases.
              </p>
              {verificationSent ? (
                <p className="text-green-600 text-sm flex items-center gap-2">
                  <CheckCircle size={16} />
                  Verification email sent! Check your inbox.
                </p>
              ) : (
                <button
                  onClick={handleResendVerification}
                  disabled={sendingVerification}
                  className="text-amber-800 text-sm font-medium hover:underline disabled:opacity-50 flex items-center gap-2"
                >
                  {sendingVerification && <Loader2 size={14} className="animate-spin" />}
                  Resend verification email
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-stone-200 mb-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-clay text-clay'
                  : 'border-transparent text-stone-500 hover:text-stone-900'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in-up">
          {activeTab === 'profile' && <ProfileTab user={user} onLogout={logout} />}
          {activeTab === 'orders' && <OrdersTab />}
          {activeTab === 'wishlist' && <WishlistTab />}
          {activeTab === 'addresses' && <AddressesTab />}
        </div>
      </div>
    </div>
  );
};

// Profile Tab
const ProfileTab = ({ user, onLogout }: { user: any; onLogout: () => void }) => {
  const [comingSoonMsg, setComingSoonMsg] = useState('');

  const handleComingSoon = (feature: string) => {
    setComingSoonMsg(`${feature} is coming soon.`);
    setTimeout(() => setComingSoonMsg(''), 3000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-8">
      {comingSoonMsg && (
        <div className="fixed top-24 right-6 z-50 bg-stone-900 text-white px-6 py-3 text-sm shadow-lg animate-fade-in-up">
          {comingSoonMsg}
        </div>
      )}

      {/* Account Info */}
      <div className="bg-stone-50 p-6 border border-stone-100">
        <h3 className="text-lg font-serif text-stone-900 mb-4">Account Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs uppercase tracking-widest text-stone-500 block mb-1">Name</label>
            <p className="text-stone-900">{user?.firstName} {user?.lastName}</p>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-stone-500 block mb-1">Email</label>
            <div className="flex items-center gap-2">
              <p className="text-stone-900">{user?.email}</p>
              {user?.emailVerified ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Verified</span>
              ) : (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Unverified</span>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-stone-500 block mb-1">Member Since</label>
            <p className="text-stone-900">{user?.createdAt ? formatDate(user.createdAt) : 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button onClick={() => handleComingSoon('Change Password')} className="p-4 border border-stone-200 hover:border-stone-300 transition-colors text-left group">
          <div className="flex items-center gap-3 mb-2">
            <Lock size={18} className="text-stone-400 group-hover:text-clay transition-colors" />
            <span className="font-medium text-stone-900">Change Password</span>
          </div>
          <p className="text-sm text-stone-500">Update your account password</p>
        </button>
        <button onClick={() => handleComingSoon('Email Preferences')} className="p-4 border border-stone-200 hover:border-stone-300 transition-colors text-left group">
          <div className="flex items-center gap-3 mb-2">
            <Mail size={18} className="text-stone-400 group-hover:text-clay transition-colors" />
            <span className="font-medium text-stone-900">Email Preferences</span>
          </div>
          <p className="text-sm text-stone-500">Manage newsletter subscriptions</p>
        </button>
      </div>

      {/* Sign Out */}
      <div className="pt-6 border-t border-stone-200">
        <button
          onClick={onLogout}
          className="text-sm text-stone-500 hover:text-stone-900 transition-colors"
        >
          Sign out of your account
        </button>
      </div>
    </div>
  );
};

// Orders Tab
const OrdersTab = () => {
  return (
    <div className="text-center py-12">
      <Package size={48} className="mx-auto text-stone-300 mb-4" />
      <h3 className="font-serif text-xl text-stone-900 mb-2">No orders yet</h3>
      <p className="text-stone-500 mb-6">When you place an order, it will appear here.</p>
      <Link
        to="/shop"
        className="inline-block bg-stone-900 text-white px-8 py-3 uppercase tracking-widest text-xs font-bold hover:bg-clay transition-colors"
      >
        Start Shopping
      </Link>
    </div>
  );
};

// Wishlist Tab
const WishlistTab = () => {
  return (
    <div className="text-center py-12">
      <Heart size={48} className="mx-auto text-stone-300 mb-4" />
      <h3 className="font-serif text-xl text-stone-900 mb-2">Your wishlist is empty</h3>
      <p className="text-stone-500 mb-6">Save items you love by clicking the heart icon on any product.</p>
      <Link
        to="/shop"
        className="inline-block bg-stone-900 text-white px-8 py-3 uppercase tracking-widest text-xs font-bold hover:bg-clay transition-colors"
      >
        Explore Collection
      </Link>
    </div>
  );
};

// Addresses Tab
const AddressesTab = () => {
  return (
    <div className="text-center py-12">
      <MapPin size={48} className="mx-auto text-stone-300 mb-4" />
      <h3 className="font-serif text-xl text-stone-900 mb-2">No saved addresses</h3>
      <p className="text-stone-500 mb-6">Add a shipping address for faster checkout.</p>
      <button className="inline-block bg-stone-900 text-white px-8 py-3 uppercase tracking-widest text-xs font-bold hover:bg-clay transition-colors">
        Add Address
      </button>
    </div>
  );
};

export default Account;
