-- Gift cards
CREATE TABLE IF NOT EXISTS gift_cards (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  code TEXT NOT NULL UNIQUE,
  initial_balance TEXT NOT NULL,       -- e.g. "50.00"
  current_balance TEXT NOT NULL,       -- e.g. "35.00"
  currency TEXT NOT NULL DEFAULT 'AUD',
  status TEXT NOT NULL DEFAULT 'active',  -- active, depleted, expired, disabled
  purchaser_email TEXT,
  purchaser_name TEXT,
  recipient_email TEXT,
  recipient_name TEXT,
  personal_message TEXT,
  order_id TEXT,                        -- order that purchased this gift card
  expires_at TEXT,                      -- nullable, ISO date
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_gift_cards_code ON gift_cards(code);
CREATE INDEX IF NOT EXISTS idx_gift_cards_status ON gift_cards(status);
CREATE INDEX IF NOT EXISTS idx_gift_cards_recipient ON gift_cards(recipient_email);

-- Gift card transactions (usage history)
CREATE TABLE IF NOT EXISTS gift_card_transactions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  gift_card_id TEXT NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                  -- purchase, redemption, refund, adjustment
  amount TEXT NOT NULL,                -- positive for credits, negative for debits
  balance_after TEXT NOT NULL,
  order_id TEXT,                       -- order where gift card was redeemed
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_gc_transactions_card ON gift_card_transactions(gift_card_id);
