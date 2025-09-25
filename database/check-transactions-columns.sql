-- Check what columns actually exist in the transactions table
-- Run this first to see the current schema

-- Check all columns in transactions table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;

-- Check if specific columns exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'transaction_date')
        THEN '✅ transaction_date column exists'
        ELSE '❌ transaction_date column does not exist'
    END as transaction_date_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'date')
        THEN '✅ date column exists'
        ELSE '❌ date column does not exist'
    END as date_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'credit_amount')
        THEN '✅ credit_amount column exists'
        ELSE '❌ credit_amount column does not exist'
    END as credit_amount_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'debit_amount')
        THEN '✅ debit_amount column exists'
        ELSE '❌ debit_amount column does not exist'
    END as debit_amount_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'payment_type')
        THEN '✅ payment_type column exists'
        ELSE '❌ payment_type column does not exist'
    END as payment_type_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'source_file')
        THEN '✅ source_file column exists'
        ELSE '❌ source_file column does not exist'
    END as source_file_status;

-- Show the current table structure
SELECT 'Current transactions table structure:' as info;
