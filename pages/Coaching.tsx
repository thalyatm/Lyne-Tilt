
import React, { useState, useEffect, useMemo } from 'react';
import SectionHeading from '../components/SectionHeading';
import CoachingCard from '../components/CoachingCard';
import CoachingApplicationModal from '../components/CoachingApplicationModal';
import SubNav from '../components/SubNav';
import { CheckCircle, ArrowRight, Clock, MessageCircle, Sparkles, Shield, Calendar, Phone, Rocket, ChevronDown, Compass, RefreshCw, Zap, Fingerprint, Award } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { API_BASE } from '../config/api';
import { CoachingPackage, Testimonial, FAQItem } from '../types';

const Coaching = () => {
  const { settings } = useSettings();
  const { coaching } = settings;
  const [coachingPackages, setCoachingPackages] = useState<CoachingPackage[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [coachingFaqs, setCoachingFaqs] = useState<FAQItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch coaching packages, testimonials, and FAQs from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pkgRes, testRes, faqRes] = await Promise.all([
          fetch(`${API_BASE}/coaching`),
          fetch(`${API_BASE}/testimonials?type=coaching`),
          fetch(`${API_BASE}/faqs?category=Coaching`),
        ]);
        if (pkgRes.ok) setCoachingPackages(await pkgRes.json());
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
    { id: 'the-shift', label: 'Benefits' },
    { id: 'packages', label: 'Packages' },
    { id: 'faq', label: 'FAQ' },
  ], []);

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
        {/* Vertical Lines */}
        <div className="absolute top-0 left-1/4 h-full w-px bg-stone-200/50"></div>
        <div className="absolute top-0 left-1/2 h-full w-px bg-stone-200/30"></div>
        <div className="absolute top-0 right-1/4 h-full w-px bg-stone-200/50"></div>

        {/* Diagonal Lines */}
        <div className="absolute top-[15%] -left-[10%] w-[120%] h-px bg-stone-200/40 rotate-6"></div>
        <div className="absolute top-[45%] -left-[10%] w-[120%] h-px bg-stone-200/30 -rotate-3"></div>
        <div className="absolute top-[75%] -left-[10%] w-[120%] h-px bg-stone-200/40 rotate-3"></div>

        {/* Circles */}
        <div className="absolute -top-32 -right-32 w-96 h-96 border border-stone-200/30 rounded-full"></div>
        <div className="absolute top-[40%] -left-24 w-80 h-80 border border-stone-200/20 rounded-full"></div>
        <div className="absolute -bottom-48 right-1/4 w-72 h-72 border border-stone-200/25 rounded-full"></div>
      </div>

      {/* Hero */}
      <section id="overview" className="pt-44 pb-16 px-6 max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Right: Text Content */}
          <div className="order-2 lg:order-2">
            <p className="text-xs uppercase tracking-[0.3em] text-stone-400 mb-4">{coaching.hero.subtitle}</p>
            <h1 className="text-4xl md:text-5xl font-serif font-medium mb-6 text-stone-900 leading-tight" dangerouslySetInnerHTML={{ __html: coaching.hero.title.replace(/\n/g, '<br/>') }} />
            <p className="text-lg font-light text-stone-600 mb-8 leading-relaxed">
              {coaching.hero.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <button
                onClick={() => handleApply()}
                className="inline-block bg-clay text-white px-8 py-4 uppercase tracking-widest text-xs font-bold hover:bg-stone-900 transition-colors"
              >
                Book Free Call
              </button>
              <button
                onClick={() => scrollToSection('packages')}
                className="inline-block text-stone-500 px-8 py-4 uppercase tracking-widest text-xs font-medium hover:text-stone-900 transition-colors"
              >
                See How It Works →
              </button>
            </div>
            {/* Trust indicators */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-stone-400">
              <span className="flex items-center gap-2">
                <CheckCircle size={14} className="text-clay" />
                50+ artists & makers coached since 2023
              </span>
              <span className="flex items-center gap-2">
                <Sparkles size={14} className="text-clay" />
                5-star reviews
              </span>
            </div>
          </div>

          {/* Left: Image with Quote */}
          <div className="order-1 lg:order-1 relative">
            <div className="aspect-[4/5] bg-stone-200 overflow-hidden shadow-2xl">
              <img
                src="https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/a2b24cba-294f-4e4f-b4a6-ebaa1b285607/IMG_4502+copy.jpg?format=750w"
                alt="Lyne Tilt - Creative Coach"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Floating Quote Card */}
            <div className="absolute -bottom-6 -right-6 lg:-right-12 bg-white p-6 shadow-xl max-w-xs border-r-4 border-clay">
              <p className="font-serif italic text-stone-700 text-sm leading-relaxed mb-3">
                "Working with Lyne gave me the clarity I needed to finally move forward."
              </p>
              <p className="text-xs uppercase tracking-widest text-stone-400"> - Sarah C., Visual Artist</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section Divider */}
      <div className="w-full max-w-3xl h-px bg-clay mx-auto relative z-10"></div>

      {/* Is This For You? */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="bg-stone-100 border border-stone-200 p-8 md:p-12 shadow-sm">
            <h2 className="text-center font-serif text-2xl md:text-3xl text-stone-900 mb-4">{coaching.isThisForYou.title}</h2>
            <p className="text-center text-stone-500 mb-10 max-w-2xl mx-auto">
              {coaching.isThisForYou.subtitle}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(coaching.isThisForYou.items.length > 0 ? coaching.isThisForYou.items : [
                "You have ideas but struggle to follow through",
                "You're tired of second-guessing yourself",
                "You want a sustainable creative practice",
                "You're ready to stop waiting and start making",
                "You feel stuck between who you are and who you're becoming",
                "You want accountability and honest feedback"
              ]).map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 bg-white border border-stone-100">
                  <CheckCircle size={20} className="text-clay shrink-0 mt-0.5" />
                  <p className="text-stone-700 text-sm">{item}</p>
                </div>
              ))}
            </div>
            <p className="text-center mt-10 text-stone-600 text-sm">
              Sound like you? <button onClick={() => handleApply()} className="text-clay font-medium hover:underline">Let's talk →</button>
            </p>
          </div>
        </div>
      </section>

      {/* What You'll Experience */}
      <section id="the-shift" className="py-24 px-6 bg-stone-50 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-2xl md:text-3xl text-stone-900 mb-4">{coaching.whatYoullExperience.title}</h2>
            <p className="text-stone-500 max-w-xl mx-auto font-light leading-relaxed">
              {coaching.whatYoullExperience.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(() => {
              const defaultCards = [
                { title: "Clarity on Your Direction", description: "Stop spinning in circles. Know exactly what to focus on and why it matters to you." },
                { title: "Sustainable Creative & Business Habits", description: "Build routines that actually work with your life, not against it." },
                { title: "Confident Action", description: "Move from planning to doing. Launch that project, share that work, make that leap." },
                { title: "A Trusted Sounding Board", description: "Someone in your corner who gets it - honest feedback without judgment." },
                { title: "Permission to Be You", description: "Stop waiting for external validation. Trust your instincts and creative vision." },
                { title: "Real Results", description: "Finished projects, new opportunities, and a creative practice you're proud of." }
              ];
              const cards = coaching.whatYoullExperience.cards.length > 0 ? coaching.whatYoullExperience.cards : defaultCards;
              const icons = [
                <Compass size={22} strokeWidth={1.5} />,
                <RefreshCw size={22} strokeWidth={1.5} />,
                <Zap size={22} strokeWidth={1.5} />,
                <MessageCircle size={22} strokeWidth={1.5} />,
                <Fingerprint size={22} strokeWidth={1.5} />,
                <Award size={22} strokeWidth={1.5} />
              ];
              return cards.map((item, idx) => (
                <div key={idx} className="bg-white rounded-2xl px-6 py-5 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-stone-50 border border-stone-100 flex items-center justify-center shrink-0 text-clay">
                    {icons[idx % icons.length]}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-stone-300 mb-0.5 block">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <h3 className="font-serif text-base text-stone-900 mb-1 leading-snug">{item.title}</h3>
                    <p className="text-stone-500 text-xs leading-relaxed font-light">{item.description}</p>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center font-serif text-2xl md:text-3xl text-stone-900 mb-4">{coaching.howItWorks.title}</h2>
          <p className="text-center text-stone-500 mb-12 max-w-2xl mx-auto">
            {coaching.howItWorks.subtitle}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-8 left-[20%] right-[20%] h-px bg-stone-200"></div>

            {(() => {
              const defaultSteps = [
                { step: "01", title: "Free Discovery Call", description: "A 15-minute conversation to understand your goals and see if we're a good fit." },
                { step: "02", title: "Choose Your Path", description: "Select the coaching package that aligns with where you are and where you want to go." },
                { step: "03", title: "Start Creating", description: "Begin your coaching journey with clarity, accountability, and ongoing support." }
              ];
              const steps = coaching.howItWorks.steps.length > 0 ? coaching.howItWorks.steps : defaultSteps;
              const icons = [<Phone size={24} />, <Calendar size={24} />, <Rocket size={24} />];
              return steps.map((item, idx) => (
                <div key={idx} className="text-center relative">
                  <div className="w-16 h-16 bg-white border-2 border-clay rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">
                    <span className="text-clay">{icons[idx % icons.length]}</span>
                  </div>
                  <span className="text-xs text-clay font-bold tracking-widest mb-2 block">{item.step}</span>
                  <h3 className="font-serif text-lg text-stone-900 mb-2">{item.title}</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">{item.description}</p>
                </div>
              ));
            })()}
          </div>
          <div className="text-center mt-12">
            <button
              onClick={() => handleApply()}
              className="inline-block bg-clay text-white px-8 py-4 uppercase tracking-widest text-xs font-bold hover:bg-stone-900 transition-colors"
            >
              Book Your Free Call
            </button>
          </div>
        </div>
      </section>

      {/* Packages */}
      <section id="packages" className="py-20 px-6 bg-white/80 backdrop-blur-sm relative z-10 overflow-hidden">
        {/* Section Background Lines */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[20%] -left-[10%] w-[120%] h-px bg-stone-200/50 rotate-3"></div>
          <div className="absolute top-[80%] -left-[10%] w-[120%] h-px bg-stone-200/40 -rotate-2"></div>
          <div className="absolute -top-16 -left-16 w-64 h-64 border border-stone-200/30 rounded-full"></div>
          <div className="absolute -bottom-20 -right-20 w-80 h-80 border border-stone-200/25 rounded-full"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <SectionHeading title="Choose Your Path" />
          <p className="text-center text-stone-500 text-sm max-w-2xl mx-auto mb-4 -mt-4">
            Two pathways designed for creatives ready to commit to clarity, focus, and sustainable growth.
          </p>
          <p className="text-center text-xs text-clay font-medium mb-10">
            Limited spots available each month
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {coachingPackages.map(pkg => (
              <CoachingCard key={pkg.id} item={pkg} onApply={handleApply} />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center font-serif text-2xl md:text-3xl text-stone-900 mb-4">What Others Are Saying</h2>
          <p className="text-center text-stone-500 mb-12 max-w-2xl mx-auto">
            Real words from creatives who've been where you are.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.slice(0, 4).map((testimonial, idx) => (
              <div key={idx} className="bg-white p-8 border border-stone-100 relative">
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

      {/* FAQ */}
      <section id="faq" className="py-20 px-6 bg-stone-50/80 backdrop-blur-sm relative z-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center font-serif text-2xl md:text-3xl text-stone-900 mb-4">Questions You Might Have</h2>
          <p className="text-center text-stone-500 mb-12">
            If your question isn't answered here, let's chat on a discovery call.
          </p>
          <div className="space-y-4">
            {/* Custom FAQ items for better coaching context */}
            {[
              {
                question: "How do I know if coaching is right for me?",
                answer: "If you're feeling stuck and ready to do something about it, book a free discovery call  - it's designed to help us both figure out if we're a good fit."
              },
              {
                question: "What happens on a discovery call?",
                answer: "A relaxed 15-minute chat about where you are, what's blocking you, and what you're hoping to achieve. No pressure, no hard sell."
              },
              {
                question: "Not sure I can commit to monthly coaching?",
                answer: "You set your own frequency with a 2-year window to use your sessions. Many clients start with a single session and decide later if they want ongoing support."
              },
              {
                question: "What kind of results can I expect?",
                answer: "Greater clarity within the first session or two. Over time: sustainable habits, finished projects, and confidence in your creative direction."
              },
              {
                question: "How is this different from therapy?",
                answer: "Coaching is action-oriented and forward-focused. I'm not a therapist - I'm a creative mentor and accountability partner."
              },
              ...coachingFaqs.map(faq => ({ question: faq.question, answer: faq.answer }))
            ].slice(0, 6).map((faq, idx) => (
              <div key={idx} className="bg-white border border-stone-100 hover:border-stone-200 transition-colors overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-6 flex items-center justify-between text-left"
                >
                  <h4 className="font-serif text-lg text-stone-900 pr-4">{faq.question}</h4>
                  <ChevronDown
                    size={20}
                    className={`text-stone-400 shrink-0 transition-transform duration-300 ${openFaq === idx ? 'rotate-180' : ''}`}
                  />
                </button>
                <div className={`transition-all duration-300 ease-in-out ${openFaq === idx ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <p className="text-stone-600 text-sm leading-relaxed px-6 pb-6">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center mt-10 text-stone-500 text-sm">
            Still have questions? <button onClick={() => handleApply()} className="text-clay font-medium hover:underline">Book a free call</button> and let's talk it through.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-6 bg-stone-900 text-white relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-2xl md:text-3xl mb-6">Ready to Clear the Path?</h2>
          <button
            onClick={() => handleApply()}
            className="inline-block bg-clay text-white px-10 py-4 uppercase tracking-widest text-xs font-bold hover:bg-white hover:text-stone-900 transition-colors"
          >
            Book Your Free Call
          </button>
          <p className="text-stone-500 text-xs mt-4">
            15 minutes · Relaxed · Over coffee or tea
          </p>
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
