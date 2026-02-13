import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'admin' | 'superadmin';
  createdAt: string;
}

export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

// Customer User (separate from admin users)
export interface CustomerUser {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: 'customer';
  emailVerified: boolean;
  verificationToken?: string;
  verificationTokenExpiry?: string;
  resetToken?: string;
  resetTokenExpiry?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface ShippingAddress {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  addedAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  userId: string;
  orderNumber: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    phone: string;
  };
  trackingNumber?: string;
  trackingUrl?: string;
  createdAt: string;
  updatedAt: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  category: 'Earrings' | 'Brooches' | 'Necklaces';
  shortDescription: string;
  longDescription: string;
  image: string;
  detailImages: string[];
  badge?: string;
  rating?: number;
  reviewCount?: number;
  availability?: string;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
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
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface LearnItem {
  id: string;
  title: string;
  type: 'ONLINE' | 'WORKSHOP';
  price: string;
  image: string;
  description: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  category: string;
  image: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Testimonial {
  id: string;
  text: string;
  author: string;
  role: string;
  type: 'shop' | 'coaching';
  rating?: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: 'Shop' | 'Coaching' | 'General';
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subscriber {
  id: string;
  email: string;
  name?: string;
  source: string;
  tags: string[];
  subscribedAt: string;
  lastEmailedAt?: string;
  emailsReceived: number;
}

export interface EmailDraft {
  id: string;
  subject: string;
  preheader?: string;
  body: string;
  bodyHtml?: string;
  audience: 'all' | 'segment';
  segmentFilters?: {
    sources?: string[];
    tags?: string[];
  };
  scheduledFor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SentEmail {
  id: string;
  subject: string;
  preheader?: string;
  body: string;
  bodyHtml?: string;
  recipientCount: number;
  recipientEmails: string[];
  audience: 'all' | 'segment';
  segmentFilters?: {
    sources?: string[];
    tags?: string[];
  };
  resendId?: string;
  sentAt: string;
}

// Contact Form Submission
export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'archived';
  createdAt: string;
  readAt?: string;
}

// Activity Log for tracking admin actions
export interface ActivityLogEntry {
  id: string;
  action: 'create' | 'update' | 'delete' | 'publish' | 'unpublish' | 'send';
  entityType: string;
  entityId: string;
  entityName: string;
  userId: string;
  userName: string;
  details?: string;
  createdAt: string;
}

// Email Automation types
export type AutomationTrigger =
  | 'newsletter_signup'
  | 'purchase'
  | 'coaching_inquiry'
  | 'contact_form'
  | 'manual';

export interface AutomationStep {
  id: string;
  delayDays: number;
  delayHours: number;
  subject: string;
  body: string;
  order: number;
}

export interface EmailAutomation {
  id: string;
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  status: 'active' | 'paused';
  steps: AutomationStep[];
  lastTriggeredAt?: string;
  totalTriggered: number;
  totalSent: number;
  createdAt: string;
  updatedAt: string;
}

// Tracks automation emails that are scheduled or sent
export interface AutomationQueueItem {
  id: string;
  automationId: string;
  automationName: string;
  stepId: string;
  stepOrder: number;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: string;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  scheduledFor: string;
  sentAt?: string;
  error?: string;
  retryCount: number;
  maxRetries: number;
  lastAttemptAt?: string;
  createdAt: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  description?: string;
  blocks: any[];
  thumbnail?: string;
  isDefault: boolean;
  category: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Site Settings Interfaces
export interface HeroSettings {
  headline: string;
  tagline: string;
  subtitle: string;
  metaTags: string;
  primaryCta: { text: string; link: string };
  secondaryCta: { text: string; link: string };
  image: string;
}

export interface SplitPathCard {
  label: string;
  title: string;
  description: string;
  linkText: string;
  linkUrl: string;
}

export interface SplitPathSettings {
  title: string;
  cards: SplitPathCard[];
}

export interface HomeSettings {
  aboutSection: {
    image: string;
    title: string;
    paragraphs: string[];
    linkText: string;
    linkUrl: string;
  };
  shopCta: {
    title: string;
    subtitle: string;
    buttonText: string;
  };
}

export interface AboutSettings {
  header: { title: string; subtitle: string; location: string };
  heroImage: string;
  philosophy: {
    quote: string;
    paragraphs: string[];
  };
  howIShowUp: {
    cards: { title: string; description: string; linkText: string; linkUrl: string }[];
  };
  journey: {
    title: string;
    description: string;
    stats: { value: string; label: string }[];
    credentials: string[];
  };
  whoThisIsFor: {
    title: string;
    subtitle: string;
    items: string[];
  };
  cta: {
    title: string;
    description: string;
    buttonText: string;
    buttonUrl: string;
  };
}

export interface CoachingSettings {
  hero: { title: string; subtitle: string; description: string };
  isThisForYou: {
    title: string;
    subtitle: string;
    items: string[];
  };
  whatYoullExperience: {
    title: string;
    subtitle: string;
    cards: { title: string; description: string }[];
  };
  howItWorks: {
    title: string;
    subtitle: string;
    steps: { step: string; title: string; description: string }[];
  };
}

export interface LearnSettings {
  hero: { title: string; subtitle: string; description: string };
  instructorBio: {
    name: string;
    paragraphs: string[];
    stats: { value: string; label: string }[];
  };
  newsletterSignup: {
    title: string;
    description: string;
  };
}

export interface ContactSettings {
  header: { title: string; subtitle: string };
  welcomeMessage: { title: string; paragraphs: string[] };
  formSubjects: string[];
  info: {
    email: string;
    location: string;
    responseTime: string;
  };
  coachingCallout: {
    title: string;
    description: string;
  };
}

export interface ProductDetailSettings {
  materialsAndCare: string;
  shippingAndReturns: string;
}

export interface FooterLink {
  label: string;
  url: string;
}

export interface FooterSettings {
  tagline: string;
  location: string;
  established: string;
  copyright: string;
  columns: {
    title: string;
    links: FooterLink[];
  }[];
  socialLinks: { platform: string; url: string }[];
}

export interface PageSeo {
  title: string;
  description: string;
  image?: string;
}

export interface SiteSeoSettings {
  home: PageSeo;
  about: PageSeo;
  coaching: PageSeo;
  learn: PageSeo;
  contact: PageSeo;
  shop: PageSeo;
  blog: PageSeo;
  faq: PageSeo;
}

export interface SiteSettings {
  hero: HeroSettings;
  splitPath: SplitPathSettings;
  home: HomeSettings;
  about: AboutSettings;
  coaching: CoachingSettings;
  learn: LearnSettings;
  contact: ContactSettings;
  productDetail: ProductDetailSettings;
  footer: FooterSettings;
  sections: {
    showTestimonials: boolean;
    showNewsletter: boolean;
    showFeaturedProducts: boolean;
    showBlogPreview: boolean;
  };
  seo?: SiteSeoSettings;
}

export interface DatabaseSchema {
  users: User[];
  refreshTokens: RefreshToken[];
  customerUsers: CustomerUser[];
  customerRefreshTokens: RefreshToken[];
  shippingAddresses: ShippingAddress[];
  wishlistItems: WishlistItem[];
  orders: Order[];
  products: Product[];
  coachingPackages: CoachingPackage[];
  learnItems: LearnItem[];
  blogPosts: BlogPost[];
  testimonials: Testimonial[];
  faqs: FAQ[];
  subscribers: Subscriber[];
  emailDrafts: EmailDraft[];
  sentEmails: SentEmail[];
  subscriberTags: string[];
  contactSubmissions: ContactSubmission[];
  activityLog: ActivityLogEntry[];
  emailAutomations: EmailAutomation[];
  automationQueue: AutomationQueueItem[];
  emailTemplates: EmailTemplate[];
  siteSettings?: SiteSettings;
}

const defaultData: DatabaseSchema = {
  users: [],
  refreshTokens: [],
  customerUsers: [],
  customerRefreshTokens: [],
  shippingAddresses: [],
  wishlistItems: [],
  orders: [],
  products: [],
  coachingPackages: [],
  learnItems: [],
  blogPosts: [],
  testimonials: [],
  faqs: [],
  subscribers: [],
  emailDrafts: [],
  sentEmails: [],
  subscriberTags: ['VIP', 'Workshop Attendee', 'Coaching Client'],
  contactSubmissions: [],
  activityLog: [],
  emailAutomations: [],
  automationQueue: [],
  emailTemplates: [],
};

const dbPath = process.env.DATABASE_PATH || join(__dirname, '../../data/db.json');
const adapter = new JSONFile<DatabaseSchema>(dbPath);
const db = new Low<DatabaseSchema>(adapter, defaultData);

export async function initDatabase() {
  await db.read();
  if (!db.data) {
    db.data = defaultData;
    await db.write();
  }
  return db;
}

export { db };
