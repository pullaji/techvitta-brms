-- Test Database Connection and Tables
-- Run this to verify everything is working

-- Test 1: Check if all tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('admin', 'transactions', 'uploads', 'reports', 'audit_logs', 'settings') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Test 2: Check table structures
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'transactions'
ORDER BY ordinal_position;

-- Test 3: Test inserting a sample transaction
INSERT INTO transactions (amount, transaction_type, category, notes)
VALUES (100.00, 'receipt', 'business_expense', 'Test transaction from database setup')
RETURNING id, amount, category, created_at;

-- Test 4: Verify the transaction was created
SELECT COUNT(*) as transaction_count FROM transactions WHERE notes = 'Test transaction from database setup';

-- Test 5: Test constraint validation (this should fail)
-- INSERT INTO transactions (amount, transaction_type, category, notes)
-- VALUES (100.00, 'receipt', 'invalid_category', 'This should fail');

-- Clean up test data
DELETE FROM transactions WHERE notes = 'Test transaction from database setup';

-- Final verification
SELECT 'Database setup completed successfully!' as status;
