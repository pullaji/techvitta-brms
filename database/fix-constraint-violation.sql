-- Complete fix for constraint violation
-- Run this step by step to identify and fix all issues

-- Step 1: First, let's see what we're dealing with
SELECT 'Current categories in database:' as info;
SELECT DISTINCT category, COUNT(*) as count
FROM transactions 
WHERE category IS NOT NULL 
GROUP BY category 
ORDER BY count DESC;

-- Step 2: Find problematic rows
SELECT 'Problematic rows found:' as info;
SELECT id, category, amount, notes, created_at
FROM transactions 
WHERE category IS NOT NULL 
  AND category NOT IN (
    'business_expense',
    'personal_expense', 
    'travel_transport',
    'meals_entertainment',
    'office_supplies',
    'software_subscriptions',
    'utilities'
  )
ORDER BY created_at DESC;

-- Step 3: Fix empty strings and trim whitespace
UPDATE transactions 
SET category = NULL 
WHERE category = '' OR TRIM(category) = '';

UPDATE transactions 
SET category = TRIM(category)
WHERE category IS NOT NULL;

-- Step 4: Fix any invalid categories by mapping them to valid ones
-- Common mappings for problematic categories
UPDATE transactions 
SET category = 'business_expense'
WHERE category IN ('General', 'general', 'GENERAL', 'Business', 'business');

UPDATE transactions 
SET category = 'personal_expense'
WHERE category IN ('Personal', 'personal', 'PERSONAL');

UPDATE transactions 
SET category = 'meals_entertainment'
WHERE category IN ('Food', 'food', 'FOOD', 'Meals', 'meals', 'MEALS');

UPDATE transactions 
SET category = 'travel_transport'
WHERE category IN ('Travel', 'travel', 'TRAVEL', 'Transport', 'transport');

-- Step 5: Fix any remaining invalid categories to business_expense
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

-- Step 6: Verify all categories are now valid
SELECT 'Categories after cleanup:' as info;
SELECT DISTINCT category, COUNT(*) as count
FROM transactions 
WHERE category IS NOT NULL 
GROUP BY category 
ORDER BY count DESC;

-- Step 7: Drop and recreate the constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_check;

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

-- Step 8: Final verification
SELECT 'Migration completed successfully!' as status;
SELECT 'All categories are now valid:' as info;
SELECT DISTINCT category FROM transactions WHERE category IS NOT NULL;
