export enum ProductCategory {
  Earrings = 'Earrings',
  Brooches = 'Brooches',
  Necklaces = 'Necklaces',
  All = 'All'
}

export interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  category: ProductCategory;
  shortDescription: string;
  longDescription: string;
  image: string;
  detailImages: string[];
  badge?: string;
  rating?: number;
  reviewCount?: number;
  availability?: string;
}

export interface CoachingPackage {
  id: string;
  title: string;
  description: string;
  features: string[];
  ctaText: string;
  image?: string; // Optional now as per new layout might not use it the same way
  price?: string; // Optional
}

export interface Testimonial {
  id: string;
  text: string;
  author: string;
  role: string;
  type: 'shop' | 'coaching';
  rating?: number;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  image: string;
}

export interface FAQItem {
  question: string;
  answer: string;
  category: 'Shop' | 'Coaching' | 'General';
}