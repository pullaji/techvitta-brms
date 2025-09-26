-- QUICK FIX for uploads table to prevent 406 errors
-- Run this in your Supabase SQL Editor

-- First, check what columns currently exist
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'uploads' 
ORDER BY ordinal_position;

-- Add missing columns that are causing 406 errors
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS file_hash TEXT;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS extracted_transactions_count INTEGER DEFAULT 0;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS processing_error TEXT;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Verify the fix
SELECT 
    '✅ uploads table fix completed' as status,
    COUNT(*) as total_columns
FROM information_schema.columns 
WHERE table_name = 'uploads';

-- Show all columns after fix
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'uploads' 
ORDER BY ordinal_position;
