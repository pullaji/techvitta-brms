-- Complete Fix for Amount Display Issue
-- This script will fix the existing transactions to show amounts properly

-- Step 1: Check current data structure
SELECT 'Current transaction structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;

-- Step 2: Check if we have old amount column
SELECT 'Checking for old amount column:' as info;
SELECT COUNT(*) as transactions_with_amount 
FROM transactions 
WHERE amount IS NOT NULL;

-- Step 3: Add credit_amount and debit_amount columns if they don't exist
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS credit_amount NUMERIC(12,2) DEFAULT 0;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS debit_amount NUMERIC(12,2) DEFAULT 0;

-- Step 4: Update existing transactions to populate credit_amount and debit_amount
-- For transactions with positive amounts, put them in credit_amount
UPDATE transactions 
SET 
  credit_amount = COALESCE(amount, 0),
  debit_amount = 0
WHERE amount > 0 AND (credit_amount IS NULL OR credit_amount = 0);

-- For transactions with negative amounts, put them in debit_amount
UPDATE transactions 
SET 
  credit_amount = 0,
  debit_amount = ABS(COALESCE(amount, 0))
WHERE amount < 0 AND (debit_amount IS NULL OR debit_amount = 0);

-- For transactions with zero amounts, set both to 0
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

-- Step 6: Verify the updates
SELECT 'Updated transactions:' as info;
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
  status
FROM transactions 
ORDER BY created_at DESC;

-- Step 7: Show summary
SELECT 
  'Summary:' as info,
  COUNT(*) as total_transactions,
  SUM(credit_amount) as total_credits,
  SUM(debit_amount) as total_debits,
  SUM(credit_amount - debit_amount) as net_amount
FROM transactions;

-- Step 8: Optional - Remove old amount column if you want to clean up
-- Uncomment the next line if you want to remove the old amount column
-- ALTER TABLE transactions DROP COLUMN IF EXISTS amount;

SELECT 'Fix completed! Refresh your browser to see the amounts.' as message;
