-- Test transactions table to ensure it exists and has the right columns
-- Run this in your Supabase SQL Editor

-- Check if transactions table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transactions')
        THEN '✅ transactions table exists'
        ELSE '❌ transactions table does not exist'
    END as table_status;

-- Check all columns in transactions table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;

-- Check if specific required columns exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'date')
        THEN '✅ date column exists'
        ELSE '❌ date column does not exist'
    END as date_column,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'credit_amount')
        THEN '✅ credit_amount column exists'
        ELSE '❌ credit_amount column does not exist'
    END as credit_amount_column,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'debit_amount')
        THEN '✅ debit_amount column exists'
        ELSE '❌ debit_amount column does not exist'
    END as debit_amount_column,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'description')
        THEN '✅ description column exists'
        ELSE '❌ description column does not exist'
    END as description_column,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'transaction_name')
        THEN '✅ transaction_name column exists'
        ELSE '❌ transaction_name column does not exist'
    END as transaction_name_column,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'payment_type')
        THEN '✅ payment_type column exists'
        ELSE '❌ payment_type column does not exist'
    END as payment_type_column,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'category')
        THEN '✅ category column exists'
        ELSE '❌ category column does not exist'
    END as category_column;

-- Test inserting a sample transaction (COMMENTED OUT TO AVOID DUMMY DATA)
-- Uncomment only for testing purposes, then delete the test transaction
/*
INSERT INTO transactions (
    date,
    payment_type,
    transaction_name,
    description,
    category,
    credit_amount,
    debit_amount,
    source_file,
    source_type,
    notes
) VALUES (
    '2024-01-15',
    'bank_transfer',
    'Test Transaction',
    'Test Description',
    'others',
    100.00,
    0.00,
    'test.xlsx',
    'excel',
    'Test transaction to verify table structure'
) RETURNING id, date, transaction_name, credit_amount, debit_amount;
*/

-- Check if the test transaction was inserted
SELECT COUNT(*) as total_transactions FROM transactions;

-- Show recent transactions
SELECT 
    id,
    date,
    transaction_name,
    description,
    category,
    credit_amount,
    debit_amount,
    source_file,
    source_type,
    created_at
FROM transactions 
ORDER BY created_at DESC 
LIMIT 5;
