
import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X, User, CreditCard, ChevronDown } from 'lucide-react';
import GlobalBackground from './GlobalBackground';
import LeadMagnet from './LeadMagnet';

const Layout = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <div className="flex flex-col min-h-screen font-sans text-stone-800 bg-white selection:bg-stone-200 selection:text-stone-900 relative">
      
      {/* Global Abstract Background Lines */}
      <GlobalBackground />

      {/* Navigation */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out border-b ${
          isScrolled || mobileMenuOpen 
            ? 'bg-stone-900 border-stone-800 py-3 shadow-md' 
            : 'bg-stone-900 border-stone-800 py-4 shadow-sm'
        }`}
      >
        <div className="container mx-auto px-6 flex justify-between items-center relative">
          {/* Desktop Links Left - With Dropdowns */}
          <div className="hidden md:flex gap-8 items-center">
            
            {/* Shop Dropdown */}
            <div className="group relative h-full py-2">
              <Link to="/shop" className="flex items-center gap-1 text-sm uppercase tracking-widest font-medium text-stone-200 hover:text-clay transition-colors">
                Shop <ChevronDown size={10} className="text-stone-400" />
              </Link>
              <div className="dropdown-menu absolute top-full left-0 mt-0 w-48 bg-white border border-stone-200 shadow-xl pt-2 pb-4 px-0 z-50">
                <div className="w-full h-1 bg-clay absolute top-0 left-0"></div>
                <Link to="/shop" className="block px-6 py-2 text-sm text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition-colors">All Collection</Link>
                <Link to="/shop" className="block px-6 py-2 text-sm text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition-colors">Earrings</Link>
                <Link to="/shop" className="block px-6 py-2 text-sm text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition-colors">Brooches</Link>
                <Link to="/shop" className="block px-6 py-2 text-sm text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition-colors">Necklaces</Link>
              </div>
            </div>

            {/* Coaching Dropdown */}
            <div className="group relative h-full py-2">
              <Link to="/coaching" className="flex items-center gap-1 text-sm uppercase tracking-widest font-medium text-stone-200 hover:text-clay transition-colors">
                Coaching <ChevronDown size={10} className="text-stone-400" />
              </Link>
              <div className="dropdown-menu absolute top-full left-0 mt-0 w-56 bg-white border border-stone-200 shadow-xl pt-2 pb-4 px-0 z-50">
                <div className="w-full h-1 bg-stone-900 absolute top-0 left-0"></div>
                <Link to="/coaching" className="block px-6 py-2 text-sm text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition-colors">Overview</Link>
                <Link to="/coaching" className="block px-6 py-2 text-sm text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition-colors">Clarity Sessions</Link>
                <Link to="/coaching" className="block px-6 py-2 text-sm text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition-colors">The Oxygen Series</Link>
                <Link to="/coaching" className="block px-6 py-2 text-sm text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition-colors">Workshops</Link>
              </div>
            </div>

             {/* Learn Dropdown */}
             <div className="group relative h-full py-2">
              <Link to="/learn" className="flex items-center gap-1 text-sm uppercase tracking-widest font-medium text-stone-200 hover:text-clay transition-colors">
                Learn <ChevronDown size={10} className="text-stone-400" />
              </Link>
              <div className="dropdown-menu absolute top-full left-0 mt-0 w-56 bg-white border border-stone-200 shadow-xl pt-2 pb-4 px-0 z-50">
                <div className="w-full h-1 bg-stone-900 absolute top-0 left-0"></div>
                <Link to="/learn" className="block px-6 py-2 text-sm text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition-colors">Workshops & Courses</Link>
              </div>
            </div>

            <Link to="/about" className="text-sm uppercase tracking-widest font-medium text-stone-200 hover:text-clay transition-colors py-2">About</Link>
            
            <Link to="/journal" className="text-sm uppercase tracking-widest font-medium text-stone-200 hover:text-clay transition-colors py-2">Blog</Link>

            <Link to="/faq" className="text-sm uppercase tracking-widest font-medium text-stone-200 hover:text-clay transition-colors py-2">FAQ</Link>
          </div>

          {/* Logo - Centered Absolutely */}
          <Link 
            to="/" 
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-base md:text-lg font-serif font-medium tracking-[0.15em] z-50 uppercase text-center text-white hover:opacity-70 transition-opacity duration-300 whitespace-nowrap"
          >
            Lyne Tilt
          </Link>

          {/* Desktop Links Right */}
          <div className="hidden md:flex gap-6 items-center">
             <Link to="/contact" className="text-[10px] uppercase tracking-widest font-bold border border-stone-600 text-stone-200 px-5 py-2 hover:bg-stone-200 hover:text-stone-900 transition-all duration-300">
               Book Free Call
             </Link>
            <button className="relative text-stone-200 hover:text-clay transition-colors group">
              <ShoppingBag size={18} />
              <span className="absolute -top-1 -right-2 bg-stone-700 group-hover:bg-clay transition-colors text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">0</span>
            </button>
          </div>

          {/* Mobile Toggle */}
          <button 
            className="md:hidden z-50 text-stone-200 hover:text-white ml-auto"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Fullscreen Menu */}
      <div className={`fixed inset-0 bg-white z-40 flex flex-col items-center justify-center transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) md:hidden ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex flex-col gap-8 text-center text-2xl font-serif text-stone-900">
          <Link to="/" onClick={() => setMobileMenuOpen(false)}>Home</Link>
          <Link to="/shop" onClick={() => setMobileMenuOpen(false)}>Shop Collection</Link>
          <Link to="/coaching" onClick={() => setMobileMenuOpen(false)}>Coaching</Link>
          <Link to="/learn" onClick={() => setMobileMenuOpen(false)}>Learn</Link>
          <Link to="/about" onClick={() => setMobileMenuOpen(false)}>About Lyne</Link>
          <Link to="/journal" onClick={() => setMobileMenuOpen(false)}>Blog</Link>
          <Link to="/faq" onClick={() => setMobileMenuOpen(false)}>FAQ</Link>
          <Link to="/contact" className="text-lg mt-4 border border-stone-900 px-6 py-3" onClick={() => setMobileMenuOpen(false)}>Book Free Call</Link>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow pt-0 relative z-10">
        <Outlet />
      </main>

      {/* Global Lead Magnet (Newsletter Sign up) */}
      <div className="relative z-10">
        <LeadMagnet />
      </div>

      {/* Footer */}
      <footer className="bg-stone-50 text-stone-600 py-10 px-6 border-t border-stone-200 relative z-10">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Column */}
          <div className="md:col-span-1">
            <h4 className="font-serif text-xl text-stone-900 mb-4 tracking-wider">LYNE TILT</h4>
            <p className="text-xs leading-loose mb-4 text-stone-500 font-light uppercase tracking-wide">
              Brisbane-based studio.<br/>
              Est. 2023
            </p>
            <div className="flex items-center gap-2 text-stone-400">
               <span className="text-xs font-bold border border-stone-300 px-2 py-1 rounded-sm flex items-center gap-1">
                 PayPal <CreditCard size={12} />
               </span>
            </div>
          </div>
          
          {/* Shop Column */}
          <div>
            <h5 className="text-stone-900 uppercase tracking-widest text-xs font-bold mb-4">Collection</h5>
            <ul className="space-y-2 text-sm font-light">
              <li><Link to="/shop" className="hover:text-clay transition-colors">All Items</Link></li>
              <li><Link to="/shop" className="hover:text-clay transition-colors">Earrings</Link></li>
              <li><Link to="/shop" className="hover:text-clay transition-colors">Brooches</Link></li>
              <li><Link to="/shop" className="hover:text-clay transition-colors">Limited Edition</Link></li>
            </ul>
          </div>

          {/* Learn Column */}
          <div>
            <h5 className="text-stone-900 uppercase tracking-widest text-xs font-bold mb-4">Practice</h5>
            <ul className="space-y-2 text-sm font-light">
              <li><Link to="/coaching" className="hover:text-clay transition-colors">Clarity Coaching</Link></li>
              <li><Link to="/learn" className="hover:text-clay transition-colors">Workshops & Courses</Link></li>
              <li><Link to="/journal" className="hover:text-clay transition-colors">The Blog</Link></li>
              <li><Link to="/contact" className="hover:text-clay transition-colors">Book Free Call</Link></li>
            </ul>
          </div>

          {/* About Column */}
          <div>
            <h5 className="text-stone-900 uppercase tracking-widest text-xs font-bold mb-4">Studio</h5>
            <ul className="space-y-2 text-sm font-light">
              <li><Link to="/about" className="hover:text-clay transition-colors">About Lyne</Link></li>
              <li><Link to="/contact" className="hover:text-clay transition-colors">Contact</Link></li>
              <li><Link to="/faq" className="hover:text-clay transition-colors">FAQ</Link></li>
              <li><Link to="/shop" className="hover:text-clay transition-colors">Shipping & Returns</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="container mx-auto mt-8 pt-8 border-t border-stone-200 text-[10px] uppercase tracking-widest text-stone-400 flex flex-col md:flex-row justify-between items-center text-center md:text-left leading-loose">
          <p>&copy; 2025 Lyne Tilt Studio. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-stone-600 transition-colors">Instagram</a>
            <a href="#" className="hover:text-stone-600 transition-colors">LinkedIn</a>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-stone-200 p-3 z-50 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Link to="/shop" className="flex flex-col items-center text-stone-500 hover:text-clay">
          <ShoppingBag size={18} />
          <span className="text-[9px] uppercase tracking-wide mt-1">Shop</span>
        </Link>
        <Link to="/contact" className="bg-stone-900 text-white px-6 py-2 text-[10px] uppercase tracking-widest font-bold">
          Book Call
        </Link>
        <Link to="/coaching" className="flex flex-col items-center text-stone-500 hover:text-clay">
          <User size={18} />
          <span className="text-[9px] uppercase tracking-wide mt-1">Coaching</span>
        </Link>
      </div>
    </div>
  );
};

export default Layout;
