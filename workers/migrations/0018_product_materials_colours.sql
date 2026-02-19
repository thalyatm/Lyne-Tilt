-- Add materials and colours columns to products table
ALTER TABLE products ADD COLUMN materials TEXT DEFAULT '[]';
ALTER TABLE products ADD COLUMN colours TEXT DEFAULT '[]';
