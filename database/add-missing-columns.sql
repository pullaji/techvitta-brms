-- Add Missing Columns to Existing Transactions Table
-- This script will add the credit_amount and debit_amount columns to your existing table

-- Step 1: Check current table structure
SELECT 'Current table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;

-- Step 2: Add the missing columns
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS credit_amount NUMERIC(12,2) DEFAULT 0;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS debit_amount NUMERIC(12,2) DEFAULT 0;

-- Step 3: Check if we have an old amount column to migrate from
SELECT 'Checking for old amount column:' as info;
SELECT COUNT(*) as transactions_with_amount 
FROM transactions 
WHERE amount IS NOT NULL;

-- Step 4: Migrate existing data from old amount column to new columns
-- Update transactions with positive amounts to credit_amount
UPDATE transactions 
SET 
  credit_amount = COALESCE(amount, 0),
  debit_amount = 0
WHERE amount > 0 AND (credit_amount IS NULL OR credit_amount = 0);

-- Update transactions with negative amounts to debit_amount
UPDATE transactions 
SET 
  credit_amount = 0,
  debit_amount = ABS(COALESCE(amount, 0))
WHERE amount < 0 AND (debit_amount IS NULL OR debit_amount = 0);

-- Update transactions with zero amounts
UPDATE transactions 
SET 
  credit_amount = 0,
  debit_amount = 0
WHERE amount = 0 AND (credit_amount IS NULL AND debit_amount IS NULL);

-- Step 5: Set default values for any remaining null values
UPDATE transactions 
SET credit_amount = 0 
WHERE credit_amount IS NULL;

UPDATE transactions 
SET debit_amount = 0 
WHERE debit_amount IS NULL;

-- Step 6: Verify the new structure
SELECT 'Updated table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;

-- Step 7: Show sample data
SELECT 'Sample transactions with new columns:' as info;
SELECT 
  id,
  date,
  payment_type,
  transaction_name,
  description,
  category,
  COALESCE(amount, 0) as old_amount,
  credit_amount,
  debit_amount,
  proof
FROM transactions 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 8: Summary
SELECT 
  'Summary:' as info,
  COUNT(*) as total_transactions,
  SUM(credit_amount) as total_credits,
  SUM(debit_amount) as total_debits,
  SUM(credit_amount - debit_amount) as net_amount
FROM transactions;

SELECT 'Missing columns added successfully! Refresh your browser.' as message;
