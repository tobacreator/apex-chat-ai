-- Migration: Add composite unique constraint on (business_id, sku) to products table
-- This fixes the ON CONFLICT error in Google Sheets import

-- First, remove the existing unique constraint on sku alone (if it exists)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sku_key;

-- Add the composite unique constraint
ALTER TABLE products ADD CONSTRAINT products_business_id_sku_unique UNIQUE (business_id, sku);

-- Add a comment to document this change
COMMENT ON CONSTRAINT products_business_id_sku_unique ON products IS 'Composite unique constraint for business_id and sku to support ON CONFLICT in Google Sheets import'; 