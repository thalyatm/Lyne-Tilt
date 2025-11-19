
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import Coaching from './pages/Coaching';
import Learn from './pages/Learn';
import About from './pages/About';
import Blog from './pages/Blog';
import BlogPostDetail from './pages/BlogPostDetail';
import FAQ from './pages/FAQ';
import Contact from './pages/Contact';

const App = () => {
  return (
    <CartProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="shop" element={<Shop />} />
            <Route path="shop/:id" element={<ProductDetail />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="coaching" element={<Coaching />} />
            <Route path="learn" element={<Learn />} />
            <Route path="about" element={<About />} />
            <Route path="journal" element={<Blog />} />
            <Route path="journal/:id" element={<BlogPostDetail />} />
            <Route path="faq" element={<FAQ />} />
            <Route path="contact" element={<Contact />} />
            {/* Catch-all route redirects to home for simplicity in this demo */}
            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
      </Router>
    </CartProvider>
  );
};

export default App;
