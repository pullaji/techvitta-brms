-- Test script to verify the constraint is working properly

-- Step 1: Check if the constraint exists
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'transactions'::regclass 
  AND conname = 'transactions_category_check';

-- Step 2: Test inserting a valid transaction
INSERT INTO transactions (amount, transaction_type, category, status, notes)
VALUES (100.00, 'receipt', 'business_expense', 'pending', 'Test transaction');

-- Step 3: Test inserting an invalid category (this should fail)
INSERT INTO transactions (amount, transaction_type, category, status, notes)
VALUES (100.00, 'receipt', 'invalid_category', 'pending', 'This should fail');

-- Step 4: Test inserting income category (this should work)
INSERT INTO transactions (amount, transaction_type, category, status, notes)
VALUES (100.00, 'receipt', 'income', 'pending', 'Test income transaction');

-- Step 5: Clean up test data
DELETE FROM transactions WHERE notes LIKE 'Test%';
