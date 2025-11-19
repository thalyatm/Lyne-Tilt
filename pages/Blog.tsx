
import React, { useState } from 'react';
import { BLOG_POSTS } from '../constants';
import { Link } from 'react-router-dom';
import { ArrowRight, MailOpen, Search, X } from 'lucide-react';

const Blog = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Extract unique categories for filters
  const categories = ['All', ...Array.from(new Set(BLOG_POSTS.map(post => post.category)))];

  const filteredPosts = BLOG_POSTS.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="pt-32 pb-20 px-6 bg-stone-50 min-h-screen">
      
      {/* Header */}
      <div className="mb-12 text-center animate-fade-in-up max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center gap-2 text-xs uppercase tracking-[0.3em] text-stone-400 mb-4 border border-stone-200 px-4 py-1 rounded-full">
            <MailOpen size={12} />
            <span>Est. 2023</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-serif text-clay mb-6">The Journal</h1>
          <p className="text-base text-stone-600 font-serif italic">
            "Oxygen Notes & Essays on Creative Living"
          </p>
      </div>

      {/* Filters & Search */}
      <div className="max-w-5xl mx-auto mb-16 animate-fade-in-up delay-100">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-y border-stone-200 py-6 bg-white/50 backdrop-blur-sm px-6">
          
          {/* Category Tags */}
          <div className="flex flex-wrap justify-center gap-4">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 transition-colors rounded-sm ${
                  selectedCategory === category 
                    ? 'bg-clay text-white' 
                    : 'bg-transparent text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search journal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-stone-200 pl-10 pr-4 py-2 text-sm text-stone-700 focus:outline-none focus:border-clay transition-colors"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400" size={14} />
            {searchQuery && (
               <button 
                 onClick={() => setSearchQuery('')}
                 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-stone-400 hover:text-stone-600"
               >
                 <X size={14} />
               </button>
            )}
          </div>
        </div>
      </div>

      {/* Newsletter Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post, idx) => (
            <article 
              key={post.id} 
              className="group bg-white p-8 md:p-10 border border-stone-200 hover:border-clay/30 transition-all duration-500 shadow-sm hover:shadow-md flex flex-col h-full animate-fade-in-up relative overflow-hidden" 
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {/* Decorative Top Line */}
              <div className="absolute top-0 left-0 w-full h-1 bg-stone-100 group-hover:bg-clay transition-colors duration-500"></div>

              <div className="flex justify-between items-center mb-8 border-b border-stone-100 pb-4">
                <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Issue 0{BLOG_POSTS.length - BLOG_POSTS.findIndex(p => p.id === post.id)}</span>
                <span className="text-[10px] uppercase tracking-widest text-stone-400">{post.date}</span>
              </div>

              <Link to={`/journal/${post.id}`} className="block mb-6 overflow-hidden aspect-[3/2]">
                <img 
                  src={post.image} 
                  alt={post.title} 
                  className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-700 hover:scale-105" 
                />
              </Link>
              
              <div className="flex flex-col flex-grow text-center">
                  <div className="mb-3">
                    <button 
                      onClick={() => setSelectedCategory(post.category)}
                      className="text-[9px] uppercase tracking-[0.2em] text-clay font-medium bg-clay/5 px-2 py-1 rounded-sm hover:bg-clay hover:text-white transition-colors"
                    >
                      {post.category}
                    </button>
                  </div>
                  
                  <h3 className="text-2xl font-serif text-stone-900 mb-4 leading-tight group-hover:text-clay transition-colors duration-300 px-2">
                    <Link to={`/journal/${post.id}`}>
                      {post.title}
                    </Link>
                  </h3>
                  
                  <p className="text-stone-500 text-sm leading-loose mb-8 line-clamp-3 font-light">
                      {post.excerpt}
                  </p>
                  
                  <div className="mt-auto flex justify-center">
                    <Link 
                      to={`/journal/${post.id}`} 
                      className="group/btn inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-stone-900 hover:text-clay transition-colors"
                    >
                      Read Issue <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </div>
              </div>
            </article>
          ))
        ) : (
          <div className="col-span-2 text-center py-20">
            <p className="text-stone-500 mb-4">No entries found matching your criteria.</p>
            <button 
              onClick={() => {setSearchQuery(''); setSelectedCategory('All');}}
              className="text-clay text-sm hover:underline"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Blog;
