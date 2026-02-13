import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// ENUMS
// ============================================

export const userRoleEnum = pgEnum('user_role', ['admin', 'superadmin']);
export const customerRoleEnum = pgEnum('customer_role', ['customer']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']);
export const productCategoryEnum = pgEnum('product_category', ['Earrings', 'Brooches', 'Necklaces']);
export const learnItemTypeEnum = pgEnum('learn_item_type', ['ONLINE', 'WORKSHOP']);
export const testimonialTypeEnum = pgEnum('testimonial_type', ['shop', 'coaching', 'learn']);
export const faqCategoryEnum = pgEnum('faq_category', ['Shop', 'Coaching', 'Learn', 'General']);
export const contactStatusEnum = pgEnum('contact_status', ['unread', 'read', 'archived']);
export const activityActionEnum = pgEnum('activity_action', ['create', 'update', 'delete', 'publish', 'unpublish', 'send', 'schedule', 'cancel_schedule', 'import', 'export', 'activate', 'pause', 'suppress', 'unsuppress']);
export const emailAudienceEnum = pgEnum('email_audience', ['all', 'segment']);
export const campaignStatusEnum = pgEnum('campaign_status', ['draft', 'scheduled', 'sending', 'sent', 'failed']);
export const emailEventTypeEnum = pgEnum('email_event_type', ['delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed']);
export const suppressionReasonEnum = pgEnum('suppression_reason', ['hard_bounce', 'complaint', 'manual', 'consecutive_soft_bounce']);
export const blogPostStatusEnum = pgEnum('blog_post_status', ['draft', 'scheduled', 'published', 'archived']);

// ============================================
// ADMIN USERS & AUTH
// ============================================

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('admin'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
}));

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 500 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('refresh_tokens_user_id_idx').on(table.userId),
  tokenIdx: uniqueIndex('refresh_tokens_token_idx').on(table.token),
}));

// ============================================
// CUSTOMER USERS & AUTH
// ============================================

export const customerUsers = pgTable('customer_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  role: customerRoleEnum('role').notNull().default('customer'),
  emailVerified: boolean('email_verified').notNull().default(false),
  verificationToken: varchar('verification_token', { length: 255 }),
  verificationTokenExpiry: timestamp('verification_token_expiry'),
  resetToken: varchar('reset_token', { length: 255 }),
  resetTokenExpiry: timestamp('reset_token_expiry'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at'),
}, (table) => ({
  emailIdx: uniqueIndex('customer_users_email_idx').on(table.email),
  stripeCustomerIdx: index('customer_users_stripe_customer_idx').on(table.stripeCustomerId),
}));

export const customerRefreshTokens = pgTable('customer_refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => customerUsers.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 500 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('customer_refresh_tokens_user_id_idx').on(table.userId),
  tokenIdx: uniqueIndex('customer_refresh_tokens_token_idx').on(table.token),
}));

// ============================================
// SHIPPING ADDRESSES
// ============================================

export const shippingAddresses = pgTable('shipping_addresses', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => customerUsers.id, { onDelete: 'cascade' }),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  address: text('address').notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  postcode: varchar('postcode', { length: 20 }).notNull(),
  country: varchar('country', { length: 100 }).notNull().default('Australia'),
  phone: varchar('phone', { length: 30 }),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('shipping_addresses_user_id_idx').on(table.userId),
}));

// ============================================
// PRODUCTS
// ============================================

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('AUD'),
  category: productCategoryEnum('category').notNull(),
  shortDescription: text('short_description'),
  longDescription: text('long_description'),
  image: text('image').notNull(),
  detailImages: jsonb('detail_images').$type<string[]>().default([]),
  badge: varchar('badge', { length: 100 }),
  rating: decimal('rating', { precision: 2, scale: 1 }),
  reviewCount: integer('review_count').default(0),
  availability: varchar('availability', { length: 100 }).notNull().default('In stock'),
  archived: boolean('archived').notNull().default(false),
  stripeProductId: varchar('stripe_product_id', { length: 255 }),
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  slugIdx: uniqueIndex('products_slug_idx').on(table.slug),
  categoryIdx: index('products_category_idx').on(table.category),
  archivedIdx: index('products_archived_idx').on(table.archived),
  stripeProductIdx: index('products_stripe_product_idx').on(table.stripeProductId),
}));

// ============================================
// WISHLIST
// ============================================

export const wishlistItems = pgTable('wishlist_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => customerUsers.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  addedAt: timestamp('added_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('wishlist_items_user_id_idx').on(table.userId),
  userProductIdx: uniqueIndex('wishlist_items_user_product_idx').on(table.userId, table.productId),
}));

// ============================================
// ORDERS
// ============================================

export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => customerUsers.id, { onDelete: 'set null' }),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  status: orderStatusEnum('status').notNull().default('pending'),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  shipping: decimal('shipping', { precision: 10, scale: 2 }).notNull().default('0'),
  tax: decimal('tax', { precision: 10, scale: 2 }).notNull().default('0'),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('AUD'),
  // Shipping address snapshot (stored at time of order)
  shippingFirstName: varchar('shipping_first_name', { length: 100 }).notNull(),
  shippingLastName: varchar('shipping_last_name', { length: 100 }).notNull(),
  shippingAddress: text('shipping_address').notNull(),
  shippingCity: varchar('shipping_city', { length: 100 }).notNull(),
  shippingState: varchar('shipping_state', { length: 100 }).notNull(),
  shippingPostcode: varchar('shipping_postcode', { length: 20 }).notNull(),
  shippingCountry: varchar('shipping_country', { length: 100 }).notNull(),
  shippingPhone: varchar('shipping_phone', { length: 30 }),
  // Stripe payment info
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  stripeCheckoutSessionId: varchar('stripe_checkout_session_id', { length: 255 }),
  paymentStatus: varchar('payment_status', { length: 50 }).default('pending'),
  // Tracking
  trackingNumber: varchar('tracking_number', { length: 100 }),
  trackingUrl: text('tracking_url'),
  notes: text('notes'),
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  paidAt: timestamp('paid_at'),
  shippedAt: timestamp('shipped_at'),
  deliveredAt: timestamp('delivered_at'),
  cancelledAt: timestamp('cancelled_at'),
}, (table) => ({
  orderNumberIdx: uniqueIndex('orders_order_number_idx').on(table.orderNumber),
  userIdIdx: index('orders_user_id_idx').on(table.userId),
  statusIdx: index('orders_status_idx').on(table.status),
  createdAtIdx: index('orders_created_at_idx').on(table.createdAt),
  stripePaymentIntentIdx: index('orders_stripe_payment_intent_idx').on(table.stripePaymentIntentId),
}));

export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  // Snapshot of product at time of order
  productName: varchar('product_name', { length: 255 }).notNull(),
  productImage: text('product_image'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  orderIdIdx: index('order_items_order_id_idx').on(table.orderId),
}));

// ============================================
// COACHING PACKAGES
// ============================================

export const coachingPackages = pgTable('coaching_packages', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  features: jsonb('features').$type<string[]>().default([]),
  ctaText: varchar('cta_text', { length: 100 }).default('Apply Now'),
  image: text('image'),
  price: varchar('price', { length: 50 }),
  priceAmount: decimal('price_amount', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('AUD'),
  recurring: boolean('recurring').notNull().default(false),
  recurringInterval: varchar('recurring_interval', { length: 20 }), // 'month', 'year', etc.
  badge: varchar('badge', { length: 100 }),
  stripeProductId: varchar('stripe_product_id', { length: 255 }),
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  displayOrder: integer('display_order').default(0),
  archived: boolean('archived').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  slugIdx: uniqueIndex('coaching_packages_slug_idx').on(table.slug),
  displayOrderIdx: index('coaching_packages_display_order_idx').on(table.displayOrder),
}));

// ============================================
// LEARN ITEMS (Courses & Workshops)
// ============================================

export const learnItems = pgTable('learn_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  subtitle: varchar('subtitle', { length: 255 }),
  type: learnItemTypeEnum('type').notNull(),
  price: varchar('price', { length: 50 }).notNull(),
  priceAmount: decimal('price_amount', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('AUD'),
  image: text('image').notNull(),
  description: text('description'),
  duration: varchar('duration', { length: 100 }),
  format: varchar('format', { length: 100 }),
  level: varchar('level', { length: 50 }),
  nextDate: varchar('next_date', { length: 100 }),
  enrolledCount: integer('enrolled_count').default(0),
  includes: jsonb('includes').$type<string[]>().default([]),
  outcomes: jsonb('outcomes').$type<string[]>().default([]),
  modules: jsonb('modules').$type<{ title: string; description: string }[]>().default([]),
  testimonial: jsonb('testimonial').$type<{ text: string; author: string; role: string }>(),
  stripeProductId: varchar('stripe_product_id', { length: 255 }),
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  displayOrder: integer('display_order').default(0),
  archived: boolean('archived').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  slugIdx: uniqueIndex('learn_items_slug_idx').on(table.slug),
  typeIdx: index('learn_items_type_idx').on(table.type),
  displayOrderIdx: index('learn_items_display_order_idx').on(table.displayOrder),
}));

// ============================================
// ENROLLMENTS (Course/Workshop Purchases)
// ============================================

export const enrollments = pgTable('enrollments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => customerUsers.id, { onDelete: 'cascade' }),
  learnItemId: uuid('learn_item_id').notNull().references(() => learnItems.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  userIdIdx: index('enrollments_user_id_idx').on(table.userId),
  learnItemIdIdx: index('enrollments_learn_item_id_idx').on(table.learnItemId),
  userLearnItemIdx: uniqueIndex('enrollments_user_learn_item_idx').on(table.userId, table.learnItemId),
}));

// ============================================
// BLOG POSTS
// ============================================

export const blogPosts = pgTable('blog_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  excerpt: text('excerpt'),
  content: text('content').notNull(),
  contentJson: text('content_json'),
  date: varchar('date', { length: 20 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  image: text('image'),
  published: boolean('published').notNull().default(false),
  status: blogPostStatusEnum('status').notNull().default('draft'),
  publishedAt: timestamp('published_at'),
  scheduledAt: timestamp('scheduled_at'),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
  authorName: varchar('author_name', { length: 255 }),
  metaTitle: varchar('meta_title', { length: 255 }),
  metaDescription: text('meta_description'),
  ogImageUrl: text('og_image_url'),
  canonicalUrl: text('canonical_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  slugIdx: uniqueIndex('blog_posts_slug_idx').on(table.slug),
  publishedIdx: index('blog_posts_published_idx').on(table.published),
  statusIdx: index('blog_posts_status_idx').on(table.status),
  categoryIdx: index('blog_posts_category_idx').on(table.category),
  dateIdx: index('blog_posts_date_idx').on(table.date),
}));

// ============================================
// TESTIMONIALS
// ============================================

export const testimonials = pgTable('testimonials', {
  id: uuid('id').defaultRandom().primaryKey(),
  text: text('text').notNull(),
  author: varchar('author', { length: 255 }).notNull(),
  role: varchar('role', { length: 255 }),
  type: testimonialTypeEnum('type').notNull(),
  rating: integer('rating').default(5),
  image: text('image'),
  displayOrder: integer('display_order').default(0),
  published: boolean('published').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  typeIdx: index('testimonials_type_idx').on(table.type),
  publishedIdx: index('testimonials_published_idx').on(table.published),
  displayOrderIdx: index('testimonials_display_order_idx').on(table.displayOrder),
}));

// ============================================
// FAQS
// ============================================

export const faqs = pgTable('faqs', {
  id: uuid('id').defaultRandom().primaryKey(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  category: faqCategoryEnum('category').notNull(),
  displayOrder: integer('display_order').default(0),
  published: boolean('published').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  categoryIdx: index('faqs_category_idx').on(table.category),
  displayOrderIdx: index('faqs_display_order_idx').on(table.displayOrder),
}));

// ============================================
// NEWSLETTER SUBSCRIBERS
// ============================================

export const subscribers = pgTable('subscribers', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  source: varchar('source', { length: 100 }).notNull().default('website'),
  tags: jsonb('tags').$type<string[]>().default([]),
  subscribed: boolean('subscribed').notNull().default(true),
  subscribedAt: timestamp('subscribed_at').defaultNow().notNull(),
  unsubscribedAt: timestamp('unsubscribed_at'),
  lastEmailedAt: timestamp('last_emailed_at'),
  emailsReceived: integer('emails_received').default(0),
  engagementScore: integer('engagement_score').default(0),
  engagementLevel: varchar('engagement_level', { length: 20 }).default('new'),
  lastOpenedAt: timestamp('last_opened_at'),
  lastClickedAt: timestamp('last_clicked_at'),
  bounceCount: integer('bounce_count').default(0),
  lastBounceAt: timestamp('last_bounce_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('subscribers_email_idx').on(table.email),
  subscribedIdx: index('subscribers_subscribed_idx').on(table.subscribed),
  sourceIdx: index('subscribers_source_idx').on(table.source),
  engagementLevelIdx: index('subscribers_engagement_level_idx').on(table.engagementLevel),
}));

export const subscriberTags = pgTable('subscriber_tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================
// EMAIL CAMPAIGNS
// ============================================

export const emailDrafts = pgTable('email_drafts', {
  id: uuid('id').defaultRandom().primaryKey(),
  subject: varchar('subject', { length: 255 }).notNull(),
  preheader: varchar('preheader', { length: 255 }),
  body: text('body').notNull(),
  bodyHtml: text('body_html'),
  audience: emailAudienceEnum('audience').notNull().default('all'),
  segmentFilters: jsonb('segment_filters').$type<{ sources?: string[]; tags?: string[] }>(),
  scheduledFor: timestamp('scheduled_for'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const sentEmails = pgTable('sent_emails', {
  id: uuid('id').defaultRandom().primaryKey(),
  subject: varchar('subject', { length: 255 }).notNull(),
  preheader: varchar('preheader', { length: 255 }),
  body: text('body').notNull(),
  bodyHtml: text('body_html'),
  recipientCount: integer('recipient_count').notNull(),
  recipientEmails: jsonb('recipient_emails').$type<string[]>().default([]),
  audience: emailAudienceEnum('audience').notNull(),
  segmentFilters: jsonb('segment_filters').$type<{ sources?: string[]; tags?: string[] }>(),
  resendId: varchar('resend_id', { length: 255 }),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  openCount: integer('open_count').default(0),
  clickCount: integer('click_count').default(0),
}, (table) => ({
  sentAtIdx: index('sent_emails_sent_at_idx').on(table.sentAt),
}));

export const emailSnippets = pgTable('email_snippets', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull().default('Content'),
  blocks: jsonb('blocks').$type<any[]>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================
// CAMPAIGNS (unified draft + sent lifecycle)
// ============================================

export const campaigns = pgTable('campaigns', {
  id: uuid('id').defaultRandom().primaryKey(),
  subject: varchar('subject', { length: 255 }).notNull(),
  preheader: varchar('preheader', { length: 255 }),
  body: text('body').notNull().default('[]'),
  bodyHtml: text('body_html'),
  status: campaignStatusEnum('status').notNull().default('draft'),
  audience: emailAudienceEnum('audience').notNull().default('all'),
  segmentId: uuid('segment_id'),
  segmentFilters: jsonb('segment_filters').$type<{ sources?: string[]; tags?: string[]; match?: string; conditions?: any[] }>(),
  scheduledFor: timestamp('scheduled_for'),
  scheduledTimezone: varchar('scheduled_timezone', { length: 50 }),
  sentAt: timestamp('sent_at'),
  recipientCount: integer('recipient_count'),
  recipientSnapshot: jsonb('recipient_snapshot').$type<{ email: string; subscriberId: string }[]>(),
  deliveredCount: integer('delivered_count').default(0),
  testSentTo: jsonb('test_sent_to').$type<string[]>(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  statusIdx: index('campaigns_status_idx').on(table.status),
  scheduledForIdx: index('campaigns_scheduled_for_idx').on(table.scheduledFor),
  sentAtIdx: index('campaigns_sent_at_idx').on(table.sentAt),
  createdByIdx: index('campaigns_created_by_idx').on(table.createdBy),
}));

// ============================================
// EMAIL EVENTS (tracking: opens, clicks, bounces, complaints)
// ============================================

export const emailEvents = pgTable('email_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  subscriberId: uuid('subscriber_id').references(() => subscribers.id, { onDelete: 'set null' }),
  email: varchar('email', { length: 255 }).notNull(),
  eventType: emailEventTypeEnum('event_type').notNull(),
  metadata: jsonb('metadata').$type<{ url?: string; linkIndex?: number; bounceType?: string; reason?: string }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  campaignIdIdx: index('email_events_campaign_id_idx').on(table.campaignId),
  subscriberIdIdx: index('email_events_subscriber_id_idx').on(table.subscriberId),
  eventTypeIdx: index('email_events_event_type_idx').on(table.eventType),
  createdAtIdx: index('email_events_created_at_idx').on(table.createdAt),
  campaignEventIdx: index('email_events_campaign_event_idx').on(table.campaignId, table.eventType),
}));

// ============================================
// SEGMENTS (saved audience filters)
// ============================================

export const segments = pgTable('segments', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  rules: jsonb('rules').$type<{ match: 'all' | 'any'; conditions: { field: string; operator: string; value: string | number | string[] }[] }>().notNull(),
  subscriberCount: integer('subscriber_count').default(0),
  lastCalculatedAt: timestamp('last_calculated_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  nameIdx: index('segments_name_idx').on(table.name),
}));

// ============================================
// IMPORT JOBS (CSV subscriber imports)
// ============================================

export const importJobs = pgTable('import_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  totalRows: integer('total_rows'),
  validRows: integer('valid_rows'),
  importedRows: integer('imported_rows'),
  skippedDuplicates: integer('skipped_duplicates'),
  skippedInvalid: integer('skipped_invalid'),
  skippedSuppressed: integer('skipped_suppressed'),
  defaultSource: varchar('default_source', { length: 100 }),
  defaultTags: jsonb('default_tags').$type<string[]>(),
  columnMapping: jsonb('column_mapping').$type<Record<string, string>>(),
  errors: jsonb('errors').$type<{ row: number; field: string; message: string }[]>(),
  importedBy: uuid('imported_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  statusIdx: index('import_jobs_status_idx').on(table.status),
  importedByIdx: index('import_jobs_imported_by_idx').on(table.importedBy),
}));

// ============================================
// SUPPRESSION LIST
// ============================================

export const suppressionList = pgTable('suppression_list', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  reason: suppressionReasonEnum('reason').notNull(),
  source: varchar('source', { length: 50 }).notNull(),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('suppression_list_email_idx').on(table.email),
  reasonIdx: index('suppression_list_reason_idx').on(table.reason),
}));

// ============================================
// CONTACT SUBMISSIONS
// ============================================

export const contactSubmissions = pgTable('contact_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  message: text('message').notNull(),
  status: contactStatusEnum('status').notNull().default('unread'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  readAt: timestamp('read_at'),
  respondedAt: timestamp('responded_at'),
  notes: text('notes'),
}, (table) => ({
  statusIdx: index('contact_submissions_status_idx').on(table.status),
  createdAtIdx: index('contact_submissions_created_at_idx').on(table.createdAt),
}));

// ============================================
// ACTIVITY LOG
// ============================================

export const activityLog = pgTable('activity_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  action: activityActionEnum('action').notNull(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: varchar('entity_id', { length: 255 }).notNull(),
  entityName: varchar('entity_name', { length: 255 }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  userName: varchar('user_name', { length: 255 }),
  details: text('details'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  entityTypeIdx: index('activity_log_entity_type_idx').on(table.entityType),
  userIdIdx: index('activity_log_user_id_idx').on(table.userId),
  createdAtIdx: index('activity_log_created_at_idx').on(table.createdAt),
}));

// ============================================
// SITE SETTINGS (JSON storage for flexibility)
// ============================================

export const siteSettings = pgTable('site_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
}, (table) => ({
  keyIdx: uniqueIndex('site_settings_key_idx').on(table.key),
}));

// ============================================
// BLOG POST VERSIONS (Auto-save history)
// ============================================

export const blogPostVersions = pgTable('blog_post_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').references(() => blogPosts.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  contentJson: text('content_json'),
  excerpt: text('excerpt'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  savedAt: timestamp('saved_at').defaultNow().notNull(),
}, (table) => ({
  postIdIdx: index('blog_post_versions_post_id_idx').on(table.postId),
  savedAtIdx: index('blog_post_versions_saved_at_idx').on(table.savedAt),
}));

// ============================================
// BLOG POST REDIRECTS (SEO slug changes)
// ============================================

export const blogPostRedirects = pgTable('blog_post_redirects', {
  id: uuid('id').defaultRandom().primaryKey(),
  fromSlug: varchar('from_slug', { length: 255 }).notNull(),
  toSlug: varchar('to_slug', { length: 255 }).notNull(),
  postId: uuid('post_id').references(() => blogPosts.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  fromSlugIdx: uniqueIndex('blog_post_redirects_from_slug_idx').on(table.fromSlug),
}));

// ============================================
// RELATIONS
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  blogPosts: many(blogPosts),
  activityLogs: many(activityLog),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const customerUsersRelations = relations(customerUsers, ({ many }) => ({
  refreshTokens: many(customerRefreshTokens),
  shippingAddresses: many(shippingAddresses),
  wishlistItems: many(wishlistItems),
  orders: many(orders),
  enrollments: many(enrollments),
}));

export const customerRefreshTokensRelations = relations(customerRefreshTokens, ({ one }) => ({
  user: one(customerUsers, {
    fields: [customerRefreshTokens.userId],
    references: [customerUsers.id],
  }),
}));

export const shippingAddressesRelations = relations(shippingAddresses, ({ one }) => ({
  user: one(customerUsers, {
    fields: [shippingAddresses.userId],
    references: [customerUsers.id],
  }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  wishlistItems: many(wishlistItems),
  orderItems: many(orderItems),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  user: one(customerUsers, {
    fields: [wishlistItems.userId],
    references: [customerUsers.id],
  }),
  product: one(products, {
    fields: [wishlistItems.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(customerUsers, {
    fields: [orders.userId],
    references: [customerUsers.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const learnItemsRelations = relations(learnItems, ({ many }) => ({
  enrollments: many(enrollments),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  user: one(customerUsers, {
    fields: [enrollments.userId],
    references: [customerUsers.id],
  }),
  learnItem: one(learnItems, {
    fields: [enrollments.learnItemId],
    references: [learnItems.id],
  }),
  order: one(orders, {
    fields: [enrollments.orderId],
    references: [orders.id],
  }),
}));

export const blogPostsRelations = relations(blogPosts, ({ one, many }) => ({
  author: one(users, {
    fields: [blogPosts.authorId],
    references: [users.id],
  }),
  versions: many(blogPostVersions),
  redirects: many(blogPostRedirects),
}));

export const blogPostVersionsRelations = relations(blogPostVersions, ({ one }) => ({
  post: one(blogPosts, {
    fields: [blogPostVersions.postId],
    references: [blogPosts.id],
  }),
  createdByUser: one(users, {
    fields: [blogPostVersions.createdBy],
    references: [users.id],
  }),
}));

export const blogPostRedirectsRelations = relations(blogPostRedirects, ({ one }) => ({
  post: one(blogPosts, {
    fields: [blogPostRedirects.postId],
    references: [blogPosts.id],
  }),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id],
  }),
}));

export const siteSettingsRelations = relations(siteSettings, ({ one }) => ({
  updatedByUser: one(users, {
    fields: [siteSettings.updatedBy],
    references: [users.id],
  }),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [campaigns.createdBy],
    references: [users.id],
  }),
  events: many(emailEvents),
}));

export const emailEventsRelations = relations(emailEvents, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [emailEvents.campaignId],
    references: [campaigns.id],
  }),
  subscriber: one(subscribers, {
    fields: [emailEvents.subscriberId],
    references: [subscribers.id],
  }),
}));

export const subscribersRelations = relations(subscribers, ({ many }) => ({
  events: many(emailEvents),
}));

export const segmentsRelations = relations(segments, ({ many }) => ({
  campaigns: many(campaigns),
}));

export const importJobsRelations = relations(importJobs, ({ one }) => ({
  importedByUser: one(users, {
    fields: [importJobs.importedBy],
    references: [users.id],
  }),
}));
