
import React from 'react';
import SectionHeading from '../components/SectionHeading';
import { LEARN_ITEMS } from '../constants';
import { ArrowRight, PlayCircle, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const Learn = () => {
  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="pt-40 pb-24 px-6 bg-stone-100 text-center relative overflow-hidden">
          <div className="relative z-10 max-w-4xl mx-auto animate-fade-in-up">
             <p className="text-xs uppercase tracking-[0.3em] text-stone-500 mb-6">Oxygen for your creative life</p>
             <h1 className="text-5xl md:text-7xl font-serif text-clay mb-6 leading-tight">
               Lift & Expand
             </h1>
             <div className="w-16 h-px bg-stone-900 mx-auto mb-8"></div>
             <h2 className="text-xl md:text-2xl font-light text-stone-600">Workshops and Courses</h2>
             <p className="mt-6 text-sm text-stone-500 max-w-xl mx-auto leading-loose">
               Designed to lift your vision and expand your creative life.
             </p>
          </div>
          
          {/* Decorative Background Elements */}
          <div className="absolute top-1/4 left-10 w-32 h-32 border border-stone-200 rounded-full opacity-50 animate-[spin_60s_linear_infinite]"></div>
          <div className="absolute bottom-10 right-10 w-48 h-48 border border-stone-200 rounded-full opacity-50 animate-[spin_40s_linear_infinite_reverse]"></div>
      </section>

      {/* Courses Grid */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            {LEARN_ITEMS.map((item, idx) => (
               <div key={item.id} className="group flex flex-col h-full animate-fade-in-up" style={{ animationDelay: `${idx * 200}ms` }}>
                  
                  {/* Image Container */}
                  <div className="relative aspect-video bg-stone-200 overflow-hidden mb-8 shadow-sm">
                     <img 
                        src={item.image} 
                        alt={item.title} 
                        className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105" 
                     />
                     <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 text-[10px] uppercase tracking-widest font-bold text-stone-900 shadow-sm">
                        {item.type}
                     </div>
                     
                     {/* Overlay Icon */}
                     <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        {item.type === 'ONLINE' ? (
                           <PlayCircle size={48} className="text-white drop-shadow-lg" strokeWidth={1} />
                        ) : (
                           <Users size={48} className="text-white drop-shadow-lg" strokeWidth={1} />
                        )}
                     </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-col flex-grow text-center px-4">
                     <h3 className="text-2xl font-serif text-stone-900 mb-4 leading-tight group-hover:text-clay transition-colors duration-300">
                        {item.title}
                     </h3>
                     <p className="text-stone-500 text-sm leading-relaxed mb-6">
                        {item.description}
                     </p>
                     <p className="text-lg font-serif text-stone-800 italic mb-8">
                        {item.price}
                     </p>
                     
                     <div className="mt-auto">
                        <Link 
                           to="#" 
                           className="inline-flex items-center gap-2 border-b border-stone-800 pb-1 text-[10px] uppercase tracking-[0.2em] font-bold hover:text-clay hover:border-clay transition-all"
                        >
                           Purchase <ArrowRight size={14} />
                        </Link>
                     </div>
                  </div>
               </div>
            ))}
         </div>
      </section>
      
      {/* Newsletter Section */}
      <section className="py-20 bg-stone-900 text-center px-6">
          <div className="max-w-2xl mx-auto text-white">
             <h3 className="text-2xl font-serif mb-4">Not ready to commit?</h3>
             <p className="text-stone-400 text-sm leading-loose mb-8">
                Join "Oxygen Notes" for free weekly insights on creativity, visibility, and staying true to your work.
             </p>
             <Link to="/journal" className="inline-block bg-white text-stone-900 px-8 py-3 text-[10px] uppercase tracking-widest font-bold hover:bg-clay hover:text-white transition-colors">
                Read the Blog
             </Link>
          </div>
      </section>
    </div>
  );
};

export default Learn;
