import React, { useEffect } from 'react';
import SectionHeading from '../components/SectionHeading';

const FAQ = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="pt-32 pb-24 px-6 max-w-4xl mx-auto min-h-screen animate-fade-in-up">
      <SectionHeading title="Frequently Asked Questions" subtitle="Shipping, Care, Returns & Service Details" />
      
      <div className="space-y-16">
        
        {/* SHIPPING */}
        <section>
            <h3 className="text-2xl font-serif text-stone-900 mb-8 border-b border-stone-200 pb-3">Shipping</h3>
            <div className="space-y-8">
                <div className="prose prose-stone max-w-none text-sm leading-loose">
                    <h4 className="font-bold text-stone-900 text-base mb-2">How long will it take to process my order?</h4>
                    <p className="text-stone-600">Please allow 5 – 10 working days for processing. Custom orders may take longer depending on the complexity of the piece.</p>
                </div>
                
                <div className="prose prose-stone max-w-none text-sm leading-loose">
                    <h4 className="font-bold text-stone-900 text-base mb-2">How is shipping handled?</h4>
                    <p className="text-stone-600 mb-4">All orders are sent via tracked Australia Post. You'll receive a notification and tracking number once your parcel is sent. Track it via the Australia Post website or app.</p>
                    
                    <div className="bg-stone-50 p-6 border border-stone-200">
                        <p className="mb-2"><strong className="text-stone-800 uppercase tracking-wide text-xs">Domestic Shipping (Jewellery):</strong><br/> Flat rate: $12.50 <br/> Local pick-up is also available</p>
                        <p className="mb-2"><strong className="text-stone-800 uppercase tracking-wide text-xs">International Shipping (Jewellery):</strong><br/> Flat rate: $25.50 for orders under $200 AUD</p>
                        <p><strong className="text-stone-800 uppercase tracking-wide text-xs">Artwork Shipping:</strong><br/> Varies by size and destination. See specific product listings for details. Pick-up also available.</p>
                    </div>
                </div>
            </div>
        </section>

        {/* HANDMADE WORK & COLOUR */}
        <section>
            <h3 className="text-2xl font-serif text-stone-900 mb-8 border-b border-stone-200 pb-3">Product Details</h3>
             <div className="space-y-8">
                <div className="prose prose-stone max-w-none text-sm leading-loose">
                    <h4 className="font-bold text-stone-900 text-base mb-2">Handmade Work</h4>
                    <p className="text-stone-600">Each piece is handmade and may contain slight imperfections or variations. These are not flaws, but the marks of authentic craftsmanship. I only list what I would proudly wear or collect myself.</p>
                </div>
                <div className="prose prose-stone max-w-none text-sm leading-loose">
                    <h4 className="font-bold text-stone-900 text-base mb-2">Colour Accuracy</h4>
                    <p className="text-stone-600">Please note that colours may appear slightly different across devices and screens. I do my best to represent all pieces as accurately as possible.</p>
                </div>
                <div className="prose prose-stone max-w-none text-sm leading-loose">
                    <h4 className="font-bold text-stone-900 text-base mb-2">Product Care</h4>
                    <p className="text-stone-600 mb-2">Treat it with love—but not stress.</p>
                    <ul className="list-disc pl-5 space-y-1 text-stone-600">
                        <li>Avoid dropping, bending, or scratching</li>
                        <li>Wipe with a soft, damp cloth</li>
                        <li>Avoid chemical exposure (including perfumes or sprays)</li>
                        <li>Store in original packaging to prevent damage or loss</li>
                    </ul>
                </div>
             </div>
        </section>

        {/* RETURNS + EXCHANGES */}
        <section>
            <h3 className="text-2xl font-serif text-stone-900 mb-8 border-b border-stone-200 pb-3">Returns + Exchanges</h3>
            <div className="space-y-8">
                <div className="prose prose-stone max-w-none text-sm leading-loose">
                    <h4 className="font-bold text-stone-900 text-base mb-2">Can I return or exchange a purchase?</h4>
                    <p className="text-stone-600 mb-4">Yes. I offer a 30-day return and refund policy on undamaged items (starts from the date of postage).</p>
                    <ul className="list-disc pl-5 space-y-1 text-stone-600 bg-stone-50 p-4 border border-stone-100">
                        <li>Jewellery returns incur a $15 processing fee and postage fees are non-refundable</li>
                        <li>Earrings incur an additional $15 fee for hygiene (replacement hooks)</li>
                        <li>Artwork returns incur return postage + $15 processing fee</li>
                        <li>Items must be returned undamaged in original packaging</li>
                        <li>Return shipping is the buyer’s responsibility</li>
                    </ul>
                </div>

                <div className="prose prose-stone max-w-none text-sm leading-loose">
                    <h4 className="font-bold text-stone-900 text-base mb-2">What if my item is damaged or faulty?</h4>
                    <p className="text-stone-600">I offer a 10-day replacement guarantee for faulty or damaged pieces (starts from postage date). Contact me ASAP to arrange a replacement. Return postage is the buyer’s responsibility unless otherwise agreed. Once the item is returned, I’ll send your replacement.</p>
                </div>

                <div className="prose prose-stone max-w-none text-sm leading-loose">
                    <h4 className="font-bold text-stone-900 text-base mb-2">What if I received the piece as a gift?</h4>
                    <p className="text-stone-600">Refunds can only be issued to the original purchaser. However, if you’d like to exchange a gift for another piece, contact me within 30 days of the original purchase. Exchanges incur standard shipping costs. Get in touch via the Contact page, email (lynettetiltart@outlook.com), or Instagram DM.</p>
                </div>
            </div>
        </section>

        {/* COACHING + SERVICES */}
        <section>
            <h3 className="text-2xl font-serif text-stone-900 mb-8 border-b border-stone-200 pb-3">Coaching + Services</h3>
             <div className="space-y-8">
                <div className="prose prose-stone max-w-none text-sm leading-loose">
                    <h4 className="font-bold text-stone-900 text-base mb-2">Do you offer coaching?</h4>
                    <p className="text-stone-600">Yes. I offer private coaching focused on mindset, strategy, and intentional growth for artists, creatives, and business owners. Sessions are tailored, strategic, and action-oriented.</p>
                    <p className="text-stone-600 mt-2"><em className="text-clay">Coaching is by application only.</em> Use the Contact page and select “coaching” to apply.</p>
                </div>

                <div className="prose prose-stone max-w-none text-sm leading-loose">
                    <h4 className="font-bold text-stone-900 text-base mb-2">Can I book you to speak or present to my group, business, or event?</h4>
                    <p className="text-stone-600">Yes. I speak on topics like creativity, clarity, identity, business, mindset, and personal leadership. Available for panels, workshops, podcasts, and private events. Applications welcome from both creative and non-creative industries. To apply, please reach out via the Contact page with your event details.</p>
                </div>

                 <div className="prose prose-stone max-w-none text-sm leading-loose">
                    <h4 className="font-bold text-stone-900 text-base mb-2">Do you run workshops for schools (Years 7–12)?</h4>
                    <p className="text-stone-600">Yes. I design custom student workshops that combine creative making with mindset, communication, and personal development tools. Ideal for enrichment days, leadership programs, or curriculum-linked experiences. Delivered in person or virtually. Enquiries are welcome from schools, art educators, or wellbeing coordinators—use the Contact page to apply.</p>
                </div>
             </div>
        </section>

        {/* OTHER */}
        <section className="bg-stone-900 text-stone-300 p-8 text-center mt-12">
             <h4 className="font-serif text-white text-xl mb-4">Other Questions?</h4>
             <p className="text-sm mb-0">Reach out anytime through the Contact page, via email. I aim to respond within 3–5 business days.</p>
        </section>

      </div>
    </div>
  );
};

export default FAQ;