-- Add bank statement categories to transactions table
-- This migration adds Income and other common bank statement categories

-- Step 1: Check what categories exist in the current data
SELECT DISTINCT category FROM transactions WHERE category IS NOT NULL;

-- Step 2: Update any invalid categories to valid ones
-- Update any categories that don't match the original constraint to 'business_expense'
UPDATE transactions 
SET category = 'business_expense' 
WHERE category IS NOT NULL 
  AND category NOT IN (
    'business_expense',
    'personal_expense', 
    'travel_transport',
    'meals_entertainment',
    'office_supplies',
    'software_subscriptions',
    'utilities'
  );

-- Step 3: Drop the existing constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_check;

-- Step 4: Add the new constraint with expanded categories
ALTER TABLE transactions ADD CONSTRAINT transactions_category_check 
CHECK (category IN (
    'business_expense',
    'personal_expense', 
    'travel_transport',
    'meals_entertainment',
    'office_supplies',
    'software_subscriptions',
    'utilities',
    'income',
    'salary',
    'business_income',
    'investment',
    'refund',
    'transfer_in',
    'transfer_out',
    'withdrawal',
    'deposit',
    'loan_payment',
    'insurance',
    'medical',
    'education',
    'shopping',
    'entertainment',
    'fuel',
    'maintenance'
));

-- Step 5: Verify the constraint was applied successfully
SELECT DISTINCT category FROM transactions WHERE category IS NOT NULL;
