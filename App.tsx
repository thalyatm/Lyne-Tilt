
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { SettingsProvider } from './context/SettingsContext';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import { WishlistProvider } from './context/WishlistContext';
import { trackPageView } from './lib/analytics';
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
import ResetPassword from './pages/ResetPassword';
import ContractView from './pages/ContractView';

// Admin imports
import { AuthProvider } from './admin/context/AuthContext';
import ProtectedRoute from './admin/components/ProtectedRoute';
import AdminLayout from './admin/AdminLayout';
import Login from './admin/pages/Login';
import Dashboard from './admin/pages/Dashboard';
import ProductsManager from './admin/pages/ProductsManager';
import ProductEditor from './admin/pages/ProductEditor';
import PromotionsManager from './admin/pages/PromotionsManager';
import OrdersManager from './admin/pages/OrdersManager';
import OrderDetail from './admin/pages/OrderDetail';
import CoachingManager from './admin/pages/CoachingManager';
import CoachingEditor from './admin/pages/CoachingEditor';
import WorkshopsManager from './admin/pages/WorkshopsManager';
import WorkshopEditor from './admin/pages/WorkshopEditor';
import BlogManager from './admin/pages/BlogManager';
import FAQsManager from './admin/pages/FAQsManager';
import SiteSettingsManager from './admin/pages/SiteSettingsManager';
import NewsletterManager from './admin/pages/NewsletterManager';
import CampaignList from './admin/pages/CampaignList';
import CampaignCompose from './admin/pages/CampaignCompose';
import CampaignReview from './admin/pages/CampaignReview';
import CampaignAnalytics from './admin/pages/CampaignAnalytics';
import ContactInbox from './admin/pages/ContactInbox';
import SubscriberList from './admin/pages/SubscriberList';
import SubscriberDetail from './admin/pages/SubscriberDetail';
import SubscriberImport from './admin/pages/SubscriberImport';
import SegmentList from './admin/pages/SegmentList';
import SegmentBuilder from './admin/pages/SegmentBuilder';
import TemplateLibrary from './admin/pages/TemplateLibrary';
import TemplateEditor from './admin/pages/TemplateEditor';
import ActivityLog from './admin/pages/ActivityLog';
import AutomationsManager from './admin/pages/AutomationsManager';
import AutomationQueue from './admin/pages/AutomationQueue';
import EmailSettings from './admin/pages/EmailSettings';
import CohortsManager from './admin/pages/CohortsManager';
import CohortEditor from './admin/pages/CohortEditor';
import AnalyticsHub from './admin/pages/AnalyticsHub';
import AnalyticsRevenue from './admin/pages/AnalyticsRevenue';
import AnalyticsEmail from './admin/pages/AnalyticsEmail';
import AnalyticsContent from './admin/pages/AnalyticsContent';
import AnalyticsCustomers from './admin/pages/AnalyticsCustomers';
import AnalyticsServices from './admin/pages/AnalyticsServices';
import MediaLibrary from './admin/pages/MediaLibrary';
import CustomersManager from './admin/pages/CustomersManager';
import CustomerDetail from './admin/pages/CustomerDetail';
import BookingsManager from './admin/pages/BookingsManager';
import ClientsManager from './admin/pages/ClientsManager';
import ClientDetail from './admin/pages/ClientDetail';
import ApplicationsManager from './admin/pages/ApplicationsManager';
import ReviewsManager from './admin/pages/ReviewsManager';
import AbandonedCartsManager from './admin/pages/AbandonedCartsManager';
import GiftCardsManager from './admin/pages/GiftCardsManager';
import WaitlistManager from './admin/pages/WaitlistManager';
import WishlistsManager from './admin/pages/WishlistsManager';
import DataExport from './admin/pages/DataExport';
import { ToastProvider } from './admin/context/ToastContext';
import FeedbackWidget from './components/FeedbackWidget';

const PageTracker = () => {
  const location = useLocation();
  useEffect(() => {
    trackPageView();
  }, [location.pathname]);
  return null;
};

const App = () => {
  return (
    <AuthProvider>
      <SettingsProvider>
        <CustomerAuthProvider>
          <WishlistProvider>
          <CartProvider>
            <Router>
            <PageTracker />
            <FeedbackWidget />
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
                <Route path="oxygennotes" element={<Blog />} />
                <Route path="oxygennotes/:id" element={<BlogPostDetail />} />
                <Route path="faq" element={<FAQ />} />
                <Route path="contact" element={<Contact />} />
                <Route path="account" element={<Account />} />
                <Route path="verify-email" element={<VerifyEmail />} />
                <Route path="reset-password" element={<ResetPassword />} />
              </Route>

            {/* Public standalone pages (outside Layout) */}
            <Route path="/contract/:token" element={<ContractView />} />

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
              <Route path="analytics" element={<AnalyticsHub />} />
              <Route path="analytics/revenue" element={<AnalyticsRevenue />} />
              <Route path="analytics/email" element={<AnalyticsEmail />} />
              <Route path="analytics/content" element={<AnalyticsContent />} />
              <Route path="analytics/customers" element={<AnalyticsCustomers />} />
              <Route path="analytics/services" element={<AnalyticsServices />} />
              <Route path="inbox" element={<ContactInbox />} />
              <Route path="newsletter" element={<NewsletterManager />} />
              <Route path="campaigns" element={<CampaignList />} />
              <Route path="campaigns/new" element={<CampaignCompose />} />
              <Route path="campaigns/:id" element={<CampaignCompose />} />
              <Route path="campaigns/:id/review" element={<CampaignReview />} />
              <Route path="campaigns/:id/analytics" element={<CampaignAnalytics />} />
              <Route path="subscribers" element={<SubscriberList />} />
              <Route path="subscribers/import" element={<SubscriberImport />} />
              <Route path="subscribers/:id" element={<SubscriberDetail />} />
              <Route path="segments" element={<SegmentList />} />
              <Route path="segments/new" element={<SegmentBuilder />} />
              <Route path="segments/:id" element={<SegmentBuilder />} />
              <Route path="products" element={<ProductsManager />} />
              <Route path="products/new" element={<ProductEditor />} />
              <Route path="products/:id" element={<ProductEditor />} />
              <Route path="promotions" element={<PromotionsManager />} />
              <Route path="orders" element={<OrdersManager />} />
              <Route path="orders/:id" element={<OrderDetail />} />
              <Route path="coaching" element={<CoachingManager />} />
              <Route path="coaching/new" element={<CoachingEditor />} />
              <Route path="coaching/:id" element={<CoachingEditor />} />
              <Route path="workshops" element={<WorkshopsManager />} />
              <Route path="workshops/new" element={<WorkshopEditor />} />
              <Route path="workshops/:id" element={<WorkshopEditor />} />
              <Route path="cohorts" element={<CohortsManager />} />
              <Route path="cohorts/new" element={<CohortEditor />} />
              <Route path="cohorts/:id" element={<CohortEditor />} />
              <Route path="blog" element={<BlogManager />} />
              <Route path="faqs" element={<FAQsManager />} />
              <Route path="settings" element={<SiteSettingsManager />} />
              <Route path="activity" element={<ActivityLog />} />
              <Route path="templates" element={<TemplateLibrary />} />
              <Route path="templates/new" element={<TemplateEditor />} />
              <Route path="templates/:id" element={<TemplateEditor />} />
              <Route path="automations" element={<AutomationsManager />} />
              <Route path="automations/queue" element={<AutomationQueue />} />
              <Route path="email-settings" element={<EmailSettings />} />
              <Route path="media" element={<MediaLibrary />} />
              <Route path="customers" element={<CustomersManager />} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="coaching/clients" element={<ClientsManager />} />
              <Route path="coaching/clients/:id" element={<ClientDetail />} />
              <Route path="coaching/applications" element={<ApplicationsManager />} />
              <Route path="bookings" element={<BookingsManager />} />
              <Route path="reviews" element={<ReviewsManager />} />
              <Route path="wishlists" element={<WishlistsManager />} />
              <Route path="abandoned-carts" element={<AbandonedCartsManager />} />
              <Route path="gift-cards" element={<GiftCardsManager />} />
              <Route path="waitlist" element={<WaitlistManager />} />
              <Route path="data-export" element={<DataExport />} />
            </Route>

              {/* Catch-all route redirects to home */}
              <Route path="*" element={<Home />} />
            </Routes>
            </Router>
          </CartProvider>
          </WishlistProvider>
        </CustomerAuthProvider>
      </SettingsProvider>
    </AuthProvider>
  );
};

export default App;
