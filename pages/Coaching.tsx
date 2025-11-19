
import React from 'react';
import SectionHeading from '../components/SectionHeading';
import CoachingCard from '../components/CoachingCard';
import ImpactChart from '../components/ImpactChart';
import { COACHING_PACKAGES, TESTIMONIALS, FAQS } from '../constants';
import { CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const Coaching = () => {
  const coachingFaqs = FAQS.filter(f => f.category === 'Coaching');

  return (
    <>
      {/* Hero */}
      <section className="pt-40 pb-20 bg-stone-100 px-6 relative overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-10 left-20 w-64 h-64 border border-stone-300 rounded-full" />
          <div className="absolute bottom-20 right-10 w-96 h-96 border border-stone-300 rounded-full" />
          <div className="absolute top-1/3 right-1/4 w-2 h-32 bg-stone-300 rotate-45" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-serif text-stone-900 mb-6 leading-tight">
            Clear the Path. <br/>
            <span className="text-clay italic">Create Your Work.</span>
          </h1>
          <p className="text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed mb-10">
            Creative coaching for artists, makers, and dreamers who are ready to move from confusion to confident action.
          </p>
          <Link to="/contact" className="inline-block bg-stone-800 text-white px-8 py-4 uppercase tracking-widest text-xs font-bold hover:bg-clay transition-colors">
            Book a Free Discovery Call
          </Link>
        </div>
      </section>

      {/* Philosophy / Outcome */}
      <section className="py-24 px-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div>
          <SectionHeading title="The Shift" alignment="left" />
          <p className="text-stone-600 text-lg mb-6">
            Most creative blocks aren't about lack of talent. They're about lack of clarity. My coaching method combines practical strategy with intuitive inquiry to help you:
          </p>
          <ul className="space-y-4 mb-8">
            {[
              "Identify the root cause of your resistance.",
              "Build sustainable creative habits.",
              "Launch projects with confidence.",
              "Reconnect with the joy of making."
            ].map((item, idx) => (
              <li key={idx} className="flex items-start gap-3 text-stone-700">
                <CheckCircle className="text-clay shrink-0 mt-1" size={20} />
                {item}
              </li>
            ))}
          </ul>
          <ImpactChart />
        </div>
        <div className="h-[600px] bg-stone-200 relative">
            <img src="https://picsum.photos/id/338/800/1000" alt="Coaching Session" className="w-full h-full object-cover" />
            <div className="absolute bottom-8 left-8 right-8 bg-white p-6 shadow-lg">
                <p className="font-serif italic text-stone-800 text-lg mb-4">"{TESTIMONIALS[1].text}"</p>
                <p className="text-xs uppercase tracking-widest text-stone-500">— {TESTIMONIALS[1].author}</p>
            </div>
        </div>
      </section>

      {/* Packages */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <SectionHeading title="Ways to Work Together" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {COACHING_PACKAGES.map(pkg => (
              <CoachingCard key={pkg.id} item={pkg} />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-stone-50">
        <div className="max-w-3xl mx-auto">
          <SectionHeading title="Common Questions" />
          <div className="space-y-6">
            {coachingFaqs.map((faq, idx) => (
              <div key={idx} className="bg-white p-6 border border-stone-100">
                <h4 className="font-serif text-lg text-stone-900 mb-2">{faq.question}</h4>
                <p className="text-stone-600 text-sm leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default Coaching;
