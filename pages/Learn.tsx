import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import SubNav from '../components/SubNav';
import {
  ArrowRight,
  PlayCircle,
  Users,
  Clock,
  BookOpen,
  CheckCircle,
  Star,
  Mail
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { API_BASE } from '../config/api';
import { LearnItem, Testimonial, FAQItem } from '../types';

const Learn = () => {
  const { settings } = useSettings();
  const { learn } = settings;
  const [learnItems, setLearnItems] = useState<LearnItem[]>([]);
  const [learnTestimonials, setLearnTestimonials] = useState<Testimonial[]>([]);
  const [learnFaqs, setLearnFaqs] = useState<FAQItem[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ONLINE' | 'WORKSHOP'>('ALL');
  const [activeFormat, setActiveFormat] = useState<string>('All');
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeError, setSubscribeError] = useState('');

  // Fetch learn items, testimonials, and FAQs from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, testRes, faqRes] = await Promise.all([
          fetch(`${API_BASE}/learn`),
          fetch(`${API_BASE}/testimonials?type=learn`),
          fetch(`${API_BASE}/faqs?category=Learn`),
        ]);
        if (itemsRes.ok) {
          const data = await itemsRes.json();
          setLearnItems(Array.isArray(data) ? data : data.items ?? []);
        }
        if (testRes.ok) setLearnTestimonials(await testRes.json());
        if (faqRes.ok) setLearnFaqs(await faqRes.json());
      } catch {
        // Data will remain empty
      }
    };
    fetchData();
  }, []);

  useEffect(() => { document.title = 'Learn | Lyne Tilt'; }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const subNavItems = useMemo(() => [
    { id: 'offerings', label: 'Courses & Workshops' },
    { id: 'testimonials', label: 'Reviews' },
    ...(learnFaqs.length > 0 ? [{ id: 'faq', label: 'FAQ' }] : []),
  ], [learnFaqs]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 130;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribing(true);
    setSubscribeError('');

    try {
      const response = await fetch(`${API_BASE}/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'learn-page' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Subscription failed');
      }

      setSubscribed(true);
    } catch (error) {
      setSubscribeError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="bg-white min-h-screen relative overflow-hidden">
      <SubNav items={subNavItems} />

      {/* Background Lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 h-full w-px bg-stone-200/50"></div>
        <div className="absolute top-0 left-1/2 h-full w-px bg-stone-200/30"></div>
        <div className="absolute top-0 right-1/4 h-full w-px bg-stone-200/50"></div>
        <div className="absolute top-[15%] -left-[10%] w-[120%] h-px bg-stone-200/40 rotate-6"></div>
        <div className="absolute top-[45%] -left-[10%] w-[120%] h-px bg-stone-200/30 -rotate-3"></div>
        <div className="absolute -top-32 -right-32 w-96 h-96 border border-stone-200/30 rounded-full"></div>
        <div className="absolute top-[40%] -left-24 w-80 h-80 border border-stone-200/20 rounded-full"></div>
      </div>

      {/* Hero Section */}
      <section className="pt-44 pb-16 px-6 max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text Content */}
          <div className="order-2 lg:order-2">
            <p className="text-xs uppercase tracking-[0.3em] text-stone-400 mb-4">{learn.hero.subtitle}</p>
            <h1 className="text-4xl md:text-5xl font-serif font-medium mb-6 text-clay leading-tight" dangerouslySetInnerHTML={{ __html: learn.hero.title.replace(/\n/g, '<br/>') }} />
            <p className="text-lg font-light text-stone-600 mb-8 leading-relaxed">
              {learn.hero.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <button
                onClick={() => scrollToSection('courses')}
                className="inline-block bg-stone-900 text-white px-8 py-4 uppercase tracking-widest text-xs font-bold hover:bg-clay transition-colors"
              >
                Explore Courses
              </button>
              <button
                onClick={() => scrollToSection('workshops')}
                className="inline-block border border-stone-300 text-stone-600 px-8 py-4 uppercase tracking-widest text-xs font-bold hover:border-stone-900 hover:text-stone-900 transition-colors"
              >
                View Workshops
              </button>
            </div>
            {/* Trust indicators */}
            <div className="flex items-center gap-6 text-sm text-stone-400">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-clay rounded-full"></span>
                2500+ Students Taught
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-clay rounded-full"></span>
                4.9★ Average Rating
              </span>
            </div>
          </div>

          {/* Image */}
          <div className="order-1 lg:order-1 relative">
            <div className="aspect-[4/5] bg-stone-200 overflow-hidden shadow-2xl">
              <img
                src="https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/1636022008943-O8YQ8KXQK7YWVQJ8JQ8V/Lyne+Tilt+Art+Studio.jpg?format=750w"
                alt="Creative Learning"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Floating Quote Card */}
            <div className="absolute -bottom-6 -right-6 lg:-right-12 bg-white p-6 shadow-xl max-w-xs border-r-4 border-clay">
              <p className="font-serif italic text-stone-700 text-sm leading-relaxed mb-3">
                "Creativity isn't a talent. It's a practice. Let me show you how."
              </p>
              <p className="text-xs uppercase tracking-widest text-stone-400"> - Lyne Tilt</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div className="w-full max-w-3xl h-px bg-stone-200 mx-auto relative z-10 my-8"></div>

      {/* Courses & Workshops Section */}
      <section id="offerings" className="py-16 px-6 max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-400 mb-3">Learn & Create</p>
          <h2 className="text-3xl md:text-4xl font-serif text-stone-900 mb-4">Courses & Workshops</h2>
          <p className="text-stone-500 max-w-2xl mx-auto">
            From self-paced online courses to hands-on live workshops. Find the learning format that fits your style.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-col items-center gap-4 mb-10">
          {/* Type Filter */}
          <div className="flex justify-center gap-4">
            {(['ALL', 'ONLINE', 'WORKSHOP'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs uppercase tracking-widest px-4 py-2 transition-colors ${
                  activeTab === tab
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
              >
                {tab === 'ALL' ? 'All' : tab === 'ONLINE' ? 'Courses' : 'Workshops'}
              </button>
            ))}
          </div>

          {/* Format Filter */}
          <div className="flex justify-center gap-2">
            {['All', 'Self-paced', 'Live Online', 'In-Person'].map((format) => (
              <button
                key={format}
                onClick={() => setActiveFormat(format)}
                className={`text-[10px] uppercase tracking-widest px-3 py-1.5 transition-colors rounded-full ${
                  activeFormat === format
                    ? 'bg-clay text-white'
                    : 'bg-stone-50 border border-stone-200 text-stone-500 hover:border-stone-400'
                }`}
              >
                {format}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {learnItems.filter(item => {
            const matchesTab = activeTab === 'ALL' || item.type === activeTab;
            const matchesFormat = activeFormat === 'All' ||
              (activeFormat === 'Self-paced' && item.format.toLowerCase().includes('self-paced')) ||
              (activeFormat === 'Live Online' && item.format.toLowerCase().includes('live online')) ||
              (activeFormat === 'In-Person' && item.format.toLowerCase().includes('in-person'));
            return matchesTab && matchesFormat;
          }).map((item) => (
            <div key={item.id} className="bg-white border border-stone-200 shadow-sm">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-stone-100 px-2 py-1 text-[9px] uppercase tracking-widest font-bold text-stone-900 flex items-center gap-1">
                    {item.type === 'ONLINE' ? <PlayCircle size={12} /> : <Users size={12} />}
                    {item.format}
                  </span>
                  {item.nextDate && (
                    <span className="bg-clay text-white px-2 py-1 text-[9px] uppercase tracking-widest font-bold">
                      Next: {item.nextDate}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 mb-3 text-[10px] text-stone-400">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {item.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen size={12} /> {item.level}
                  </span>
                  {item.type === 'WORKSHOP' && item.enrolledCount && (
                    <span className="flex items-center gap-1">
                      <Users size={12} /> {item.enrolledCount} attendees
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-serif text-stone-900 mb-1">{item.title}</h3>
                {item.subtitle && <p className="text-clay font-serif italic text-sm mb-3">{item.subtitle}</p>}

                <p className="text-stone-600 text-sm leading-relaxed mb-4 line-clamp-3">
                  {item.description}
                </p>

                {/* Footer with price and CTA */}
                <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                  <div>
                    <p className="text-xl font-serif text-stone-900">{item.price}</p>
                    <p className="text-[10px] text-stone-400">
                      {item.type === 'ONLINE' ? 'Lifetime access' : 'Limited spots'}
                    </p>
                  </div>
                  <Link
                    to={`/contact?subject=${encodeURIComponent(item.title)}`}
                    className={`inline-block px-6 py-2 uppercase tracking-widest text-[10px] font-bold transition-colors text-center ${
                      item.type === 'ONLINE'
                        ? 'bg-stone-900 text-white hover:bg-clay'
                        : 'bg-clay text-white hover:bg-stone-900'
                    }`}
                  >
                    {item.type === 'ONLINE' ? 'Enrol Now' : 'Reserve Spot'}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Your Instructor Section */}
      <section className="py-16 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-4">
              <div className="aspect-square bg-stone-200 overflow-hidden shadow-lg">
                <img
                  src="https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/a2b24cba-294f-4e4f-b4a6-ebaa1b285607/IMG_4502+copy.jpg?format=500w"
                  alt={learn.instructorBio.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="md:col-span-8">
              <p className="text-xs uppercase tracking-[0.3em] text-stone-400 mb-3">Your Instructor</p>
              <h2 className="text-3xl font-serif text-stone-900 mb-4">{learn.instructorBio.name}</h2>
              {(learn.instructorBio.paragraphs.length > 0 ? learn.instructorBio.paragraphs : [
                "With over two decades at the intersection of art, psychology, and strategy, I've helped hundreds of creatives move from confusion to confident action.",
                "My teaching style blends practical technique with deep mindset work - because I believe creative blocks aren't about lack of talent. They're about lack of clarity. My courses are designed to give you both."
              ]).map((para, idx) => (
                <p key={idx} className="text-stone-600 leading-relaxed mb-4">{para}</p>
              ))}
              <div className="flex flex-wrap gap-6 text-sm text-stone-500">
                {(learn.instructorBio.stats.length > 0 ? learn.instructorBio.stats : [
                  { value: "2500+", label: "Students Taught" },
                  { value: "20+", label: "Years Experience" },
                  { value: "Brisbane", label: "Australia" }
                ]).map((stat, idx) => (
                  <span key={idx} className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-clay rounded-full"></span>
                    {stat.value} {stat.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-16 px-6 bg-stone-900 text-white relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.3em] text-stone-400 mb-3">Student Stories</p>
            <h2 className="text-3xl md:text-4xl font-serif text-white mb-4">What Students Say</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {learnTestimonials.slice(0, 6).map((testimonial) => (
              <div key={testimonial.id} className="bg-stone-800 p-6 border border-stone-700">
                <div className="flex text-clay mb-4">
                  {[...Array(testimonial.rating || 5)].map((_, i) => (
                    <Star key={i} size={14} fill="currentColor" />
                  ))}
                </div>
                <p className="text-stone-300 text-sm leading-relaxed mb-4 italic">
                  "{testimonial.text}"
                </p>
                <div className="border-t border-stone-700 pt-4">
                  <p className="font-medium text-white text-sm">{testimonial.author}</p>
                  <p className="text-stone-500 text-xs">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section - only shown when FAQs exist */}
      {learnFaqs.length > 0 && (
        <section id="faq" className="py-16 px-6 bg-stone-50 relative z-10">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs uppercase tracking-[0.3em] text-stone-400 mb-3">Questions</p>
              <h2 className="text-3xl font-serif text-stone-900 mb-4">Frequently Asked</h2>
            </div>

            <div className="space-y-4">
              {learnFaqs.map((faq, idx) => (
                <div key={idx} className="bg-white p-6 border border-stone-200 shadow-sm">
                  <h4 className="font-serif text-lg text-stone-900 mb-2">{faq.question}</h4>
                  <p className="text-stone-600 text-sm leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Email Signup Section */}
      <section className="py-20 px-6 bg-white relative z-10 border-t border-stone-200">
        <div className="max-w-2xl mx-auto text-center">
          <Mail className="text-clay mx-auto mb-6" size={40} strokeWidth={1} />
          <h3 className="text-2xl font-serif text-stone-900 mb-4">{learn.newsletterSignup.title}</h3>
          <p className="text-stone-500 text-sm leading-relaxed mb-8" dangerouslySetInnerHTML={{ __html: learn.newsletterSignup.description || "Join <span class='font-medium text-stone-700'>Oxygen Notes</span> - my free weekly newsletter with insights on creativity, visibility, and staying true to your work. No spam, unsubscribe anytime." }} />

          {subscribed ? (
            <div className="bg-stone-50 p-6 border border-stone-200">
              <CheckCircle className="text-clay mx-auto mb-3" size={32} />
              <p className="font-serif text-lg text-stone-900">Welcome to the community!</p>
              <p className="text-stone-500 text-sm mt-2">Check your inbox for a welcome note.</p>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="max-w-md mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={subscribing}
                  className="flex-1 px-4 py-3 border border-stone-300 focus:border-clay focus:outline-none transition-colors disabled:bg-stone-100 disabled:text-stone-400"
                />
                <button
                  type="submit"
                  disabled={subscribing}
                  className="bg-stone-900 text-white px-8 py-3 uppercase tracking-widest text-xs font-bold hover:bg-clay transition-colors disabled:bg-stone-400 disabled:cursor-not-allowed"
                >
                  {subscribing ? 'Subscribing...' : 'Subscribe'}
                </button>
              </div>
              {subscribeError && (
                <p className="text-red-600 text-sm mt-3">{subscribeError}</p>
              )}
            </form>
          )}
        </div>
      </section>
    </div>
  );
};

export default Learn;
