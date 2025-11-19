import React, { useEffect, useRef } from 'react';
import Hero from '../components/Hero';
import SplitPath from '../components/SplitPath';
import SectionHeading from '../components/SectionHeading';
import CoachingCard from '../components/CoachingCard';
import LeadMagnet from '../components/LeadMagnet';
import SocialProofToast from '../components/SocialProofToast';
import { PRODUCTS, COACHING_PACKAGES, TESTIMONIALS } from '../constants';
import { Link } from 'react-router-dom';
import { Star, ShieldCheck, Truck, RefreshCw, ArrowRight, Image as ImageIcon } from 'lucide-react';

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
  const featuredProducts = PRODUCTS;
  const coachingServices = COACHING_PACKAGES;
  const featuredTestimonial = TESTIMONIALS[0]; 

  return (
    <div className="relative overflow-hidden bg-white">
      {/* Aesthetic Grid Overlay - Using mix-blend-multiply to show over backgrounds */}
      <div className="absolute inset-0 pointer-events-none z-20 mix-blend-multiply opacity-40 h-full">
         <div className="max-w-7xl mx-auto h-full border-x border-stone-200/50 relative">
             {/* Central Axis */}
             <div className="absolute left-1/2 top-0 bottom-0 w-px bg-stone-200/60 -translate-x-1/2"></div>
             {/* Thirds (Hidden on small mobile) */}
             <div className="absolute left-1/3 top-0 bottom-0 w-px bg-stone-100/50 hidden md:block"></div>
             <div className="absolute right-1/3 top-0 bottom-0 w-px bg-stone-100/50 hidden md:block"></div>
         </div>
      </div>

      <Hero />
      
      <RevealOnScroll>
        <SplitPath />
      </RevealOnScroll>
      
      {/* Social Proof / Testimonials - Made distinct */}
      <section className="bg-stone-200 py-24 px-6 border-b border-stone-200 relative z-10">
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

      {/* Featured Shop */}
      <section className="py-24 px-6 max-w-7xl mx-auto relative z-10">
        <RevealOnScroll>
          <SectionHeading 
            title="Recent Works" 
            subtitle="Small batch wearable artifacts." 
          />
        </RevealOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
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

        <RevealOnScroll className="text-center mb-24">
          <Link to="/shop" className="inline-block border border-stone-900 text-stone-900 px-10 py-4 uppercase tracking-[0.2em] text-[10px] font-bold hover:bg-stone-900 hover:text-white transition-all duration-300">
            View Full Collection
          </Link>
        </RevealOnScroll>

        {/* Trust Bar */}
        <RevealOnScroll>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 border-y border-stone-100 py-16 bg-white">
            <div className="flex flex-col items-center text-center gap-4">
               <ShieldCheck size={20} className="text-stone-300" />
               <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-stone-500">Secure Checkout</span>
            </div>
             <div className="flex flex-col items-center text-center gap-4">
               <RefreshCw size={20} className="text-stone-300" />
               <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-stone-500">Handmade in Aus</span>
            </div>
             <div className="flex flex-col items-center text-center gap-4">
               <Star size={20} className="text-stone-300" />
               <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-stone-500">5 Star Rating</span>
            </div>
             <div className="flex flex-col items-center text-center gap-4">
               <Truck size={20} className="text-stone-300" />
               <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-stone-500">Global Shipping</span>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      {/* Featured Coaching */}
      <section className="bg-stone-100 py-24 px-6 relative z-10">
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
      
      <LeadMagnet />

      {/* About Section - Minimal */}
      <section className="py-32 px-6 max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-20 relative z-10">
        <RevealOnScroll className="flex-1 order-2 md:order-1 w-full">
           <div className="relative bg-white p-16 flex flex-col justify-center border border-stone-100 shadow-xl shadow-stone-200/50 min-h-[450px]">
             <div className="text-9xl font-serif text-stone-100 leading-none select-none absolute -top-6 -left-6 font-bold">"</div>
             <div className="relative z-10">
                <p className="font-serif text-3xl md:text-4xl text-stone-900 leading-tight mb-10">
                  I work at the intersection of art, psychology, and strategy.
                </p>
                <div className="w-20 h-px bg-stone-900 mb-0"></div>
             </div>
             <div className="text-left mt-10">
                <p className="text-xs uppercase tracking-widest text-stone-900 font-bold">Lyne Tilt</p>
                <p className="text-[10px] uppercase tracking-widest text-stone-400 mt-2">Founder & Artist</p>
             </div>
           </div>
        </RevealOnScroll>
        
        <RevealOnScroll className="flex-1 order-1 md:order-2">
          <p className="text-stone-400 text-[10px] uppercase tracking-[0.3em] mb-6">The Studio</p>
          <h2 className="text-4xl md:text-5xl font-serif mb-8 text-stone-900">Material & Mind</h2>
          <div className="prose prose-stone text-stone-500 leading-loose text-sm max-w-md">
            <p className="mb-6">
              For over two decades, I've explored the space between making and thinking. My work is split into two distinct but connected paths: objects and guidance.
            </p>
            <p className="mb-6">
              I create wearable art that acts as a talisman for the wearer, and I coach creatives who are building something meaningful but feel stuck in the process.
            </p>
            <p className="font-serif italic text-stone-800 text-lg border-l border-stone-300 pl-6 py-2 my-8">
              Art is oxygen. Clarity is power.
            </p>
          </div>
          <Link to="/about" className="inline-flex items-center gap-3 mt-8 text-stone-900 uppercase text-[10px] tracking-widest font-bold hover:text-clay transition-colors group">
            Read Full Story <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </RevealOnScroll>
      </section>
      
      <SocialProofToast />
    </div>
  );
};

export default Home;