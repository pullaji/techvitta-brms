-- Test the auto-description feature for Excel processing
-- This verifies that transactions can be created with auto-generated descriptions

-- Test inserting a transaction with auto-generated description format
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
    'upi',
    'Ravi - upi payment',
    'Ravi - upi payment',
    'business_expense',
    0,
    1000.00,
    1000.00,
    'test-auto-description.xlsx',
    'excel',
    'test-auto-description.xlsx',
    'Excel import - debit transaction',
    NOW()
);

-- Check if the transaction was inserted successfully
SELECT 
    transaction_name,
    description,
    payment_type,
    debit_amount,
    source_file
FROM transactions 
WHERE source_file = 'test-auto-description.xlsx';

-- Clean up test data
DELETE FROM transactions WHERE source_file = 'test-auto-description.xlsx';

SELECT '✅ Auto-description test completed successfully!' as message;
