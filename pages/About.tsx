import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Feather, Users } from 'lucide-react';

const About = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="pt-32 pb-20 px-6 bg-[#FAFAF9] min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Page Header */}
        <div className="mb-16 text-center animate-fade-in-up">
           <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500 mb-4">Artist. Educator. Creative Strategist. Coach.</p>
           <h1 className="text-6xl md:text-8xl font-serif text-clay mb-6">About Lyne Tilt</h1>
           <div className="w-12 h-px bg-stone-900 mx-auto"></div>
        </div>

        {/* Section 1: Philosophy - Image & Text Layout */}
        <div className="relative flex flex-col md:flex-row items-start gap-12 mb-24">
          
          {/* Image Section */}
          <div className="w-full md:w-5/12 relative z-10 animate-fade-in-up delay-100 sticky top-32">
             <div className="relative aspect-[3/4] w-full shadow-xl shadow-stone-200 image-zoom-container">
                <img
                  src="https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/a2b24cba-294f-4e4f-b4a6-ebaa1b285607/IMG_4502+copy.jpg?format=300w"
                  alt="Lyne Tilt"
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000 ease-out image-zoom"
                />
                <div className="absolute inset-0 border-[1px] border-white/20 pointer-events-none"></div>
             </div>
             <div className="absolute -z-10 -bottom-6 -left-6 w-full h-full border border-stone-300/60 hidden md:block"></div>
          </div>

          {/* Philosophy Content */}
          <div className="w-full md:w-7/12 relative z-20 animate-fade-in-up delay-200">
            <h2 className="font-serif text-3xl text-stone-900 mb-6">My Philosophy</h2>
            
            <p className="font-serif italic text-2xl text-clay mb-8 leading-relaxed">
              "Art is oxygen. Clarity is power."
            </p>

            <div className="prose prose-stone text-stone-600 leading-loose text-base space-y-6">
              <p>
                I believe that art isn’t just something we make or admire, it’s how we breathe. Whether we create it, wear it, or let it shape how we think, art gives form to the parts of ourselves we’re ready to reclaim. It’s a force. A decision. A declaration.
              </p>
              <p>
                My work, whether through jewellery, abstract painting, classes, or coaching, is built around that truth. Art allows us to engage with who we are and what we want to become.
              </p>
              <p>
                I’m here for those who are ready to shed what’s no longer working—the second-guessing, the small talk, the safe choices—and take themselves seriously. Not in a heavy, overcomplicated way. In a clear, conscious, unapologetic way.
              </p>
              
              <div className="bg-white p-8 border-l-2 border-stone-900 shadow-sm my-8">
                <p className="font-bold text-stone-900 uppercase tracking-widest text-xs mb-4">The Core Belief</p>
                <p className="italic text-stone-800">
                   You don’t need more fluff. You need clarity, direction, and space to decide who you’re becoming.
                </p>
              </div>

              <p>
                This isn’t therapy. It’s not “woo.” It’s mindset and creative strategy with real-world application, delivered by someone who has led thousands of people across decades in education, business, and the creative industries.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: The Three Pillars - Compact */}
        <div className="mb-24 animate-fade-in-up delay-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div className="bg-stone-900 text-stone-200 p-6 flex flex-col items-center text-center">
                <Feather className="text-clay mb-3" size={32} />
                <h3 className="font-serif text-2xl mb-4 text-white">I Make.</h3>
                <p className="text-sm leading-loose font-light text-stone-400">
                  If you wear my jewellery or collect my art, you’re not just choosing beauty, you’re anchoring into something bold and personal.
                </p>
             </div>
             <div className="bg-stone-200 text-stone-800 p-6 flex flex-col items-center text-center">
                <Sparkles className="text-stone-600 mb-3" size={32} />
                <h3 className="font-serif text-2xl mb-4">I Teach.</h3>
                <p className="text-sm leading-loose font-light text-stone-600">
                  If you attend one of my classes or workshops, you're not just learning a skill, you’re engaging with your mindset, your capacity, and your creative identity.
                </p>
             </div>
             <div className="bg-white border border-stone-200 text-stone-800 p-6 flex flex-col items-center text-center">
                <Users className="text-clay mb-3" size={32} />
                <h3 className="font-serif text-2xl mb-4">I Coach.</h3>
                <p className="text-sm leading-loose font-light text-stone-600">
                  We’ll get to the heart of what’s holding you back, and build the strategy and structure to move through it.
                </p>
             </div>
          </div>
        </div>

        {/* Section 3: Background - Larger Font */}
        <div className="max-w-3xl mx-auto mb-24 prose prose-stone animate-fade-in-up">
           <h3 className="font-serif text-2xl text-stone-900 mb-6">A Background Built for Clarity + Action</h3>
           <div className="space-y-6 text-stone-600 text-base leading-loose">
              <p>
                My professional background spans Fine Art, Literature, Education, Human Behaviour, and most recently, Nutrition and Integrative Health. I hold First Class Honours in Education and completed Honours research through Griffith University examining identity and belonging in adolescent girls. That early work still drives me, because at every stage of life the question remains: <span className="text-stone-900 font-medium italic">what would it take to truly belong to yourself?</span>
              </p>
              <p>
                As a former educator and wellbeing leader in schools, I’ve led thousands of people, students, staff, parents, and leaders, toward more focused, values-aligned ways of living and working. Over the last five years, I’ve coached more than 200 artists, creatives, and business owners, helping them find their voice, clarify their message, and build with purpose.
              </p>
              <p>
                I’m a qualified Nutrition Coach and an ICF-eligible professional coach, combining evidence-based mindset and behaviour change approaches with creative strategy and communication. My coaching practice integrates these disciplines to help people build lives, businesses, and habits that feel aligned, sustainable, and self-led.
              </p>
           </div>
        </div>

        {/* Section 4: Who I Work With & What to Expect - Larger Font */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 mb-24 border-t border-stone-200 pt-16">
           <div>
              <h3 className="font-serif text-2xl text-stone-900 mb-6">Who I Work With</h3>
              <p className="text-base text-stone-600 mb-6 leading-loose">
                I work with people who are ready to stop circling and start building. You don’t have to be an artist. You just have to be ready to think and act more consciously.
              </p>
              <ul className="space-y-4">
                 {[
                   "People starting or returning to a creative practice after a long break.",
                   "People creating or refining businesses that reflect their values.",
                   "People ready to stop playing small in life, work, or leadership."
                 ].map((item, i) => (
                   <li key={i} className="flex items-start gap-3 text-base text-stone-800">
                      <div className="w-1.5 h-1.5 bg-clay rounded-full mt-2 shrink-0"></div>
                      {item}
                   </li>
                 ))}
              </ul>
           </div>

           <div>
              <h3 className="font-serif text-2xl text-stone-900 mb-6">What You Can Expect</h3>
              <div className="space-y-8">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-widest text-stone-900 mb-2">If you purchase art</h4>
                  <p className="text-base text-stone-600 leading-loose">
                    Expect quality work imbued with story, soul, and meaning. Every piece is designed to bring presence and beauty into your everyday life.
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-widest text-stone-900 mb-2">If you coach with me</h4>
                  <p className="text-base text-stone-600 leading-loose">
                    Expect real-world strategy, grounded creative insight, and zero fluff. It’s clarity and action, designed to help you live, lead, and create more deliberately.
                  </p>
                </div>
              </div>
           </div>
        </div>

        {/* Section 5: CTA - Larger Font */}
        <div className="bg-stone-100 p-10 md:p-20 text-center relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="font-serif text-3xl md:text-4xl text-stone-900 mb-6">Want to Work With Lyne?</h2>
              <p className="text-stone-600 max-w-2xl mx-auto leading-relaxed mb-10 text-base md:text-lg">
                Got a question, or want to explore working together? Whether you’re looking to book a guest speaker, collaborate on a project, or schedule a free 15-minute strategy call, let's start a conversation about what’s possible.
              </p>
              <div className="flex flex-col md:flex-row justify-center gap-6">
                <Link to="/contact" className="bg-stone-900 text-white px-8 py-4 uppercase tracking-widest text-[10px] font-bold hover:bg-clay transition-colors">
                  Contact Lyne
                </Link>
                <Link to="/coaching" className="bg-white border border-stone-300 text-stone-900 px-8 py-4 uppercase tracking-widest text-[10px] font-bold hover:border-stone-900 transition-colors">
                  View Services
                </Link>
              </div>
            </div>
            {/* Decorative Abstract Shapes */}
            <div className="absolute top-[-50%] left-[-10%] w-96 h-96 rounded-full border border-stone-200 opacity-50 pointer-events-none"></div>
            <div className="absolute bottom-[-50%] right-[-10%] w-96 h-96 rounded-full border border-stone-200 opacity-50 pointer-events-none"></div>
        </div>
      </div>
    </div>
  );
};

export default About;