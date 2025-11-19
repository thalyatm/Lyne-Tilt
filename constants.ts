import { Product, ProductCategory, CoachingPackage, Testimonial, BlogPost, FAQItem } from './types';

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Terra Earrings',
    price: 185,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    shortDescription: 'Soft clay tones meet organic form. A study in quiet presence.',
    longDescription: 'Handmade clay earrings that ground you. Born from the earth, these earrings feature soft clay tones meeting organic forms. A study in quiet presence for the modern artist.',
    image: 'https://picsum.photos/id/106/800/1000',
    detailImages: ['https://picsum.photos/id/107/800/800', 'https://picsum.photos/id/108/800/800'],
    badge: 'LIMITED EDITION',
    rating: 4.7,
    reviewCount: 47,
    availability: 'Only 2 left in stock'
  },
  {
    id: 'p2',
    name: 'Elemental Brooch',
    price: 210,
    currency: 'AUD',
    category: ProductCategory.Brooches,
    shortDescription: 'A wearable sculpture. Earthy, bold, intentional.',
    longDescription: 'A handmade statement brooch that acts as a wearable sculpture. Earthy, bold, and intentional. Structured to sit with weight and presence on heavy coats or linens.',
    image: 'https://picsum.photos/id/112/800/1000',
    detailImages: ['https://picsum.photos/id/113/800/800', 'https://picsum.photos/id/114/800/800'],
    badge: 'BESTSELLER',
    rating: 5,
    reviewCount: 32,
    availability: 'In stock - Ships in 1-3 days'
  },
  {
    id: 'p3',
    name: 'Horizon Earrings',
    price: 195,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    shortDescription: 'Where sky meets earth. Light, elegant, distinctive.',
    longDescription: 'Handmade artistic earrings capturing the moment where sky meets earth. Light, elegant, and distinctive. 14k gold wire meets hand-shaped porcelain.',
    image: 'https://picsum.photos/id/120/800/1000',
    detailImages: ['https://picsum.photos/id/121/800/800'],
    badge: 'ONE OF A KIND',
    rating: 5,
    reviewCount: 28,
    availability: 'In stock - Ships in 1-3 days'
  }
];

export const COACHING_PACKAGES: CoachingPackage[] = [
  {
    id: 'c1',
    title: 'Single Session',
    price: '$250',
    description: 'One 90-minute session',
    features: [
      '90-minute deep-dive session',
      'Strategic clarity on one key challenge',
      'Actionable next steps',
      'Follow-up email support (1 week)'
    ],
    ctaText: 'BOOK SINGLE SESSION',
    image: 'https://picsum.photos/id/180/800/600'
  },
  {
    id: 'c2',
    title: 'Monthly Coaching',
    price: '$800',
    description: 'per month (3-month minimum)',
    badge: 'MOST POPULAR',
    features: [
      'Two 60-minute sessions per month',
      'Ongoing email support',
      'Custom resources & frameworks',
      'Accountability check-ins',
      'Priority scheduling'
    ],
    ctaText: 'START MONTHLY COACHING',
    image: 'https://picsum.photos/id/20/800/600'
  },
  {
    id: 'c3',
    title: 'Creative Intensive',
    price: '$2,200',
    description: '8-week program',
    features: [
      'Six 90-minute sessions',
      'Comprehensive strategic planning',
      'Daily Voxer/email access',
      'Custom workbooks & templates',
      'Complete creative business foundation'
    ],
    ctaText: 'APPLY FOR INTENSIVE',
    image: 'https://picsum.photos/id/26/800/600'
  }
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    text: "Lyne's coaching gave me the clarity and confidence I needed to finally launch my creative business. Her approach is intelligent, intuitive, and deeply transformative.",
    author: "Sarah Chen",
    role: "Ceramic Artist & Designer, Brisbane",
    type: "coaching",
    rating: 5
  },
  {
    id: 't2',
    text: "Wearing Lyne's work feels like wearing a secret. It grounds me before every presentation.",
    author: "Sarah J.",
    role: "Architect",
    type: "shop",
    rating: 5
  }
];

export const BLOG_POSTS: BlogPost[] = [
  {
    id: 'b1',
    title: 'Why Chaos is Necessary for Order',
    excerpt: 'Embracing the mess in the studio as a vital part of the creative cycle.',
    date: 'Oct 12, 2023',
    category: 'Process',
    image: 'https://picsum.photos/id/42/800/600'
  },
  {
    id: 'b2',
    title: 'Materials Speak: Working with Clay',
    excerpt: 'What the earth teaches us about patience and resilience.',
    date: 'Nov 05, 2023',
    category: 'Materials',
    image: 'https://picsum.photos/id/56/800/600'
  },
  {
    id: 'b3',
    title: 'Breaking Through the Mid-Project Slump',
    excerpt: 'Practical strategies to keep going when the inspiration fades.',
    date: 'Dec 01, 2023',
    category: 'Coaching',
    image: 'https://picsum.photos/id/60/800/600'
  }
];

export const FAQS: FAQItem[] = [
  {
    question: "How long does shipping take?",
    answer: "Ready-to-ship items are dispatched within 1-3 business days. Custom pieces take 2-3 weeks.",
    category: "Shop"
  },
  {
    question: "Do you offer international shipping?",
    answer: "Yes, we ship worldwide from our studio in Brisbane, Australia.",
    category: "Shop"
  },
  {
    question: "What happens in a Clarity Call?",
    answer: "We spend 90 minutes deconstructing your current creative block. It's part therapy, part strategy.",
    category: "Coaching"
  },
  {
    question: "Can I refund a coaching session?",
    answer: "Sessions can be rescheduled up to 24 hours in advance. Refunds are not available once the session is booked, but credits can be applied.",
    category: "Coaching"
  }
];