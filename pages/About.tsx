import React, { useEffect } from 'react';
import { Award, MapPin, PenTool } from 'lucide-react';

const About = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="pt-32 pb-20 px-6 bg-[#FAFAF9] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-12 text-center animate-fade-in-up">
           <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500 mb-3">The Studio</p>
           <h1 className="text-4xl md:text-5xl font-serif text-stone-900">About the Artist</h1>
        </div>

        {/* Compact Credentials Bar */}
        <div className="max-w-5xl mx-auto mb-20 animate-fade-in-up delay-100">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12 border-y border-stone-200/60 py-6">
                <div className="flex flex-col items-center text-center">
                    <div className="flex items-center gap-2 mb-2 text-stone-800">
                       <Award size={14} className="text-clay" />
                       <h4 className="uppercase tracking-widest font-bold text-[10px]">Recognition</h4>
                    </div>
                    <p className="text-stone-500 text-[10px] leading-relaxed">
                      BFA Gold & Silversmithing • Design Files Feature
                    </p>
                </div>

                <div className="flex flex-col items-center text-center">
                    <div className="flex items-center gap-2 mb-2 text-stone-800">
                       <MapPin size={14} className="text-clay" />
                       <h4 className="uppercase tracking-widest font-bold text-[10px]">Studio</h4>
                    </div>
                     <p className="text-stone-500 text-[10px] leading-relaxed">
                      Based in Brisbane, QLD • Open by Appointment
                    </p>
                </div>

                <div className="flex flex-col items-center text-center">
                    <div className="flex items-center gap-2 mb-2 text-stone-800">
                       <PenTool size={14} className="text-clay" />
                       <h4 className="uppercase tracking-widest font-bold text-[10px]">Teaching</h4>
                    </div>
                     <p className="text-stone-500 text-[10px] leading-relaxed">
                      Guest Lecturer QUT • The Artist's Path Creator
                    </p>
                </div>
            </div>
        </div>

        {/* Editorial Layout */}
        <div className="relative flex flex-col md:flex-row items-center justify-center min-h-[600px] mb-24">
          
          {/* Image Section */}
          <div className="w-full md:w-5/12 relative z-10 animate-fade-in-up delay-100">
             <div className="relative aspect-[3/4] w-full shadow-2xl shadow-stone-300/50">
                {/* Image */}
                <img 
                  src="https://images.unsplash.com/photo-1554244933-d877deb50367?q=80&w=800&auto=format&fit=crop" 
                  alt="Lyne Tilt" 
                  className="w-full h-full object-cover grayscale contrast-110 hover:grayscale-0 transition-all duration-1000 ease-out"
                />
                {/* Inner Border */}
                <div className="absolute inset-0 border-[1px] border-white/20 pointer-events-none"></div>
             </div>
             {/* Decorative elements behind image */}
             <div className="absolute -z-10 -bottom-6 -left-6 w-full h-full border border-stone-300/60 hidden md:block"></div>
             <div className="absolute -z-10 -top-6 -right-6 w-32 h-32 bg-clay/10 rounded-full blur-3xl"></div>
          </div>

          {/* Text Section - Overlap */}
          <div className="w-full md:w-7/12 relative z-20 mt-10 md:mt-0 md:-ml-20 animate-fade-in-up delay-300">
            <div className="bg-white p-8 md:p-16 shadow-xl shadow-stone-200/40 border border-stone-100 relative overflow-hidden">
               {/* Large Background Quote Mark */}
               <div className="absolute -top-10 left-8 text-9xl text-stone-50 font-serif font-bold select-none z-0 pointer-events-none">"</div>
               
               <div className="relative z-10">
                  <h3 className="font-serif text-2xl text-stone-900 mb-6">Material & Mind</h3>
                  
                  <p className="font-serif italic text-lg md:text-xl text-stone-600 mb-8 leading-relaxed border-l-2 border-clay pl-6">
                    "I exist in the space between the forged metal and the spoken word."
                  </p>

                  <div className="text-stone-500 text-sm leading-loose space-y-6 font-light text-justify">
                    <p>
                      My name is Lyne Tilt. I am a jeweller, a writer, and a creative mentor based in <span className="text-stone-900 font-medium">Brisbane, Australia</span>.
                    </p>
                    <p>
                      For years, I treated these parts of myself as separate. The artist who spent hours in silence filing silver, and the mentor who loved dissecting the creative process with others. 
                    </p>
                    <p>
                      I realized eventually that they are the same work. Whether I am shaping a piece of brass or helping a client shape their career, the goal is the same: <span className="text-stone-800 font-normal">reveal the essential form. Remove what is unnecessary. Polish what remains until it sings.</span>
                    </p>
                    <p>
                       My jewellery is raw, tactile, and imperfect. It celebrates the mark of the hand. My coaching is structured yet intuitive, grounded in a decade of navigating the art world and running a creative business.
                    </p>
                  </div>

                  <div className="mt-10 flex items-center justify-between pt-8 border-t border-stone-100">
                     <div className="font-serif text-3xl text-stone-900 opacity-90" style={{ fontFamily: '"Playfair Display", serif', fontStyle: 'italic' }}>Lyne Tilt</div>
                     <div className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">Est. 2023</div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;