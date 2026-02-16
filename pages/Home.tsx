
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
  { id: 'r1', author: 'Jennifer M', role: 'She Basked in Silence', text: '', type: 'shop', rating: 5 },
  { id: 'r2', author: 'Denise F', role: 'Black Boots & Big Scarves Were Her Aphrodisiacs', text: "These earrings are so fun and so me! Lyne's craftsmanship is superior and she knows how to make women feel beautiful AND fun at the same time. These are fantastic and I get compliments about them every time I wear them!", type: 'shop', rating: 5 },
  { id: 'r3', author: 'Jenny M', role: 'Long Weekends in Melbourne Filled Her Heart & Her Head', text: "The problem I have is to only choose 1 pair of earrings!! I love everything Lyne makes, so to narrow it down to 1 pair is difficult!!", type: 'shop', rating: 5 },
  { id: 'r4', author: 'Tricia W', role: 'She Saved Her Pennies for Today', text: "Gorgeous, quirky earrings that look fabulous and get so many comments - I love them", type: 'shop', rating: 5 },
  { id: 'r5', author: 'Cathie T', role: 'PURE INFATUATION: When She Swam it Was as if the World Stood Still...', text: "Beautiful earrings. So loved the style, craftsmanship and colour that I put through three purchases. Discover the joy of wearing Lyne's beautiful jewellery. You won't be disappointed. Might just have to order one more pair...", type: 'shop', rating: 5 },
  { id: 'r6', author: 'Karen Watson M', role: "KAREN's Order", text: "Lyne's work is awesome. The quality and feel of her jewellery is lovely and each piece is totally unique. Real wow factor. Can't fault service or customer care. Lyne is a gem. I've been following her for a while on IG and just love what she does and who she seems to be. She's been an inspiration to me.", type: 'shop', rating: 5 },
  { id: 'r7', author: 'Susan S', role: 'PURE INFATUATION: And So She Wrote Poetry', text: "Just about every piece of jewellery is something I want to buy. The hardest job is choosing. Lovely earrings, fantastic quality...just can't rate Lyne Tilt high enough.", type: 'shop', rating: 5 },
  { id: 'r8', author: 'Cheryl Y', role: 'Polymer Week Artist Silkscreens', text: "Thanks Lyne, this silkscreen set arrived quickly and safely. Of the 5 or 6 silkscreen sets which were released by Lucy recently, yours is by far the most attractive, IMHO. Much love, Cheryl", type: 'shop', rating: 5 },
  { id: 'r9', author: 'Margaret R', role: "PURE INFATUATION: There Was No Reason She Couldn't", text: "Lyne, your website was very easy to deal with. Shipping was prompt and I LOVE the earrings. Thank you for your great work.", type: 'shop', rating: 5 },
  { id: 'r10', author: 'Mary-ann W', role: 'PURE INFATUATION: Oh Audrey - How I Miss Your Understated Glamour', text: "Absolutely love Lyne's work. I have a number of her pieces and they always receive lots of compliments and coordinate with my outfits beautifully.", type: 'shop', rating: 5 },
  { id: 'r11', author: 'Anne M', role: 'Polymer Week Artist Silkscreens', text: 'Excellent product. Love it', type: 'shop', rating: 5 },
  { id: 'r12', author: 'Carol H', role: 'Polymer Week Artist Silkscreens', text: "So much fabulous inspiration and great quality items from this really lovely, friendly seller. Thank you", type: 'shop', rating: 5 },
  { id: 'r13', author: 'Jennifer M', role: 'Polymer Week Artist Silkscreens', text: "Love my set of Lyne Tilt silkscreens. It is a pleasure to deal with Lyne. She is a very thoughtful person and I can thoroughly recommend purchasing from her.", type: 'shop', rating: 5 },
  { id: 'r14', author: 'Shelley B', role: 'ELEMENTS - FULL SET STENCILS (10 stencils)', text: "Love these stencils, can't wait to try them all!", type: 'shop', rating: 5 },
  { id: 'r15', author: 'Carol H', role: 'BLACK+WHITE - Digi-Paper LIGHTLY LAYERED', text: "These stencils and digi papers encourage and inspire so much creativity and they are amazing quality. I'm having so much fun. Thank you", type: 'shop', rating: 5 },
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
        const mapped: Product[] = items.slice(0, 3).map((p: any) => ({
          id: p.slug || p.id,
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
        setTestimonials(data.length > 0 ? data : DEFAULT_TESTIMONIALS.filter(t => t.text));
      } catch {
        setTestimonials(DEFAULT_TESTIMONIALS.filter(t => t.text));
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

      {/* Vertical divider between Hero and Split Path */}
      <div className="flex justify-center -mt-14 -mb-14 relative z-20">
        <div className="w-px h-28 bg-stone-300" />
      </div>

      {/* 2. Split Path */}
      <RevealOnScroll>
        <SplitPath />
      </RevealOnScroll>

      {/* 3. About Section */}
      <section className="pt-16 pb-16 px-6 relative z-10 bg-white w-full border-b border-stone-100">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 right-20 w-72 h-72 border border-stone-200 rounded-full" />
          <div className="absolute bottom-10 -left-10 w-96 h-96 border border-stone-200 rounded-full" />
          <div className="absolute top-1/4 left-1/3 w-48 h-48 border border-stone-200 rounded-full" />
          <div className="absolute -top-8 left-[15%] w-40 h-40 border border-stone-200 rounded-full" />
          <div className="absolute top-[60%] right-[10%] w-56 h-56 border border-stone-200 rounded-full" />
          <div className="absolute bottom-[20%] left-[45%] w-32 h-32 border border-stone-200 rounded-full" />
          <div className="absolute -bottom-20 right-[30%] w-80 h-80 border border-stone-200 rounded-full" />
          <div className="absolute top-[10%] right-[45%] w-24 h-24 border border-stone-200 rounded-full" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center">

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
            <div className="md:col-span-7 md:pl-8 text-center md:text-left">
                 <RevealOnScroll>
                    <p className="text-stone-400 text-[10px] uppercase tracking-[0.3em] mb-3">Meet Lyne</p>
                    <h2 className="text-3xl md:text-4xl font-serif mb-5 text-stone-900">{home.aboutSection.title}</h2>

                    <div className="prose prose-stone text-stone-600 leading-relaxed text-sm mb-6 max-w-lg mx-auto md:mx-0">
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
