
import React, { useState, useEffect, useMemo } from 'react';
import CoachingCard from '../components/CoachingCard';
import CoachingApplicationModal from '../components/CoachingApplicationModal';
import SubNav from '../components/SubNav';
import { CheckCircle, ChevronDown, Eye, Compass, Heart, Award, Users, BookOpen, ArrowRight } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { API_BASE } from '../config/api';
import { CoachingPackage, Testimonial, FAQItem } from '../types';

const Coaching = () => {
  const { settings } = useSettings();
  const { coaching } = settings;
  const defaultPackages: CoachingPackage[] = [
    {
      id: 'oxygen',
      title: 'The Oxygen Package',
      description: '6-Month Commitment',
      summary: 'For creatives ready to commit to clarity, focus, and growth. A six-month partnership designed to help you strengthen your mindset, refine your direction, and create consistent progress in your art, business, or leadership.',
      features: [
        '1 x 60-minute coaching call per month (Zoom)',
        'Email support between sessions',
        'Custom tools and resources aligned with your goals',
        'Reflection and review every two months',
      ],
      ctaText: 'Apply Now',
      price: '$155 per month',
      priceAmount: '155',
      currency: 'AUD',
      recurring: true,
      recurringInterval: 'month',
    },
    {
      id: 'momentum',
      title: 'The Momentum Package',
      description: '12-Month Commitment',
      summary: 'For creatives ready to build lasting rhythm, visibility, and sustainability. A year-long coaching partnership for deeper transformation, accountability, and growth. Perfect for artists and entrepreneurs scaling their work or developing long-term strategy.',
      features: [
        '1 x 60-minute coaching call per month (Zoom)',
        'Priority email access',
        'Quarterly strategic planning sessions',
        'Tailored frameworks and progress reviews',
      ],
      ctaText: 'Apply Now',
      price: '$135 per month',
      priceAmount: '135',
      currency: 'AUD',
      recurring: true,
      recurringInterval: 'month',
      badge: 'MOST POPULAR',
    },
  ];
  const [coachingPackages, setCoachingPackages] = useState<CoachingPackage[]>(defaultPackages);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [coachingFaqs, setCoachingFaqs] = useState<FAQItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pkgRes, testRes, faqRes] = await Promise.all([
          fetch(`${API_BASE}/coaching`),
          fetch(`${API_BASE}/testimonials?type=coaching`),
          fetch(`${API_BASE}/faqs?category=Coaching`),
        ]);
        if (pkgRes.ok) {
          const data = await pkgRes.json();
          const items = Array.isArray(data) ? data : data.items ?? [];
          if (items.length > 0) setCoachingPackages(items);
        }
        if (testRes.ok) setTestimonials(await testRes.json());
        if (faqRes.ok) setCoachingFaqs(await faqRes.json());
      } catch {
        // Data will remain empty
      }
    };
    fetchData();
  }, []);
  const [selectedPackage, setSelectedPackage] = useState<string | undefined>(undefined);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => { document.title = 'Creative Coaching | Lyne Tilt'; }, []);

  const handleApply = (packageName?: string) => {
    setSelectedPackage(packageName);
    setIsModalOpen(true);
  };

  const subNavItems = useMemo(() => [
    { id: 'overview', label: 'Overview' },
    { id: 'why-coaching', label: 'Benefits' },
    { id: 'your-coach', label: 'Your Coach' },
    { id: 'is-it-for-me', label: 'Is It For Me?' },
    { id: 'packages', label: 'Packages' },
    ...(coachingFaqs.length > 0 ? [{ id: 'faq', label: 'FAQ' }] : []),
  ], [coachingFaqs]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 130;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative overflow-hidden">
      <SubNav items={subNavItems} />

      {/* Background Lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 h-full w-px bg-stone-200/50"></div>
        <div className="absolute top-0 left-1/2 h-full w-px bg-stone-200/30"></div>
        <div className="absolute top-0 right-1/4 h-full w-px bg-stone-200/50"></div>
        <div className="absolute -top-32 -right-32 w-96 h-96 border border-stone-200/30 rounded-full"></div>
        <div className="absolute top-[40%] -left-24 w-80 h-80 border border-stone-200/20 rounded-full"></div>
      </div>

      {/* Hero — Split Layout with Image */}
      <section id="overview" className="pt-36 md:pt-44 pb-12 md:pb-16 px-6 max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Image */}
          <div className="relative flex justify-center -mt-4 md:mt-0">
            <div className="aspect-[3/4] md:aspect-[4/5] max-w-[280px] md:max-w-none bg-stone-200 overflow-hidden shadow-2xl rounded-3xl">
              <img
                src="https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/a2b24cba-294f-4e4f-b4a6-ebaa1b285607/IMG_4502+copy.jpg?format=750w"
                alt="Lyne Tilt - Creative Coach"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Floating Quote Card */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 md:-bottom-6 md:left-auto md:translate-x-0 md:-right-6 lg:-right-10 bg-white p-2.5 md:p-6 shadow-xl max-w-[300px] md:max-w-xs border-t-4 md:border-t-0 md:border-l-4 border-clay rounded-lg md:rounded-r-lg text-center md:text-left">
              <p className="font-serif italic text-stone-700 text-xs md:text-sm leading-snug md:leading-relaxed mb-1 md:mb-2">
                "Working with Lyne gave me the clarity I needed to finally move forward."
              </p>
              <p className="text-[10px] uppercase tracking-widest text-stone-400">- Sarah C., Visual Artist</p>
            </div>
          </div>

          {/* Text Content */}
          <div className="text-center lg:text-left mt-4 md:mt-0">
            <p className="text-xs uppercase tracking-[0.3em] text-stone-400 mb-4">{coaching.hero.subtitle}</p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif text-stone-900 mb-4 leading-tight">{coaching.hero.title.replace(/\n/g, ' ')}</h1>
            <p className="font-serif text-lg text-clay mb-6 italic">Art is oxygen. Clarity is power. Action is growth.</p>
            <p className="text-stone-600 text-[15px] leading-relaxed mb-8">
              Creative success doesn't come from chance or hustle. It comes from clarity, consistency, and confidence. Coaching gives you the structure, strategy, and support to build a creative life that actually works.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center lg:justify-start items-center lg:items-start">
              <button
                onClick={() => handleApply()}
                className="bg-clay text-white px-8 py-4 uppercase tracking-widest text-xs font-bold hover:bg-stone-900 transition-colors"
              >
                Apply for Coaching
              </button>
              <button
                onClick={() => scrollToSection('packages')}
                className="text-stone-500 px-8 py-4 uppercase tracking-widest text-xs font-medium hover:text-stone-900 transition-colors inline-flex items-center gap-2"
              >
                See Packages <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Divider between Hero and Why Coaching */}
      <div className="flex justify-center -mt-6 -mb-6 relative z-20 md:hidden">
        <div className="w-px h-16 bg-stone-300" />
      </div>

      {/* Why Coaching — Icon Cards */}
      <section id="why-coaching" className="py-16 px-6 relative z-10 bg-stone-50 md:bg-transparent">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400 mb-3">Why Coaching</p>
            <h2 className="font-serif text-2xl md:text-3xl text-stone-900">What changes when you have a coach</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-md md:max-w-5xl mx-auto">
            {[
              { icon: <Eye size={22} strokeWidth={1.5} />, title: "Clarity", desc: "See clearly, plan intentionally, and stop spinning in circles. Know exactly what to focus on and why it matters." },
              { icon: <Compass size={22} strokeWidth={1.5} />, title: "Momentum", desc: "Move from inspiration to implementation. Build routines that actually work with your life, not against it." },
              { icon: <Heart size={22} strokeWidth={1.5} />, title: "Support", desc: "A partner in your corner. Honest feedback, real accountability, and space to think without judgment." },
            ].map((card, idx) => (
              <div key={idx} className="group bg-white border border-stone-200 rounded-2xl p-5 md:p-8 hover:border-clay/30 hover:shadow-lg transition-all duration-300 flex flex-row md:flex-col items-start md:items-center text-left md:text-center gap-4 md:gap-0">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-clay/10 flex items-center justify-center shrink-0 md:mx-auto md:mb-5 text-clay group-hover:bg-clay group-hover:text-white transition-colors duration-300">
                  {card.icon}
                </div>
                <div>
                  <h3 className="font-serif text-lg md:text-xl text-stone-900 mb-1 md:mb-3">{card.title}</h3>
                  <p className="text-sm text-stone-500 leading-relaxed">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Lyne — Credentials + Pull Quote */}
      <section id="your-coach" className="py-16 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400 mb-3">Your Coach</p>
            <h2 className="font-serif text-2xl md:text-3xl text-stone-900 mb-4">Why Work With Lyne</h2>
            <p className="text-stone-600 text-sm leading-relaxed max-w-2xl mx-auto">
              More than two decades across art, education, business, and human behaviour, blending creative strategy, mindset work, and evidence-based coaching.
            </p>
          </div>

          {/* Credential Badges */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {[
              { icon: <BookOpen size={14} />, label: "First Class Honours" },
              { icon: <Users size={14} />, label: "200+ Creatives Coached" },
              { icon: <Award size={14} />, label: "ICF Eligible" },
              { icon: <Compass size={14} />, label: "20+ Years Experience" },
            ].map((cred, idx) => (
              <div key={idx} className="flex items-center gap-2 px-4 py-2.5 bg-stone-100 rounded-full text-stone-600">
                <span className="text-clay">{cred.icon}</span>
                <span className="text-xs uppercase tracking-wider font-medium">{cred.label}</span>
              </div>
            ))}
          </div>

          {/* Pull Quote */}
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-10 h-[2px] bg-clay mx-auto mb-6"></div>
            <p className="font-serif text-xl md:text-2xl text-stone-900 italic leading-relaxed mb-4">
              "Clients describe my coaching as clear, grounded, and deeply human."
            </p>
            <p className="text-stone-500 text-sm leading-relaxed">
              You'll get real-world insight, tools that work, and accountability that feels supportive, not stressful.
            </p>
          </div>
        </div>
      </section>

      {/* Is Coaching For Me — Dark Card */}
      <section id="is-it-for-me" className="py-6 md:py-10 px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-stone-900 rounded-2xl py-10 px-6 md:py-12 md:px-14 overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.08]">
              <div className="absolute -top-12 -left-8 w-56 h-56 border border-white rounded-full"></div>
              <div className="absolute -bottom-16 right-8 w-72 h-72 border border-white rounded-full"></div>
              <div className="absolute top-1/2 right-[20%] w-32 h-32 border border-white rounded-full"></div>
              <div className="absolute top-4 left-[30%] w-40 h-40 border border-white rounded-full"></div>
            </div>

            <div className="relative z-10">
              <h2 className="font-serif text-2xl md:text-3xl text-white mb-4 text-center">Is Coaching For Me?</h2>
              <p className="text-stone-400 text-sm leading-relaxed text-center max-w-2xl mx-auto mb-8">
                You've worked hard, but you haven't seen the rewards you expected. You're ready to keep working, but this time, aligned with your values, your creativity, and your goals.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 max-w-2xl mx-auto">
                {[
                  "You've outgrown where you are, but you're not sure what's next",
                  "You're craving something real, sustainable, and true to you",
                  "You want to stop second-guessing and start building momentum",
                  "You need structure, clarity, and support to follow through",
                  "You want your art, business, and life to feel aligned",
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle size={16} className="text-clay shrink-0 mt-0.5" />
                    <p className="text-stone-300 text-sm leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Packages */}
      <section id="packages" className="py-16 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="w-10 h-[2px] bg-clay mx-auto mb-6"></div>
            <h2 className="font-serif text-2xl md:text-3xl text-stone-900 mb-3">The Packages</h2>
            <p className="text-stone-500 text-sm max-w-xl mx-auto">
              Two pathways designed for creatives ready to commit to clarity, focus, and sustainable growth.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
            {coachingPackages.map(pkg => (
              <CoachingCard key={pkg.id} item={pkg} onApply={handleApply} />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="py-16 px-6 bg-stone-50 relative z-10">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-center font-serif text-2xl md:text-3xl text-stone-900 mb-4">What Others Are Saying</h2>
            <p className="text-center text-stone-500 mb-10 max-w-2xl mx-auto text-sm">
              Real words from creatives who've been where you are.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {testimonials.slice(0, 4).map((testimonial, idx) => (
                <div key={idx} className="bg-white p-8 border border-stone-100 rounded-xl relative">
                  <div className="text-5xl text-clay/20 font-serif absolute top-4 left-6">"</div>
                  <p className="font-serif text-stone-700 italic leading-relaxed mb-6 relative z-10">
                    "{testimonial.text}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-stone-200 rounded-full flex items-center justify-center text-stone-500 font-medium text-sm">
                      {testimonial.author.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-900">{testimonial.author}</p>
                      <p className="text-xs text-stone-400">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {coachingFaqs.length > 0 && (
        <section id="faq" className="py-16 px-6 relative z-10">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-center font-serif text-2xl md:text-3xl text-stone-900 mb-4">Questions You Might Have</h2>
            <p className="text-center text-stone-500 mb-10 text-sm">
              If your question isn't answered here, let's chat on a discovery call.
            </p>
            <div className="space-y-3">
              {coachingFaqs.map((faq, idx) => (
                <div key={idx} className="bg-white border border-stone-200 rounded-xl hover:border-stone-300 transition-colors overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full p-5 flex items-center justify-between text-left"
                  >
                    <h4 className="font-serif text-base text-stone-900 pr-4">{faq.question}</h4>
                    <ChevronDown
                      size={18}
                      className={`text-stone-400 shrink-0 transition-transform duration-300 ${openFaq === idx ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <div className={`transition-all duration-300 ease-in-out ${openFaq === idx ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <p className="text-stone-600 text-sm leading-relaxed px-5 pb-5">{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Apply For Coaching CTA */}
      <section className="pt-4 pb-12 px-6 relative z-10">
        <div className="max-w-3xl mx-auto">
          <div className="bg-stone-900 rounded-2xl px-8 py-10 md:px-12 text-center relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.07]">
              <div className="absolute -top-16 -left-8 w-56 h-56 border border-white rounded-full"></div>
              <div className="absolute -bottom-20 right-6 w-72 h-72 border border-white rounded-full"></div>
              <div className="absolute top-1/3 right-[15%] w-36 h-36 border border-white rounded-full"></div>
            </div>
            <div className="relative z-10">
              <h2 className="font-serif text-xl md:text-2xl text-white mb-3">Apply For Coaching</h2>
              <p className="text-stone-400 text-sm leading-relaxed max-w-lg mx-auto mb-6">
                Coaching is personal. Let's start with a short conversation to see if we're the right fit. This isn't a sales call, it's a real chat about where you're at and whether coaching can help.
              </p>
              <div className="flex justify-center">
                <button
                  onClick={() => handleApply()}
                  className="bg-clay text-white px-8 py-3 uppercase tracking-widest text-[10px] font-bold hover:bg-white hover:text-stone-900 transition-colors rounded-full"
                >
                  Apply for Coaching
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Application Modal */}
      <CoachingApplicationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        preselectedPackage={selectedPackage}
      />
    </div>
  );
};

export default Coaching;
