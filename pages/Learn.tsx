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
  Mail,
  X
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { API_BASE } from '../config/api';
import { LearnItem, Testimonial, FAQItem } from '../types';

const Learn = () => {
  const { settings } = useSettings();
  const { learn } = settings;
  const defaultLearnItems: LearnItem[] = [
    {
      id: 'concept-to-create',
      title: 'Concept to Create: Wearable Art Online Workshop',
      type: 'ONLINE',
      price: 'from $135.00',
      image: '',
      description: "Break free from the scroll, the trends, and the sameness. Join Professional Artist, Coach, Mentor, and Creative Strategist Lyne Tilt for a two-part online workshop designed to help you move from feeling stuck to creating original, wearable art that feels unmistakably yours. Over two consecutive Sundays, you'll work through Lyne's signature Concept to Create framework, a practical, mindset-driven process that connects creative clarity with artistic momentum.",
      subtitle: 'Premium Creative Experience',
      duration: '2 full days',
      format: 'Live Online',
      level: 'Intermediate',
      includes: [
        'Material mastery: polymer clay, paint, and mixed media combinations',
        'Custom components: design hooks, findings, and details that elevate your work',
        'Design integrity: balancing wearability, durability, and creative vision',
        'Purpose-led practice: infuse your story, values, and sustainability into your process',
        'Audience alignment: create work that resonates with your ideal collectors',
        'Creative foundations: composition, originality, and professional growth techniques',
        'Access to exclusive Concept to Create Alumni community',
        'All sessions recorded for later viewing',
      ],
      outcomes: [
        'Tap into your authentic creative voice without chasing trends',
        'Transform raw ideas into clear, meaningful concepts',
        'Prototype and experiment with confidence',
        'Design and refine a small-batch release or one-of-a-kind statement piece',
      ],
    },
    {
      id: 'oxygen-series-2026',
      title: 'The Oxygen Series: Creative Momentum 2026',
      type: 'ONLINE',
      price: 'from $105.00',
      image: '',
      description: 'This three-part online workshop series is exclusively for Concept to Create alumni. Designed to give your creative practice a powerful breath of clarity, focus, and forward motion. Over three connected workshop days, we explore how intentional focus, creative planning, and inspired action can shape both your art and your year ahead.',
      subtitle: 'Alumni Only',
      duration: '3 sessions',
      format: 'Live Online',
      level: 'Alumni',
      includes: [
        'Three connected workshop days exploring art, AI, and intention',
        'Clear intentions and a personally driven project plan',
        'Focus on neuroscience principles and creative reconnection',
        'All sessions recorded for later viewing',
      ],
      outcomes: [
        'Set clear intentions for the year ahead',
        'Plan and create a personally driven project',
        'Explore how focus, awareness, and community support transform creative goals',
      ],
    },
  ];
  const [learnItems, setLearnItems] = useState<LearnItem[]>(defaultLearnItems);
  const [learnTestimonials, setLearnTestimonials] = useState<Testimonial[]>([]);
  const [learnFaqs, setLearnFaqs] = useState<FAQItem[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ONLINE' | 'WORKSHOP'>('ALL');
  const [activeFormat, setActiveFormat] = useState<string>('All');
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeError, setSubscribeError] = useState('');

  // Register Interest modal state
  const [interestModal, setInterestModal] = useState<{ open: boolean; title: string }>({ open: false, title: '' });
  const [interestName, setInterestName] = useState('');
  const [interestEmail, setInterestEmail] = useState('');
  const [interestSubmitting, setInterestSubmitting] = useState(false);
  const [interestSuccess, setInterestSuccess] = useState(false);
  const [interestError, setInterestError] = useState('');

  const openInterestModal = (title: string) => {
    setInterestModal({ open: true, title });
    setInterestName('');
    setInterestEmail('');
    setInterestSuccess(false);
    setInterestError('');
  };

  const closeInterestModal = () => {
    setInterestModal({ open: false, title: '' });
  };

  const handleInterestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInterestSubmitting(true);
    setInterestError('');

    try {
      const response = await fetch(`${API_BASE}/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: interestEmail,
          name: interestName,
          source: `learn-interest:${interestModal.title}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setInterestSuccess(true);
    } catch (error) {
      setInterestError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setInterestSubmitting(false);
    }
  };

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
          const items = Array.isArray(data) ? data : data.items ?? [];
          if (items.length > 0) setLearnItems(items);
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
      <section className="pt-40 md:pt-40 pb-8 md:pb-4 px-6 max-w-3xl mx-auto relative z-10 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-stone-400 mb-4">{learn.hero.subtitle}</p>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-medium mb-6 text-clay leading-tight" dangerouslySetInnerHTML={{ __html: learn.hero.title.replace(/\n/g, '<br/>') }} />
        <p className="text-base md:text-lg font-light text-stone-600 mb-8 leading-relaxed max-w-2xl mx-auto">
          {learn.hero.description}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mb-8 items-center justify-center">
          <button
            onClick={() => scrollToSection('offerings')}
            className="inline-block bg-stone-900 text-white px-8 py-4 uppercase tracking-widest text-xs font-bold hover:bg-clay transition-colors"
          >
            Explore
          </button>
        </div>
        {/* Trust indicators */}
        <div className="flex items-center justify-center gap-6 text-sm text-stone-400">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-clay rounded-full"></span>
            2500+ Students Taught
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-clay rounded-full"></span>
            4.9★ Average Rating
          </span>
        </div>
      </section>

      {/* Your Creative Journey */}
      <section className="py-6 md:py-8 mt-4 md:mt-6 px-6 bg-stone-50 border-y border-stone-200 relative z-10">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400 text-center mb-4">Your Creative Journey</p>
          <div className="flex items-start justify-between gap-2 md:gap-4 overflow-x-auto scrollbar-hide">
            {[
              { step: '01', label: 'Curiosity', desc: 'Something pulls you in', icon: <Star size={14} /> },
              { step: '02', label: 'Foundation', desc: 'Learn the tools & techniques', icon: <BookOpen size={14} /> },
              { step: '03', label: 'Practice', desc: 'Build rhythm & confidence', icon: <Clock size={14} /> },
              { step: '04', label: 'Community', desc: 'Create alongside others', icon: <Users size={14} /> },
              { step: '05', label: 'Identity', desc: 'Make work that\'s unmistakably yours', icon: <CheckCircle size={14} /> },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center text-center flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mb-1.5 ${idx === 4 ? 'bg-clay text-white' : 'bg-stone-200 text-stone-500'}`}>
                    {item.icon}
                  </div>
                  <p className="text-[9px] uppercase tracking-widest text-clay font-bold">{item.step}</p>
                  <p className="font-serif text-stone-900 text-xs md:text-sm leading-tight">{item.label}</p>
                  <p className="text-[10px] text-stone-500 leading-tight hidden md:block">{item.desc}</p>
                </div>
                {/* spacer only, no line */}
              </div>
            ))}
          </div>
        </div>
      </section>

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
                  {item.nextDate ? (
                    <span className="bg-clay text-white px-2 py-1 text-[9px] uppercase tracking-widest font-bold">
                      Next: {item.nextDate}
                    </span>
                  ) : (
                    <span className="bg-stone-200 text-stone-600 px-2 py-1 text-[9px] uppercase tracking-widest font-bold">
                      Register Interest
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
                      {!item.nextDate ? 'No upcoming dates' : item.type === 'ONLINE' ? 'Lifetime access' : 'Limited spots'}
                    </p>
                  </div>
                  {!item.nextDate ? (
                    <button
                      onClick={() => openInterestModal(item.title)}
                      className={`inline-block px-6 py-2 uppercase tracking-widest text-[10px] font-bold transition-colors text-center ${
                        item.type === 'ONLINE'
                          ? 'bg-stone-900 text-white hover:bg-clay'
                          : 'bg-clay text-white hover:bg-stone-900'
                      }`}
                    >
                      Register Interest
                    </button>
                  ) : (
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
                  )}
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
            <div className="md:col-span-4 flex justify-center">
              <div className="aspect-square max-w-[220px] md:max-w-none w-full bg-stone-200 overflow-hidden shadow-lg rounded-3xl">
                <img
                  src="https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/a2b24cba-294f-4e4f-b4a6-ebaa1b285607/IMG_4502+copy.jpg?format=500w"
                  alt={learn.instructorBio.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="md:col-span-8 text-center md:text-left">
              <p className="text-xs uppercase tracking-[0.3em] text-stone-400 mb-3">Your Instructor</p>
              <h2 className="text-3xl font-serif text-stone-900 mb-4">{learn.instructorBio.name}</h2>
              {(learn.instructorBio.paragraphs.length > 0 ? learn.instructorBio.paragraphs : [
                "With over two decades at the intersection of art, psychology, and strategy, I've helped hundreds of creatives move from confusion to confident action.",
                "My teaching style blends practical technique with deep mindset work - because I believe creative blocks aren't about lack of talent. They're about lack of clarity. My courses are designed to give you both."
              ]).map((para, idx) => (
                <p key={idx} className="text-stone-600 leading-relaxed mb-4">{para}</p>
              ))}
              <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm text-stone-500 mt-6 md:mt-0">
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
      <section className="py-8 md:py-10 px-6 bg-white relative z-10 border-t border-stone-200">
        <div className="max-w-2xl mx-auto text-center">
          <Mail className="text-clay mx-auto mb-3" size={28} strokeWidth={1} />
          <h3 className="text-xl md:text-2xl font-serif text-stone-900 mb-2">{learn.newsletterSignup.title}</h3>
          <p className="text-stone-500 text-sm leading-relaxed mb-4" dangerouslySetInnerHTML={{ __html: learn.newsletterSignup.description || "Join <span class='font-medium text-stone-700'>Oxygen Notes</span> - honest thoughts, clarity tools, and gently rebellious insight, occasionally dispatched to your inbox with care." }} />

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

      {/* Register Interest Modal */}
      {interestModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeInterestModal} />
          <div className="relative bg-white w-full max-w-md shadow-xl">
            <button
              onClick={closeInterestModal}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-900 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="p-8">
              {interestSuccess ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-clay/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={24} className="text-clay" />
                  </div>
                  <h3 className="text-xl font-serif text-stone-900 mb-2">You're on the list</h3>
                  <p className="text-stone-500 text-sm mb-6">
                    We'll let you know when <span className="font-medium text-stone-700">{interestModal.title}</span> has upcoming dates.
                  </p>
                  <button
                    onClick={closeInterestModal}
                    className="text-xs uppercase tracking-widest text-stone-500 hover:text-stone-900 transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-xs uppercase tracking-[0.3em] text-stone-400 mb-2">Register Interest</p>
                  <h3 className="text-xl font-serif text-stone-900 mb-1">{interestModal.title}</h3>
                  <p className="text-stone-500 text-sm mb-6">
                    Be the first to know when dates are announced.
                  </p>

                  <form onSubmit={handleInterestSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-stone-500 mb-1.5">Name</label>
                      <input
                        type="text"
                        value={interestName}
                        onChange={(e) => setInterestName(e.target.value)}
                        placeholder="Your name"
                        required
                        className="w-full border border-stone-200 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:border-clay transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-stone-500 mb-1.5">Email</label>
                      <input
                        type="email"
                        value={interestEmail}
                        onChange={(e) => setInterestEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        className="w-full border border-stone-200 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:border-clay transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-stone-500 mb-1.5">Interested In</label>
                      <input
                        type="text"
                        value={interestModal.title}
                        readOnly
                        className="w-full border border-stone-200 px-4 py-3 text-sm text-stone-500 bg-stone-50 cursor-not-allowed"
                      />
                    </div>

                    {interestError && (
                      <p className="text-red-600 text-sm">{interestError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={interestSubmitting}
                      className="w-full bg-stone-900 text-white py-3 uppercase tracking-widest text-xs font-bold hover:bg-clay transition-colors disabled:bg-stone-400 disabled:cursor-not-allowed"
                    >
                      {interestSubmitting ? 'Submitting...' : 'Register Interest'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Learn;
