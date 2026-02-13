
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search, X, Clock, Feather } from 'lucide-react';
import { API_BASE } from '../config/api';
import { BlogPost } from '../types';

// Helper to format date
const formatDate = (dateStr: string) => {
  const [day, month, year] = dateStr.split('/');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(month) - 1]} ${parseInt(day)}, 20${year}`;
};

// Helper to estimate reading time
const getReadingTime = (content: string) => {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
};

const Blog = () => {
  useEffect(() => { document.title = 'Journal | Lyne Tilt'; }, []);

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  // Fetch blog posts from API
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch(`${API_BASE}/blog`);
        if (!response.ok) throw new Error('API error');
        const data = await response.json();
        setPosts(data);
      } catch {
        // Posts will remain empty
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  // Extract unique categories for filters
  const categories = ['All', ...Array.from(new Set(posts.map(post => post.category)))];

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Get featured post (first/latest) and remaining posts
  const featuredPost = filteredPosts[0];
  const remainingPosts = filteredPosts.slice(1);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'blog-page' }),
      });
      if (response.ok) {
        setSubscribed(true);
      }
    } catch {
      setSubscribed(true);
    }
  };

  if (loading) {
    return (
      <div className="pt-32 pb-20 px-6 bg-white/40 min-h-screen flex items-center justify-center">
        <p className="text-stone-400">Loading articles...</p>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 px-6 bg-white/40 min-h-screen">

      {/* Header */}
      <div className="mb-10 text-center animate-fade-in-up max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-serif text-clay mb-4">Lyne Tilt Blog</h1>
          <p className="text-base text-stone-500 font-light">
            Essays on creative living, mindset, and building a meaningful practice.
          </p>
      </div>

      {/* Filters & Search */}
      <div className="max-w-4xl mx-auto mb-12 animate-fade-in-up delay-100">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-stone-100 pb-6">

          {/* Category Tags */}
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`text-[10px] uppercase tracking-widest font-medium px-3 py-1.5 transition-colors rounded-full ${
                  selectedCategory === category
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-500 hover:text-stone-900 hover:bg-stone-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-56">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 pl-9 pr-4 py-2 text-sm text-stone-700 focus:outline-none focus:border-stone-400 transition-colors rounded-md"
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

      {filteredPosts.length > 0 ? (
        <>
          {/* Featured Post */}
          {featuredPost && (
            <article className="max-w-2xl mx-auto mb-16 animate-fade-in-up">
              <div>
                <div className="text-left">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[10px] uppercase tracking-widest text-clay font-medium bg-clay/10 px-2 py-1 rounded">
                      {featuredPost.category}
                    </span>
                    <span className="text-[10px] text-stone-400 flex items-center gap-1">
                      <Clock size={10} />
                      {getReadingTime(featuredPost.content)}
                    </span>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-serif text-stone-900 mb-4 leading-tight hover:text-clay transition-colors">
                    <Link to={`/journal/${featuredPost.id}`}>
                      {featuredPost.title}
                    </Link>
                  </h2>

                  <p className="text-stone-500 text-sm leading-relaxed mb-6 line-clamp-3">
                    {featuredPost.excerpt}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-400">{formatDate(featuredPost.date)}</span>
                    <Link
                      to={`/journal/${featuredPost.id}`}
                      className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-stone-900 hover:text-clay transition-colors"
                    >
                      Read Article <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          )}

          {/* Remaining Posts Grid */}
          {remainingPosts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
              {remainingPosts.map((post, idx) => (
                <article
                  key={post.id}
                  className="group bg-white border border-stone-100 hover:border-stone-300 transition-all duration-300 flex flex-col h-full animate-fade-in-up"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="flex flex-col flex-grow p-5 text-left">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[9px] uppercase tracking-widest text-clay font-medium">
                        {post.category}
                      </span>
                      <span className="text-[9px] text-stone-400 flex items-center gap-1">
                        <Clock size={9} />
                        {getReadingTime(post.content)}
                      </span>
                    </div>

                    <h3 className="text-lg font-serif text-stone-900 mb-3 leading-snug group-hover:text-clay transition-colors">
                      <Link to={`/journal/${post.id}`}>
                        {post.title}
                      </Link>
                    </h3>

                    <p className="text-stone-500 text-sm leading-relaxed mb-4 line-clamp-2 flex-grow">
                      {post.excerpt}
                    </p>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-stone-100">
                      <span className="text-[10px] text-stone-400">{formatDate(post.date)}</span>
                      <Link
                        to={`/journal/${post.id}`}
                        className="text-[10px] uppercase tracking-widest font-bold text-stone-900 hover:text-clay transition-colors"
                      >
                        Read →
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20 max-w-md mx-auto">
          <p className="text-stone-500 mb-4">No articles found matching your criteria.</p>
          <button
            onClick={() => {setSearchQuery(''); setSelectedCategory('All');}}
            className="text-clay text-sm hover:underline"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Newsletter Signup */}
      <div className="max-w-2xl mx-auto mt-8 bg-stone-900 rounded-2xl p-8 md:p-12 text-center">
        <div className="flex justify-center mb-4">
          <Feather className="text-clay" size={24} />
        </div>
        <h3 className="text-xl font-serif text-white mb-2">Get new articles in your inbox</h3>
        <p className="text-stone-400 text-sm mb-6">
          Join the newsletter for essays on creative living, delivered occasionally with care.
        </p>

        {!subscribed ? (
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-stone-500 transition-colors"
            />
            <button
              type="submit"
              className="bg-clay text-white rounded-lg px-6 py-3 text-[10px] uppercase tracking-widest font-bold hover:bg-clay/80 transition-colors"
            >
              Subscribe
            </button>
          </form>
        ) : (
          <p className="text-clay font-medium">✓ You're subscribed! Check your inbox soon.</p>
        )}
      </div>
    </div>
  );
};

export default Blog;
