-- COMPLETE DUMMY DATA CLEANUP
-- This script removes ALL dummy, test, and hardcoded data from the database
-- Run this in your Supabase SQL Editor

-- ========================================
-- STEP 1: Show Current State
-- ========================================
SELECT 
    'BEFORE CLEANUP' as status,
    COUNT(*) as total_transactions
FROM transactions;

-- Show sample of current transactions
SELECT 
    'CURRENT TRANSACTIONS' as info,
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
-- STEP 2: Remove ALL Dummy/Test Data
-- ========================================

-- Remove transactions with test/dummy names
DELETE FROM transactions 
WHERE transaction_name IN (
    'Test Transaction',
    'Test Excel Transaction', 
    'Test Excel Debit Transaction',
    'Malakala Venkatesh',
    'Dasari Taranga Naveen',
    'Sample Credit Transaction',
    'Sample Debit Transaction',
    'Sample Deposit Transaction',
    'Sample Withdrawal Transaction',
    'Another Credit Transaction',
    'Another Debit Transaction',
    'Another Deposit Transaction',
    'Test Description',
    'File upload: test.xlsx',
    'Uploaded file: test.xlsx'
);

-- Remove transactions with test/dummy descriptions
DELETE FROM transactions 
WHERE description IN (
    'Test Description',
    'Test transaction from Excel file',
    'Test transaction from Excel',
    'Test debit transaction from Excel file',
    'Test debit transaction created from Excel import',
    'Test transaction created from Excel import',
    'Bank statement transaction',
    'Sample Credit Transaction',
    'Sample Debit Transaction',
    'Sample Deposit Transaction',
    'Sample Withdrawal Transaction',
    'Another Credit Transaction',
    'Another Debit Transaction',
    'Another Deposit Transaction'
);

-- Remove transactions with test/dummy source files
DELETE FROM transactions 
WHERE source_file IN (
    'test.xlsx',
    'test_excel.xlsx',
    'test.csv',
    'sample.xlsx',
    'Book1.xlsx',
    'Book1 (1).xlsx',
    'Output.xlsx'
);

-- Remove transactions with test/dummy notes
DELETE FROM transactions 
WHERE notes LIKE '%Test transaction%' 
   OR notes LIKE '%test transaction%'
   OR notes LIKE '%Test Transaction%'
   OR notes LIKE '%Test Description%'
   OR notes LIKE '%test.xlsx%'
   OR notes LIKE '%sample%'
   OR notes LIKE '%dummy%'
   OR notes LIKE '%Malakala%'
   OR notes LIKE '%Dasari%';

-- Remove transactions with common test amounts
DELETE FROM transactions 
WHERE (credit_amount = 100.00 AND debit_amount = 0.00)
   OR (credit_amount = 1000.00 AND debit_amount = 0.00)
   OR (credit_amount = 20000.00 AND debit_amount = 0.00)
   OR (credit_amount = 30000.00 AND debit_amount = 0.00)
   OR (credit_amount = 50000.00 AND debit_amount = 0.00)
   OR (credit_amount = 0.01 AND debit_amount = 0.00 AND notes LIKE '%File upload%');

-- Remove transactions with test categories
DELETE FROM transactions 
WHERE category IN (
    'others',
    'test',
    'dummy',
    'sample'
) AND (notes LIKE '%Test%' OR transaction_name LIKE '%Test%' OR description LIKE '%Test%');

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
    'REMAINING TRANSACTIONS' as info,
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
-- STEP 4: Final Verification
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
   OR transaction_name LIKE '%Sample%'
   OR description LIKE '%Test%'
   OR description LIKE '%Sample%'
   OR source_file LIKE '%test%'
   OR source_file LIKE '%sample%';

-- Final status
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM transactions 
              WHERE notes LIKE '%Test%' 
                 OR notes LIKE '%test%'
                 OR notes LIKE '%dummy%'
                 OR notes LIKE '%sample%'
                 OR transaction_name LIKE '%Test%'
                 OR transaction_name LIKE '%Sample%'
                 OR description LIKE '%Test%'
                 OR description LIKE '%Sample%'
                 OR source_file LIKE '%test%'
                 OR source_file LIKE '%sample%') = 0
        THEN '✅ SUCCESS: All dummy data removed!'
        ELSE '❌ WARNING: Some dummy data still remains'
    END as cleanup_status;

-- ========================================
-- STEP 5: Show Final State
-- ========================================

-- Show final transaction count by source type
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
