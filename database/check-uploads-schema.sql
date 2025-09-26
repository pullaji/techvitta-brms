-- Check uploads table schema to identify missing columns
-- Run this in your Supabase SQL Editor to see what columns exist

-- Check all columns in uploads table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'uploads' 
ORDER BY ordinal_position;

-- Check if specific columns exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'uploads' AND column_name = 'status')
        THEN '✅ status column exists'
        ELSE '❌ status column does not exist'
    END as status_column,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'uploads' AND column_name = 'extracted_transactions_count')
        THEN '✅ extracted_transactions_count column exists'
        ELSE '❌ extracted_transactions_count column does not exist'
    END as extracted_transactions_count_column,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'uploads' AND column_name = 'processed_at')
        THEN '✅ processed_at column exists'
        ELSE '❌ processed_at column does not exist'
    END as processed_at_column,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'uploads' AND column_name = 'processing_error')
        THEN '✅ processing_error column exists'
        ELSE '❌ processing_error column does not exist'
    END as processing_error_column;

-- Show the current table structure
SELECT 'Current uploads table structure:' as info;
