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
    <div className="relative overflow-hidden">
      {/* Continuous Central Axis Line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-stone-200 -translate-x-1/2 z-0 hidden md:block" />

      <Hero />
      
      <RevealOnScroll>
        <SplitPath />
      </RevealOnScroll>
      
      {/* Social Proof / Testimonials */}
      <section className="bg-stone-50 py-16 px-6 border-b border-stone-200 relative z-10">
        <RevealOnScroll className="max-w-4xl mx-auto text-center bg-stone-50/80 backdrop-blur-sm py-8 md:px-12">
            <div className="flex justify-center mb-6 text-stone-800 gap-1">
              {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
            </div>

            <h3 className="text-xl md:text-3xl font-serif italic text-stone-800 mb-8 leading-relaxed max-w-2xl mx-auto">
              "{featuredTestimonial.text}"
            </h3>
            
            <div className="text-center">
               <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-900 mb-2">{featuredTestimonial.author}</p>
               <p className="text-[9px] text-stone-400 uppercase tracking-widest">{featuredTestimonial.role}</p>
            </div>
        </RevealOnScroll>
      </section>

      {/* Featured Shop - TILES SAME HEIGHT + PLACEHOLDER */}
      <section className="py-20 px-6 max-w-6xl mx-auto relative z-10 bg-white/50">
        <RevealOnScroll>
          <SectionHeading 
            title="Recent Works" 
            subtitle="Small batch wearable artifacts." 
          />
        </RevealOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {featuredProducts.map((product, idx) => (
            <RevealOnScroll key={product.id} className={`delay-${idx * 100} h-full`}>
              <Link 
                to={`/shop/${product.id}`} 
                className="group flex flex-col h-full bg-white border border-stone-200 p-6 hover:border-stone-900 transition-all duration-500 relative overflow-hidden"
              >
                {/* Hover Fill Effect */}
                <div className="absolute inset-0 bg-stone-50 transform scale-y-0 origin-bottom group-hover:scale-y-100 transition-transform duration-500 ease-out z-0"></div>
                
                <div className="relative z-10 flex flex-col h-full">
                   {/* Placeholder Image Area */}
                   <div className="w-full aspect-[4/3] bg-stone-100 mb-6 flex items-center justify-center overflow-hidden">
                        <div className="text-stone-300 group-hover:scale-110 transition-transform duration-700">
                            {/* Simple geometric placeholder graphic */}
                            <ImageIcon size={24} strokeWidth={1} />
                        </div>
                   </div>

                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[9px] uppercase tracking-widest text-stone-400 group-hover:text-stone-500 transition-colors">0{idx + 1}</span>
                    {product.badge && (
                      <span className="text-[9px] uppercase tracking-widest font-bold text-clay">{product.badge}</span>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-serif text-stone-900 mb-3 group-hover:translate-x-1 transition-transform duration-300">{product.name}</h3>
                  
                  <p className="text-xs text-stone-500 leading-relaxed mb-6 flex-grow group-hover:text-stone-600 transition-colors line-clamp-3">
                    {product.shortDescription}
                  </p>
                  
                  <div className="flex justify-between items-end border-t border-stone-100 pt-4 group-hover:border-stone-200 mt-auto">
                    <span className="font-serif text-lg text-stone-900 italic">${product.price}</span>
                    <span className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 group-hover:gap-3 transition-all text-stone-800">
                      View <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </Link>
            </RevealOnScroll>
          ))}
        </div>

        <RevealOnScroll className="text-center mb-20">
          <Link to="/shop" className="inline-block border-b border-stone-900 text-stone-900 pb-1 uppercase tracking-widest text-[10px] font-bold hover:text-clay hover:border-clay transition-colors">
            View Full Collection
          </Link>
        </RevealOnScroll>

        {/* Trust Bar */}
        <RevealOnScroll>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-b border-stone-100 py-12 bg-white">
            <div className="flex flex-col items-center text-center gap-3">
               <ShieldCheck size={18} className="text-stone-300" />
               <span className="text-[9px] uppercase tracking-[0.2em] font-medium text-stone-500">Secure Checkout</span>
            </div>
             <div className="flex flex-col items-center text-center gap-3">
               <RefreshCw size={18} className="text-stone-300" />
               <span className="text-[9px] uppercase tracking-[0.2em] font-medium text-stone-500">Handmade in Aus</span>
            </div>
             <div className="flex flex-col items-center text-center gap-3">
               <Star size={18} className="text-stone-300" />
               <span className="text-[9px] uppercase tracking-[0.2em] font-medium text-stone-500">5 Star Rating</span>
            </div>
             <div className="flex flex-col items-center text-center gap-3">
               <Truck size={18} className="text-stone-300" />
               <span className="text-[9px] uppercase tracking-[0.2em] font-medium text-stone-500">Global Shipping</span>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      {/* Featured Coaching */}
      <section className="bg-stone-100/50 py-20 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <RevealOnScroll>
            <SectionHeading 
              title="Creative Coaching" 
              subtitle="Intelligent strategy for artists, designers, and founders." 
            />
          </RevealOnScroll>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {coachingServices.map((service, idx) => (
               <RevealOnScroll key={service.id} className={`delay-${idx * 100}`}>
                 <CoachingCard item={service} />
               </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>
      
      <LeadMagnet />

      {/* About Section - Minimal */}
      <section className="py-24 px-6 max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-16 relative z-10">
        <RevealOnScroll className="flex-1 order-2 md:order-1 w-full">
           <div className="relative bg-white p-12 flex flex-col justify-center border border-stone-100 shadow-sm min-h-[400px]">
             <div className="text-8xl font-serif text-stone-100 leading-none select-none absolute top-0 left-4 font-bold">"</div>
             <div className="relative z-10">
                <p className="font-serif text-2xl md:text-3xl text-stone-900 leading-tight mb-8">
                  I work at the intersection of art, psychology, and strategy.
                </p>
                <div className="w-16 h-px bg-stone-900 mb-0"></div>
             </div>
             <div className="text-left mt-8">
                <p className="text-xs uppercase tracking-widest text-stone-900 font-bold">Lyne Tilt</p>
                <p className="text-[10px] uppercase tracking-widest text-stone-400 mt-1">Founder & Artist</p>
             </div>
           </div>
        </RevealOnScroll>
        
        <RevealOnScroll className="flex-1 order-1 md:order-2">
          <h2 className="text-3xl md:text-4xl font-serif mb-6 text-stone-900">The Studio</h2>
          <div className="w-12 h-px bg-clay mb-8"></div>
          <div className="prose prose-stone text-stone-500 leading-loose text-sm">
            <p className="mb-6">
              For over two decades, I've explored the space between making and thinking. My work is split into two distinct but connected paths: objects and guidance.
            </p>
            <p className="mb-6">
              I create wearable art that acts as a talisman for the wearer, and I coach creatives who are building something meaningful but feel stuck in the process.
            </p>
            <p className="font-serif italic text-stone-800 text-lg border-l-2 border-stone-200 pl-4">
              Art is oxygen. Clarity is power.
            </p>
          </div>
          <Link to="/about" className="inline-flex items-center gap-2 mt-10 text-stone-900 uppercase text-[10px] tracking-widest font-bold hover:text-clay transition-colors group">
            Read Full Story <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </RevealOnScroll>
      </section>
      
      <SocialProofToast />
    </div>
  );
};

export default Home;