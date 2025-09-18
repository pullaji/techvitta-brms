-- Fix existing transactions to have separate credit_amount and debit_amount
-- This script will update existing transactions to work with the new schema

-- First, let's see what we have
SELECT id, date, payment_type, transaction_name, description, category, amount, notes 
FROM transactions 
ORDER BY created_at DESC;

-- Update existing transactions to populate credit_amount and debit_amount
-- For now, we'll assume all existing transactions are credits (positive amounts)
UPDATE transactions 
SET 
  credit_amount = COALESCE(amount, 0),
  debit_amount = 0
WHERE credit_amount IS NULL OR debit_amount IS NULL;

-- If you have transactions that should be debits, you can manually update them like this:
-- UPDATE transactions 
-- SET credit_amount = 0, debit_amount = ABS(amount)
-- WHERE transaction_name LIKE '%expense%' OR description LIKE '%payment%';

-- Verify the updates
SELECT id, date, payment_type, transaction_name, credit_amount, debit_amount, status 
FROM transactions 
ORDER BY created_at DESC;

-- Show a summary
SELECT 
  'Total Transactions' as summary,
  COUNT(*) as count,
  SUM(credit_amount) as total_credits,
  SUM(debit_amount) as total_debits
FROM transactions;
