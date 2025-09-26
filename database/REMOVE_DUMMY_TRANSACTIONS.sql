-- REMOVE ALL DUMMY/STATIC TRANSACTIONS FROM DATABASE
-- Run this in your Supabase SQL Editor to clean up dummy data

-- ========================================
-- STEP 1: Identify and Remove Dummy Transactions
-- ========================================

-- Show current transactions before cleanup
SELECT 
    'BEFORE CLEANUP' as status,
    COUNT(*) as total_transactions
FROM transactions;

-- Show sample of current transactions
SELECT 
    id,
    date,
    transaction_name,
    description,
    credit_amount,
    debit_amount,
    source_file,
    source_type,
    notes,
    created_at
FROM transactions 
ORDER BY created_at DESC 
LIMIT 10;

-- ========================================
-- STEP 2: Remove Dummy Transactions
-- ========================================

-- Remove test transactions
DELETE FROM transactions 
WHERE notes LIKE '%Test transaction%' 
   OR notes LIKE '%test transaction%'
   OR notes LIKE '%Test Transaction%';

-- Remove transactions with dummy names
DELETE FROM transactions 
WHERE transaction_name IN (
    'Test Transaction',
    'Test Excel Transaction', 
    'Malakala Venkatesh',
    'Dasari Taranga Naveen'
);

-- Remove transactions with dummy descriptions
DELETE FROM transactions 
WHERE description IN (
    'Test Description',
    'Test transaction from Excel file',
    'Test transaction from Excel',
    'Bank statement transaction'
);

-- Remove transactions with dummy source files
DELETE FROM transactions 
WHERE source_file IN (
    'test.xlsx',
    'test_excel.xlsx',
    'test.csv',
    'sample.xlsx'
);

-- Remove transactions with dummy amounts (common test values)
DELETE FROM transactions 
WHERE (credit_amount = 100.00 AND debit_amount = 0.00)
   OR (credit_amount = 1000.00 AND debit_amount = 0.00)
   OR (credit_amount = 20000.00 AND debit_amount = 0.00)
   OR (credit_amount = 30000.00 AND debit_amount = 0.00)
   OR (credit_amount = 50000.00 AND debit_amount = 0.00);

-- Remove transactions with dummy categories
DELETE FROM transactions 
WHERE category IN (
    'others',
    'test',
    'dummy',
    'sample'
) AND notes LIKE '%Test%';

-- ========================================
-- STEP 3: Verify Cleanup
-- ========================================

-- Show transactions after cleanup
SELECT 
    'AFTER CLEANUP' as status,
    COUNT(*) as total_transactions
FROM transactions;

-- Show remaining transactions (should be real user data)
SELECT 
    id,
    date,
    transaction_name,
    description,
    credit_amount,
    debit_amount,
    source_file,
    source_type,
    notes,
    created_at
FROM transactions 
ORDER BY created_at DESC 
LIMIT 10;

-- ========================================
-- STEP 4: Verify No Dummy Data Remains
-- ========================================

-- Check for any remaining test/dummy data
SELECT 
    'REMAINING DUMMY DATA CHECK' as status,
    COUNT(*) as dummy_count
FROM transactions 
WHERE notes LIKE '%Test%' 
   OR notes LIKE '%test%'
   OR notes LIKE '%dummy%'
   OR notes LIKE '%sample%'
   OR transaction_name LIKE '%Test%'
   OR description LIKE '%Test%'
   OR source_file LIKE '%test%';

-- If dummy_count is 0, the cleanup was successful
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM transactions 
              WHERE notes LIKE '%Test%' 
                 OR notes LIKE '%test%'
                 OR notes LIKE '%dummy%'
                 OR notes LIKE '%sample%'
                 OR transaction_name LIKE '%Test%'
                 OR description LIKE '%Test%'
                 OR source_file LIKE '%test%') = 0
        THEN '✅ SUCCESS: All dummy data removed!'
        ELSE '❌ WARNING: Some dummy data still remains'
    END as cleanup_status;

-- ========================================
-- STEP 5: Show Final State
-- ========================================

-- Show final transaction count
SELECT 
    'FINAL STATE' as status,
    COUNT(*) as total_real_transactions,
    COUNT(CASE WHEN source_type = 'excel' THEN 1 END) as excel_transactions,
    COUNT(CASE WHEN source_type = 'pdf' THEN 1 END) as pdf_transactions,
    COUNT(CASE WHEN source_type = 'manual' THEN 1 END) as manual_transactions
FROM transactions;

-- Show recent real transactions
SELECT 
    'RECENT REAL TRANSACTIONS' as info,
    id,
    date,
    transaction_name,
    description,
    credit_amount,
    debit_amount,
    source_file,
    source_type,
    created_at
FROM transactions 
ORDER BY created_at DESC 
LIMIT 5;
