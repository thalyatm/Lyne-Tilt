
import React, { useEffect, useRef, useState } from 'react';
import Hero from '../components/Hero';
import SplitPath from '../components/SplitPath';
import SectionHeading from '../components/SectionHeading';
import { Link } from 'react-router-dom';
import { Star, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { API_BASE, resolveImageUrl } from '../config/api';
import { Product, ProductCategory, Testimonial } from '../types';

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  { id: 'r1', author: 'Tanya B.', role: 'Coaching Client', text: "Every Time I speak with Lyne it's like the problems I thought I had dissolve and suddenly I realise they're super powers in disguise. When you can flick your limiting beliefs into signposts that guide you towards and away from things it is life (and art)changing. I can't thank you enough Lyne - see you next month for our session!", type: 'coaching', rating: 5 },
  { id: 'r2', author: 'Melanie C.', role: 'Workshop Attendee', text: "I didn't realise how much I was holding back until I started learning with Lyne. Her classes blend practical skill and deep mindset shifts.", type: 'learn', rating: 5 },
  { id: 'r3', author: 'Sandie M.', role: 'Jewellery Customer', text: "Her jewellery isn't just beautiful - it feels like a part of me. I wear it when I need to feel strong, and when I want to show up fully.", type: 'shop', rating: 5 },
  { id: 'r4', author: 'Art of Instagram attendee', role: 'Workshop Attendee', text: "I am generally hesitant to pay for a course such as this, from finding someone online. I was comfortable because I knew Lyne, and trusted that it was worth the price.", type: 'learn', rating: 5 },
  { id: 'r5', author: 'Bel Y.', role: 'Workshop Attendee', text: "Lyne is a nurturing teacher. Allowing you to explore without expectation. It's refreshing to attend an art class without feeling like there is any expectation you need to live up to. A night to let go and embrace your inner artist!", type: 'learn', rating: 5 },
  { id: 'r6', author: 'Andréa Z.', role: 'Coaching Client', text: "It was as if I was seen for the first time in my life - from the minute Lyne spoke about common blocks like Imposter Syndrome & limiting beliefs to the practical steps she was able to make accessible to me through her decades of experience coaching and teaching, leading and learning I just felt as if I could breathe again. Funny thing is I didn't know I wasn't. To say I'm grateful is inadequate", type: 'coaching', rating: 5 },
  { id: 'r7', author: 'Jenny M.', role: 'Coaching Client', text: "Lyne is a wealth of knowledge when it comes to all things brain to website building. I feel blessed to have found her.", type: 'coaching', rating: 5 },
  { id: 'r8', author: 'Vicki D.', role: 'Coaching Client', text: "I can't say enough about how exploring the psychology behind my branding and messaging has helped me. Lyne takes what would take me years of study to comprehend and distils into a fifteen minute chat with easy to follow actionable steps for me to take away every time.", type: 'coaching', rating: 5 },
  { id: 'r9', author: 'Tracey D.', role: 'Workshop Attendee', text: "Lyne's unique way of guiding me us all to unique ideas was profound. We all felt it - we all used it - we all needed it. Thanks Lyne.", type: 'learn', rating: 5 },
  { id: 'r10', author: 'Mel G.', role: 'Coaching Client', text: "What can I say? She's worth the time and money.", type: 'coaching', rating: 5 },
  { id: 'r11', author: 'Liza M.', role: 'Workshop Attendee', text: "I thought I knew how to use Instagram - I have over 11,000 followers (but little conversion). Honestly, I was doing Lyne a favour taking the class - within the first 30 minutes I realised I knew almost nothing and she wasn't charging enough. Book your ticket before she realises she needs to up her prices is my advice!", type: 'learn', rating: 5 },
  { id: 'r12', author: 'Sue V.', role: 'Coaching Client', text: "I knew I would learn things from Lyne. I didn't know it would change who I am, how I see the world and how I approach all things business, love and life.", type: 'coaching', rating: 5 },
];

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

  useEffect(() => { document.title = 'Lyne Tilt | Wearable Art & Creative Coaching'; }, []);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_BASE}/products`);
        if (!response.ok) throw new Error('API error');
        const data = await response.json();
        const items = data.products || data;
        const mapped: Product[] = items.slice(0, 4).map((p: any) => ({
          id: p.slug || p.id,
          name: p.name,
          price: parseFloat(p.price),
          compareAtPrice: p.compareAtPrice ? parseFloat(p.compareAtPrice) : undefined,
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

  // Fetch testimonials + featured reviews
  useEffect(() => {
    const fetchAll = async () => {
      // Fetch testimonials and featured reviews in parallel
      const [testimonialsRes, reviewsRes] = await Promise.allSettled([
        fetch(`${API_BASE}/testimonials`),
        fetch(`${API_BASE}/reviews/featured`),
      ]);

      let testimonialsData: Testimonial[] = [];
      if (testimonialsRes.status === 'fulfilled' && testimonialsRes.value.ok) {
        const data = await testimonialsRes.value.json();
        if (data.length > 0) testimonialsData = data;
      }

      // Convert featured reviews to testimonial format
      let reviewTestimonials: Testimonial[] = [];
      if (reviewsRes.status === 'fulfilled' && reviewsRes.value.ok) {
        const reviews = await reviewsRes.value.json();
        const roleMap: Record<string, { role: string; type: string }> = {
          'Wearable Art': { role: 'Jewellery Customer', type: 'shop' },
          'Art Supplies': { role: 'Art Supplies Customer', type: 'shop' },
          'Creative Coaching': { role: 'Coaching Client', type: 'coaching' },
          'Workshop': { role: 'Workshop Attendee', type: 'learn' },
        };
        reviewTestimonials = reviews
          .filter((r: any) => r.body)
          .map((r: any) => {
            const mapped = roleMap[r.productName] || { role: 'Customer', type: 'shop' };
            return {
              id: `review-${r.id}`,
              author: r.customerName,
              role: mapped.role,
              text: r.body,
              type: mapped.type as 'shop' | 'coaching' | 'learn',
              rating: r.rating,
            };
          });
      }

      // Merge: featured reviews first, then testimonials
      const combined = [...reviewTestimonials, ...testimonialsData];
      setTestimonials(combined.length > 0 ? combined : DEFAULT_TESTIMONIALS.filter(t => t.text));
    };
    fetchAll();
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
      <RevealOnScroll className="relative z-20">
        <SplitPath />
      </RevealOnScroll>

      {/* 3. About Section + 4. Featured Shop — shared background */}
      <div className="relative z-10 bg-white w-full overflow-hidden">
        {/* Abstract Background Elements — spans both sections */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-4 right-20 w-72 h-72 border border-stone-200 rounded-full" />
          <div className="absolute bottom-10 left-0 w-96 h-96 border border-stone-200 rounded-full" />
          <div className="absolute top-[10%] left-1/3 w-48 h-48 border border-stone-200 rounded-full" />
          <div className="absolute top-2 left-[15%] w-40 h-40 border border-stone-200 rounded-full" />
          <div className="absolute top-[35%] right-[10%] w-56 h-56 border border-stone-200 rounded-full" />
          <div className="absolute top-[55%] left-[45%] w-32 h-32 border border-stone-200 rounded-full" />
          <div className="absolute bottom-[15%] right-[30%] w-80 h-80 border border-stone-200 rounded-full" />
          <div className="absolute top-[5%] right-[45%] w-24 h-24 border border-stone-200 rounded-full" />
          <div className="absolute bottom-[25%] left-[8%] w-64 h-64 border border-stone-200 rounded-full" />
          <div className="absolute bottom-[5%] right-[15%] w-44 h-44 border border-stone-200 rounded-full" />
        </div>

        {/* Meet Lyne content */}
        <div className="pt-16 pb-16 px-6 relative z-10">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-0 items-center">

            {/* Image Column */}
            <div className="md:col-span-5 relative flex justify-center">
                 <RevealOnScroll>
                    <div className="relative aspect-[4/5] max-w-[280px] md:max-w-none bg-stone-200 overflow-hidden shadow-2xl shadow-stone-200 rounded-3xl image-zoom-container">
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
            <div className="md:col-span-7 md:pl-0 text-center md:text-left">
                 <RevealOnScroll>
                    <p className="inline-block text-stone-500 text-[10px] uppercase tracking-[0.3em] mb-3 bg-stone-100 border border-stone-200 px-3 py-1 rounded-full">Meet Lyne</p>
                    <h2 className="text-3xl md:text-4xl font-serif mb-5 text-stone-900">{home.aboutSection.title}</h2>

                    <div className="prose prose-stone text-stone-600 leading-relaxed text-sm mb-6 max-w-lg mx-auto md:mx-0">
                        {home.aboutSection.paragraphs.map((para, idx) => (
                          <p key={idx} className={idx < home.aboutSection.paragraphs.length - 1 ? 'mb-4' : ''}>
                            {para}
                          </p>
                        ))}
                    </div>

                    <Link to={home.aboutSection.linkUrl} className="group relative overflow-hidden bg-stone-900 text-white px-8 py-3 md:px-10 md:py-4 text-[10px] uppercase tracking-[0.25em] font-bold transition-all shadow-xl shadow-stone-200/50 hover:shadow-stone-300 text-center inline-flex items-center gap-3 rounded-lg">
                        <span className="relative z-10 group-hover:text-white transition-colors duration-500">{home.aboutSection.linkText}</span>
                        <ArrowRight size={12} className="relative z-10" />
                        <div className="absolute inset-0 bg-clay transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                    </Link>
                 </RevealOnScroll>
            </div>
          </div>
        </div>

        {/* Featured Shop content */}
        {featuredProducts.length > 0 && (
          <div className="py-4 md:py-5 px-4 lg:px-6 mx-4 md:mx-auto max-w-[92%] md:max-w-[80%] lg:max-w-[65%] rounded-2xl border border-stone-200 relative z-20 bg-stone-50 mb-8">
          <RevealOnScroll className="mt-3">
            <SectionHeading
              title={home.shopCta.title}
              subtitle={home.shopCta.subtitle}
            />
          </RevealOnScroll>

          {/* Products Grid */}
          <div className="flex flex-wrap justify-center gap-2 mb-2">
            {featuredProducts.map((product, idx) => (
              <RevealOnScroll key={product.id} className={`delay-${idx * 100} h-full`}>
                <Link
                  to={`/shop/${product.id}`}
                  className="group flex flex-col bg-white border border-stone-200 p-2 hover:border-stone-900 transition-all duration-500 relative overflow-hidden shadow-sm hover:shadow-md rounded-2xl w-44 md:w-52"
                >
                  <div className="relative z-10 flex flex-col h-full">
                     {/* Image Area */}
                     <div className="w-full aspect-[3/4] bg-stone-100 mb-2 flex items-center justify-center overflow-hidden relative">
                          <img
                              src={resolveImageUrl(product.image)}
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

                    <h3 className="text-base font-serif text-stone-900 mb-1 min-h-[2.5rem] line-clamp-2">{product.name}</h3>

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

          <RevealOnScroll className="text-center mt-5 mb-1">
            <Link to="/shop" className="group relative overflow-hidden bg-stone-900 text-white px-8 py-3 md:px-10 md:py-4 text-[10px] uppercase tracking-[0.25em] font-bold transition-all shadow-xl shadow-stone-200/50 hover:shadow-stone-300 text-center inline-flex items-center gap-3 rounded-lg">
              <span className="relative z-10 group-hover:text-white transition-colors duration-500">View Full Collection</span>
              <ArrowRight size={12} className="relative z-10" />
              <div className="absolute inset-0 bg-clay transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
            </Link>
          </RevealOnScroll>
          </div>
        )}
      </div>

      {/* 5. Testimonials */}
      {testimonials.length > 0 && (
        <section className="pt-10 pb-16 px-6 relative z-10 bg-white w-full border-b border-stone-100 overflow-hidden">
          {/* Abstract Background Elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-10 left-16 w-64 h-64 border border-stone-200 rounded-full" />
            <div className="absolute bottom-10 right-20 w-80 h-80 border border-stone-200 rounded-full" />
            <div className="absolute top-[20%] right-[15%] w-48 h-48 border border-stone-200 rounded-full" />
            <div className="absolute bottom-[30%] left-[40%] w-36 h-36 border border-stone-200 rounded-full" />
            <div className="absolute top-[50%] left-[10%] w-56 h-56 border border-stone-200 rounded-full" />
          </div>

          <RevealOnScroll className="max-w-3xl mx-auto relative z-10">
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

            <div className="text-center bg-white py-10 px-6 md:px-12 shadow-lg rounded-2xl border border-stone-200">
              {/* Context Label */}
              <div className="mb-4">
                <span className="text-[9px] uppercase tracking-[0.2em] font-medium text-clay bg-clay/10 px-3 py-1 rounded-full">
                  {testimonials[currentTestimonial].role}
                </span>
              </div>

              <div className="flex justify-center mb-4 text-clay gap-1">
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
