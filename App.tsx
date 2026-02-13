
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { SettingsProvider } from './context/SettingsContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Shop from './pages/Shop';
import WallArt from './pages/WallArt';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import CheckoutSuccess from './pages/CheckoutSuccess';
import Coaching from './pages/Coaching';
import Learn from './pages/Learn';
import About from './pages/About';
import Blog from './pages/Blog';
import BlogPostDetail from './pages/BlogPostDetail';
import FAQ from './pages/FAQ';
import Contact from './pages/Contact';
import Account from './pages/Account';
import VerifyEmail from './pages/VerifyEmail';

// Admin imports
import { AuthProvider } from './admin/context/AuthContext';
import ProtectedRoute from './admin/components/ProtectedRoute';
import AdminLayout from './admin/AdminLayout';
import Login from './admin/pages/Login';
import Dashboard from './admin/pages/Dashboard';
import ProductsManager from './admin/pages/ProductsManager';
import ProductEditor from './admin/pages/ProductEditor';
import CoachingManager from './admin/pages/CoachingManager';
import LearnManager from './admin/pages/LearnManager';
import BlogManager from './admin/pages/BlogManager';
import TestimonialsManager from './admin/pages/TestimonialsManager';
import FAQsManager from './admin/pages/FAQsManager';
import SiteSettingsManager from './admin/pages/SiteSettingsManager';
import NewsletterManager from './admin/pages/NewsletterManager';
import CampaignList from './admin/pages/CampaignList';
import CampaignCompose from './admin/pages/CampaignCompose';
import CampaignReview from './admin/pages/CampaignReview';
import CampaignAnalytics from './admin/pages/CampaignAnalytics';
import ContactInbox from './admin/pages/ContactInbox';
import { ToastProvider } from './admin/context/ToastContext';

const App = () => {
  return (
    <AuthProvider>
      <SettingsProvider>
        <CustomerAuthProvider>
          <CartProvider>
            <Router>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="shop" element={<Shop />} />
                <Route path="shop/:id" element={<ProductDetail />} />
                <Route path="wall-art" element={<WallArt />} />
                <Route path="wall-art/:id" element={<ProductDetail />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="checkout/success" element={<CheckoutSuccess />} />
                <Route path="coaching" element={<Coaching />} />
                <Route path="learn" element={<Learn />} />
                <Route path="about" element={<About />} />
                <Route path="journal" element={<Blog />} />
                <Route path="journal/:id" element={<BlogPostDetail />} />
                <Route path="faq" element={<FAQ />} />
                <Route path="contact" element={<Contact />} />
                <Route path="account" element={<Account />} />
                <Route path="verify-email" element={<VerifyEmail />} />
              </Route>

            {/* Admin routes */}
            <Route path="/admin/login" element={<Login />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <ToastProvider>
                    <AdminLayout />
                  </ToastProvider>
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="inbox" element={<ContactInbox />} />
              <Route path="newsletter" element={<NewsletterManager />} />
              <Route path="campaigns" element={<CampaignList />} />
              <Route path="campaigns/new" element={<CampaignCompose />} />
              <Route path="campaigns/:id" element={<CampaignCompose />} />
              <Route path="campaigns/:id/review" element={<CampaignReview />} />
              <Route path="campaigns/:id/analytics" element={<CampaignAnalytics />} />
              <Route path="products" element={<ProductsManager />} />
              <Route path="products/new" element={<ProductEditor />} />
              <Route path="products/:id" element={<ProductEditor />} />
              <Route path="coaching" element={<CoachingManager />} />
              <Route path="learn" element={<LearnManager />} />
              <Route path="blog" element={<BlogManager />} />
              <Route path="testimonials" element={<TestimonialsManager />} />
              <Route path="faqs" element={<FAQsManager />} />
              <Route path="settings" element={<SiteSettingsManager />} />
              <Route path="automations" element={<NewsletterManager />} />
              {/* Automations tab auto-selected via URL */}
            </Route>

              {/* Catch-all route redirects to home */}
              <Route path="*" element={<Home />} />
            </Routes>
            </Router>
          </CartProvider>
        </CustomerAuthProvider>
      </SettingsProvider>
    </AuthProvider>
  );
};

export default App;
