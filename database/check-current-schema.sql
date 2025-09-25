-- Check current schema of uploads and transactions tables
-- Run this first to see what columns currently exist

-- Check uploads table columns
SELECT 
    'uploads' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'uploads' 
ORDER BY ordinal_position;

-- Check transactions table columns
SELECT 
    'transactions' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;

-- Check if tables exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'uploads')
        THEN '✅ uploads table exists'
        ELSE '❌ uploads table does not exist'
    END as uploads_status,
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transactions')
        THEN '✅ transactions table exists'
        ELSE '❌ transactions table does not exist'
    END as transactions_status;
