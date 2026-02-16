import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
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
        <div className="absolute -top-32 -right-32 w-96 h-96 border border-stone-200/30 rounded-full"></div>
        <div className="absolute top-[40%] -left-24 w-80 h-80 border border-stone-200/20 rounded-full"></div>
      </div>

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        {/* Page Header */}
        <div className="mb-10 text-center animate-fade-in-up">
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
        <div className="relative flex flex-col md:flex-row items-start gap-6 md:gap-12 mb-16 md:mb-24">

          {/* Image Section */}
          <div className="w-full md:w-5/12 relative z-10 animate-fade-in-up delay-100 md:sticky md:top-32 flex justify-center">
             <div className="relative aspect-[3/4] w-full max-w-[280px] md:max-w-none shadow-xl shadow-stone-200 image-zoom-container rounded-3xl overflow-hidden">
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
          <div className="w-full md:w-7/12 relative z-20 animate-fade-in-up delay-200 text-center md:text-left">
            <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400 mb-4">My Philosophy</p>
            <h2 className="font-serif text-3xl text-stone-900 mb-8">Art is oxygen. Clarity is power.</h2>

            <div className="space-y-5 text-stone-600 leading-relaxed text-[15px]">
              {about.philosophy.paragraphs.map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="flex justify-center mb-16">
          <div className="w-px h-20 bg-stone-300" />
        </div>

        {/* Section 2: I Make. I Teach. I Coach. */}
        <div className="mb-24 animate-fade-in-up">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl text-clay mb-3">I Make. I Teach. I Coach.</h2>
            <p className="text-stone-500 max-w-xl mx-auto text-[15px]">
              You can engage with me in different ways, but it's all anchored in the same belief: you don't need more fluff. You need clarity, direction, and space to decide who you're becoming.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {about.howIShowUp.cards.length > 0 ? (
              about.howIShowUp.cards.map((card, idx) => {
                const styles = [
                  'bg-white border border-stone-200 hover:border-clay',
                  'bg-white border border-stone-200 hover:border-clay',
                  'bg-white border border-stone-200 hover:border-clay'
                ];
                return (
                  <Link key={idx} to={card.linkUrl} className={`group ${styles[idx] || styles[0]} p-5 md:p-8 flex flex-col items-center text-center transition-all duration-300`}>
                    <h3 className="font-serif text-xl text-stone-900 mb-2 md:mb-3">{card.title}</h3>
                    <p className="text-sm leading-relaxed text-stone-500 mb-3 md:mb-6 flex-grow">{card.description}</p>
                    <span className="text-[10px] text-stone-900 uppercase tracking-[0.2em] font-bold group-hover:text-clay transition-colors inline-flex items-center gap-2">
                      {card.linkText} <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Link>
                );
              })
            ) : (
              <>
                <Link to="/shop" className="group bg-white border border-stone-200 p-5 md:p-8 flex flex-col items-center text-center hover:border-clay transition-all duration-300">
                  <h3 className="font-serif text-xl text-stone-900 mb-2 md:mb-3">As a Maker</h3>
                  <p className="text-sm leading-relaxed text-stone-500 mb-3 md:mb-6 flex-grow">
                    If you wear my jewellery or collect my art, you're not just choosing beauty. You're anchoring into something bold and personal.
                  </p>
                  <span className="text-[10px] text-stone-900 uppercase tracking-[0.2em] font-bold group-hover:text-clay transition-colors inline-flex items-center gap-2">
                    Shop Collection <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
                <Link to="/learn" className="group bg-white border border-stone-200 p-5 md:p-8 flex flex-col items-center text-center hover:border-clay transition-all duration-300">
                  <h3 className="font-serif text-xl text-stone-900 mb-2 md:mb-3">As an Educator</h3>
                  <p className="text-sm leading-relaxed text-stone-500 mb-3 md:mb-6 flex-grow">
                    If you attend one of my classes or workshops, you're not just learning a skill. You're engaging with your mindset, your capacity, and your creative identity.
                  </p>
                  <span className="text-[10px] text-stone-900 uppercase tracking-[0.2em] font-bold group-hover:text-clay transition-colors inline-flex items-center gap-2">
                    View Workshops <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
                <Link to="/coaching" className="group bg-white border border-stone-200 p-5 md:p-8 flex flex-col items-center text-center hover:border-clay transition-all duration-300">
                  <h3 className="font-serif text-xl text-stone-900 mb-2 md:mb-3">As a Coach</h3>
                  <p className="text-sm leading-relaxed text-stone-500 mb-3 md:mb-6 flex-grow">
                    If you work with me as a coach, we'll get to the heart of what's holding you back and build the strategy and structure to move through it.
                  </p>
                  <span className="text-[10px] text-stone-900 uppercase tracking-[0.2em] font-bold group-hover:text-clay transition-colors inline-flex items-center gap-2">
                    Learn More <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              </>
            )}
          </div>

          <p className="text-center text-stone-400 text-sm mt-8 max-w-2xl mx-auto italic">
            This isn't therapy. It's not "woo." It's mindset and creative strategy with real-world application, delivered by someone who has led thousands of people across decades in education, business, and the creative industries.
          </p>
        </div>

        {/* Section 3: What I Believe */}
        <div className="mb-24 animate-fade-in-up -mx-6">
          <div className="relative bg-stone-900 py-10 md:py-12 px-6 overflow-hidden rounded-2xl mx-6">
            {/* Decorative circles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.12]">
              <div className="absolute -top-16 -left-8 w-64 h-64 border border-white rounded-full"></div>
              <div className="absolute top-1/2 -translate-y-1/2 -right-20 w-80 h-80 border border-white rounded-full"></div>
              <div className="absolute -bottom-12 left-1/3 w-48 h-48 border border-white rounded-full"></div>
              <div className="absolute top-8 left-[20%] w-36 h-36 border border-white rounded-full"></div>
              <div className="absolute -top-6 right-[15%] w-52 h-52 border border-white rounded-full"></div>
              <div className="absolute bottom-6 right-[35%] w-28 h-28 border border-white rounded-full"></div>
              <div className="absolute top-[60%] -left-12 w-44 h-44 border border-white rounded-full"></div>
              <div className="absolute -bottom-20 right-[10%] w-72 h-72 border border-white rounded-full"></div>
            </div>

            <div className="relative z-10 max-w-4xl mx-auto">
              <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500 text-center mb-3">What I Believe</p>
              <h2 className="text-center font-serif text-3xl md:text-4xl text-white mb-8">The ideas that shape everything I do.</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="relative text-center bg-transparent border border-white/20 rounded-xl p-6">
                  <div className="w-10 h-[2px] bg-clay mx-auto mb-4"></div>
                  <h3 className="font-serif text-xl text-white mb-4">Art is oxygen.</h3>
                  <p className="text-sm text-stone-400 leading-relaxed">
                    It keeps us connected to what matters. It reminds us that we are not just here to survive. We're here to express, to lead, to build.
                  </p>
                </div>
                <div className="relative text-center bg-transparent border border-white/20 rounded-xl p-6">
                  <div className="w-10 h-[2px] bg-clay mx-auto mb-4"></div>
                  <h3 className="font-serif text-xl text-white mb-4">Clarity is power.</h3>
                  <p className="text-sm text-stone-400 leading-relaxed">
                    When you know what you stand for, what you want, and how you work best, everything changes. Communication improves. Business improves. Energy improves.
                  </p>
                </div>
                <div className="relative text-center bg-transparent border border-white/20 rounded-xl p-6">
                  <div className="w-10 h-[2px] bg-clay mx-auto mb-4"></div>
                  <h3 className="font-serif text-xl text-white mb-4">You don't have to start from scratch.</h3>
                  <p className="text-sm text-stone-400 leading-relaxed">
                    You don't need to become someone else. You need to get honest about what's next and take action that fits.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: The Journey / Stats */}
        <div className="mb-24 animate-fade-in-up">

          {/* Brick Wall Graphic - above heading on mobile */}
          <div className="flex justify-center mb-6 md:hidden">
            <svg width="200" height="90" viewBox="0 0 200 90" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Row 5 (bottom) - 4 bricks */}
              <rect x="10" y="72" width="42" height="14" rx="1.5" className="fill-stone-200/80 stroke-stone-300" strokeWidth="0.8" />
              <rect x="56" y="72" width="42" height="14" rx="1.5" className="fill-stone-200/80 stroke-stone-300" strokeWidth="0.8" />
              <rect x="102" y="72" width="42" height="14" rx="1.5" className="fill-stone-200/80 stroke-stone-300" strokeWidth="0.8" />
              <rect x="148" y="72" width="42" height="14" rx="1.5" className="fill-stone-200/80 stroke-stone-300" strokeWidth="0.8" />
              {/* Row 4 - 3 bricks offset */}
              <rect x="32" y="55" width="42" height="14" rx="1.5" className="fill-stone-200/60 stroke-stone-300" strokeWidth="0.8" />
              <rect x="78" y="55" width="42" height="14" rx="1.5" className="fill-stone-200/60 stroke-stone-300" strokeWidth="0.8" />
              <rect x="124" y="55" width="42" height="14" rx="1.5" className="fill-stone-200/60 stroke-stone-300" strokeWidth="0.8" />
              {/* Row 3 - 3 bricks */}
              <rect x="44" y="38" width="42" height="14" rx="1.5" className="fill-stone-300/40 stroke-stone-300" strokeWidth="0.8" />
              <rect x="90" y="38" width="42" height="14" rx="1.5" className="fill-clay/10 stroke-clay/30" strokeWidth="0.8" />
              <rect x="136" y="38" width="24" height="14" rx="1.5" className="fill-stone-300/40 stroke-stone-300" strokeWidth="0.8" />
              {/* Row 2 - 2 bricks */}
              <rect x="58" y="21" width="42" height="14" rx="1.5" className="fill-clay/10 stroke-clay/30" strokeWidth="0.8" />
              <rect x="104" y="21" width="42" height="14" rx="1.5" className="fill-clay/15 stroke-clay/30" strokeWidth="0.8" />
              {/* Row 1 (top) - 1 brick */}
              <rect x="80" y="4" width="42" height="14" rx="1.5" className="fill-clay/20 stroke-clay/40" strokeWidth="0.8" />
            </svg>
          </div>

          <h2 className="text-center font-serif text-2xl text-stone-900 mb-4">{about.journey.title}</h2>
          <p className="text-center text-stone-500 mb-10 max-w-2xl mx-auto text-sm" dangerouslySetInnerHTML={{ __html: about.journey.description }} />

          {/* Brick Wall Graphic - between heading and stats on desktop */}
          <div className="hidden md:flex justify-center mb-10">
            <svg width="320" height="100" viewBox="0 0 320 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Row 5 (bottom) - 5 bricks */}
              <rect x="18" y="80" width="52" height="16" rx="2" className="fill-stone-200/80 stroke-stone-300" strokeWidth="0.8" />
              <rect x="74" y="80" width="52" height="16" rx="2" className="fill-stone-200/80 stroke-stone-300" strokeWidth="0.8" />
              <rect x="130" y="80" width="52" height="16" rx="2" className="fill-stone-200/80 stroke-stone-300" strokeWidth="0.8" />
              <rect x="186" y="80" width="52" height="16" rx="2" className="fill-stone-200/80 stroke-stone-300" strokeWidth="0.8" />
              <rect x="242" y="80" width="52" height="16" rx="2" className="fill-stone-200/80 stroke-stone-300" strokeWidth="0.8" />
              {/* Row 4 - 4 bricks offset */}
              <rect x="46" y="61" width="52" height="16" rx="2" className="fill-stone-200/60 stroke-stone-300" strokeWidth="0.8" />
              <rect x="102" y="61" width="52" height="16" rx="2" className="fill-stone-200/60 stroke-stone-300" strokeWidth="0.8" />
              <rect x="158" y="61" width="52" height="16" rx="2" className="fill-stone-200/60 stroke-stone-300" strokeWidth="0.8" />
              <rect x="214" y="61" width="52" height="16" rx="2" className="fill-stone-200/60 stroke-stone-300" strokeWidth="0.8" />
              {/* Row 3 - 3 bricks */}
              <rect x="74" y="42" width="52" height="16" rx="2" className="fill-stone-300/40 stroke-stone-300" strokeWidth="0.8" />
              <rect x="130" y="42" width="52" height="16" rx="2" className="fill-clay/10 stroke-clay/30" strokeWidth="0.8" />
              <rect x="186" y="42" width="52" height="16" rx="2" className="fill-stone-300/40 stroke-stone-300" strokeWidth="0.8" />
              {/* Row 2 - 2 bricks */}
              <rect x="102" y="23" width="52" height="16" rx="2" className="fill-clay/10 stroke-clay/30" strokeWidth="0.8" />
              <rect x="158" y="23" width="52" height="16" rx="2" className="fill-clay/15 stroke-clay/30" strokeWidth="0.8" />
              {/* Row 1 (top) - 1 brick */}
              <rect x="130" y="4" width="52" height="16" rx="2" className="fill-clay/20 stroke-clay/40" strokeWidth="0.8" />
            </svg>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-12">
            {(about.journey.stats.length > 0 ? about.journey.stats : [
              { value: "20+", label: "Years in Education" },
              { value: "200+", label: "Creatives Coached" },
              { value: "2500+", label: "Students Taught" },
              { value: "5+", label: "Disciplines" }
            ]).map((stat, idx) => (
              <div key={idx} className="text-center p-4 md:p-6 bg-white border border-stone-100">
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

        {/* Section 5: Who I Work With */}
        <div className="mb-24 pt-16 max-w-4xl mx-auto">
          <div className="w-10 h-[2px] bg-clay mx-auto mb-8"></div>
          <div className="text-center mb-10">
            <h2 className="font-serif text-3xl text-stone-900 mb-4">{about.whoThisIsFor.title}</h2>
            <p className="text-stone-500 text-[15px] leading-relaxed mb-4 max-w-xl mx-auto">
              I work with people who are ready to stop circling and start building.
            </p>
            <p className="text-stone-400 text-sm leading-relaxed italic max-w-xl mx-auto">
              You don't have to be an artist. You just have to be ready to think and act more consciously and show up for the version of you you've been holding back.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-md md:max-w-none mx-auto">
            {(about.whoThisIsFor.items.length > 0 ? about.whoThisIsFor.items : [
              "People starting or returning to a creative practice after a long break",
              "People creating or refining businesses that reflect their values",
              "People ready to stop playing small in life, work, or leadership"
            ]).map((item, i) => (
              <div key={i} className="group flex flex-col items-center text-center gap-2 px-6 py-3 bg-white border border-stone-200 rounded-xl hover:border-clay/30 hover:shadow-md transition-all duration-300">
                <span className="flex items-center justify-center w-9 h-9 rounded-full bg-clay/10 text-clay font-serif text-base shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-stone-700 leading-relaxed">{item}</span>
              </div>
            ))}
          </div>

          {/* Permission Slip */}
          <div className="text-center mt-10">
            <p className="font-serif text-xl md:text-2xl text-stone-900 leading-relaxed mb-6">
              Buy the art. Make the thing. Take the class. Ask for what you want.
            </p>
            <p className="text-stone-500 text-[15px] mb-2">
              This is your permission slip, but you never really needed one.
            </p>
            <p className="font-serif italic text-clay text-lg">
              You're allowed to live a life that breathes.
            </p>
          </div>
        </div>

        {/* Section 7: CTA */}
        <div className="bg-stone-900 px-8 py-8 md:px-12 md:py-8 text-center relative overflow-hidden rounded-2xl">
            <div className="relative z-10">
              <h2 className="font-serif text-xl md:text-2xl text-white mb-2">Ready to Take the Next Step?</h2>
              <p className="text-stone-400 mb-5 max-w-lg mx-auto text-sm">
                Whether you want to explore working with Lyne, attend an upcoming workshop, or commission a piece that speaks to your story, there's a place to begin.
              </p>
              <Link to={about.cta.buttonUrl} className="inline-flex items-center gap-2 bg-clay text-white px-8 py-3 uppercase tracking-widest text-xs font-bold hover:bg-white hover:text-stone-900 transition-colors rounded-full">
                {about.cta.buttonText}
                <ArrowRight size={12} />
              </Link>
            </div>
            {/* Decorative circles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.07]">
              <div className="absolute -top-20 -left-10 w-72 h-72 border border-white rounded-full"></div>
              <div className="absolute -bottom-28 right-12 w-96 h-96 border border-white rounded-full"></div>
              <div className="absolute top-1/2 right-[20%] w-40 h-40 border border-white rounded-full"></div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default About;
