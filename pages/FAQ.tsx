import React from 'react';
import SectionHeading from '../components/SectionHeading';
import { FAQS } from '../constants';

const FAQ = () => {
  return (
    <div className="pt-32 pb-20 px-6 max-w-4xl mx-auto">
      <SectionHeading title="Frequently Asked Questions" />
      
      <div className="space-y-12">
        {['Shop', 'Coaching'].map(category => (
            <div key={category}>
                <h3 className="text-2xl font-serif text-stone-800 mb-6 border-b border-stone-200 pb-2">{category}</h3>
                <div className="space-y-6">
                    {FAQS.filter(f => f.category === category).map((item, idx) => (
                        <div key={idx} className="bg-stone-50 p-6 rounded-sm">
                            <h4 className="font-bold text-stone-900 mb-3">{item.question}</h4>
                            <p className="text-stone-600 text-sm leading-relaxed">{item.answer}</p>
                        </div>
                    ))}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default FAQ;