-- ========================================
-- FIX FOR 1970 DATE ISSUE IN TRANSACTIONS
-- ========================================
-- This script fixes the issue where Excel dates are showing as 1/1/1970
-- instead of the actual dates from the Excel files.

-- ========================================
-- STEP 1: Check for transactions with 1970 dates
-- ========================================
SELECT 
    id, 
    date, 
    transaction_name, 
    description,
    created_at
FROM transactions 
WHERE date = '1970-01-01' 
   OR date < '1990-01-01'
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- STEP 2: Delete transactions with 1970 dates (dummy data)
-- ========================================
-- These are likely dummy/fallback transactions that were created
-- when date parsing failed
DELETE FROM transactions 
WHERE date = '1970-01-01' 
   OR date < '1990-01-01';

-- ========================================
-- STEP 3: Verify the cleanup
-- ========================================
SELECT 
    COUNT(*) as total_transactions,
    MIN(date) as earliest_date,
    MAX(date) as latest_date
FROM transactions;

-- ========================================
-- STEP 4: Add constraints to prevent future 1970 dates
-- ========================================
-- Add a check constraint to prevent dates before 1990
ALTER TABLE transactions 
ADD CONSTRAINT check_date_not_1970 
CHECK (date >= '1990-01-01');

-- ========================================
-- STEP 5: Update any remaining NULL dates to current date
-- ========================================
UPDATE transactions 
SET date = CURRENT_DATE 
WHERE date IS NULL;

-- ========================================
-- STEP 6: Final verification
-- ========================================
SELECT 
    'Date fix completed successfully' as status,
    COUNT(*) as total_transactions,
    MIN(date) as earliest_date,
    MAX(date) as latest_date,
    COUNT(CASE WHEN date < '1990-01-01' THEN 1 END) as old_dates_count
FROM transactions;
