import React, { useState, useEffect } from 'react';
import SectionHeading from '../components/SectionHeading';
import { Mail, MapPin, Clock, Loader2 } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { API_BASE } from '../config/api';

const Contact = () => {
  const { settings } = useSettings();
  const { contact } = settings;
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: 'General Inquiry', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { document.title = 'Contact | Lyne Tilt'; }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send message');
      }

      setSubmitted(true);
      setFormData({ name: '', email: '', phone: '', subject: 'General Inquiry', message: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-32 pb-20 px-6 bg-white min-h-screen animate-fade-in-up relative overflow-hidden">
      {/* Background Lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Vertical Lines */}
        <div className="absolute top-0 left-1/4 h-full w-px bg-stone-200/50"></div>
        <div className="absolute top-0 left-1/2 h-full w-px bg-stone-200/30"></div>
        <div className="absolute top-0 right-1/4 h-full w-px bg-stone-200/50"></div>

        {/* Diagonal Lines */}
        <div className="absolute top-[15%] -left-[10%] w-[120%] h-px bg-stone-200/40 rotate-6"></div>
        <div className="absolute top-[70%] -left-[10%] w-[120%] h-px bg-stone-200/30 -rotate-3"></div>

        {/* Circles */}
        <div className="absolute -top-32 -right-32 w-96 h-96 border border-stone-200/30 rounded-full"></div>
        <div className="absolute -bottom-48 -left-24 w-80 h-80 border border-stone-200/20 rounded-full"></div>
      </div>

      <div className="relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500 mb-4">{contact.header.subtitle}</p>
          <h1 className="text-2xl md:text-4xl font-serif text-clay mb-4 leading-tight">
            {contact.header.title}
          </h1>
          <div className="h-px w-12 bg-stone-900 mx-auto"></div>
        </div>

      <div className="max-w-6xl mx-auto">

        {/* Contact Info - Horizontal Row */}
        <div className="flex flex-wrap justify-center items-start gap-8 md:gap-16 mb-12 pb-8 border-b border-stone-200 pt-4">
          <div className="flex flex-col items-center text-center">
            <Mail className="text-clay mb-3" size={24} />
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-900 mb-1">Email</h4>
            <a href={`mailto:${contact.info.email}`} className="text-stone-600 hover:text-clay transition-colors text-sm">{contact.info.email}</a>
          </div>
          <div className="flex flex-col items-center text-center">
            <MapPin className="text-clay mb-3" size={24} />
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-900 mb-1">Studio</h4>
            <p className="text-stone-600 text-sm">{contact.info.location}</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <Clock className="text-clay mb-3" size={24} />
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-900 mb-1">Response Time</h4>
            <p className="text-stone-600 text-sm">3-5 business days</p>
          </div>
        </div>

        {/* Intro Message + Form Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

          {/* Personal Message Column */}
          <div className="bg-stone-100 border border-stone-200 shadow-sm p-8">
            <h3 className="font-serif text-2xl text-stone-900 mb-6">{contact.welcomeMessage.title}</h3>
            <div className="text-stone-600 leading-relaxed space-y-4">
              {(contact.welcomeMessage.paragraphs.length > 0 ? contact.welcomeMessage.paragraphs : [
                "If you've landed here, you're probably ready for something to shift. Maybe a new creative direction, more clarity in your work, or just a conversation about what's possible.",
                "Use this space to tell me a little about why you're here. It might be to book your free 15-minute strategy session, ask about a workshop, or invite me to speak at your event or with your team. Or maybe it's something completely different.",
                "Whatever it is, I can't wait to hear from you and see where it leads."
              ]).map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
              <p className="font-serif text-stone-800 italic pt-2">
                Lyne.
              </p>
            </div>
          </div>

          {/* Form Column */}
          <div>
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
            <div className="bg-stone-100 border border-stone-200 shadow-sm p-8">
              <h3 className="font-serif text-xl text-stone-900 mb-6">Send a Message</h3>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-stone-500">Name</label>
                    <input
                      type="text"
                      id="name"
                      required
                      className="w-full border border-stone-200 bg-white px-4 py-3 focus:border-stone-400 focus:outline-none transition-colors"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-stone-500">Email</label>
                    <input
                      type="email"
                      id="email"
                      required
                      className="w-full border border-stone-200 bg-white px-4 py-3 focus:border-stone-400 focus:outline-none transition-colors"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label htmlFor="phone" className="text-xs font-bold uppercase tracking-widest text-stone-500">Phone <span className="text-stone-400 normal-case">(optional)</span></label>
                    <input
                      type="tel"
                      id="phone"
                      className="w-full border border-stone-200 bg-white px-4 py-3 focus:border-stone-400 focus:outline-none transition-colors"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="subject" className="text-xs font-bold uppercase tracking-widest text-stone-500">Subject</label>
                    <select
                      id="subject"
                      className="w-full border border-stone-200 bg-white px-4 py-3 focus:border-stone-400 focus:outline-none transition-colors text-stone-800"
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    >
                      {(contact.formSubjects.length > 0 ? contact.formSubjects : [
                        "General Inquiry",
                        "Coaching & Mentoring",
                        "Workshops & Courses",
                        "Speaking & Events",
                        "Order Support"
                      ]).map((subject, idx) => (
                        <option key={idx}>{subject}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                    <label htmlFor="message" className="text-xs font-bold uppercase tracking-widest text-stone-500">Message</label>
                    <textarea
                      id="message"
                      required
                      rows={5}
                      className="w-full border border-stone-200 bg-white px-4 py-3 focus:border-stone-400 focus:outline-none transition-colors resize-none"
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                    ></textarea>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-stone-900 text-white px-8 py-3 uppercase tracking-[0.2em] text-xs font-bold hover:bg-clay transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Message'
                  )}
                </button>
              </form>
            </div>
          )}
          </div>

        </div>
      </div>
      </div>
    </div>
  );
};

export default Contact;
