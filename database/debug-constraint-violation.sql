-- Debug script to identify rows causing constraint violation
-- Run these queries one by one to identify and fix the problem

-- Step 1: Check all categories in your database
SELECT DISTINCT category, COUNT(*) as row_count
FROM transactions 
WHERE category IS NOT NULL 
GROUP BY category 
ORDER BY row_count DESC;

-- Step 2: Find any rows with invalid categories
-- This will show you exactly which rows are problematic
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

-- Step 3: Check for NULL categories (these should be fine)
SELECT COUNT(*) as null_category_count
FROM transactions 
WHERE category IS NULL;

-- Step 4: Check for empty string categories
SELECT COUNT(*) as empty_category_count
FROM transactions 
WHERE category = '';

-- Step 5: Check for categories with extra spaces
SELECT DISTINCT category, COUNT(*) as count
FROM transactions 
WHERE category LIKE ' %' OR category LIKE '% ' OR category LIKE '%  %'
GROUP BY category;
