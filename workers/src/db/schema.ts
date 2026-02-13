import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Helper for generating IDs (use crypto.randomUUID() at runtime)
// For D1/SQLite, we use text IDs instead of native UUID

// ============================================
// ADMIN USERS & AUTH
// ============================================

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['admin', 'superadmin', 'editor'] }).notNull().default('admin'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
}));

export const refreshTokens = sqliteTable('refresh_tokens', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  userIdIdx: index('refresh_tokens_user_id_idx').on(table.userId),
  tokenIdx: uniqueIndex('refresh_tokens_token_idx').on(table.token),
}));

// ============================================
// CUSTOMER USERS & AUTH
// ============================================

export const customerUsers = sqliteTable('customer_users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  role: text('role', { enum: ['customer'] }).notNull().default('customer'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  verificationToken: text('verification_token'),
  verificationTokenExpiry: text('verification_token_expiry'),
  resetToken: text('reset_token'),
  resetTokenExpiry: text('reset_token_expiry'),
  stripeCustomerId: text('stripe_customer_id'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  lastLoginAt: text('last_login_at'),
}, (table) => ({
  emailIdx: uniqueIndex('customer_users_email_idx').on(table.email),
  stripeCustomerIdx: index('customer_users_stripe_customer_idx').on(table.stripeCustomerId),
}));

export const customerRefreshTokens = sqliteTable('customer_refresh_tokens', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => customerUsers.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  userIdIdx: index('customer_refresh_tokens_user_id_idx').on(table.userId),
  tokenIdx: uniqueIndex('customer_refresh_tokens_token_idx').on(table.token),
}));

// ============================================
// SHIPPING ADDRESSES
// ============================================

export const shippingAddresses = sqliteTable('shipping_addresses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => customerUsers.id, { onDelete: 'cascade' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  address: text('address').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  postcode: text('postcode').notNull(),
  country: text('country').notNull().default('Australia'),
  phone: text('phone'),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  userIdIdx: index('shipping_addresses_user_id_idx').on(table.userId),
}));

// ============================================
// PRODUCTS (unified: wearable, wall-art, digital)
// ============================================

export const products = sqliteTable('products', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  productType: text('product_type', { enum: ['wearable', 'wall-art', 'digital'] }).notNull().default('wearable'),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),

  // Pricing
  price: text('price').notNull(), // stored as decimal string e.g. '89.00'
  compareAtPrice: text('compare_at_price'),
  costPrice: text('cost_price'),
  currency: text('currency').notNull().default('AUD'),
  taxable: integer('taxable', { mode: 'boolean' }).notNull().default(true),

  // Descriptions
  shortDescription: text('short_description'),
  longDescription: text('long_description'),

  // Organisation
  category: text('category').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
  badge: text('badge'),

  // Physical attributes (nullable for digital)
  weightGrams: integer('weight_grams'),
  dimensions: text('dimensions'),

  // Inventory
  trackInventory: integer('track_inventory', { mode: 'boolean' }).notNull().default(true),
  quantity: integer('quantity').notNull().default(1),
  continueSelling: integer('continue_selling', { mode: 'boolean' }).notNull().default(false),
  availability: text('availability').notNull().default('In stock'),

  // Media (primary image shortcut for listings)
  image: text('image').notNull().default(''),
  detailImages: text('detail_images', { mode: 'json' }).$type<string[]>().default([]),

  // Stripe
  stripeProductId: text('stripe_product_id'),
  stripePriceId: text('stripe_price_id'),

  // Ratings (aggregated)
  rating: real('rating'),
  reviewCount: integer('review_count').default(0),

  // SEO
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  ogImage: text('og_image'),

  // Lifecycle
  status: text('status', { enum: ['draft', 'active', 'scheduled', 'archived', 'discontinued'] }).notNull().default('draft'),
  publishedAt: text('published_at'),
  scheduledFor: text('scheduled_for'),
  displayOrder: integer('display_order').default(0),

  // Backward compat (kept during transition)
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),

  // Soft delete
  deletedAt: text('deleted_at'),

  // Timestamps
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  slugIdx: uniqueIndex('products_slug_idx').on(table.slug),
  categoryIdx: index('products_category_idx').on(table.category),
  archivedIdx: index('products_archived_idx').on(table.archived),
  statusIdx: index('products_status_idx').on(table.status),
  productTypeIdx: index('products_product_type_idx').on(table.productType),
  deletedAtIdx: index('products_deleted_at_idx').on(table.deletedAt),
  statusTypeDeletedIdx: index('products_status_type_deleted_idx').on(table.status, table.productType, table.deletedAt),
}));

// Wall art products table kept read-only for rollback safety during Phase 1
// Will be dropped in Phase 2 migration
export const wallArtProducts = sqliteTable('wall_art_products', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  price: text('price').notNull(),
  currency: text('currency').notNull().default('AUD'),
  category: text('category', { enum: ['Prints', 'Originals', 'Mixed Media'] }).notNull(),
  shortDescription: text('short_description'),
  longDescription: text('long_description'),
  dimensions: text('dimensions'),
  image: text('image').notNull(),
  detailImages: text('detail_images', { mode: 'json' }).$type<string[]>().default([]),
  badge: text('badge'),
  rating: real('rating'),
  reviewCount: integer('review_count').default(0),
  availability: text('availability').notNull().default('In stock'),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  stripeProductId: text('stripe_product_id'),
  stripePriceId: text('stripe_price_id'),
  displayOrder: integer('display_order').default(0),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  slugIdx: uniqueIndex('wall_art_products_slug_idx').on(table.slug),
  categoryIdx: index('wall_art_products_category_idx').on(table.category),
  archivedIdx: index('wall_art_products_archived_idx').on(table.archived),
}));

// ============================================
// PRODUCT MEDIA
// ============================================

export const productMedia = sqliteTable('product_media', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  variantId: text('variant_id'),
  url: text('url').notNull(),
  filename: text('filename').notNull(),
  altText: text('alt_text').notNull().default(''),
  width: integer('width'),
  height: integer('height'),
  fileSize: integer('file_size'),
  mimeType: text('mime_type'),
  isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  productIdIdx: index('product_media_product_id_idx').on(table.productId),
  sortOrderIdx: index('product_media_sort_order_idx').on(table.sortOrder),
}));

// ============================================
// SLUG REDIRECTS
// ============================================

export const slugRedirects = sqliteTable('slug_redirects', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  oldSlug: text('old_slug').notNull().unique(),
  newSlug: text('new_slug').notNull(),
  productType: text('product_type').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  oldSlugIdx: uniqueIndex('slug_redirects_old_slug_idx').on(table.oldSlug),
}));

// ============================================
// WISHLIST
// ============================================

export const wishlistItems = sqliteTable('wishlist_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => customerUsers.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  addedAt: text('added_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  userIdIdx: index('wishlist_items_user_id_idx').on(table.userId),
  userProductIdx: uniqueIndex('wishlist_items_user_product_idx').on(table.userId, table.productId),
}));

// ============================================
// ORDERS
// ============================================

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').references(() => customerUsers.id, { onDelete: 'set null' }),
  orderNumber: text('order_number').notNull().unique(),
  status: text('status', { enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] }).notNull().default('pending'),
  subtotal: text('subtotal').notNull(),
  shipping: text('shipping').notNull().default('0'),
  tax: text('tax').notNull().default('0'),
  total: text('total').notNull(),
  currency: text('currency').notNull().default('AUD'),
  shippingFirstName: text('shipping_first_name').notNull(),
  shippingLastName: text('shipping_last_name').notNull(),
  shippingAddress: text('shipping_address').notNull(),
  shippingCity: text('shipping_city').notNull(),
  shippingState: text('shipping_state').notNull(),
  shippingPostcode: text('shipping_postcode').notNull(),
  shippingCountry: text('shipping_country').notNull(),
  shippingPhone: text('shipping_phone'),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  stripeCheckoutSessionId: text('stripe_checkout_session_id'),
  paymentStatus: text('payment_status').default('pending'),
  trackingNumber: text('tracking_number'),
  trackingUrl: text('tracking_url'),
  notes: text('notes'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  paidAt: text('paid_at'),
  shippedAt: text('shipped_at'),
  deliveredAt: text('delivered_at'),
  cancelledAt: text('cancelled_at'),
}, (table) => ({
  orderNumberIdx: uniqueIndex('orders_order_number_idx').on(table.orderNumber),
  userIdIdx: index('orders_user_id_idx').on(table.userId),
  statusIdx: index('orders_status_idx').on(table.status),
  createdAtIdx: index('orders_created_at_idx').on(table.createdAt),
}));

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: text('product_id').references(() => products.id, { onDelete: 'set null' }),
  productName: text('product_name').notNull(),
  productImage: text('product_image'),
  price: text('price').notNull(),
  quantity: integer('quantity').notNull().default(1),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  orderIdIdx: index('order_items_order_id_idx').on(table.orderId),
}));

// ============================================
// COACHING PACKAGES
// ============================================

export const coachingPackages = sqliteTable('coaching_packages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  features: text('features', { mode: 'json' }).$type<string[]>().default([]),
  ctaText: text('cta_text').default('Apply Now'),
  image: text('image'),
  price: text('price'),
  priceAmount: text('price_amount'),
  currency: text('currency').default('AUD'),
  recurring: integer('recurring', { mode: 'boolean' }).notNull().default(false),
  recurringInterval: text('recurring_interval'),
  badge: text('badge'),
  stripeProductId: text('stripe_product_id'),
  stripePriceId: text('stripe_price_id'),
  displayOrder: integer('display_order').default(0),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  // New fields (migration 0005)
  status: text('status', { enum: ['draft', 'scheduled', 'published', 'archived'] }).notNull().default('draft'),
  summary: text('summary'),
  descriptionHtml: text('description_html'),
  descriptionJson: text('description_json'),
  coverImageUrl: text('cover_image_url'),
  priceType: text('price_type', { enum: ['fixed', 'from', 'free', 'inquiry'] }).notNull().default('fixed'),
  durationMinutes: integer('duration_minutes'),
  deliveryMode: text('delivery_mode', { enum: ['online', 'in_person', 'hybrid'] }).notNull().default('online'),
  locationLabel: text('location_label'),
  bookingUrl: text('booking_url'),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  ogImageUrl: text('og_image_url'),
  canonicalUrl: text('canonical_url'),
  tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
  publishedAt: text('published_at'),
  scheduledAt: text('scheduled_at'),
  previousSlugs: text('previous_slugs', { mode: 'json' }).$type<string[]>().default([]),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  slugIdx: uniqueIndex('coaching_packages_slug_idx').on(table.slug),
  displayOrderIdx: index('coaching_packages_display_order_idx').on(table.displayOrder),
  statusIdx: index('coaching_packages_status_idx').on(table.status),
}));

// Coaching Revisions
export const coachingRevisions = sqliteTable('coaching_revisions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  coachingId: text('coaching_id').notNull().references(() => coachingPackages.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  summary: text('summary'),
  descriptionHtml: text('description_html'),
  descriptionJson: text('description_json'),
  features: text('features', { mode: 'json' }).$type<string[]>().default([]),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  savedAt: text('saved_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  coachingIdIdx: index('coaching_revisions_coaching_id_idx').on(table.coachingId),
  savedAtIdx: index('coaching_revisions_saved_at_idx').on(table.savedAt),
}));

// ============================================
// LEARN ITEMS
// ============================================

export const learnItems = sqliteTable('learn_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  subtitle: text('subtitle'),
  type: text('type', { enum: ['ONLINE', 'WORKSHOP'] }).notNull(),
  price: text('price').notNull(),
  priceAmount: text('price_amount'),
  currency: text('currency').default('AUD'),
  image: text('image').notNull(),
  description: text('description'),
  duration: text('duration'),
  format: text('format'),
  level: text('level'),
  nextDate: text('next_date'),
  enrolledCount: integer('enrolled_count').default(0),
  includes: text('includes', { mode: 'json' }).$type<string[]>().default([]),
  outcomes: text('outcomes', { mode: 'json' }).$type<string[]>().default([]),
  modules: text('modules', { mode: 'json' }).$type<{ title: string; description: string }[]>().default([]),
  testimonial: text('testimonial', { mode: 'json' }).$type<{ text: string; author: string; role: string }>(),
  stripeProductId: text('stripe_product_id'),
  stripePriceId: text('stripe_price_id'),
  displayOrder: integer('display_order').default(0),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  // New fields (migration 0005)
  status: text('status', { enum: ['draft', 'scheduled', 'published', 'archived'] }).notNull().default('draft'),
  summary: text('summary'),
  contentHtml: text('content_html'),
  contentJson: text('content_json'),
  coverImageUrl: text('cover_image_url'),
  capacity: integer('capacity'),
  deliveryMode: text('delivery_mode', { enum: ['online', 'in_person', 'hybrid'] }).notNull().default('online'),
  locationLabel: text('location_label'),
  startAt: text('start_at'),
  endAt: text('end_at'),
  timezone: text('timezone').notNull().default('Australia/Sydney'),
  ticketingUrl: text('ticketing_url'),
  evergreen: integer('evergreen', { mode: 'boolean' }).notNull().default(false),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  ogImageUrl: text('og_image_url'),
  canonicalUrl: text('canonical_url'),
  tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
  publishedAt: text('published_at'),
  scheduledAt: text('scheduled_at'),
  previousSlugs: text('previous_slugs', { mode: 'json' }).$type<string[]>().default([]),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  slugIdx: uniqueIndex('learn_items_slug_idx').on(table.slug),
  typeIdx: index('learn_items_type_idx').on(table.type),
  displayOrderIdx: index('learn_items_display_order_idx').on(table.displayOrder),
  statusIdx: index('learn_items_status_idx').on(table.status),
}));

// Workshop Revisions
export const workshopRevisions = sqliteTable('workshop_revisions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workshopId: text('workshop_id').notNull().references(() => learnItems.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  summary: text('summary'),
  contentHtml: text('content_html'),
  contentJson: text('content_json'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  savedAt: text('saved_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  workshopIdIdx: index('workshop_revisions_workshop_id_idx').on(table.workshopId),
  savedAtIdx: index('workshop_revisions_saved_at_idx').on(table.savedAt),
}));

// ============================================
// ENROLLMENTS
// ============================================

export const enrollments = sqliteTable('enrollments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => customerUsers.id, { onDelete: 'cascade' }),
  learnItemId: text('learn_item_id').notNull().references(() => learnItems.id, { onDelete: 'cascade' }),
  orderId: text('order_id').references(() => orders.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('active'),
  enrolledAt: text('enrolled_at').notNull().$defaultFn(() => new Date().toISOString()),
  expiresAt: text('expires_at'),
  completedAt: text('completed_at'),
}, (table) => ({
  userIdIdx: index('enrollments_user_id_idx').on(table.userId),
  learnItemIdIdx: index('enrollments_learn_item_id_idx').on(table.learnItemId),
  userLearnItemIdx: uniqueIndex('enrollments_user_learn_item_idx').on(table.userId, table.learnItemId),
}));

// ============================================
// BLOG POSTS
// ============================================

export const blogPosts = sqliteTable('blog_posts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  excerpt: text('excerpt'),
  content: text('content').notNull(),
  contentJson: text('content_json'),
  date: text('date').notNull(),
  category: text('category').notNull(),
  image: text('image'),
  status: text('status', { enum: ['draft', 'scheduled', 'published', 'archived'] }).notNull().default('draft'),
  published: integer('published', { mode: 'boolean' }).notNull().default(false),
  publishedAt: text('published_at'),
  scheduledAt: text('scheduled_at'),
  authorId: text('author_id').references(() => users.id, { onDelete: 'set null' }),
  authorName: text('author_name'),
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  ogImageUrl: text('og_image_url'),
  canonicalUrl: text('canonical_url'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  slugIdx: uniqueIndex('blog_posts_slug_idx').on(table.slug),
  publishedIdx: index('blog_posts_published_idx').on(table.published),
  categoryIdx: index('blog_posts_category_idx').on(table.category),
  statusIdx: index('blog_posts_status_idx').on(table.status),
  dateIdx: index('blog_posts_date_idx').on(table.date),
}));

// ============================================
// BLOG POST VERSIONS
// ============================================

export const blogPostVersions = sqliteTable('blog_post_versions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  postId: text('post_id').notNull().references(() => blogPosts.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  contentJson: text('content_json'),
  excerpt: text('excerpt'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  savedAt: text('saved_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  postIdIdx: index('blog_post_versions_post_id_idx').on(table.postId),
  savedAtIdx: index('blog_post_versions_saved_at_idx').on(table.savedAt),
}));

// ============================================
// BLOG POST REDIRECTS (SEO slug changes)
// ============================================

export const blogPostRedirects = sqliteTable('blog_post_redirects', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  fromSlug: text('from_slug').notNull(),
  toSlug: text('to_slug').notNull(),
  postId: text('post_id').references(() => blogPosts.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  fromSlugIdx: uniqueIndex('blog_post_redirects_from_slug_idx').on(table.fromSlug),
}));

// ============================================
// TESTIMONIALS
// ============================================

export const testimonials = sqliteTable('testimonials', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  text: text('text').notNull(),
  author: text('author').notNull(),
  role: text('role'),
  type: text('type', { enum: ['shop', 'coaching', 'learn'] }).notNull(),
  rating: integer('rating').default(5),
  image: text('image'),
  displayOrder: integer('display_order').default(0),
  published: integer('published', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  typeIdx: index('testimonials_type_idx').on(table.type),
  publishedIdx: index('testimonials_published_idx').on(table.published),
  displayOrderIdx: index('testimonials_display_order_idx').on(table.displayOrder),
}));

// ============================================
// FAQS
// ============================================

export const faqs = sqliteTable('faqs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  category: text('category', { enum: ['Shop', 'Coaching', 'Learn', 'General'] }).notNull(),
  displayOrder: integer('display_order').default(0),
  published: integer('published', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  categoryIdx: index('faqs_category_idx').on(table.category),
  displayOrderIdx: index('faqs_display_order_idx').on(table.displayOrder),
}));

// ============================================
// NEWSLETTER SUBSCRIBERS
// ============================================

export const subscribers = sqliteTable('subscribers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  source: text('source').notNull().default('website'),
  tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
  subscribed: integer('subscribed', { mode: 'boolean' }).notNull().default(true),
  subscribedAt: text('subscribed_at').notNull().$defaultFn(() => new Date().toISOString()),
  unsubscribedAt: text('unsubscribed_at'),
  lastEmailedAt: text('last_emailed_at'),
  emailsReceived: integer('emails_received').default(0),
  engagementScore: integer('engagement_score').default(0),
  engagementLevel: text('engagement_level').default('new'),
  lastOpenedAt: text('last_opened_at'),
  lastClickedAt: text('last_clicked_at'),
  bounceCount: integer('bounce_count').default(0),
  lastBounceAt: text('last_bounce_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  emailIdx: uniqueIndex('subscribers_email_idx').on(table.email),
  subscribedIdx: index('subscribers_subscribed_idx').on(table.subscribed),
  sourceIdx: index('subscribers_source_idx').on(table.source),
  engagementLevelIdx: index('subscribers_engagement_level_idx').on(table.engagementLevel),
}));

export const subscriberTags = sqliteTable('subscriber_tags', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// ============================================
// EMAIL CAMPAIGNS
// ============================================

export const emailDrafts = sqliteTable('email_drafts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  subject: text('subject').notNull(),
  preheader: text('preheader'),
  body: text('body').notNull(),
  bodyHtml: text('body_html'),
  audience: text('audience', { enum: ['all', 'segment'] }).notNull().default('all'),
  segmentFilters: text('segment_filters', { mode: 'json' }).$type<{ sources?: string[]; tags?: string[] }>(),
  scheduledFor: text('scheduled_for'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const sentEmails = sqliteTable('sent_emails', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  subject: text('subject').notNull(),
  preheader: text('preheader'),
  body: text('body').notNull(),
  bodyHtml: text('body_html'),
  recipientCount: integer('recipient_count').notNull(),
  recipientEmails: text('recipient_emails', { mode: 'json' }).$type<string[]>().default([]),
  audience: text('audience', { enum: ['all', 'segment'] }).notNull(),
  segmentFilters: text('segment_filters', { mode: 'json' }).$type<{ sources?: string[]; tags?: string[] }>(),
  resendId: text('resend_id'),
  sentAt: text('sent_at').notNull().$defaultFn(() => new Date().toISOString()),
  openCount: integer('open_count').default(0),
  clickCount: integer('click_count').default(0),
}, (table) => ({
  sentAtIdx: index('sent_emails_sent_at_idx').on(table.sentAt),
}));

// ============================================
// EMAIL EVENTS (legacy — open/click tracking for sentEmails)
// ============================================

export const emailEvents = sqliteTable('email_events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sentEmailId: text('sent_email_id').notNull().references(() => sentEmails.id, { onDelete: 'cascade' }),
  subscriberEmail: text('subscriber_email').notNull(),
  eventType: text('event_type', { enum: ['open', 'click'] }).notNull(),
  linkUrl: text('link_url'),
  linkIndex: integer('link_index'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  sentEmailIdx: index('email_events_sent_email_idx').on(table.sentEmailId),
  subscriberEmailIdx: index('email_events_subscriber_email_idx').on(table.subscriberEmail),
  eventTypeIdx: index('email_events_event_type_idx').on(table.eventType),
}));

// ============================================
// CAMPAIGNS (unified draft + sent lifecycle)
// ============================================

export const campaigns = sqliteTable('campaigns', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  subject: text('subject').notNull(),
  preheader: text('preheader'),
  body: text('body').notNull().default('[]'),
  bodyHtml: text('body_html'),
  status: text('status', { enum: ['draft', 'scheduled', 'sending', 'sent', 'failed'] }).notNull().default('draft'),
  audience: text('audience', { enum: ['all', 'segment'] }).notNull().default('all'),
  segmentId: text('segment_id'),
  segmentFilters: text('segment_filters', { mode: 'json' }).$type<{ sources?: string[]; tags?: string[]; match?: string; conditions?: any[] }>(),
  scheduledFor: text('scheduled_for'),
  scheduledTimezone: text('scheduled_timezone'),
  sentAt: text('sent_at'),
  recipientCount: integer('recipient_count'),
  recipientSnapshot: text('recipient_snapshot', { mode: 'json' }).$type<{ email: string; subscriberId: string }[]>(),
  deliveredCount: integer('delivered_count').default(0),
  testSentTo: text('test_sent_to', { mode: 'json' }).$type<string[]>(),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  statusIdx: index('campaigns_status_idx').on(table.status),
  scheduledForIdx: index('campaigns_scheduled_for_idx').on(table.scheduledFor),
  sentAtIdx: index('campaigns_sent_at_idx').on(table.sentAt),
  createdByIdx: index('campaigns_created_by_idx').on(table.createdBy),
}));

// ============================================
// CAMPAIGN EVENTS (tracking: opens, clicks, bounces, complaints)
// ============================================

export const campaignEvents = sqliteTable('campaign_events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  subscriberId: text('subscriber_id').references(() => subscribers.id, { onDelete: 'set null' }),
  email: text('email').notNull(),
  eventType: text('event_type', { enum: ['delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed'] }).notNull(),
  metadata: text('metadata', { mode: 'json' }).$type<{ url?: string; linkIndex?: number; bounceType?: string; reason?: string }>(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  campaignIdIdx: index('campaign_events_campaign_id_idx').on(table.campaignId),
  subscriberIdIdx: index('campaign_events_subscriber_id_idx').on(table.subscriberId),
  eventTypeIdx: index('campaign_events_event_type_idx').on(table.eventType),
  createdAtIdx: index('campaign_events_created_at_idx').on(table.createdAt),
  campaignEventIdx: index('campaign_events_campaign_event_idx').on(table.campaignId, table.eventType),
}));

// ============================================
// SEGMENTS (saved audience filters)
// ============================================

export const segments = sqliteTable('segments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  rules: text('rules', { mode: 'json' }).$type<{ match: 'all' | 'any'; conditions: { field: string; operator: string; value: string | number | string[] }[] }>().notNull(),
  subscriberCount: integer('subscriber_count').default(0),
  lastCalculatedAt: text('last_calculated_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  nameIdx: index('segments_name_idx').on(table.name),
}));

// ============================================
// IMPORT JOBS (CSV subscriber imports)
// ============================================

export const importJobs = sqliteTable('import_jobs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  fileName: text('file_name').notNull(),
  status: text('status', { enum: ['pending', 'validating', 'importing', 'completed', 'failed'] }).notNull().default('pending'),
  totalRows: integer('total_rows'),
  validRows: integer('valid_rows'),
  importedRows: integer('imported_rows'),
  skippedDuplicates: integer('skipped_duplicates'),
  skippedInvalid: integer('skipped_invalid'),
  skippedSuppressed: integer('skipped_suppressed'),
  defaultSource: text('default_source'),
  defaultTags: text('default_tags', { mode: 'json' }).$type<string[]>(),
  columnMapping: text('column_mapping', { mode: 'json' }).$type<Record<string, string>>(),
  errors: text('errors', { mode: 'json' }).$type<{ row: number; field: string; message: string }[]>(),
  importedBy: text('imported_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  completedAt: text('completed_at'),
}, (table) => ({
  statusIdx: index('import_jobs_status_idx').on(table.status),
  importedByIdx: index('import_jobs_imported_by_idx').on(table.importedBy),
}));

// ============================================
// SUPPRESSION LIST
// ============================================

export const suppressionList = sqliteTable('suppression_list', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  reason: text('reason', { enum: ['hard_bounce', 'complaint', 'manual', 'consecutive_soft_bounce'] }).notNull(),
  source: text('source').notNull(),
  details: text('details'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  emailIdx: uniqueIndex('suppression_list_email_idx').on(table.email),
  reasonIdx: index('suppression_list_reason_idx').on(table.reason),
}));

// ============================================
// CONTACT SUBMISSIONS
// ============================================

export const contactSubmissions = sqliteTable('contact_submissions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: text('status', { enum: ['unread', 'read', 'archived'] }).notNull().default('unread'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  readAt: text('read_at'),
  respondedAt: text('responded_at'),
  notes: text('notes'),
}, (table) => ({
  statusIdx: index('contact_submissions_status_idx').on(table.status),
  createdAtIdx: index('contact_submissions_created_at_idx').on(table.createdAt),
}));

// ============================================
// ACTIVITY LOG
// ============================================

export const activityLog = sqliteTable('activity_log', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  action: text('action', { enum: ['create', 'update', 'delete', 'publish', 'unpublish', 'send', 'archive', 'duplicate'] }).notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  entityName: text('entity_name'),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  userName: text('user_name'),
  details: text('details'),
  metadata: text('metadata', { mode: 'json' }),
  changedFields: text('changed_fields', { mode: 'json' }).$type<Record<string, { old: unknown; new: unknown }>>(),
  entitySnapshot: text('entity_snapshot', { mode: 'json' }),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  entityTypeIdx: index('activity_log_entity_type_idx').on(table.entityType),
  userIdIdx: index('activity_log_user_id_idx').on(table.userId),
  createdAtIdx: index('activity_log_created_at_idx').on(table.createdAt),
}));

// ============================================
// SITE SETTINGS
// ============================================

export const siteSettings = sqliteTable('site_settings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
}, (table) => ({
  keyIdx: uniqueIndex('site_settings_key_idx').on(table.key),
}));

// ============================================
// EMAIL TEMPLATES
// ============================================

export const emailTemplates = sqliteTable('email_templates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  blocks: text('blocks', { mode: 'json' }).$type<any[]>().notNull().default([]),
  thumbnail: text('thumbnail'),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  category: text('category').default('Custom'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  nameIdx: index('email_templates_name_idx').on(table.name),
  isDefaultIdx: index('email_templates_is_default_idx').on(table.isDefault),
  categoryIdx: index('email_templates_category_idx').on(table.category),
}));

// ============================================
// EMAIL AUTOMATIONS
// ============================================

export interface AutomationStep {
  id: string;
  order: number;
  delayDays: number;
  delayHours: number;
  subject: string;
  body: string;
}

export const emailAutomations = sqliteTable('email_automations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  trigger: text('trigger', { enum: [
    'newsletter_signup', 'purchase', 'coaching_inquiry', 'contact_form', 'manual',
    'form_submission_received', 'order_placed', 'order_fulfilled_or_delivered', 'cart_abandoned',
  ] }).notNull().default('manual'),
  status: text('status', { enum: ['active', 'paused'] }).notNull().default('paused'),
  steps: text('steps', { mode: 'json' }).$type<AutomationStep[]>().default([]),
  subject: text('subject'),
  previewText: text('preview_text'),
  bodyText: text('body_text'),
  bodyHtml: text('body_html'),
  ctaLabel: text('cta_label'),
  ctaUrl: text('cta_url'),
  footerText: text('footer_text'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  sendDelayDays: integer('send_delay_days').notNull().default(0),
  sendDelayHours: integer('send_delay_hours').notNull().default(0),
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
  oneTimePerRecipient: integer('one_time_per_recipient', { mode: 'boolean' }).notNull().default(false),
  lastTriggeredAt: text('last_triggered_at'),
  totalTriggered: integer('total_triggered').default(0),
  totalSent: integer('total_sent').default(0),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  triggerIdx: index('email_automations_trigger_idx').on(table.trigger),
  statusIdx: index('email_automations_status_idx').on(table.status),
  enabledIdx: index('email_automations_enabled_idx').on(table.enabled),
}));

export const automationQueue = sqliteTable('automation_queue', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  automationId: text('automation_id').notNull().references(() => emailAutomations.id, { onDelete: 'cascade' }),
  automationName: text('automation_name'),
  stepId: text('step_id').notNull(),
  stepOrder: integer('step_order').notNull(),
  recipientEmail: text('recipient_email').notNull(),
  recipientName: text('recipient_name'),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  status: text('status', { enum: ['scheduled', 'sent', 'failed', 'cancelled'] }).notNull().default('scheduled'),
  scheduledFor: text('scheduled_for').notNull(),
  sentAt: text('sent_at'),
  error: text('error'),
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  lastAttemptAt: text('last_attempt_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  automationIdIdx: index('automation_queue_automation_id_idx').on(table.automationId),
  recipientEmailIdx: index('automation_queue_recipient_email_idx').on(table.recipientEmail),
  statusIdx: index('automation_queue_status_idx').on(table.status),
  scheduledForIdx: index('automation_queue_scheduled_for_idx').on(table.scheduledFor),
}));

// ============================================
// ANALYTICS & TRACKING
// ============================================

export const analyticsEvents = sqliteTable('analytics_events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  eventType: text('event_type', {
    enum: ['page_view', 'product_view', 'add_to_cart', 'checkout_start', 'blog_read', 'search'],
  }).notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  sessionId: text('session_id').notNull(),
  referrer: text('referrer'),
  pathname: text('pathname').notNull(),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  typeIdx: index('analytics_events_type_idx').on(table.eventType),
  entityIdx: index('analytics_events_entity_idx').on(table.entityType, table.entityId),
  sessionIdx: index('analytics_events_session_idx').on(table.sessionId),
  createdAtIdx: index('analytics_events_created_at_idx').on(table.createdAt),
  pathnameIdx: index('analytics_events_pathname_idx').on(table.pathname),
}));

// ============================================
// COHORTS (scheduled instances of workshops)
// ============================================

export const cohorts = sqliteTable('cohorts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  learnItemId: text('learn_item_id').notNull().references(() => learnItems.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  status: text('status', { enum: ['draft', 'open', 'closed', 'in_progress', 'completed', 'cancelled'] }).notNull().default('draft'),
  description: text('description'),
  internalNotes: text('internal_notes'),

  // Scheduling
  startAt: text('start_at'),
  endAt: text('end_at'),
  timezone: text('timezone').notNull().default('Australia/Sydney'),
  registrationOpensAt: text('registration_opens_at'),
  registrationClosesAt: text('registration_closes_at'),

  // Capacity
  capacity: integer('capacity'),
  enrolledCount: integer('enrolled_count').notNull().default(0),
  waitlistEnabled: integer('waitlist_enabled', { mode: 'boolean' }).notNull().default(false),
  waitlistCapacity: integer('waitlist_capacity'),
  waitlistCount: integer('waitlist_count').notNull().default(0),

  // Pricing (overrides learn_item when set)
  price: text('price'),
  compareAtPrice: text('compare_at_price'),
  earlyBirdPrice: text('early_bird_price'),
  earlyBirdEndsAt: text('early_bird_ends_at'),
  currency: text('currency').notNull().default('AUD'),

  // Delivery (overrides learn_item when set)
  deliveryMode: text('delivery_mode', { enum: ['online', 'in_person', 'hybrid'] }),
  locationLabel: text('location_label'),
  locationAddress: text('location_address'),
  meetingUrl: text('meeting_url'),

  // Facilitator
  instructorName: text('instructor_name'),
  instructorEmail: text('instructor_email'),

  // Duplication tracking
  duplicatedFromId: text('duplicated_from_id'),

  // Lifecycle timestamps
  publishedAt: text('published_at'),
  cancelledAt: text('cancelled_at'),
  cancellationReason: text('cancellation_reason'),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  learnItemIdIdx: index('cohorts_learn_item_id_idx').on(table.learnItemId),
  statusIdx: index('cohorts_status_idx').on(table.status),
  slugIdx: uniqueIndex('cohorts_slug_idx').on(table.slug),
  startAtIdx: index('cohorts_start_at_idx').on(table.startAt),
  statusStartIdx: index('cohorts_status_start_idx').on(table.status, table.startAt),
}));

// ============================================
// COHORT SESSIONS
// ============================================

export const cohortSessions = sqliteTable('cohort_sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  cohortId: text('cohort_id').notNull().references(() => cohorts.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  sessionNumber: integer('session_number').notNull(),
  startAt: text('start_at').notNull(),
  endAt: text('end_at'),
  durationMinutes: integer('duration_minutes'),
  locationLabel: text('location_label'),
  meetingUrl: text('meeting_url'),
  status: text('status', { enum: ['scheduled', 'completed', 'cancelled'] }).notNull().default('scheduled'),
  notes: text('notes'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  cohortIdIdx: index('cohort_sessions_cohort_id_idx').on(table.cohortId),
  startAtIdx: index('cohort_sessions_start_at_idx').on(table.startAt),
}));

// ============================================
// COHORT ENROLLMENTS
// ============================================

export const cohortEnrollments = sqliteTable('cohort_enrollments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  cohortId: text('cohort_id').notNull().references(() => cohorts.id, { onDelete: 'cascade' }),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerId: text('customer_id').references(() => customerUsers.id, { onDelete: 'set null' }),
  orderId: text('order_id').references(() => orders.id, { onDelete: 'set null' }),
  status: text('status', { enum: ['active', 'waitlisted', 'cancelled', 'refunded', 'completed', 'no_show'] }).notNull().default('active'),
  pricePaid: text('price_paid'),
  currency: text('currency').notNull().default('AUD'),
  paymentMethod: text('payment_method'),

  // Waitlist
  waitlistPosition: integer('waitlist_position'),
  waitlistAddedAt: text('waitlist_added_at'),
  promotedFromWaitlistAt: text('promoted_from_waitlist_at'),

  // Cancellation
  cancelledAt: text('cancelled_at'),
  cancellationReason: text('cancellation_reason'),
  refundedAt: text('refunded_at'),
  refundAmount: text('refund_amount'),

  // Admin
  enrolledBy: text('enrolled_by').notNull().default('admin'),
  internalNotes: text('internal_notes'),

  // Timestamps
  enrolledAt: text('enrolled_at').notNull().$defaultFn(() => new Date().toISOString()),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  cohortIdIdx: index('cohort_enrollments_cohort_id_idx').on(table.cohortId),
  customerEmailIdx: index('cohort_enrollments_customer_email_idx').on(table.customerEmail),
  statusIdx: index('cohort_enrollments_status_idx').on(table.status),
  cohortEmailIdx: uniqueIndex('cohort_enrollments_cohort_email_idx').on(table.cohortId, table.customerEmail),
}));

// ============================================
// COHORT ATTENDANCE
// ============================================

export const cohortAttendance = sqliteTable('cohort_attendance', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text('session_id').notNull().references(() => cohortSessions.id, { onDelete: 'cascade' }),
  enrollmentId: text('enrollment_id').notNull().references(() => cohortEnrollments.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['present', 'absent', 'late', 'excused'] }).notNull().default('present'),
  checkedInAt: text('checked_in_at'),
  notes: text('notes'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => ({
  sessionIdIdx: index('cohort_attendance_session_id_idx').on(table.sessionId),
  enrollmentIdIdx: index('cohort_attendance_enrollment_id_idx').on(table.enrollmentId),
  sessionEnrollmentIdx: uniqueIndex('cohort_attendance_session_enrollment_idx').on(table.sessionId, table.enrollmentId),
}));

// ============================================
// RELATIONS (for Drizzle query builder)
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  blogPosts: many(blogPosts),
  activityLogs: many(activityLog),
}));

export const customerUsersRelations = relations(customerUsers, ({ many }) => ({
  refreshTokens: many(customerRefreshTokens),
  shippingAddresses: many(shippingAddresses),
  wishlistItems: many(wishlistItems),
  orders: many(orders),
  enrollments: many(enrollments),
}));

export const productsRelations = relations(products, ({ many }) => ({
  media: many(productMedia),
  wishlistItems: many(wishlistItems),
  orderItems: many(orderItems),
}));

export const productMediaRelations = relations(productMedia, ({ one }) => ({
  product: one(products, { fields: [productMedia.productId], references: [products.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(customerUsers, { fields: [orders.userId], references: [customerUsers.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const sentEmailsRelations = relations(sentEmails, ({ many }) => ({
  emailEvents: many(emailEvents),
}));

export const emailEventsRelations = relations(emailEvents, ({ one }) => ({
  sentEmail: one(sentEmails, { fields: [emailEvents.sentEmailId], references: [sentEmails.id] }),
}));

export const emailAutomationsRelations = relations(emailAutomations, ({ many }) => ({
  queueItems: many(automationQueue),
}));

export const automationQueueRelations = relations(automationQueue, ({ one }) => ({
  automation: one(emailAutomations, { fields: [automationQueue.automationId], references: [emailAutomations.id] }),
}));

export const blogPostsRelations = relations(blogPosts, ({ one, many }) => ({
  author: one(users, { fields: [blogPosts.authorId], references: [users.id] }),
  versions: many(blogPostVersions),
  redirects: many(blogPostRedirects),
}));

export const blogPostVersionsRelations = relations(blogPostVersions, ({ one }) => ({
  post: one(blogPosts, { fields: [blogPostVersions.postId], references: [blogPosts.id] }),
  createdByUser: one(users, { fields: [blogPostVersions.createdBy], references: [users.id] }),
}));

export const blogPostRedirectsRelations = relations(blogPostRedirects, ({ one }) => ({
  post: one(blogPosts, { fields: [blogPostRedirects.postId], references: [blogPosts.id] }),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  createdByUser: one(users, { fields: [campaigns.createdBy], references: [users.id] }),
  events: many(campaignEvents),
}));

export const campaignEventsRelations = relations(campaignEvents, ({ one }) => ({
  campaign: one(campaigns, { fields: [campaignEvents.campaignId], references: [campaigns.id] }),
  subscriber: one(subscribers, { fields: [campaignEvents.subscriberId], references: [subscribers.id] }),
}));

export const subscribersRelations = relations(subscribers, ({ many }) => ({
  campaignEvents: many(campaignEvents),
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

export const emailTemplatesRelations = relations(emailTemplates, ({ one }) => ({
  createdByUser: one(users, {
    fields: [emailTemplates.createdBy],
    references: [users.id],
  }),
}));

export const coachingPackagesRelations = relations(coachingPackages, ({ many }) => ({
  revisions: many(coachingRevisions),
}));

export const coachingRevisionsRelations = relations(coachingRevisions, ({ one }) => ({
  coaching: one(coachingPackages, { fields: [coachingRevisions.coachingId], references: [coachingPackages.id] }),
  createdByUser: one(users, { fields: [coachingRevisions.createdBy], references: [users.id] }),
}));

export const learnItemsRelations = relations(learnItems, ({ many }) => ({
  enrollments: many(enrollments),
  revisions: many(workshopRevisions),
  cohorts: many(cohorts),
}));

export const workshopRevisionsRelations = relations(workshopRevisions, ({ one }) => ({
  workshop: one(learnItems, { fields: [workshopRevisions.workshopId], references: [learnItems.id] }),
  createdByUser: one(users, { fields: [workshopRevisions.createdBy], references: [users.id] }),
}));

// Cohort relations
export const cohortsRelations = relations(cohorts, ({ one, many }) => ({
  learnItem: one(learnItems, { fields: [cohorts.learnItemId], references: [learnItems.id] }),
  sessions: many(cohortSessions),
  enrollments: many(cohortEnrollments),
}));

export const cohortSessionsRelations = relations(cohortSessions, ({ one, many }) => ({
  cohort: one(cohorts, { fields: [cohortSessions.cohortId], references: [cohorts.id] }),
  attendance: many(cohortAttendance),
}));

export const cohortEnrollmentsRelations = relations(cohortEnrollments, ({ one, many }) => ({
  cohort: one(cohorts, { fields: [cohortEnrollments.cohortId], references: [cohorts.id] }),
  customer: one(customerUsers, { fields: [cohortEnrollments.customerId], references: [customerUsers.id] }),
  order: one(orders, { fields: [cohortEnrollments.orderId], references: [orders.id] }),
  attendance: many(cohortAttendance),
}));

export const cohortAttendanceRelations = relations(cohortAttendance, ({ one }) => ({
  session: one(cohortSessions, { fields: [cohortAttendance.sessionId], references: [cohortSessions.id] }),
  enrollment: one(cohortEnrollments, { fields: [cohortAttendance.enrollmentId], references: [cohortEnrollments.id] }),
}));
