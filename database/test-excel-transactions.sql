-- Test script to verify Excel transactions can be created
-- Run this after applying fix-transactions-schema.sql

-- Test 1: Check if all required columns exist
SELECT 
    'transactions' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN (
    'credit_amount',
    'debit_amount', 
    'payment_type',
    'transaction_name',
    'description',
    'source_file',
    'source_type',
    'balance',
    'proof',
    'date'
)
ORDER BY column_name;

-- Test 2: Try to insert a test Excel transaction
INSERT INTO transactions (
    date,
    payment_type,
    transaction_name,
    description,
    category,
    credit_amount,
    debit_amount,
    balance,
    source_file,
    source_type,
    proof,
    notes,
    amount
) VALUES (
    '2024-01-15',
    'bank_transfer',
    'Test Excel Transaction',
    'Test transaction from Excel file',
    'business_expense',
    1000.00,
    0.00,
    5000.00,
    'test_excel.xlsx',
    'excel',
    NULL,
    'Test transaction created from Excel import',
    1000.00
);

-- Test 3: Verify the transaction was created
SELECT 
    id,
    date,
    transaction_name,
    description,
    credit_amount,
    debit_amount,
    source_file,
    source_type,
    category
FROM transactions 
WHERE source_file = 'test_excel.xlsx';

-- Test 4: Try to insert a debit transaction
INSERT INTO transactions (
    date,
    payment_type,
    transaction_name,
    description,
    category,
    credit_amount,
    debit_amount,
    balance,
    source_file,
    source_type,
    proof,
    notes,
    amount
) VALUES (
    '2024-01-16',
    'bank_transfer',
    'Test Excel Debit Transaction',
    'Test debit transaction from Excel file',
    'business_expense',
    0.00,
    500.00,
    4500.00,
    'test_excel.xlsx',
    'excel',
    NULL,
    'Test debit transaction created from Excel import',
    -500.00
);

-- Test 5: Verify both transactions exist
SELECT 
    id,
    date,
    transaction_name,
    credit_amount,
    debit_amount,
    source_file,
    source_type
FROM transactions 
WHERE source_file = 'test_excel.xlsx'
ORDER BY date;

-- Test 6: Check if transactions can be queried like the app does
SELECT 
    id,
    date,
    payment_type,
    transaction_name,
    description,
    category,
    credit_amount,
    debit_amount,
    balance,
    source_file,
    source_type,
    proof,
    notes
FROM transactions 
WHERE source_type = 'excel'
ORDER BY date DESC;

-- Clean up test data
DELETE FROM transactions WHERE source_file = 'test_excel.xlsx';

SELECT '✅ Excel transaction test completed successfully! The schema fix should resolve the issue.' as result;
