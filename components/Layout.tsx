
import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X, User, ChevronDown, LogOut, Package, Heart, MapPin } from 'lucide-react';
import GlobalBackground from './GlobalBackground';
import LeadMagnet from './LeadMagnet';
import AuthModal from './AuthModal';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';

const Layout = () => {
  const { settings } = useSettings();
  const { footer } = settings;
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileAccordion, setMobileAccordion] = useState<string | null>(null);
  const dropdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();
  const { cartCount } = useCart();
  const { user, isAuthenticated, logout, openAuthModal } = useCustomerAuth();

  // Active page detection
  const isShopActive = location.pathname === '/shop' || location.pathname.startsWith('/shop/');
  const isLearnActive = ['/learn', '/oxygennotes'].some(p => location.pathname === p || location.pathname.startsWith(p + '/'));
  const isCoachingActive = location.pathname === '/coaching';
  const isAboutActive = location.pathname === '/about';
  const isFaqActive = location.pathname === '/faq';

  // Dropdown hover management with delay to prevent flicker
  const openDropdown = (name: string) => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setActiveDropdown(name);
  };

  const closeDropdown = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  const toggleMobileAccordion = (section: string) => {
    setMobileAccordion(prev => prev === section ? null : section);
  };

  // Close dropdowns on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdown(null);
        setUserMenuOpen(false);
        if (mobileMenuOpen) setMobileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    };
  }, []);

  // Close all menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    setActiveDropdown(null);
    setMobileAccordion(null);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen font-sans text-stone-800 bg-white selection:bg-stone-200 selection:text-stone-900 relative">

      {/* Global Abstract Background Lines */}
      <GlobalBackground />

      {/* Navigation */}
      <nav
        aria-label="Main navigation"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out border-b ${
          isScrolled || mobileMenuOpen
            ? 'bg-stone-900 border-stone-800 pt-1 pb-0 shadow-md'
            : 'bg-stone-900 border-stone-800 pt-1 pb-0 shadow-sm'
        }`}
      >
        <div className="container mx-auto px-6 flex items-center justify-between">
          {/* Logo - Left */}
          <div className="flex-1">
          <Link
            to="/"
            className="z-50 hover:opacity-70 transition-opacity duration-300 inline-block"
          >
            <img
              src="https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/fac44eed-af07-4260-a870-f990338b731a/Untitled+design+%286%29.png?format=1500w"
              alt="Lyne Tilt"
              className="h-[60px] lg:h-[78px] w-auto object-contain -mb-2"
            />
          </Link>
          </div>

          {/* Desktop Links - Center */}
          <div className="hidden lg:flex gap-6 xl:gap-8 items-center justify-center flex-shrink-0">

            {/* Shop Dropdown */}
            <div
              className="relative h-full py-2"
              onMouseEnter={() => openDropdown('shop')}
              onMouseLeave={closeDropdown}
            >
              <Link to="/shop" aria-haspopup="true" aria-expanded={activeDropdown === 'shop'} className={`flex items-center gap-1 text-xs xl:text-sm uppercase tracking-wider xl:tracking-widest font-medium transition-colors relative z-10 whitespace-nowrap ${isShopActive ? 'text-clay' : 'text-stone-200 hover:text-clay'}`}>
                Shop <ChevronDown size={10} className={`transition-transform duration-200 ${activeDropdown === 'shop' ? 'rotate-180' : ''} ${isShopActive ? 'text-clay' : 'text-stone-400'}`} />
              </Link>
              {isShopActive && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-clay" />}
              <div role="menu" className={`absolute top-full left-1/2 -translate-x-1/2 mt-3 w-52 bg-white/95 backdrop-blur-sm rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] ring-1 ring-stone-900/5 py-2 z-50 transition-all duration-300 ease-out ${activeDropdown === 'shop' ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1 pointer-events-none'}`}>
                <Link to="/shop" className="block mx-2 px-4 py-2.5 text-sm font-medium text-stone-800 rounded-lg hover:bg-stone-50 transition-colors">View All</Link>
                <div className="h-px bg-stone-100 mx-4 my-1.5"></div>
                <p className="px-6 pt-2 pb-1 text-[10px] uppercase tracking-[0.2em] text-stone-400 font-medium">Wearable Art</p>
                <Link to="/shop?category=Earrings" className="block mx-2 px-4 py-2 text-sm text-stone-500 rounded-lg hover:text-stone-800 hover:bg-stone-50 transition-colors">Earrings</Link>
                <Link to="/shop?category=Brooches" className="block mx-2 px-4 py-2 text-sm text-stone-500 rounded-lg hover:text-stone-800 hover:bg-stone-50 transition-colors">Brooches</Link>
                <Link to="/shop?category=Necklaces" className="block mx-2 px-4 py-2 text-sm text-stone-500 rounded-lg hover:text-stone-800 hover:bg-stone-50 transition-colors">Necklaces</Link>
              </div>
            </div>

            <Link to="/coaching" className={`text-xs xl:text-sm uppercase tracking-wider xl:tracking-widest font-medium transition-colors py-2 whitespace-nowrap relative ${isCoachingActive ? 'text-clay' : 'text-stone-200 hover:text-clay'}`}>
              Coaching
              {isCoachingActive && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-clay" />}
            </Link>

             {/* Learn Dropdown */}
             <div
              className="relative h-full py-2"
              onMouseEnter={() => openDropdown('learn')}
              onMouseLeave={closeDropdown}
            >
              <Link to="/learn" aria-haspopup="true" aria-expanded={activeDropdown === 'learn'} className={`flex items-center gap-1 text-xs xl:text-sm uppercase tracking-wider xl:tracking-widest font-medium transition-colors relative z-10 whitespace-nowrap ${isLearnActive ? 'text-clay' : 'text-stone-200 hover:text-clay'}`}>
                Learn <ChevronDown size={10} className={`transition-transform duration-200 ${activeDropdown === 'learn' ? 'rotate-180' : ''} ${isLearnActive ? 'text-clay' : 'text-stone-400'}`} />
              </Link>
              {isLearnActive && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-clay" />}
              <div role="menu" className={`absolute top-full left-1/2 -translate-x-1/2 mt-3 w-52 bg-white/95 backdrop-blur-sm rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] ring-1 ring-stone-900/5 py-2 z-50 transition-all duration-300 ease-out ${activeDropdown === 'learn' ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1 pointer-events-none'}`}>
                <Link to="/learn" className="block mx-2 px-4 py-2.5 text-sm text-stone-500 rounded-lg hover:text-stone-800 hover:bg-stone-50 transition-colors">Workshops & Courses</Link>
                <Link to="/oxygennotes" className="block mx-2 px-4 py-2.5 text-sm text-stone-500 rounded-lg hover:text-stone-800 hover:bg-stone-50 transition-colors">Oxygen Notes</Link>
              </div>
            </div>

            <Link to="/about" className={`text-xs xl:text-sm uppercase tracking-wider xl:tracking-widest font-medium transition-colors py-2 whitespace-nowrap relative ${isAboutActive ? 'text-clay' : 'text-stone-200 hover:text-clay'}`}>
              About
              {isAboutActive && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-clay" />}
            </Link>

            <Link to="/faq" className={`text-xs xl:text-sm uppercase tracking-wider xl:tracking-widest font-medium transition-colors py-2 whitespace-nowrap relative ${isFaqActive ? 'text-clay' : 'text-stone-200 hover:text-clay'}`}>
              Policies
              {isFaqActive && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-clay" />}
            </Link>

          </div>

          {/* Desktop Links Right */}
          <div className="hidden lg:flex flex-1 justify-end">
          <div className="flex gap-3 xl:gap-4 items-center">
            {/* Login / User Menu */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 text-stone-200 hover:text-clay transition-colors"
                >
                  <User size={18} />
                  <span className="text-xs">Hi, {user?.firstName}</span>
                  <ChevronDown size={12} className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-3 w-56 bg-white/95 backdrop-blur-sm rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] ring-1 ring-stone-900/5 py-2 z-50">
                      <div className="px-5 py-3 border-b border-stone-100 mx-2">
                        <p className="text-sm font-medium text-stone-900">{user?.firstName} {user?.lastName}</p>
                        <p className="text-xs text-stone-400 truncate mt-0.5">{user?.email}</p>
                      </div>
                      <div className="py-1.5">
                        <Link to="/account" className="flex items-center gap-3 mx-2 px-3 py-2.5 text-sm text-stone-600 rounded-lg hover:text-stone-800 hover:bg-stone-50 transition-colors">
                          <User size={15} className="text-stone-400" />
                          My Account
                        </Link>
                        <Link to="/account?tab=orders" className="flex items-center gap-3 mx-2 px-3 py-2.5 text-sm text-stone-600 rounded-lg hover:text-stone-800 hover:bg-stone-50 transition-colors">
                          <Package size={15} className="text-stone-400" />
                          Order History
                        </Link>
                        <Link to="/account?tab=wishlist" className="flex items-center gap-3 mx-2 px-3 py-2.5 text-sm text-stone-600 rounded-lg hover:text-stone-800 hover:bg-stone-50 transition-colors">
                          <Heart size={15} className="text-stone-400" />
                          Wishlist
                        </Link>
                        <Link to="/account?tab=addresses" className="flex items-center gap-3 mx-2 px-3 py-2.5 text-sm text-stone-600 rounded-lg hover:text-stone-800 hover:bg-stone-50 transition-colors">
                          <MapPin size={15} className="text-stone-400" />
                          Addresses
                        </Link>
                      </div>
                      <div className="border-t border-stone-100 mx-2 pt-1.5">
                        <button
                          onClick={() => { logout(); setUserMenuOpen(false); }}
                          className="flex items-center gap-3 mx-2 px-3 py-2.5 text-sm text-stone-600 rounded-lg hover:text-stone-800 hover:bg-stone-50 transition-colors w-[calc(100%-16px)]"
                        >
                          <LogOut size={15} className="text-stone-400" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => openAuthModal('login')}
                className="flex items-center gap-2 text-stone-200 hover:text-clay transition-colors"
              >
                <User size={18} />
                <span className="text-xs uppercase tracking-widest">Login</span>
              </button>
            )}

            <Link to="/checkout" className="relative text-stone-200 hover:text-clay transition-colors group">
              <ShoppingBag size={18} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-stone-700 group-hover:bg-clay transition-colors text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{cartCount}</span>
              )}
            </Link>
          </div>
          </div>

          {/* Mobile Icons */}
          <div className="lg:hidden z-50 flex items-center gap-4 ml-auto">
            {isAuthenticated ? (
              <Link to="/account" className="text-stone-200 hover:text-clay transition-colors">
                <User size={20} />
              </Link>
            ) : (
              <button onClick={() => openAuthModal('login')} className="text-stone-200 hover:text-clay transition-colors">
                <User size={20} />
              </button>
            )}
            <Link to="/checkout" className="relative text-stone-200 hover:text-clay transition-colors">
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-clay text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{cartCount}</span>
              )}
            </Link>
            <button
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              className="text-stone-200 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Fullscreen Menu */}
      <div className={`fixed inset-0 bg-white z-40 flex flex-col items-center justify-center transition-all duration-700 lg:hidden ${mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex flex-col gap-6 text-center text-2xl font-serif text-stone-900 w-full max-w-xs">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`transition-colors ${location.pathname === '/' ? 'text-clay' : ''}`}
          >
            Home
          </Link>

          {/* Shop Accordion */}
          <div>
            <button
              onClick={() => toggleMobileAccordion('shop')}
              className={`flex items-center justify-center gap-2 w-full text-2xl font-serif transition-colors ${isShopActive ? 'text-clay' : 'text-stone-900'}`}
            >
              Shop
              <ChevronDown size={18} className={`transition-transform duration-300 ${mobileAccordion === 'shop' ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${mobileAccordion === 'shop' ? 'max-h-80 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
              <div className="flex flex-col gap-3 text-base font-sans text-stone-500">
                <Link to="/shop" onClick={() => setMobileMenuOpen(false)} className="hover:text-clay transition-colors">All Wearable Art</Link>
                <Link to="/shop?category=Earrings" onClick={() => setMobileMenuOpen(false)} className="hover:text-clay transition-colors">Earrings</Link>
                <Link to="/shop?category=Brooches" onClick={() => setMobileMenuOpen(false)} className="hover:text-clay transition-colors">Brooches</Link>
                <Link to="/shop?category=Necklaces" onClick={() => setMobileMenuOpen(false)} className="hover:text-clay transition-colors">Necklaces</Link>
              </div>
            </div>
          </div>

          <Link
            to="/coaching"
            onClick={() => setMobileMenuOpen(false)}
            className={`transition-colors ${isCoachingActive ? 'text-clay' : ''}`}
          >
            Coaching & Mentoring
          </Link>

          {/* Learn Accordion */}
          <div>
            <button
              onClick={() => toggleMobileAccordion('learn')}
              className={`flex items-center justify-center gap-2 w-full text-2xl font-serif transition-colors ${isLearnActive ? 'text-clay' : 'text-stone-900'}`}
            >
              Learn & Create
              <ChevronDown size={18} className={`transition-transform duration-300 ${mobileAccordion === 'learn' ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${mobileAccordion === 'learn' ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
              <div className="flex flex-col gap-3 text-base font-sans text-stone-500">
                <Link to="/learn" onClick={() => setMobileMenuOpen(false)} className="hover:text-clay transition-colors">Workshops & Courses</Link>
                <Link to="/oxygennotes" onClick={() => setMobileMenuOpen(false)} className="hover:text-clay transition-colors">Oxygen Notes</Link>
              </div>
            </div>
          </div>

          <Link
            to="/about"
            onClick={() => setMobileMenuOpen(false)}
            className={`transition-colors ${isAboutActive ? 'text-clay' : ''}`}
          >
            About Lyne
          </Link>
          <Link
            to="/faq"
            onClick={() => setMobileMenuOpen(false)}
            className={`transition-colors ${isFaqActive ? 'text-clay' : ''}`}
          >
            Policies
          </Link>
          {isAuthenticated ? (
            <Link
              to="/account"
              onClick={() => setMobileMenuOpen(false)}
              className={`transition-colors ${location.pathname === '/account' ? 'text-clay' : ''}`}
            >
              My Account
            </Link>
          ) : (
            <button onClick={() => { setMobileMenuOpen(false); openAuthModal('login'); }} className="text-clay">
              Login / Register
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow pt-0 relative">
        <Outlet />
      </main>

      {/* Global Lead Magnet (Newsletter Sign up) - Hidden on Blog page which has its own */}
      {location.pathname !== '/oxygennotes' && location.pathname !== '/learn' && (
        <div id="newsletter" className="relative">
          <LeadMagnet />
        </div>
      )}

      {/* Footer */}
      <footer className="bg-stone-50 text-stone-600 py-3 md:py-6 px-4 md:px-6 border-t border-stone-200 relative">
        <div className="container mx-auto grid grid-cols-4 gap-2 md:gap-6">

          {/* Brand Column */}
          <div>
            <h4 className="font-serif text-base md:text-xl text-stone-900 mb-2 tracking-wider">{footer.tagline}</h4>
            <p className="text-[10px] md:text-xs leading-relaxed mb-3 text-stone-500 font-light uppercase tracking-wide">
              {footer.location}<br/>
              {footer.established}
            </p>
            <div className="flex flex-wrap items-center gap-1 md:gap-2 text-stone-400">
               <span className="text-[9px] md:text-[10px] font-medium border border-stone-300 px-1.5 md:px-2 py-0.5 md:py-1 rounded-sm">Visa</span>
               <span className="text-[9px] md:text-[10px] font-medium border border-stone-300 px-1.5 md:px-2 py-0.5 md:py-1 rounded-sm">MC</span>
               <span className="text-[9px] md:text-[10px] font-medium border border-stone-300 px-1.5 md:px-2 py-0.5 md:py-1 rounded-sm">Amex</span>
               <span className="text-[9px] md:text-[10px] font-medium border border-stone-300 px-1.5 md:px-2 py-0.5 md:py-1 rounded-sm">Apple Pay</span>
               <span className="text-[9px] md:text-[10px] font-medium border border-stone-300 px-1.5 md:px-2 py-0.5 md:py-1 rounded-sm">Google Pay</span>
               <span className="text-[9px] md:text-[10px] font-medium border border-stone-300 px-1.5 md:px-2 py-0.5 md:py-1 rounded-sm">PayPal</span>
            </div>
          </div>

          {/* Dynamic Columns from Settings */}
          {footer.columns.length > 0 ? (
            footer.columns.map((column, idx) => (
              <div key={idx}>
                <h5 className="text-stone-900 uppercase tracking-widest text-[10px] md:text-xs font-bold mb-2">{column.title}</h5>
                <ul className="space-y-0.5 md:space-y-1 text-xs md:text-sm font-light leading-tight md:leading-normal">
                  {column.links.map((link, linkIdx) => (
                    <li key={linkIdx}>
                      <Link to={link.url} className="hover:text-clay transition-colors link-underline">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <>
              {/* Shop Column - Default */}
              <div>
                <h5 className="text-stone-900 uppercase tracking-widest text-[10px] md:text-xs font-bold mb-2">Collection</h5>
                <ul className="space-y-0.5 md:space-y-1 text-xs md:text-sm font-light leading-tight md:leading-normal">
                  <li><Link to="/shop" className="hover:text-clay transition-colors link-underline">All Items</Link></li>
                  <li><Link to="/shop?category=Earrings" className="hover:text-clay transition-colors link-underline">Earrings</Link></li>
                  <li><Link to="/shop?category=Brooches" className="hover:text-clay transition-colors link-underline">Brooches</Link></li>
                  <li><Link to="/shop?category=Necklaces" className="hover:text-clay transition-colors link-underline">Necklaces</Link></li>
                </ul>
              </div>

              {/* Learn Column - Default */}
              <div>
                <h5 className="text-stone-900 uppercase tracking-widest text-[10px] md:text-xs font-bold mb-2">Practice</h5>
                <ul className="space-y-0.5 md:space-y-1 text-xs md:text-sm font-light leading-tight md:leading-normal">
                  <li><Link to="/coaching" className="hover:text-clay transition-colors link-underline">Clarity Coaching</Link></li>
                  <li><Link to="/learn" className="hover:text-clay transition-colors link-underline">Workshops & Courses</Link></li>
                  <li><Link to="/oxygennotes" className="hover:text-clay transition-colors link-underline">Oxygen Notes</Link></li>
                </ul>
              </div>

              {/* About Column - Default */}
              <div>
                <h5 className="text-stone-900 uppercase tracking-widest text-[10px] md:text-xs font-bold mb-2">Studio</h5>
                <ul className="space-y-0.5 md:space-y-1 text-xs md:text-sm font-light leading-tight md:leading-normal">
                  <li><Link to="/about" className="hover:text-clay transition-colors link-underline">About Lyne</Link></li>
                  <li><Link to="/contact" className="hover:text-clay transition-colors link-underline">Contact</Link></li>
                  <li><Link to="/faq" className="hover:text-clay transition-colors link-underline">Policies & FAQs</Link></li>
                  <li><Link to="/admin" className="hover:text-clay transition-colors link-underline">Admin</Link></li>
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="container mx-auto mt-3 md:mt-5 pt-2 md:pt-4 border-t border-stone-200 text-[10px] uppercase tracking-widest text-stone-400 flex flex-col md:flex-row justify-between items-center text-center md:text-left leading-relaxed">
          <p>{footer.copyright}</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            {footer.socialLinks.length > 0 ? (
              footer.socialLinks.map((social, idx) => (
                <a key={idx} href={social.url} target="_blank" rel="noopener noreferrer" className="hover:text-stone-600 transition-colors link-underline capitalize">{social.platform}</a>
              ))
            ) : (
              <>
                <a href="#" className="hover:text-stone-600 transition-colors link-underline">Instagram</a>
                <a href="#" className="hover:text-stone-600 transition-colors link-underline">LinkedIn</a>
              </>
            )}
          </div>
        </div>
      </footer>


      {/* Auth Modal */}
      <AuthModal />
    </div>
  );
};

export default Layout;
