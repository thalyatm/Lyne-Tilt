-- Migration: Add source tracking to orders and customer_users, import SQ customers
-- This migration:
--   1. Adds 'source' column to orders (default 'website')
--   2. Tags all Squarespace-imported orders
--   3. Adds 'auth_provider' and 'source' columns to customer_users
--   4. Detects existing Google accounts
--   5. Creates customer records from unique Squarespace order names
--   6. Links Squarespace orders to the new customer records

-- Step 1: Add source column to orders
ALTER TABLE orders ADD COLUMN source TEXT NOT NULL DEFAULT 'website';

-- Step 2: Tag all Squarespace-imported orders
UPDATE orders SET source = 'squarespace_migration' WHERE order_number LIKE 'SQ-%';

-- Step 3: Add auth_provider and source to customer_users
ALTER TABLE customer_users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'email';
ALTER TABLE customer_users ADD COLUMN source TEXT NOT NULL DEFAULT 'website';

-- Step 4: Mark existing Google-auth users (those with empty password_hash)
UPDATE customer_users SET auth_provider = 'google' WHERE password_hash = '';

-- Step 5: Insert unique customers extracted from Squarespace orders
-- Deduplicated by LOWER(first_name) + LOWER(last_name)
-- Uses earliest order date as customer created_at
INSERT INTO customer_users (id, email, password_hash, first_name, last_name, role, email_verified, auth_provider, source, created_at, updated_at)
SELECT
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
  'sq-import-' || ROW_NUMBER() OVER (ORDER BY MIN(created_at)) || '@imported.local',
  '',
  TRIM(shipping_first_name),
  TRIM(shipping_last_name),
  'customer',
  0,
  'none',
  'squarespace_migration',
  MIN(created_at),
  MIN(created_at)
FROM orders
WHERE order_number LIKE 'SQ-%'
GROUP BY LOWER(TRIM(shipping_first_name)), LOWER(TRIM(shipping_last_name));

-- Step 6: Link Squarespace orders to the newly created customer records
UPDATE orders
SET user_id = (
  SELECT cu.id FROM customer_users cu
  WHERE cu.source = 'squarespace_migration'
    AND LOWER(TRIM(cu.first_name)) = LOWER(TRIM(orders.shipping_first_name))
    AND LOWER(TRIM(cu.last_name)) = LOWER(TRIM(orders.shipping_last_name))
  LIMIT 1
)
WHERE order_number LIKE 'SQ-%' AND user_id IS NULL;
