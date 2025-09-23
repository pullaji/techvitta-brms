-- REMOVE DUMMY PROOF DATA
-- This script removes all dummy/placeholder proof data from transactions

-- ========================================
-- STEP 1: Check Current Dummy Data
-- ========================================
SELECT '=== CHECKING CURRENT DUMMY PROOF DATA ===' as info;

-- Count transactions with dummy proof data
SELECT 
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN proof = 'No proof' THEN 1 END) as no_proof_dummy,
  COUNT(CASE WHEN proof LIKE '%test%' THEN 1 END) as test_proof_dummy,
  COUNT(CASE WHEN proof IS NULL THEN 1 END) as null_proof,
  COUNT(CASE WHEN proof = '' THEN 1 END) as empty_proof
FROM transactions;

-- Show examples of dummy data
SELECT 'Sample dummy proof data:' as info;
SELECT id, transaction_name, proof 
FROM transactions 
WHERE proof IN ('No proof', '') OR proof LIKE '%test%' 
LIMIT 10;

-- ========================================
-- STEP 2: Remove Dummy Proof Data
-- ========================================
SELECT '=== REMOVING DUMMY PROOF DATA ===' as info;

-- Remove "No proof" dummy values
UPDATE transactions 
SET proof = NULL 
WHERE proof = 'No proof';

-- Remove test proof data
UPDATE transactions 
SET proof = NULL 
WHERE proof LIKE '%test%';

-- Remove empty proof values (set to NULL instead of empty string)
UPDATE transactions 
SET proof = NULL 
WHERE proof = '';

-- Remove any other common dummy values
UPDATE transactions 
SET proof = NULL 
WHERE proof IN ('dummy', 'placeholder', 'sample', 'example');

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

-- Show remaining proof data (should only be real data now)
SELECT 'Remaining proof data:' as info;
SELECT id, transaction_name, proof 
FROM transactions 
WHERE proof IS NOT NULL AND proof != ''
LIMIT 10;

SELECT '=== DUMMY PROOF DATA REMOVAL COMPLETE ===' as info;
