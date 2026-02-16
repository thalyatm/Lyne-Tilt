-- Abandoned cart snapshots
CREATE TABLE IF NOT EXISTS abandoned_carts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  session_id TEXT,
  email TEXT,
  customer_name TEXT,
  customer_id TEXT REFERENCES customer_users(id),
  recovery_token TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'abandoned',  -- abandoned, recovered, expired, converting
  total_value TEXT NOT NULL DEFAULT '0',
  item_count INTEGER NOT NULL DEFAULT 0,
  last_activity_at TEXT NOT NULL DEFAULT (datetime('now')),
  recovered_at TEXT,
  email_sent_at TEXT,
  email_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_email ON abandoned_carts(email);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_status ON abandoned_carts(status);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_recovery ON abandoned_carts(recovery_token);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_activity ON abandoned_carts(last_activity_at);

-- Items in an abandoned cart
CREATE TABLE IF NOT EXISTS abandoned_cart_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  cart_id TEXT NOT NULL REFERENCES abandoned_carts(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  price TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  image TEXT,
  variant TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON abandoned_cart_items(cart_id);
