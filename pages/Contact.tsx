
import React, { useState, useEffect } from 'react';
import SectionHeading from '../components/SectionHeading';
import { Mail, MapPin, Clock } from 'lucide-react';

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', subject: 'General Inquiry', message: '' });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API call
    setTimeout(() => setSubmitted(true), 500);
  };

  return (
    <div className="pt-32 pb-20 px-6 bg-white min-h-screen animate-fade-in-up">
      <SectionHeading title="Contact" subtitle="Start a conversation." />
      
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-16">
        
        {/* Info Column */}
        <div className="md:col-span-5 space-y-10">
          <div>
            <h3 className="font-serif text-2xl text-stone-900 mb-6">Get in Touch</h3>
            <p className="text-stone-600 leading-loose text-sm">
              Whether you’re looking to book a coaching session, enquire about a custom piece, or simply want to say hello, I’d love to hear from you.
            </p>
          </div>

          <div className="space-y-6">
             <div className="flex items-start gap-4">
                <Mail className="text-clay mt-1" size={20} />
                <div>
                   <h4 className="text-xs font-bold uppercase tracking-widest text-stone-900 mb-1">Email</h4>
                   <a href="mailto:lynettetiltart@outlook.com" className="text-stone-600 hover:text-clay transition-colors">lynettetiltart@outlook.com</a>
                </div>
             </div>
             <div className="flex items-start gap-4">
                <MapPin className="text-clay mt-1" size={20} />
                <div>
                   <h4 className="text-xs font-bold uppercase tracking-widest text-stone-900 mb-1">Studio</h4>
                   <p className="text-stone-600">Brisbane, Australia</p>
                </div>
             </div>
             <div className="flex items-start gap-4">
                <Clock className="text-clay mt-1" size={20} />
                <div>
                   <h4 className="text-xs font-bold uppercase tracking-widest text-stone-900 mb-1">Response Time</h4>
                   <p className="text-stone-600 text-sm">I aim to respond to all inquiries within 3-5 business days.</p>
                </div>
             </div>
          </div>

          <div className="bg-stone-50 p-8 border-l-2 border-stone-900">
             <h4 className="font-serif text-lg text-stone-900 mb-2">Coaching Applications</h4>
             <p className="text-sm text-stone-600 leading-relaxed">
               Ready to book a discovery call? Please select "Coaching Application" in the subject line and tell me a little about your current creative challenge.
             </p>
          </div>
        </div>

        {/* Form Column */}
        <div className="md:col-span-7">
          {submitted ? (
             <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-stone-50 border border-stone-200 animate-fade-in">
                <div className="w-16 h-16 bg-clay/10 text-clay rounded-full flex items-center justify-center mb-6">
                  <Mail size={32} />
                </div>
                <h3 className="font-serif text-3xl text-stone-900 mb-4">Message Sent</h3>
                <p className="text-stone-600 max-w-md">Thank you for reaching out. Your message has been received and I will be in touch shortly.</p>
                <button 
                  onClick={() => setSubmitted(false)} 
                  className="mt-8 text-xs uppercase tracking-widest font-bold text-stone-900 hover:text-clay border-b border-stone-900 pb-1"
                >
                  Send Another Message
                </button>
             </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-stone-500">Name</label>
                  <input 
                    type="text" 
                    id="name" 
                    required
                    className="w-full border-b border-stone-300 py-3 focus:border-stone-900 focus:outline-none transition-colors bg-transparent"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-stone-500">Email</label>
                  <input 
                    type="email" 
                    id="email" 
                    required
                    className="w-full border-b border-stone-300 py-3 focus:border-stone-900 focus:outline-none transition-colors bg-transparent"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                  <label htmlFor="subject" className="text-xs font-bold uppercase tracking-widest text-stone-500">Subject</label>
                  <select 
                    id="subject" 
                    className="w-full border-b border-stone-300 py-3 focus:border-stone-900 focus:outline-none transition-colors bg-transparent text-stone-800"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  >
                    <option>General Inquiry</option>
                    <option>Coaching Application</option>
                    <option>Wholesale / Stockist</option>
                    <option>Speaking Request</option>
                    <option>Order Support</option>
                  </select>
              </div>

              <div className="space-y-2">
                  <label htmlFor="message" className="text-xs font-bold uppercase tracking-widest text-stone-500">Message</label>
                  <textarea 
                    id="message" 
                    required
                    rows={6}
                    className="w-full border border-stone-300 p-4 focus:border-stone-900 focus:outline-none transition-colors bg-stone-50 resize-none mt-2"
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                  ></textarea>
              </div>

              <button type="submit" className="bg-stone-900 text-white px-10 py-4 uppercase tracking-[0.2em] text-xs font-bold hover:bg-clay transition-colors w-full md:w-auto">
                Send Message
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Contact;
