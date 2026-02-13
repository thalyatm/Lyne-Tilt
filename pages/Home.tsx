
import React, { useEffect, useRef, useState } from 'react';
import Hero from '../components/Hero';
import SplitPath from '../components/SplitPath';
import SectionHeading from '../components/SectionHeading';
import { Link } from 'react-router-dom';
import { Star, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { API_BASE } from '../config/api';
import { Product, ProductCategory, Testimonial } from '../types';

// Helper component for scroll reveal animation
const RevealOnScroll: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = "" }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return (
    <div ref={ref} className={`reveal-on-scroll ${className}`}>
      {children}
    </div>
  );
};

const Home = () => {
  const { settings } = useSettings();
  const { home } = settings;
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => { document.title = 'Lyne Tilt — Wearable Art & Creative Coaching'; }, []);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_BASE}/products`);
        if (!response.ok) throw new Error('API error');
        const data = await response.json();
        const mapped: Product[] = data.slice(0, 3).map((p: any) => ({
          id: p.id,
          name: p.name,
          price: parseFloat(p.price),
          currency: p.currency || 'AUD',
          category: p.category as ProductCategory,
          colours: [],
          shortDescription: p.shortDescription || '',
          longDescription: p.longDescription || '',
          image: p.image,
          detailImages: p.detailImages || [],
          badge: p.badge,
          availability: p.availability || 'In stock',
        }));
        setFeaturedProducts(mapped);
      } catch {
        // Products will remain empty
      }
    };
    fetchProducts();
  }, []);

  // Fetch testimonials
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const response = await fetch(`${API_BASE}/testimonials`);
        if (!response.ok) throw new Error('API error');
        const data = await response.json();
        setTestimonials(data);
      } catch {
        // Testimonials will remain empty
      }
    };
    fetchTestimonials();
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    if (testimonials.length === 0) return;
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  const nextTestimonial = () => {
    if (testimonials.length === 0) return;
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    if (testimonials.length === 0) return;
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <div className="relative overflow-hidden bg-transparent">

      {/* 1. Hero */}
      <Hero />

      {/* 2. Split Path */}
      <RevealOnScroll>
        <SplitPath />
      </RevealOnScroll>

      {/* 3. About Section */}
      <section className="pt-16 pb-16 px-6 max-w-7xl mx-auto relative z-10 bg-white w-full border-b border-stone-100">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center">

            {/* Image Column */}
            <div className="md:col-span-5 relative">
                 <RevealOnScroll>
                    <div className="relative aspect-[4/5] bg-stone-200 overflow-hidden shadow-2xl shadow-stone-200 image-zoom-container">
                        <img
                           src={home.aboutSection.image || "https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/a2b24cba-294f-4e4f-b4a6-ebaa1b285607/IMG_4502+copy.jpg?format=300w"}
                           alt="Lyne Tilt"
                           className="w-full h-full object-cover transition-all duration-1000 image-zoom"
                        />
                        <div className="absolute inset-0 border-[1px] border-white/20 pointer-events-none"></div>
                    </div>
                 </RevealOnScroll>
            </div>

            {/* Text Column */}
            <div className="md:col-span-7 md:pl-8">
                 <RevealOnScroll>
                    <p className="text-stone-400 text-[10px] uppercase tracking-[0.3em] mb-3">Meet Lyne</p>
                    <h2 className="text-3xl md:text-4xl font-serif mb-5 text-stone-900">{home.aboutSection.title}</h2>

                    <div className="prose prose-stone text-stone-600 leading-relaxed text-sm mb-6 max-w-lg">
                        {home.aboutSection.paragraphs.map((para, idx) => (
                          <p key={idx} className={idx < home.aboutSection.paragraphs.length - 1 ? 'mb-4' : ''}>
                            {para}
                          </p>
                        ))}
                    </div>

                    <Link to={home.aboutSection.linkUrl} className="inline-flex items-center gap-3 text-stone-900 uppercase text-[10px] tracking-widest font-bold hover:text-clay transition-colors group">
                        <span className="link-underline">{home.aboutSection.linkText}</span> <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                 </RevealOnScroll>
            </div>
        </div>
      </section>

      {/* 4. Featured Shop */}
      {featuredProducts.length > 0 && (
        <section className="py-10 px-6 max-w-7xl mx-auto relative z-10 bg-stone-50">
          <RevealOnScroll>
            <SectionHeading
              title={home.shopCta.title}
              subtitle={home.shopCta.subtitle}
            />
          </RevealOnScroll>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            {featuredProducts.map((product, idx) => (
              <RevealOnScroll key={product.id} className={`delay-${idx * 100} h-full`}>
                <Link
                  to={`/shop/${product.id}`}
                  className="group flex flex-col h-full bg-white border border-stone-200 p-3 hover:border-stone-900 transition-all duration-500 relative overflow-hidden shadow-sm hover:shadow-md"
                >
                  <div className="relative z-10 flex flex-col h-full">
                     {/* Image Area */}
                     <div className="w-full aspect-square bg-stone-100 mb-2 flex items-center justify-center overflow-hidden relative">
                          <img
                              src={product.image}
                              alt={product.name}
                              className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                          />
                     </div>

                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] uppercase tracking-widest text-stone-400 group-hover:text-stone-900 transition-colors font-medium">0{idx + 1}</span>
                      {product.badge && (
                        <span className="text-[9px] uppercase tracking-widest font-bold text-stone-500 border border-stone-200 px-2 py-0.5">{product.badge}</span>
                      )}
                    </div>

                    <h3 className="text-base font-serif text-stone-900 mb-1">{product.name}</h3>

                    <div className="flex justify-between items-end border-t border-stone-100 pt-2 mt-auto">
                      <span className="font-serif text-base text-stone-900">${product.price}</span>
                      <span className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 text-stone-400 group-hover:text-clay transition-colors">
                        View <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </Link>
              </RevealOnScroll>
            ))}
          </div>

          <RevealOnScroll className="text-center mb-4">
            <Link to="/shop" className="inline-block border border-stone-900 text-stone-900 px-8 py-3 uppercase tracking-[0.2em] text-[10px] font-bold hover:bg-stone-900 hover:text-white transition-all duration-300">
              View Full Collection
            </Link>
          </RevealOnScroll>
        </section>
      )}

      {/* 5. Testimonials */}
      {testimonials.length > 0 && (
        <section className="bg-stone-100 py-16 px-6">
          <RevealOnScroll className="max-w-3xl mx-auto relative">
            {/* Navigation Arrows */}
            <button
              onClick={prevTestimonial}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-10 z-20 p-2 text-stone-400 hover:text-stone-800 transition-colors"
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={nextTestimonial}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-10 z-20 p-2 text-stone-400 hover:text-stone-800 transition-colors"
              aria-label="Next testimonial"
            >
              <ChevronRight size={24} />
            </button>

            <div className="text-center bg-white py-10 px-6 md:px-12 shadow-lg">
              {/* Context Label */}
              <div className="mb-4">
                <span className="text-[9px] uppercase tracking-[0.2em] font-medium text-clay bg-clay/10 px-3 py-1 rounded-full">
                  {testimonials[currentTestimonial].type === 'shop' ? 'About the Jewellery' :
                   testimonials[currentTestimonial].type === 'coaching' ? 'Coaching Client' : 'Workshop Attendee'}
                </span>
              </div>

              <div className="flex justify-center mb-4 text-stone-300 gap-1">
                {[...Array(5)].map((_, i) => <Star key={i} size={10} fill="currentColor" />)}
              </div>

              <div className="min-h-[100px] flex items-center justify-center">
                <p className="text-base md:text-lg font-serif italic text-stone-700 leading-relaxed max-w-2xl mx-auto">
                  "{testimonials[currentTestimonial].text}"
                </p>
              </div>

              <div className="text-center pt-4 w-full">
                 <p className="text-xs font-bold uppercase tracking-[0.15em] text-stone-800">{testimonials[currentTestimonial].author}</p>
                 <p className="text-[10px] text-stone-400 mt-1">{testimonials[currentTestimonial].role}</p>
              </div>

              {/* Dots Navigation */}
              <div className="flex justify-center gap-2 mt-6">
                {testimonials.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentTestimonial(idx)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      idx === currentTestimonial ? 'bg-stone-800 w-6' : 'bg-stone-300 hover:bg-stone-400'
                    }`}
                    aria-label={`Go to testimonial ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </RevealOnScroll>
        </section>
      )}

    </div>
  );
};

export default Home;
