
import React, { useEffect, useRef } from 'react';
import Hero from '../components/Hero';
import SplitPath from '../components/SplitPath';
import SectionHeading from '../components/SectionHeading';
import CoachingCard from '../components/CoachingCard';
import { PRODUCTS, COACHING_PACKAGES, TESTIMONIALS } from '../constants';
import { Link } from 'react-router-dom';
import { Star, ShieldCheck, Truck, RefreshCw, ArrowRight } from 'lucide-react';

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
  const featuredProducts = PRODUCTS.slice(0, 3);
  const coachingServices = COACHING_PACKAGES;
  const featuredTestimonial = TESTIMONIALS[0]; 

  return (
    <div className="relative overflow-hidden bg-transparent">
      
      {/* 1. Hero */}
      <Hero />
      
      {/* 2. Split Path */}
      <RevealOnScroll>
        <SplitPath />
      </RevealOnScroll>

      {/* 3. About Section (Moved UP & Distinct Styling) */}
      <section className="py-28 px-6 max-w-7xl mx-auto relative z-10 bg-white w-full border-b border-stone-100">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
            
            {/* Image Column */}
            <div className="md:col-span-5 relative">
                 <RevealOnScroll>
                    <div className="relative aspect-[3/4] bg-stone-200 overflow-hidden shadow-2xl shadow-stone-200 image-zoom-container">
                        <img
                           src="https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/a2b24cba-294f-4e4f-b4a6-ebaa1b285607/IMG_4502+copy.jpg?format=300w"
                           alt="Lyne Tilt in Studio"
                           className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000 image-zoom"
                        />
                        <div className="absolute inset-0 border-[1px] border-white/20 pointer-events-none"></div>
                    </div>
                     <div className="absolute -bottom-6 -right-6 bg-white p-8 border border-stone-100 shadow-lg hidden md:block">
                        <p className="font-serif text-xl text-clay italic">"Art is oxygen."</p>
                     </div>
                 </RevealOnScroll>
            </div>

            {/* Text Column */}
            <div className="md:col-span-7 md:pl-12">
                 <RevealOnScroll>
                    <p className="text-stone-400 text-[10px] uppercase tracking-[0.3em] mb-6">The Founder</p>
                    <h2 className="text-3xl md:text-5xl font-serif mb-8 text-stone-900">Lyne Tilt</h2>
                    
                    <div className="prose prose-stone text-stone-600 leading-loose text-sm mb-10 max-w-lg">
                        <p className="font-serif text-xl text-stone-800 mb-6 italic">
                            I work at the intersection of art, psychology, and strategy.
                        </p>
                        <p className="mb-6">
                            For over two decades, I've explored the space between making and thinking. My work is split into two distinct but connected paths: objects and guidance.
                        </p>
                        <p>
                            I create wearable art that acts as a talisman for the wearer, and I coach creatives who are building something meaningful but feel stuck in the process.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8">
                        <Link to="/about" className="inline-flex items-center gap-3 text-stone-900 uppercase text-[10px] tracking-widest font-bold hover:text-clay transition-colors group pb-1">
                            <span className="link-underline">Read Full Story</span> <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <span className="hidden sm:inline-block w-12 h-px bg-stone-200"></span>
                        <span className="font-serif italic text-stone-400">Clarity is power.</span>
                    </div>
                 </RevealOnScroll>
            </div>
        </div>
      </section>

      {/* 4. Featured Coaching */}
      <section className="bg-stone-100/90 backdrop-blur-sm py-24 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <RevealOnScroll>
            <SectionHeading 
              title="Coaching Packages" 
              subtitle="Choose the support level that matches where you are in your creative journey." 
            />
          </RevealOnScroll>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4">
            {coachingServices.map((service, idx) => (
               <RevealOnScroll key={service.id} className={`delay-${idx * 100} h-full`}>
                 <CoachingCard item={service} />
               </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Featured Shop (Shorter Vertical Height) */}
      <section className="py-12 md:py-16 px-6 max-w-7xl mx-auto relative z-10">
        <RevealOnScroll>
          <SectionHeading 
            title="Recent Works" 
            subtitle="Small batch wearable art." 
          />
        </RevealOnScroll>

        {/* Trust Bar - Reduced spacing */}
        <RevealOnScroll className="mb-8 max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12 border-y border-stone-200 py-4 bg-white/50 backdrop-blur-sm">
            <div className="flex flex-col items-center text-center gap-2">
               <ShieldCheck size={16} className="text-stone-400" />
               <span className="text-[9px] uppercase tracking-[0.2em] font-medium text-stone-500">Secure Checkout</span>
            </div>
             <div className="flex flex-col items-center text-center gap-2">
               <RefreshCw size={16} className="text-stone-400" />
               <span className="text-[9px] uppercase tracking-[0.2em] font-medium text-stone-500">Handmade in Aus</span>
            </div>
             <div className="flex flex-col items-center text-center gap-2">
               <Star size={16} className="text-stone-400" />
               <span className="text-[9px] uppercase tracking-[0.2em] font-medium text-stone-500">5 Star Rating</span>
            </div>
             <div className="flex flex-col items-center text-center gap-2">
               <Truck size={16} className="text-stone-400" />
               <span className="text-[9px] uppercase tracking-[0.2em] font-medium text-stone-500">Global Shipping</span>
            </div>
          </div>
        </RevealOnScroll>

        {/* Products Grid - Reduced bottom margin */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {featuredProducts.map((product, idx) => (
            <RevealOnScroll key={product.id} className={`delay-${idx * 100} h-full`}>
              <Link 
                to={`/shop/${product.id}`} 
                className="group flex flex-col h-full bg-white border border-stone-200 p-8 hover:border-stone-900 transition-all duration-500 relative overflow-hidden shadow-sm hover:shadow-md"
              >
                <div className="relative z-10 flex flex-col h-full">
                   {/* Image Area */}
                   <div className="w-full aspect-[4/5] bg-stone-100 mb-8 flex items-center justify-center overflow-hidden relative">
                        <img 
                            src={product.image} 
                            alt={product.name}
                            className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                        />
                   </div>

                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] uppercase tracking-widest text-stone-400 group-hover:text-stone-900 transition-colors font-medium">0{idx + 1}</span>
                    {product.badge && (
                      <span className="text-[9px] uppercase tracking-widest font-bold text-stone-500 border border-stone-200 px-2 py-0.5">{product.badge}</span>
                    )}
                  </div>
                  
                  <h3 className="text-2xl font-serif text-stone-900 mb-2">{product.name}</h3>
                  
                  <p className="text-xs text-stone-500 leading-relaxed mb-6 flex-grow line-clamp-2">
                    {product.shortDescription}
                  </p>
                  
                  <div className="flex justify-between items-end border-t border-stone-100 pt-5 mt-auto">
                    <span className="font-serif text-lg text-stone-900">${product.price}</span>
                    <span className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 text-stone-400 group-hover:text-clay transition-colors">
                      View <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            </RevealOnScroll>
          ))}
        </div>

        <RevealOnScroll className="text-center mb-12">
          <Link to="/shop" className="inline-block border border-stone-900 text-stone-900 px-10 py-4 uppercase tracking-[0.2em] text-[10px] font-bold hover:bg-stone-900 hover:text-white transition-all duration-300">
            View Full Collection
          </Link>
        </RevealOnScroll>
      </section>

      {/* 6. Social Proof / Testimonials (Moved to Bottom) */}
      <section className="bg-stone-200/90 backdrop-blur-sm py-24 px-6 border-b border-stone-200 relative z-10">
        <RevealOnScroll className="max-w-4xl mx-auto text-center bg-white py-16 px-8 md:px-16 border border-stone-800 shadow-2xl relative">
            {/* Decorative Quote Icon */}
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 text-stone-100 opacity-60 pointer-events-none">
               <span className="font-serif text-9xl leading-none">"</span>
            </div>

            <div className="relative z-10">
              <div className="flex justify-center mb-8 text-stone-800 gap-1">
                {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
              </div>

              <h3 className="text-2xl md:text-3xl font-serif italic text-stone-900 mb-10 leading-relaxed max-w-2xl mx-auto">
                {featuredTestimonial.text}
              </h3>
              
              <div className="text-center border-t border-stone-100 pt-8 w-full">
                 <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-900 mb-2">{featuredTestimonial.author}</p>
                 <p className="text-[10px] text-stone-400 uppercase tracking-widest">{featuredTestimonial.role}</p>
              </div>
            </div>
        </RevealOnScroll>
      </section>
      
    </div>
  );
};

export default Home;
