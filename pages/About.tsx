import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Feather, Users, MapPin } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const About = () => {
  const { settings } = useSettings();
  const { about } = settings;

  useEffect(() => { document.title = 'About | Lyne Tilt'; }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="pt-32 pb-20 bg-[#FAFAF9] min-h-screen relative overflow-hidden">
      {/* Background Lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 h-full w-px bg-stone-200/50"></div>
        <div className="absolute top-0 left-1/2 h-full w-px bg-stone-200/30"></div>
        <div className="absolute top-0 right-1/4 h-full w-px bg-stone-200/50"></div>
        <div className="absolute top-[20%] -left-[10%] w-[120%] h-px bg-stone-200/40 rotate-6"></div>
        <div className="absolute top-[50%] -left-[10%] w-[120%] h-px bg-stone-200/30 -rotate-3"></div>
        <div className="absolute top-[80%] -left-[10%] w-[120%] h-px bg-stone-200/40 rotate-3"></div>
        <div className="absolute -top-32 -right-32 w-96 h-96 border border-stone-200/30 rounded-full"></div>
        <div className="absolute top-[40%] -left-24 w-80 h-80 border border-stone-200/20 rounded-full"></div>
      </div>

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        {/* Page Header */}
        <div className="mb-16 text-center animate-fade-in-up">
           <h1 className="text-4xl md:text-5xl font-serif text-stone-900 mb-4">{about.header.title}</h1>
           <p className="text-lg text-stone-500 max-w-xl mx-auto mb-6">
             {about.header.subtitle}
           </p>
           <div className="flex items-center justify-center gap-2 text-sm text-stone-400">
             <MapPin size={14} />
             <span>{about.header.location}</span>
           </div>
        </div>

        {/* Section 1: Philosophy - Image & Text Layout */}
        <div className="relative flex flex-col md:flex-row items-start gap-12 mb-24">
          
          {/* Image Section */}
          <div className="w-full md:w-5/12 relative z-10 animate-fade-in-up delay-100 sticky top-32">
             <div className="relative aspect-[3/4] w-full shadow-xl shadow-stone-200 image-zoom-container">
                <img
                  src={about.heroImage || "https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/a2b24cba-294f-4e4f-b4a6-ebaa1b285607/IMG_4502+copy.jpg?format=300w"}
                  alt="Lyne Tilt"
                  className="w-full h-full object-cover transition-all duration-1000 ease-out image-zoom"
                />
                <div className="absolute inset-0 border-[1px] border-white/20 pointer-events-none"></div>
             </div>
             <div className="absolute -z-10 -bottom-6 -left-6 w-full h-full border border-stone-300/60 hidden md:block"></div>
          </div>

          {/* Philosophy Content */}
          <div className="w-full md:w-7/12 relative z-20 animate-fade-in-up delay-200">
            <p className="font-serif italic text-2xl text-clay mb-8 leading-relaxed">
              "{about.philosophy.quote}"
            </p>

            <div className="space-y-6 text-stone-600 leading-relaxed">
              {about.philosophy.paragraphs.map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: How I Show Up */}
        <div className="mb-24 animate-fade-in-up delay-300">
          <h2 className="text-center font-serif text-2xl text-stone-900 mb-10">How I Show Up</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {about.howIShowUp.cards.length > 0 ? (
               about.howIShowUp.cards.map((card, idx) => {
                 const icons = [<Feather className="text-clay mb-4" size={28} />, <Sparkles className="text-stone-600 mb-4" size={28} />, <Users className="text-clay mb-4" size={28} />];
                 const styles = [
                   { bg: 'bg-stone-900', text: 'text-stone-200', hover: 'hover:bg-stone-800', titleColor: 'text-white', descColor: 'text-stone-400', linkColor: 'text-clay' },
                   { bg: 'bg-stone-100', text: 'text-stone-800', hover: 'hover:bg-stone-200', titleColor: '', descColor: 'text-stone-600', linkColor: 'text-stone-500' },
                   { bg: 'bg-white border border-stone-200', text: 'text-stone-800', hover: 'hover:border-clay', titleColor: '', descColor: 'text-stone-600', linkColor: 'text-clay' }
                 ];
                 const style = styles[idx] || styles[0];
                 return (
                   <Link key={idx} to={card.linkUrl} className={`group ${style.bg} ${style.text} p-8 flex flex-col items-center text-center ${style.hover} transition-colors`}>
                     {icons[idx]}
                     <h3 className={`font-serif text-xl mb-3 ${style.titleColor}`}>{card.title}</h3>
                     <p className={`text-sm leading-relaxed ${style.descColor} mb-4`}>{card.description}</p>
                     <span className={`text-xs ${style.linkColor} uppercase tracking-widest group-hover:underline`}>{card.linkText} →</span>
                   </Link>
                 );
               })
             ) : (
               <>
                 <Link to="/shop" className="group bg-stone-900 text-stone-200 p-8 flex flex-col items-center text-center hover:bg-stone-800 transition-colors">
                    <Feather className="text-clay mb-4" size={28} />
                    <h3 className="font-serif text-xl mb-3 text-white">As a Maker</h3>
                    <p className="text-sm leading-relaxed text-stone-400 mb-4">Wearable art that anchors you into something bold and personal.</p>
                    <span className="text-xs text-clay uppercase tracking-widest group-hover:underline">Shop Collection →</span>
                 </Link>
                 <Link to="/learn" className="group bg-stone-100 text-stone-800 p-8 flex flex-col items-center text-center hover:bg-stone-200 transition-colors">
                    <Sparkles className="text-stone-600 mb-4" size={28} />
                    <h3 className="font-serif text-xl mb-3">As an Educator</h3>
                    <p className="text-sm leading-relaxed text-stone-600 mb-4">Workshops that engage your mindset, capacity, and creative identity.</p>
                    <span className="text-xs text-stone-500 uppercase tracking-widest group-hover:underline">View Workshops →</span>
                 </Link>
                 <Link to="/coaching" className="group bg-white border border-stone-200 text-stone-800 p-8 flex flex-col items-center text-center hover:border-clay transition-colors">
                    <Users className="text-clay mb-4" size={28} />
                    <h3 className="font-serif text-xl mb-3">As a Coach</h3>
                    <p className="text-sm leading-relaxed text-stone-600 mb-4">Strategic guidance to move through what's holding you back.</p>
                    <span className="text-xs text-clay uppercase tracking-widest group-hover:underline">Learn More →</span>
                 </Link>
               </>
             )}
          </div>
        </div>

        {/* Section 3: The Journey */}
        <div className="mb-24 animate-fade-in-up">
          <h2 className="text-center font-serif text-2xl text-stone-900 mb-4">{about.journey.title}</h2>
          <p className="text-center text-stone-500 mb-12 max-w-2xl mx-auto" dangerouslySetInnerHTML={{ __html: about.journey.description }} />

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {(about.journey.stats.length > 0 ? about.journey.stats : [
              { value: "20+", label: "Years in Education" },
              { value: "200+", label: "Creatives Coached" },
              { value: "2500+", label: "Students Taught" },
              { value: "5+", label: "Disciplines" }
            ]).map((stat, idx) => (
              <div key={idx} className="text-center p-6 bg-white border border-stone-100">
                <p className="font-serif text-3xl text-clay mb-1">{stat.value}</p>
                <p className="text-xs uppercase tracking-widest text-stone-400">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Credentials */}
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-wrap justify-center gap-3">
              {(about.journey.credentials.length > 0 ? about.journey.credentials : ["Fine Art", "Education (Hons)", "ICF-Eligible Coach", "Nutrition Coach", "Creative Strategy", "Founder, Studio on Brunswick"]).map((cred, idx) => (
                <span key={idx} className="px-4 py-2 bg-stone-100 text-stone-600 text-xs uppercase tracking-widest">
                  {cred}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Section 4: Who This Is For */}
        <div className="mb-24 border-t border-stone-200 pt-16">
          <h2 className="text-center font-serif text-2xl text-stone-900 mb-4">{about.whoThisIsFor.title}</h2>
          <p className="text-center text-stone-500 mb-10 max-w-xl mx-auto">
            {about.whoThisIsFor.subtitle}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {(about.whoThisIsFor.items.length > 0 ? about.whoThisIsFor.items : [
              "Artists gathering the courage to share their work publicly or build a consistent practice",
              "Creatives already in motion but ready for more visibility, traction, or a clearer message",
              "Business owners ready to move from vague marketing into strategic, values-aligned growth"
            ]).map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-5 bg-white border border-stone-100 text-stone-700">
                <div className="w-2 h-2 bg-clay rounded-full shrink-0"></div>
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: CTA */}
        <div className="bg-stone-900 p-12 md:p-16 text-center relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="font-serif text-2xl md:text-3xl text-white mb-4">{about.cta.title}</h2>
              <p className="text-stone-400 mb-8">
                {about.cta.description}
              </p>
              <Link to={about.cta.buttonUrl} className="inline-block bg-clay text-white px-10 py-4 uppercase tracking-widest text-xs font-bold hover:bg-white hover:text-stone-900 transition-colors">
                {about.cta.buttonText}
              </Link>
            </div>
            {/* Decorative Abstract Shapes */}
            <div className="absolute top-[-30%] left-[-5%] w-64 h-64 rounded-full border border-stone-700 opacity-30 pointer-events-none"></div>
            <div className="absolute bottom-[-30%] right-[-5%] w-64 h-64 rounded-full border border-stone-700 opacity-30 pointer-events-none"></div>
        </div>
      </div>
    </div>
  );
};

export default About;