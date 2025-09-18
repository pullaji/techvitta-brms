-- Check all constraints on the transactions table (updated for newer PostgreSQL)

-- Step 1: List all constraints on transactions table
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'transactions'::regclass;

-- Step 2: Check the exact constraint definition
SELECT 
    conname,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'transactions'::regclass 
  AND conname LIKE '%category%';

-- Step 3: Check transaction_type constraint
SELECT 
    conname,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'transactions'::regclass 
  AND conname LIKE '%transaction_type%';

-- Step 4: Check status constraint
SELECT 
    conname,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'transactions'::regclass 
  AND conname LIKE '%status%';
