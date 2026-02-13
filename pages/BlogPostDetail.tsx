
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Share2, Check, Feather, Loader2 } from 'lucide-react';
import { API_BASE } from '../config/api';
import { BlogPost } from '../types';

// Helper to format date
const formatDate = (dateStr: string) => {
  const [day, month, year] = dateStr.split('/');
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[parseInt(month) - 1]} ${parseInt(day)}, 20${year}`;
};

// Helper to estimate reading time
const getReadingTime = (content: string) => {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
};

const BlogPostDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  // Fetch the post and all posts for "Read Next"
  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchData = async () => {
      setLoading(true);
      try {
        const [postRes, allRes] = await Promise.all([
          fetch(`${API_BASE}/blog/${id}`),
          fetch(`${API_BASE}/blog`),
        ]);
        if (postRes.ok) {
          const postData = await postRes.json();
          setPost(postData);
        }
        if (allRes.ok) {
          const allData = await allRes.json();
          setAllPosts(allData);
        }
      } catch {
        // Post will remain null
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (post) document.title = `${post.title} | Lyne Tilt`;
  }, [post]);

  // Scroll progress tracking
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: post?.title, url });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20">
        <Loader2 className="animate-spin text-stone-400" size={32} />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20">
        <p className="text-stone-500 mb-4">Article not found.</p>
        <Link to="/journal" className="text-clay hover:underline">Return to Blog</Link>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 bg-white/80 min-h-screen">
      <style>{`
        .blog-content figure[data-type="resizable-image"] {
          margin: 2rem auto;
        }
        .blog-content figure[data-type="resizable-image"] img {
          border-radius: 0.5rem;
          width: 100%;
        }
        .blog-content figure[data-type="resizable-image"] figcaption {
          text-align: center;
          font-size: 0.875rem;
          color: #78716c;
          margin-top: 0.5rem;
          font-style: italic;
        }
        .blog-content div[data-callout] {
          border-left: 4px solid;
          padding: 1rem 1.25rem;
          margin: 1.5rem 0;
          border-radius: 0 0.5rem 0.5rem 0;
        }
        .blog-content div[data-callout="info"] {
          border-color: #93c5fd;
          background: #eff6ff;
        }
        .blog-content div[data-callout="tip"] {
          border-color: #6ee7b7;
          background: #ecfdf5;
        }
        .blog-content div[data-callout="warning"] {
          border-color: #fcd34d;
          background: #fffbeb;
        }
        .blog-content div[data-callout="note"] {
          border-color: #d6d3d1;
          background: #fafaf9;
        }
        .blog-content blockquote[data-pull-quote] {
          border: none;
          border-top: 2px solid #e7e5e4;
          border-bottom: 2px solid #e7e5e4;
          font-size: 1.5em;
          font-style: italic;
          text-align: center;
          color: #78716c;
          padding: 2rem 1rem;
          margin: 2rem 0;
          font-family: Georgia, serif;
        }
        .blog-content div[data-button-cta] {
          text-align: center;
          margin: 1.5rem 0;
        }
        .blog-content div[data-button-cta] a {
          display: inline-block;
          padding: 0.75rem 2rem;
          border-radius: 0.375rem;
          font-weight: 500;
          text-decoration: none;
          font-size: 0.875rem;
          transition: opacity 0.2s;
        }
        .blog-content div[data-button-cta] a:hover {
          opacity: 0.85;
        }
        .blog-content iframe {
          border-radius: 0.5rem;
          margin: 1.5rem auto;
          display: block;
        }
      `}</style>

      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 h-0.5 bg-clay z-50 transition-all duration-100" style={{ width: `${scrollProgress}%` }}></div>

      <article className="max-w-3xl mx-auto px-6 animate-fade-in-up">
        {/* Back Link */}
        <Link to="/journal" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-stone-400 hover:text-stone-800 mb-10 transition-colors">
          <ArrowLeft size={14} /> Back to Blog
        </Link>

        {/* Header */}
        <header className="mb-10">
           <div className="flex items-center gap-4 mb-6">
             <span className="text-[10px] uppercase tracking-widest text-clay font-medium bg-clay/10 px-2 py-1 rounded">
               {post.category}
             </span>
             <span className="text-[10px] text-stone-400 flex items-center gap-1">
               <Clock size={10} />
               {getReadingTime(post.content)}
             </span>
           </div>
           <h1 className="text-3xl md:text-4xl font-serif text-stone-900 mb-6 leading-tight">
             {post.title}
           </h1>
           <div className="flex items-center justify-between text-stone-400 text-sm">
             <span>{formatDate(post.date)}</span>
             <button
               onClick={handleShare}
               className="flex items-center gap-2 text-[10px] uppercase tracking-widest hover:text-stone-800 transition-colors"
             >
               {copied ? <><Check size={14} /> Copied!</> : <><Share2 size={14} /> Share</>}
             </button>
           </div>
        </header>

        {/* Content */}
        <div
          className="prose prose-stone prose-lg max-w-none text-stone-700 leading-relaxed blog-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Author Bio */}
        <div className="mt-16 pt-8 border-t border-stone-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-stone-200 rounded-full overflow-hidden flex-shrink-0">
              <img
                src="https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/a2b24cba-294f-4e4f-b4a6-ebaa1b285607/IMG_4502+copy.jpg?format=100w"
                alt="Lyne Tilt"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-serif text-stone-900 font-medium mb-1">Lyne Tilt</p>
              <p className="text-sm text-stone-500 leading-relaxed">
                Artist, coach, and maker of wearable art. Writing about creative living, mindset, and building a meaningful practice.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-stone-100 flex justify-between items-center">
           <Link to="/journal" className="text-xs font-bold uppercase tracking-widest text-stone-900 hover:text-clay transition-colors">
              ← All Articles
           </Link>
           <button
             onClick={handleShare}
             className="flex items-center gap-2 text-xs uppercase tracking-widest text-stone-400 hover:text-stone-800 transition-colors"
           >
             <Share2 size={14} /> Share Article
           </button>
        </div>
      </article>

      {/* Read Next */}
      {allPosts.filter(p => p.id !== post.id).length > 0 && (
        <div className="bg-stone-50/80 py-16 mt-20">
           <div className="max-w-3xl mx-auto px-6">
              <h3 className="text-center font-serif text-xl text-stone-900 mb-10">Continue Reading</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {allPosts.filter(p => p.id !== post.id).slice(0, 2).map(nextPost => (
                     <Link key={nextPost.id} to={`/journal/${nextPost.id}`} className="group block bg-white p-5 border border-stone-100 hover:border-stone-300 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-[9px] uppercase tracking-widest text-clay">{nextPost.category}</span>
                          <span className="text-[9px] text-stone-400">{formatDate(nextPost.date)}</span>
                        </div>
                        <h4 className="font-serif text-lg text-stone-900 group-hover:text-clay transition-colors leading-snug">{nextPost.title}</h4>
                     </Link>
                  ))}
              </div>
           </div>
        </div>
      )}

      {/* Newsletter CTA */}
      <div className="max-w-xl mx-auto px-6 py-12 text-center">
        <Feather className="text-clay mx-auto mb-4" size={20} />
        <p className="text-stone-600 text-sm mb-4">
          Enjoyed this article? Get more essays on creative living delivered to your inbox.
        </p>
        <Link
          to="/journal"
          className="inline-block text-[10px] uppercase tracking-widest font-bold text-stone-900 hover:text-clay transition-colors"
        >
          Subscribe to the Journal →
        </Link>
      </div>
    </div>
  );
};

export default BlogPostDetail;
