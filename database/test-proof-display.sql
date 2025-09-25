-- TEST PROOF DISPLAY FIX
-- Run this after the main fix to verify everything works

-- ========================================
-- STEP 1: Check Current State
-- ========================================
SELECT '=== TESTING PROOF DISPLAY FIX ===' as info;

-- Count different proof states
SELECT 
  'Total Transactions' as metric,
  COUNT(*) as count
FROM transactions

UNION ALL

SELECT 
  'Transactions with NULL proof (should show upload icon 📤)' as metric,
  COUNT(*) as count
FROM transactions 
WHERE proof IS NULL

UNION ALL

SELECT 
  'Transactions with real proof URLs (should show View link)' as metric,
  COUNT(*) as count
FROM transactions 
WHERE proof IS NOT NULL AND proof LIKE 'http%'

UNION ALL

SELECT 
  'Transactions with dummy proof data (should be 0)' as metric,
  COUNT(*) as count
FROM transactions 
WHERE proof IN ('any', 'No proof', '', 'dummy', 'placeholder', 'sample', 'example');

-- ========================================
-- STEP 2: Show Sample Data
-- ========================================
SELECT '=== SAMPLE TRANSACTIONS ===' as info;

-- Show a few sample transactions with their proof status
SELECT 
  id,
  transaction_name,
  CASE 
    WHEN proof IS NULL THEN '📤 Upload Icon (Empty)'
    WHEN proof LIKE 'http%' THEN '🖼️ View Link (Has Image)'
    ELSE '❌ Problem: ' || COALESCE(proof, 'NULL')
  END as proof_display_status,
  proof as actual_proof_value
FROM transactions 
ORDER BY created_at DESC
LIMIT 5;

-- ========================================
-- STEP 3: Expected Results
-- ========================================
SELECT '=== EXPECTED RESULTS ===' as info;
SELECT '✅ Transactions with NULL proof should show blue upload icon (📤)' as expected_result
UNION ALL
SELECT '✅ Transactions with http URLs should show "View" link with image icon' as expected_result
UNION ALL
SELECT '✅ No transactions should have dummy values like "any"' as expected_result
UNION ALL
SELECT '✅ Upload functionality should work when clicking the upload icon' as expected_result;

SELECT '=== TEST COMPLETE ===' as info;
