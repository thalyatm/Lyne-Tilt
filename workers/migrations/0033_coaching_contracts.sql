-- Migration: Coaching contracts & payment tracking
-- Admin generates unique payment links with contract terms
-- Client reviews and agrees; admin tracks payment status

CREATE TABLE IF NOT EXISTS coaching_contracts (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES coaching_clients(id) ON DELETE CASCADE,
  package_id TEXT REFERENCES coaching_packages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'AUD',
  status TEXT NOT NULL DEFAULT 'draft',
  payment_token TEXT UNIQUE,
  contract_terms TEXT NOT NULL,
  payment_instructions TEXT,
  stripe_payment_link TEXT,
  sent_at TEXT,
  viewed_at TEXT,
  agreed_at TEXT,
  agreed_ip TEXT,
  paid_at TEXT,
  paid_method TEXT,
  paid_reference TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS coaching_contracts_client_id_idx ON coaching_contracts(client_id);
CREATE UNIQUE INDEX IF NOT EXISTS coaching_contracts_payment_token_idx ON coaching_contracts(payment_token);
CREATE INDEX IF NOT EXISTS coaching_contracts_status_idx ON coaching_contracts(status);
CREATE INDEX IF NOT EXISTS coaching_contracts_created_at_idx ON coaching_contracts(created_at);
