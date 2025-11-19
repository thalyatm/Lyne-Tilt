
import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BLOG_POSTS } from '../constants';
import { ArrowLeft, Facebook, Twitter, Linkedin } from 'lucide-react';

const BlogPostDetail = () => {
  const { id } = useParams<{ id: string }>();
  const post = BLOG_POSTS.find(p => p.id === id);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20">
        <p className="text-stone-500 mb-4">Article not found.</p>
        <Link to="/journal" className="text-clay hover:underline">Return to Journal</Link>
      </div>
    );
  }

  // Format text to preserve line breaks
  const formattedContent = post.content.split('\n').map((str, index) => (
    <React.Fragment key={index}>
      {str}
      <br />
    </React.Fragment>
  ));

  return (
    <div className="pt-32 pb-24 bg-white min-h-screen">
      {/* Progress Bar (optional visual flair) */}
      <div className="fixed top-0 left-0 h-1 bg-clay z-50 w-full origin-left scale-x-0 animate-[slide-right_1s_ease-out_forwards]"></div>

      <article className="max-w-3xl mx-auto px-6 animate-fade-in-up">
        {/* Back Link */}
        <Link to="/journal" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-stone-400 hover:text-stone-800 mb-12 transition-colors">
          <ArrowLeft size={14} /> Back to Journal
        </Link>

        {/* Header */}
        <header className="mb-12 text-center">
           <div className="text-[10px] uppercase tracking-[0.2em] text-clay font-bold mb-4">
             {post.category} • {post.date}
           </div>
           <h1 className="text-3xl md:text-5xl font-serif text-stone-900 mb-8 leading-tight">
             {post.title}
           </h1>
        </header>

        {/* Hero Image */}
        <div className="w-full aspect-video bg-stone-100 mb-16 overflow-hidden shadow-lg">
           <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
        </div>

        {/* Content */}
        <div className="prose prose-stone prose-lg max-w-none font-serif text-stone-700 leading-loose">
            <div className="whitespace-pre-line">
                {post.content}
            </div>
        </div>

        {/* Footer / Share */}
        <div className="mt-20 pt-10 border-t border-stone-200 flex justify-between items-center">
           <Link to="/journal" className="text-xs font-bold uppercase tracking-widest text-stone-900 hover:text-clay">
              More Articles
           </Link>
           <div className="flex gap-4 text-stone-400">
              <button className="hover:text-stone-800 transition-colors"><Facebook size={18} /></button>
              <button className="hover:text-stone-800 transition-colors"><Twitter size={18} /></button>
              <button className="hover:text-stone-800 transition-colors"><Linkedin size={18} /></button>
           </div>
        </div>
      </article>

      {/* Read Next (Simple implementation) */}
      <div className="bg-stone-50 py-20 mt-20">
         <div className="max-w-4xl mx-auto px-6">
            <h3 className="text-center font-serif text-2xl text-stone-900 mb-12">Read Next</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {BLOG_POSTS.filter(p => p.id !== post.id).slice(0, 2).map(nextPost => (
                   <Link key={nextPost.id} to={`/journal/${nextPost.id}`} className="group block bg-white p-6 border border-stone-100 hover:border-stone-300 transition-colors">
                      <div className="text-[10px] uppercase tracking-widest text-clay mb-2">{nextPost.date}</div>
                      <h4 className="font-serif text-xl text-stone-900 group-hover:text-stone-600 transition-colors">{nextPost.title}</h4>
                   </Link>
                ))}
            </div>
         </div>
      </div>
    </div>
  );
};

export default BlogPostDetail;
