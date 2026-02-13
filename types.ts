
export enum ProductCategory {
  All = 'All',
  Earrings = 'Earrings',
  Brooches = 'Brooches',
  Necklaces = 'Necklaces'
}

export enum WallArtCategory {
  All = 'All',
  Prints = 'Prints',
  Originals = 'Originals',
  Mixed = 'Mixed Media'
}

export enum ProductColour {
  All = 'All Colours',
  Black = 'Black & Neutrals',
  Blue = 'Blue & Green',
  Pink = 'Pink & Purple',
  Red = 'Red & Orange',
  Yellow = 'Yellow & Gold',
  Multi = 'Multi-colour'
}

export enum PriceRange {
  All = 'All Prices',
  Under60 = 'Under $60',
  From60To75 = '$60 - $75',
  From75To100 = '$75 - $100',
  Over100 = 'Over $100'
}

export enum Availability {
  All = 'All Items',
  InStock = 'In Stock',
  SoldOut = 'Sold Out'
}

export interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  category: ProductCategory;
  colours: ProductColour[];
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
  image?: string; 
  price?: string;
  badge?: string;
}

export interface LearnItem {
  id: string;
  title: string;
  type: 'ONLINE' | 'WORKSHOP';
  price: string;
  image: string;
  description: string;
  // Enhanced fields
  subtitle?: string;
  duration?: string;
  format?: string;
  level?: string;
  includes?: string[];
  outcomes?: string[];
  modules?: { title: string; description: string }[];
  testimonial?: { text: string; author: string; role: string };
  enrolledCount?: number;
  nextDate?: string;
}

export interface Testimonial {
  id: string;
  text: string;
  author: string;
  role: string;
  type: 'shop' | 'coaching' | 'learn';
  rating?: number;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string; // Added content field
  date: string;
  category: string;
  image: string;
}

export interface FAQItem {
  question: string;
  answer: string;
  category: 'Shop' | 'Coaching' | 'Learn' | 'General';
}

export interface WallArtProduct {
  id: string;
  name: string;
  price: number;
  currency: string;
  category: WallArtCategory;
  colours: ProductColour[];
  shortDescription: string;
  longDescription: string;
  image: string;
  detailImages: string[];
  dimensions?: string;
  badge?: string;
  rating?: number;
  reviewCount?: number;
  availability?: string;
}
