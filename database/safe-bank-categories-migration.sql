-- Safe migration to add bank statement categories
-- This approach is safer and handles existing data properly

-- Step 1: First, let's see what categories currently exist
SELECT DISTINCT category, COUNT(*) as count 
FROM transactions 
WHERE category IS NOT NULL 
GROUP BY category 
ORDER BY count DESC;

-- Step 2: If there are any problematic categories, update them
-- (Only run this if you see invalid categories in step 1)
-- UPDATE transactions 
-- SET category = 'business_expense' 
-- WHERE category = 'invalid_category_name';

-- Step 3: Drop the existing constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_check;

-- Step 4: Add the new constraint with all categories
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

-- Step 5: Verify everything is working
SELECT 'Migration completed successfully!' as status;
SELECT DISTINCT category FROM transactions WHERE category IS NOT NULL;
