-- Product waitlist (notify when back in stock)
CREATE TABLE IF NOT EXISTS waitlist (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  customer_name TEXT,
  customer_id TEXT REFERENCES customer_users(id),
  status TEXT NOT NULL DEFAULT 'waiting',  -- waiting, notified, purchased, cancelled
  notified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_waitlist_product ON waitlist(product_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_product_email ON waitlist(product_id, email);
