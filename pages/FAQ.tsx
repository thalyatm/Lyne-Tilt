
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { API_BASE } from '../config/api';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  displayOrder: number;
}

const CATEGORY_ORDER = ['Shipping', 'Handmade Work', 'Returns + Exchanges', 'Product Care', 'Coaching + Services'];

const DEFAULT_FAQS: FAQItem[] = [
  // SHIPPING
  { id: 'ship-1', question: 'How long will it take to process my order?', answer: 'Please allow 5–10 working days for processing. Custom orders may take longer depending on the complexity of the piece.', category: 'Shipping', displayOrder: 1 },
  { id: 'ship-2', question: 'How is shipping handled?', answer: `All orders are sent via tracked Australia Post. You'll receive a notification and tracking number once your parcel is sent. Track it via the Australia Post website or app.<br/><br/><strong>Domestic Shipping (Jewellery):</strong><br/>Flat rate: $12.50<br/>Local pick-up is also available<br/><br/><strong>International Shipping (Jewellery):</strong><br/>Flat rate: $25.50 for orders under $200 AUD<br/><br/><strong>Artwork Shipping:</strong><br/>Varies by size and destination<br/>See specific product listings for details<br/>Pick-up also available`, category: 'Shipping', displayOrder: 2 },
  // HANDMADE WORK
  { id: 'hand-1', question: 'Are pieces truly handmade?', answer: 'Each piece is handmade and may contain slight imperfections or variations. These are not flaws, but the marks of authentic craftsmanship. I only list what I would proudly wear or collect myself.', category: 'Handmade Work', displayOrder: 1 },
  { id: 'hand-2', question: 'Will colours look exactly like the photos?', answer: 'Please note that colours may appear slightly different across devices and screens. I do my best to represent all pieces as accurately as possible.', category: 'Handmade Work', displayOrder: 2 },
  // RETURNS + EXCHANGES
  { id: 'ret-1', question: 'Can I return or exchange a purchase?', answer: `Yes. I offer a 30-day return and refund policy on undamaged items (starts from the date of postage).<br/><br/>• Jewellery returns incur a $15 processing fee and postage fees are non-refundable<br/>• Earrings incur an additional $15 fee for hygiene (replacement hooks)<br/>• Artwork returns incur return postage + $15 processing fee<br/>• Items must be returned undamaged in original packaging<br/>• Return shipping is the buyer's responsibility`, category: 'Returns + Exchanges', displayOrder: 1 },
  { id: 'ret-2', question: 'What if my item is damaged or faulty?', answer: `I offer a 10-day replacement guarantee for faulty or damaged pieces (starts from postage date).<br/><br/>• Contact me ASAP to arrange a replacement<br/>• Return postage is the buyer's responsibility unless otherwise agreed<br/>• Once the item is returned, I'll send your replacement`, category: 'Returns + Exchanges', displayOrder: 2 },
  { id: 'ret-3', question: 'What if I received the piece as a gift?', answer: `Refunds can only be issued to the original purchaser. However, if you'd like to exchange a gift for another piece:<br/><br/>• Contact me within 30 days of the original purchase<br/>• Exchanges incur standard shipping costs<br/><br/>Get in touch via the <a href="/contact" class="text-clay hover:underline">Contact page</a>, email (lynettetiltart@outlook.com), or Instagram DM`, category: 'Returns + Exchanges', displayOrder: 3 },
  // PRODUCT CARE
  { id: 'care-1', question: 'How should I care for my wearable art?', answer: `Treat it with love—but not stress.<br/><br/>• Avoid dropping, bending, or scratching<br/>• Wipe with a soft, damp cloth<br/>• Avoid chemical exposure (including perfumes or sprays)<br/>• Store in original packaging to prevent damage or loss`, category: 'Product Care', displayOrder: 1 },
  // COACHING + SERVICES
  { id: 'coach-1', question: 'Do you offer coaching?', answer: `Yes. I offer private coaching focused on mindset, strategy, and intentional growth for artists, creatives, and business owners.<br/><br/>• Sessions are tailored, strategic, and action-oriented<br/>• Coaching is by application only<br/><br/>Use the <a href="/contact" class="text-clay hover:underline">Contact page</a> and select "coaching" to apply.`, category: 'Coaching + Services', displayOrder: 1 },
  { id: 'coach-2', question: 'Can I book you to speak or present to my group, business, or event?', answer: `Yes. I speak on topics like creativity, clarity, identity, business, mindset, and personal leadership.<br/><br/>• Available for panels, workshops, podcasts, and private events<br/>• Applications welcome from both creative and non-creative industries<br/><br/>To apply, please reach out via the <a href="/contact" class="text-clay hover:underline">Contact page</a> with your event details.`, category: 'Coaching + Services', displayOrder: 2 },
  { id: 'coach-3', question: 'Do you run workshops for schools (Years 7–12)?', answer: `Yes. I design custom student workshops that combine creative making with mindset, communication, and personal development tools.<br/><br/>• Ideal for enrichment days, leadership programs, or curriculum-linked experiences<br/>• Delivered in person or virtually<br/><br/>Enquiries are welcome from schools, art educators, or wellbeing coordinators—use the <a href="/contact" class="text-clay hover:underline">Contact page</a> to apply.`, category: 'Coaching + Services', displayOrder: 3 },
];

const FAQ = () => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [faqsByCategory, setFaqsByCategory] = useState<Record<string, FAQItem[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = 'FAQ | Lyne Tilt'; }, []);
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const groupFaqs = (data: FAQItem[]) => {
    const grouped: Record<string, FAQItem[]> = {};
    for (const faq of data) {
      if (!grouped[faq.category]) grouped[faq.category] = [];
      grouped[faq.category].push(faq);
    }
    for (const cat of Object.keys(grouped)) {
      grouped[cat].sort((a, b) => a.displayOrder - b.displayOrder);
    }
    return grouped;
  };

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const res = await fetch(`${API_BASE}/faqs`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data: FAQItem[] = await res.json();

        if (data.length > 0) {
          setFaqsByCategory(groupFaqs(data));
        } else {
          setFaqsByCategory(groupFaqs(DEFAULT_FAQS));
        }
      } catch {
        setFaqsByCategory(groupFaqs(DEFAULT_FAQS));
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
    setActiveQuestion(null);
  };

  const toggleQuestion = (id: string) => {
    setActiveQuestion(activeQuestion === id ? null : id);
  };

  const sortedCategories = CATEGORY_ORDER.filter(c => faqsByCategory[c]?.length > 0);

  return (
    <div className="pt-32 pb-10 px-6 max-w-4xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="text-center mb-16">
        <p className="text-xs uppercase tracking-[0.3em] text-stone-400 mb-3">Studio Policies</p>
        <h1 className="text-4xl md:text-5xl font-serif text-clay mb-4">Policies & FAQs</h1>
        <p className="text-stone-500 max-w-xl mx-auto">
          Everything you need to know about shipping, care, returns, and working with me.
        </p>
      </div>

      {loading && (
        <div className="text-center py-12 text-stone-400">Loading...</div>
      )}

      {!loading && sortedCategories.length === 0 && (
        <div className="text-center py-12 text-stone-400">No FAQs available yet.</div>
      )}

      <div className="space-y-12">
        {sortedCategories.map(category => (
          <section key={category}>
            <button
              onClick={() => toggleSection(category)}
              className="w-full flex items-center justify-between text-2xl font-serif text-stone-900 border-b border-stone-200 pb-3 hover:text-clay transition-colors"
            >
              {category}
              <ChevronDown size={20} className={`transition-transform ${activeSection === category ? 'rotate-180' : ''}`} />
            </button>

            <div className={`space-y-0 mt-4 ${activeSection === category ? 'block' : 'hidden'}`}>
              {faqsByCategory[category].map(faq => (
                <div key={faq.id} className="border-b border-stone-100 last:border-0">
                  <button
                    onClick={() => toggleQuestion(faq.id)}
                    className="w-full flex items-center justify-between text-left py-4 group"
                  >
                    <h4 className="font-bold text-stone-900 text-base pr-4 group-hover:text-clay transition-colors">
                      {faq.question}
                    </h4>
                    <ChevronDown size={16} className={`text-stone-400 flex-shrink-0 transition-transform ${activeQuestion === faq.id ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`pb-4 ${activeQuestion === faq.id ? 'block' : 'hidden'}`}>
                    <div
                      className="prose prose-stone max-w-none text-sm leading-loose text-stone-600"
                      dangerouslySetInnerHTML={{ __html: faq.answer }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Contact CTA */}
        {!loading && (
          <section className="bg-stone-900 text-stone-300 px-8 py-5 md:px-12 md:py-6 text-center mt-20 rounded-2xl">
            <h4 className="font-serif text-white text-xl mb-1">Other Questions?</h4>
            <p className="text-sm mb-5 max-w-md mx-auto">Reach out anytime through the Contact page or via email. I aim to respond within 3-5 business days.</p>
            <Link
              to="/contact"
              className="inline-block bg-clay text-white px-8 py-3 text-[10px] uppercase tracking-widest font-bold hover:bg-white hover:text-stone-900 transition-colors rounded-full"
            >
              Get in Touch
            </Link>
          </section>
        )}
      </div>
    </div>
  );
};

export default FAQ;
