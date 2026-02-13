import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

const FAQ = () => {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => { document.title = 'FAQ | Lyne Tilt'; }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  return (
    <div className="pt-32 pb-8 px-6 max-w-4xl mx-auto min-h-screen animate-fade-in-up">
      {/* Header */}
      <div className="text-center mb-16">
        <p className="text-xs uppercase tracking-[0.3em] text-stone-400 mb-3">Studio Policies</p>
        <h1 className="text-4xl md:text-5xl font-serif text-clay mb-4">Policies & FAQs</h1>
        <p className="text-stone-500 max-w-xl mx-auto">
          Everything you need to know about shipping, care, returns, and working with me.
        </p>
      </div>

      <div className="space-y-12">

        {/* SHIPPING */}
        <section>
          <button
            onClick={() => toggleSection('shipping')}
            className="w-full flex items-center justify-between text-2xl font-serif text-stone-900 border-b border-stone-200 pb-3 hover:text-clay transition-colors"
          >
            Shipping
            <ChevronDown size={20} className={`transition-transform ${activeSection === 'shipping' ? 'rotate-180' : ''}`} />
          </button>

          <div className={`space-y-8 mt-8 ${activeSection === 'shipping' ? 'block' : 'hidden'}`}>
            <div className="prose prose-stone max-w-none text-sm leading-loose">
              <h4 className="font-bold text-stone-900 text-base mb-2">How long will it take to process my order?</h4>
              <p className="text-stone-600">Please allow 5–10 working days for processing. Custom orders may take longer depending on the complexity of the piece.</p>
            </div>

            <div className="prose prose-stone max-w-none text-sm leading-loose">
              <h4 className="font-bold text-stone-900 text-base mb-2">How is shipping handled?</h4>
              <p className="text-stone-600 mb-4">All orders are sent via tracked Australia Post. You'll receive a notification and tracking number once your parcel is sent. Track it via the Australia Post website or app.</p>

              <div className="bg-stone-50 p-6 border border-stone-200 space-y-4">
                <div>
                  <p className="text-stone-800 uppercase tracking-wide text-xs font-bold mb-1">Domestic Shipping (Wearable Art)</p>
                  <p className="text-stone-600">Flat rate: $12.50</p>
                  <p className="text-stone-500 text-xs">Local pick-up also available</p>
                </div>
                <div>
                  <p className="text-stone-800 uppercase tracking-wide text-xs font-bold mb-1">International Shipping (Wearable Art)</p>
                  <p className="text-stone-600">Flat rate: $25.50 for orders under $200 AUD</p>
                </div>
                <div>
                  <p className="text-stone-800 uppercase tracking-wide text-xs font-bold mb-1">Wall Art Shipping</p>
                  <p className="text-stone-600">Varies by size and destination</p>
                  <p className="text-stone-500 text-xs">See specific product listings for details. Pick-up also available.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HANDMADE WORK & COLOUR */}
        <section>
          <button
            onClick={() => toggleSection('product')}
            className="w-full flex items-center justify-between text-2xl font-serif text-stone-900 border-b border-stone-200 pb-3 hover:text-clay transition-colors"
          >
            Product Details
            <ChevronDown size={20} className={`transition-transform ${activeSection === 'product' ? 'rotate-180' : ''}`} />
          </button>

          <div className={`space-y-8 mt-8 ${activeSection === 'product' ? 'block' : 'hidden'}`}>
            <div className="prose prose-stone max-w-none text-sm leading-loose">
              <h4 className="font-bold text-stone-900 text-base mb-2">Handmade Work</h4>
              <p className="text-stone-600">Each piece is handmade and may contain slight imperfections or variations. These are not flaws, but the marks of authentic craftsmanship.</p>
              <p className="text-stone-600 italic mt-2">I only list what I would proudly wear or collect myself.</p>
            </div>
            <div className="prose prose-stone max-w-none text-sm leading-loose">
              <h4 className="font-bold text-stone-900 text-base mb-2">Colour Accuracy</h4>
              <p className="text-stone-600">Please note that colours may appear slightly different across devices and screens. I do my best to represent all pieces as accurately as possible.</p>
            </div>
          </div>
        </section>

        {/* PRODUCT CARE */}
        <section>
          <button
            onClick={() => toggleSection('care')}
            className="w-full flex items-center justify-between text-2xl font-serif text-stone-900 border-b border-stone-200 pb-3 hover:text-clay transition-colors"
          >
            Product Care
            <ChevronDown size={20} className={`transition-transform ${activeSection === 'care' ? 'rotate-180' : ''}`} />
          </button>

          <div className={`space-y-8 mt-8 ${activeSection === 'care' ? 'block' : 'hidden'}`}>
            <div className="prose prose-stone max-w-none text-sm leading-loose">
              <h4 className="font-bold text-stone-900 text-base mb-2">How should I care for my wearable art?</h4>
              <p className="text-stone-600 mb-4">Treat it with love, but not stress.</p>
              <ul className="list-none space-y-1 text-stone-600 mt-2">
                <li className="flex items-start gap-2">
                  <span className="text-clay">•</span>
                  Avoid dropping, bending, or scratching
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-clay">•</span>
                  Wipe with a soft, damp cloth
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-clay">•</span>
                  Avoid chemical exposure (including perfumes or sprays)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-clay">•</span>
                  Store in original packaging to prevent damage or loss
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* RETURNS + EXCHANGES */}
        <section>
          <button
            onClick={() => toggleSection('returns')}
            className="w-full flex items-center justify-between text-2xl font-serif text-stone-900 border-b border-stone-200 pb-3 hover:text-clay transition-colors"
          >
            Returns + Exchanges
            <ChevronDown size={20} className={`transition-transform ${activeSection === 'returns' ? 'rotate-180' : ''}`} />
          </button>

          <div className={`space-y-8 mt-8 ${activeSection === 'returns' ? 'block' : 'hidden'}`}>
            <div className="prose prose-stone max-w-none text-sm leading-loose">
              <h4 className="font-bold text-stone-900 text-base mb-2">Can I return or exchange a purchase?</h4>
              <p className="text-stone-600 mb-4">Yes. I offer a 30-day return and refund policy on undamaged items (starts from the date of postage).</p>
              <ul className="list-none space-y-1 text-stone-600 mt-2">
                <li className="flex items-start gap-2">
                  <span className="text-clay">•</span>
                  Wearable art returns incur a $15 processing fee and postage fees are non-refundable
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-clay">•</span>
                  Earrings incur an additional $15 fee for hygiene (replacement hooks)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-clay">•</span>
                  Wall art returns incur return postage + $15 processing fee
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-clay">•</span>
                  Items must be returned undamaged in original packaging
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-clay">•</span>
                  Return shipping is the buyer's responsibility
                </li>
              </ul>
            </div>

            <div className="prose prose-stone max-w-none text-sm leading-loose">
              <h4 className="font-bold text-stone-900 text-base mb-2">What if my item is damaged or faulty?</h4>
              <p className="text-stone-600">I offer a 10-day replacement guarantee for faulty or damaged pieces (starts from postage date).</p>
              <ul className="list-none space-y-1 text-stone-600 mt-2">
                <li className="flex items-start gap-2">
                  <span className="text-clay">•</span>
                  Contact me ASAP to arrange a replacement
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-clay">•</span>
                  Return postage is the buyer's responsibility unless otherwise agreed
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-clay">•</span>
                  Once the item is returned, I'll send your replacement
                </li>
              </ul>
            </div>

            <div className="prose prose-stone max-w-none text-sm leading-loose">
              <h4 className="font-bold text-stone-900 text-base mb-2">What if I received the piece as a gift?</h4>
              <p className="text-stone-600">Refunds can only be issued to the original purchaser. However, if you'd like to exchange a gift for another piece:</p>
              <ul className="list-none space-y-1 text-stone-600 mt-2">
                <li className="flex items-start gap-2">
                  <span className="text-clay">•</span>
                  Contact me within 30 days of the original purchase
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-clay">•</span>
                  Exchanges incur standard shipping costs
                </li>
              </ul>
              <p className="text-stone-600 mt-3">
                Get in touch via the <Link to="/contact" className="text-clay hover:underline">Contact page</Link>, email (lynettetiltart@outlook.com), or Instagram DM.
              </p>
            </div>
          </div>
        </section>

        {/* COACHING + SERVICES */}
        <section>
          <button
            onClick={() => toggleSection('coaching')}
            className="w-full flex items-center justify-between text-2xl font-serif text-stone-900 border-b border-stone-200 pb-3 hover:text-clay transition-colors"
          >
            Coaching + Services
            <ChevronDown size={20} className={`transition-transform ${activeSection === 'coaching' ? 'rotate-180' : ''}`} />
          </button>

          <div className={`space-y-8 mt-8 ${activeSection === 'coaching' ? 'block' : 'hidden'}`}>
            <div className="prose prose-stone max-w-none text-sm leading-loose">
              <h4 className="font-bold text-stone-900 text-base mb-2">Do you offer coaching?</h4>
              <p className="text-stone-600">Yes. I offer private coaching focused on mindset, strategy, and intentional growth for artists, creatives, and business owners.</p>
              <ul className="list-none space-y-1 text-stone-600 mt-2">
                <li className="flex items-start gap-2">
                  <span className="text-clay">•</span>
                  Sessions are tailored, strategic, and action-oriented
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-clay">•</span>
                  Coaching is by application only
                </li>
              </ul>
              <p className="text-stone-600 mt-3">
                Use the <Link to="/contact" className="text-clay hover:underline">Contact page</Link> and select "coaching" to apply.
              </p>
            </div>

            <div className="prose prose-stone max-w-none text-sm leading-loose">
              <h4 className="font-bold text-stone-900 text-base mb-2">Can I book you to speak or present to my group, business, or event?</h4>
              <p className="text-stone-600">Yes. I speak on topics like creativity, clarity, identity, business, mindset, and personal leadership.</p>
              <ul className="list-none space-y-1 text-stone-600 mt-2">
                <li className="flex items-start gap-2">
                  <span className="text-clay">•</span>
                  Available for panels, workshops, podcasts, and private events
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-clay">•</span>
                  Applications welcome from both creative and non-creative industries
                </li>
              </ul>
              <p className="text-stone-600 mt-3">
                To apply, please reach out via the <Link to="/contact" className="text-clay hover:underline">Contact page</Link> with your event details.
              </p>
            </div>

            <div className="prose prose-stone max-w-none text-sm leading-loose">
              <h4 className="font-bold text-stone-900 text-base mb-2">Do you run workshops for schools (Years 7–12)?</h4>
              <p className="text-stone-600">Yes. I design custom student workshops that combine creative making with mindset, communication, and personal development tools.</p>
              <ul className="list-none space-y-1 text-stone-600 mt-2">
                <li className="flex items-start gap-2">
                  <span className="text-clay">•</span>
                  Ideal for enrichment days, leadership programmes, or curriculum-linked experiences
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-clay">•</span>
                  Delivered in person or virtually
                </li>
              </ul>
              <p className="text-stone-600 mt-3">
                Enquiries welcome from schools, art educators, or wellbeing coordinators. Use the <Link to="/contact" className="text-clay hover:underline">Contact page</Link> to apply.
              </p>
            </div>

            <div className="prose prose-stone max-w-none text-sm leading-loose">
              <h4 className="font-bold text-stone-900 text-base mb-2">Do you accept international clients?</h4>
              <p className="text-stone-600">Yes! I work with creatives all over the world. All coaching and mentoring sessions are conducted online via video call, so location is no barrier.</p>
            </div>
          </div>
        </section>

        {/* OTHER */}
        <section className="bg-stone-900 text-stone-300 p-8 md:p-12 text-center mt-12 rounded-2xl">
          <h4 className="font-serif text-white text-xl mb-1">Other Questions?</h4>
          <p className="text-sm mb-1 max-w-md mx-auto">Reach out anytime through the Contact page or via email. I aim to respond within 3–5 business days.</p>
          <Link
            to="/contact"
            className="inline-block border border-stone-600 text-white px-8 py-3 text-[10px] uppercase tracking-widest font-bold hover:bg-white hover:text-stone-900 transition-colors"
          >
            Get in Touch
          </Link>
        </section>

      </div>
    </div>
  );
};

export default FAQ;
