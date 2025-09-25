-- FIX PROOF COLUMN DISPLAY ISSUE
-- This script fixes the proof column showing "any" instead of proper upload icons

-- ========================================
-- STEP 1: Check Current Proof Data
-- ========================================
SELECT '=== CHECKING CURRENT PROOF DATA ===' as info;

-- Count transactions with different proof values
SELECT 
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN proof IS NULL THEN 1 END) as null_proof,
  COUNT(CASE WHEN proof = '' THEN 1 END) as empty_proof,
  COUNT(CASE WHEN proof = 'any' THEN 1 END) as any_proof,
  COUNT(CASE WHEN proof = 'No proof' THEN 1 END) as no_proof_dummy,
  COUNT(CASE WHEN proof LIKE '%test%' THEN 1 END) as test_proof_dummy,
  COUNT(CASE WHEN proof LIKE 'http%' THEN 1 END) as real_urls,
  COUNT(CASE WHEN proof IS NOT NULL AND proof != '' AND proof != 'any' AND proof != 'No proof' AND proof NOT LIKE '%test%' AND proof NOT LIKE 'http%' THEN 1 END) as other_values
FROM transactions;

-- Show examples of problematic proof data
SELECT 'Sample problematic proof data:' as info;
SELECT id, transaction_name, proof 
FROM transactions 
WHERE proof IN ('any', 'No proof', '') OR proof LIKE '%test%' OR proof LIKE '%dummy%'
LIMIT 10;

-- ========================================
-- STEP 2: Remove All Dummy Proof Data
-- ========================================
SELECT '=== REMOVING DUMMY PROOF DATA ===' as info;

-- Remove "any" dummy values
UPDATE transactions 
SET proof = NULL 
WHERE proof = 'any';

-- Remove "No proof" dummy values
UPDATE transactions 
SET proof = NULL 
WHERE proof = 'No proof';

-- Remove test proof data
UPDATE transactions 
SET proof = NULL 
WHERE proof LIKE '%test%';

-- Remove empty proof values
UPDATE transactions 
SET proof = NULL 
WHERE proof = '';

-- Remove any other common dummy values
UPDATE transactions 
SET proof = NULL 
WHERE proof IN ('dummy', 'placeholder', 'sample', 'example', 'none', 'n/a', 'na');

-- ========================================
-- STEP 3: Verify Cleanup
-- ========================================
SELECT '=== VERIFICATION AFTER CLEANUP ===' as info;

-- Count transactions after cleanup
SELECT 
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN proof IS NULL THEN 1 END) as null_proof,
  COUNT(CASE WHEN proof IS NOT NULL AND proof != '' THEN 1 END) as real_proof_data
FROM transactions;

-- Show remaining proof data (should only be real URLs or NULL now)
SELECT 'Remaining proof data:' as info;
SELECT id, transaction_name, proof 
FROM transactions 
WHERE proof IS NOT NULL AND proof != ''
LIMIT 10;

-- ========================================
-- STEP 4: Ensure Proper Column Setup
-- ========================================
SELECT '=== ENSURING PROPER COLUMN SETUP ===' as info;

-- Make sure proof column exists and is properly configured
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS proof TEXT;

-- Add comment to clarify the column purpose
COMMENT ON COLUMN transactions.proof IS 'File URL or reference to proof document. NULL means no proof uploaded.';

SELECT '=== PROOF COLUMN FIX COMPLETE ===' as info;
SELECT 'Now the proof column should show upload icons (📤) for empty transactions' as result;
