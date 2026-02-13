-- Initial schema for Lyne Tilt

-- Admin Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- Admin Refresh Tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS refresh_tokens_token_idx ON refresh_tokens(token);

-- Customer Users
CREATE TABLE IF NOT EXISTS customer_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer')),
  email_verified INTEGER NOT NULL DEFAULT 0,
  verification_token TEXT,
  verification_token_expiry TEXT,
  reset_token TEXT,
  reset_token_expiry TEXT,
  stripe_customer_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS customer_users_email_idx ON customer_users(email);
CREATE INDEX IF NOT EXISTS customer_users_stripe_customer_idx ON customer_users(stripe_customer_id);

-- Customer Refresh Tokens
CREATE TABLE IF NOT EXISTS customer_refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS customer_refresh_tokens_user_id_idx ON customer_refresh_tokens(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS customer_refresh_tokens_token_idx ON customer_refresh_tokens(token);

-- Shipping Addresses
CREATE TABLE IF NOT EXISTS shipping_addresses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postcode TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Australia',
  phone TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS shipping_addresses_user_id_idx ON shipping_addresses(user_id);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  price TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AUD',
  category TEXT NOT NULL CHECK (category IN ('Earrings', 'Brooches', 'Necklaces')),
  short_description TEXT,
  long_description TEXT,
  image TEXT NOT NULL,
  detail_images TEXT DEFAULT '[]',
  badge TEXT,
  rating REAL,
  review_count INTEGER DEFAULT 0,
  availability TEXT NOT NULL DEFAULT 'In stock',
  archived INTEGER NOT NULL DEFAULT 0,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_idx ON products(slug);
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category);
CREATE INDEX IF NOT EXISTS products_archived_idx ON products(archived);

-- Wishlist Items
CREATE TABLE IF NOT EXISTS wishlist_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  added_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS wishlist_items_user_id_idx ON wishlist_items(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS wishlist_items_user_product_idx ON wishlist_items(user_id, product_id);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES customer_users(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  subtotal TEXT NOT NULL,
  shipping TEXT NOT NULL DEFAULT '0',
  tax TEXT NOT NULL DEFAULT '0',
  total TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AUD',
  shipping_first_name TEXT NOT NULL,
  shipping_last_name TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_state TEXT NOT NULL,
  shipping_postcode TEXT NOT NULL,
  shipping_country TEXT NOT NULL,
  shipping_phone TEXT,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  payment_status TEXT DEFAULT 'pending',
  tracking_number TEXT,
  tracking_url TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT,
  shipped_at TEXT,
  delivered_at TEXT,
  cancelled_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_idx ON orders(order_number);
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_image TEXT,
  price TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);

-- Coaching Packages
CREATE TABLE IF NOT EXISTS coaching_packages (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  features TEXT DEFAULT '[]',
  cta_text TEXT DEFAULT 'Apply Now',
  image TEXT,
  price TEXT,
  price_amount TEXT,
  currency TEXT DEFAULT 'AUD',
  recurring INTEGER NOT NULL DEFAULT 0,
  recurring_interval TEXT,
  badge TEXT,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  display_order INTEGER DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS coaching_packages_slug_idx ON coaching_packages(slug);
CREATE INDEX IF NOT EXISTS coaching_packages_display_order_idx ON coaching_packages(display_order);

-- Learn Items
CREATE TABLE IF NOT EXISTS learn_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subtitle TEXT,
  type TEXT NOT NULL CHECK (type IN ('ONLINE', 'WORKSHOP')),
  price TEXT NOT NULL,
  price_amount TEXT,
  currency TEXT DEFAULT 'AUD',
  image TEXT NOT NULL,
  description TEXT,
  duration TEXT,
  format TEXT,
  level TEXT,
  next_date TEXT,
  enrolled_count INTEGER DEFAULT 0,
  includes TEXT DEFAULT '[]',
  outcomes TEXT DEFAULT '[]',
  modules TEXT DEFAULT '[]',
  testimonial TEXT,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  display_order INTEGER DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS learn_items_slug_idx ON learn_items(slug);
CREATE INDEX IF NOT EXISTS learn_items_type_idx ON learn_items(type);
CREATE INDEX IF NOT EXISTS learn_items_display_order_idx ON learn_items(display_order);

-- Enrollments
CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
  learn_item_id TEXT NOT NULL REFERENCES learn_items(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS enrollments_user_id_idx ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS enrollments_learn_item_id_idx ON enrollments(learn_item_id);
CREATE UNIQUE INDEX IF NOT EXISTS enrollments_user_learn_item_idx ON enrollments(user_id, learn_item_id);

-- Blog Posts
CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  image TEXT,
  published INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  meta_title TEXT,
  meta_description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_slug_idx ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS blog_posts_published_idx ON blog_posts(published);
CREATE INDEX IF NOT EXISTS blog_posts_category_idx ON blog_posts(category);

-- Testimonials
CREATE TABLE IF NOT EXISTS testimonials (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  author TEXT NOT NULL,
  role TEXT,
  type TEXT NOT NULL CHECK (type IN ('shop', 'coaching', 'learn')),
  rating INTEGER DEFAULT 5,
  image TEXT,
  display_order INTEGER DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS testimonials_type_idx ON testimonials(type);
CREATE INDEX IF NOT EXISTS testimonials_published_idx ON testimonials(published);
CREATE INDEX IF NOT EXISTS testimonials_display_order_idx ON testimonials(display_order);

-- FAQs
CREATE TABLE IF NOT EXISTS faqs (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Shop', 'Coaching', 'Learn', 'General')),
  display_order INTEGER DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS faqs_category_idx ON faqs(category);
CREATE INDEX IF NOT EXISTS faqs_display_order_idx ON faqs(display_order);

-- Newsletter Subscribers
CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  source TEXT NOT NULL DEFAULT 'website',
  tags TEXT DEFAULT '[]',
  subscribed INTEGER NOT NULL DEFAULT 1,
  subscribed_at TEXT NOT NULL DEFAULT (datetime('now')),
  unsubscribed_at TEXT,
  last_emailed_at TEXT,
  emails_received INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS subscribers_email_idx ON subscribers(email);
CREATE INDEX IF NOT EXISTS subscribers_subscribed_idx ON subscribers(subscribed);
CREATE INDEX IF NOT EXISTS subscribers_source_idx ON subscribers(source);

-- Subscriber Tags
CREATE TABLE IF NOT EXISTS subscriber_tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Email Drafts
CREATE TABLE IF NOT EXISTS email_drafts (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  preheader TEXT,
  body TEXT NOT NULL,
  body_html TEXT,
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'segment')),
  segment_filters TEXT,
  scheduled_for TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sent Emails
CREATE TABLE IF NOT EXISTS sent_emails (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  preheader TEXT,
  body TEXT NOT NULL,
  body_html TEXT,
  recipient_count INTEGER NOT NULL,
  recipient_emails TEXT DEFAULT '[]',
  audience TEXT NOT NULL CHECK (audience IN ('all', 'segment')),
  segment_filters TEXT,
  resend_id TEXT,
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS sent_emails_sent_at_idx ON sent_emails(sent_at);

-- Contact Submissions
CREATE TABLE IF NOT EXISTS contact_submissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  read_at TEXT,
  responded_at TEXT,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS contact_submissions_status_idx ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS contact_submissions_created_at_idx ON contact_submissions(created_at);

-- Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'publish', 'unpublish', 'send')),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT,
  details TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS activity_log_entity_type_idx ON activity_log(entity_type);
CREATE INDEX IF NOT EXISTS activity_log_user_id_idx ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS activity_log_created_at_idx ON activity_log(created_at);

-- Site Settings
CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS site_settings_key_idx ON site_settings(key);
