import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Coaching from './pages/Coaching';
import About from './pages/About';
import Blog from './pages/Blog';
import FAQ from './pages/FAQ';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="shop/:id" element={<ProductDetail />} />
          <Route path="coaching" element={<Coaching />} />
          <Route path="about" element={<About />} />
          <Route path="journal" element={<Blog />} />
          <Route path="faq" element={<FAQ />} />
          {/* Catch-all route redirects to home for simplicity in this demo */}
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;