-- Migration to add Google OAuth columns to businesses table and category to products table
-- Run this if the columns don't exist

DO $$
BEGIN
    -- Add google_access_token column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' AND column_name = 'google_access_token'
    ) THEN
        ALTER TABLE businesses ADD COLUMN google_access_token TEXT;
        RAISE NOTICE 'Added google_access_token column to businesses table';
    ELSE
        RAISE NOTICE 'google_access_token column already exists in businesses table';
    END IF;

    -- Add google_refresh_token column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' AND column_name = 'google_refresh_token'
    ) THEN
        ALTER TABLE businesses ADD COLUMN google_refresh_token TEXT;
        RAISE NOTICE 'Added google_refresh_token column to businesses table';
    ELSE
        RAISE NOTICE 'google_refresh_token column already exists in businesses table';
    END IF;

    -- Add category column to products table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'category'
    ) THEN
        ALTER TABLE products ADD COLUMN category VARCHAR;
        RAISE NOTICE 'Added category column to products table';
    ELSE
        RAISE NOTICE 'category column already exists in products table';
    END IF;
END $$; 