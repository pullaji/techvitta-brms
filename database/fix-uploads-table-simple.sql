-- Simple fix for uploads table missing columns
-- Run this in your Supabase SQL Editor to add missing columns

-- Add extracted_transactions_count column if it doesn't exist
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS extracted_transactions_count INTEGER DEFAULT 0;

-- Add processed_at column if it doesn't exist
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Add processing_error column if it doesn't exist
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS processing_error TEXT;

-- Add file_hash column if it doesn't exist
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- Add metadata column if it doesn't exist
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Verify the fix
SELECT 
    '✅ uploads table fix completed' as status,
    COUNT(*) as total_columns
FROM information_schema.columns 
WHERE table_name = 'uploads';

-- Show all columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'uploads' 
ORDER BY ordinal_position;
