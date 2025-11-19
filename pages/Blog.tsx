import React from 'react';
import SectionHeading from '../components/SectionHeading';
import { BLOG_POSTS } from '../constants';
import { Link } from 'react-router-dom';

const Blog = () => {
  return (
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
      <SectionHeading title="The Journal" subtitle="Notes on process, creativity, and life in the studio." />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {BLOG_POSTS.map(post => (
          <article key={post.id} className="group cursor-pointer">
            <div className="aspect-video overflow-hidden mb-6 bg-stone-200">
              <img src={post.image} alt={post.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            </div>
            <div className="text-xs uppercase tracking-widest text-clay mb-2">{post.category} • {post.date}</div>
            <h3 className="text-xl font-serif text-stone-900 mb-3 group-hover:text-stone-600 transition-colors">{post.title}</h3>
            <p className="text-stone-600 text-sm leading-relaxed mb-4">{post.excerpt}</p>
            <Link to={`/journal/${post.id}`} className="text-xs uppercase tracking-widest border-b border-stone-300 pb-1 hover:border-stone-800 transition-colors">Read More</Link>
          </article>
        ))}
      </div>
    </div>
  );
};

export default Blog;