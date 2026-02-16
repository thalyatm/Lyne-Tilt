-- Discount codes / promotions
CREATE TABLE IF NOT EXISTS discount_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('percentage', 'fixed_amount', 'free_shipping')),
  value REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'AUD',
  min_order_amount REAL,
  max_discount_amount REAL,
  starts_at TEXT,
  expires_at TEXT,
  usage_limit INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  per_customer_limit INTEGER NOT NULL DEFAULT 1,
  first_time_only INTEGER NOT NULL DEFAULT 0,
  applicable_to TEXT NOT NULL DEFAULT 'all' CHECK(applicable_to IN ('all', 'specific_products', 'specific_categories')),
  product_ids TEXT DEFAULT '[]',
  categories TEXT DEFAULT '[]',
  stripe_coupon_id TEXT,
  stripe_promotion_code_id TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS discount_codes_code_idx ON discount_codes(code);
CREATE INDEX IF NOT EXISTS discount_codes_active_idx ON discount_codes(active);
