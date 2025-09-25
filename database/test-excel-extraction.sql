-- Test to check if Excel transactions can be saved
-- This will help identify what's preventing transaction extraction

-- Check if all required columns exist in transactions table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN (
    'date',
    'payment_type', 
    'transaction_name',
    'description',
    'category',
    'credit_amount',
    'debit_amount',
    'balance',
    'source_file',
    'source_type',
    'proof',
    'notes',
    'updated_at'
)
ORDER BY column_name;

-- Try to insert a test transaction to see what error occurs
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
    updated_at
) VALUES (
    '2024-01-15',
    'bank_transfer',
    'Test Excel Transaction',
    'Test transaction from Excel',
    'business_expense',
    0,
    100.00,
    1000.00,
    'test.xlsx',
    'excel',
    'test.xlsx',
    'Test Excel import',
    NOW()
);

-- Check if the test transaction was inserted
SELECT * FROM transactions WHERE source_file = 'test.xlsx';

-- Clean up test data
DELETE FROM transactions WHERE source_file = 'test.xlsx';
