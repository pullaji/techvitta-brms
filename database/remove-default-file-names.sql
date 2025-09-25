-- REMOVE DEFAULT FILE NAMES FROM PROOF COLUMN
-- This script removes all default file names like "Output.xlsx" and ensures clean upload button display

-- ========================================
-- STEP 1: Check Current Proof Data
-- ========================================
SELECT '=== CHECKING CURRENT PROOF DATA ===' as info;

-- Count transactions with different proof values
SELECT 
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN proof IS NULL THEN 1 END) as null_proof,
  COUNT(CASE WHEN proof = '' THEN 1 END) as empty_proof,
  COUNT(CASE WHEN proof LIKE '%Output.xlsx%' THEN 1 END) as output_xlsx_files,
  COUNT(CASE WHEN proof LIKE '%xlsx%' THEN 1 END) as xlsx_files,
  COUNT(CASE WHEN proof LIKE '%pdf%' THEN 1 END) as pdf_files,
  COUNT(CASE WHEN proof LIKE 'http%' THEN 1 END) as real_urls,
  COUNT(CASE WHEN proof IS NOT NULL AND proof != '' AND proof NOT LIKE 'http%' THEN 1 END) as other_file_names
FROM transactions;

-- Show examples of problematic proof data
SELECT 'Sample problematic proof data:' as info;
SELECT id, transaction_name, proof 
FROM transactions 
WHERE proof LIKE '%Output.xlsx%' OR proof LIKE '%xlsx%' OR proof LIKE '%pdf%' OR proof IN ('any', 'No proof', '')
LIMIT 15;

-- ========================================
-- STEP 2: Remove All Default File Names
-- ========================================
SELECT '=== REMOVING DEFAULT FILE NAMES ===' as info;

-- Remove "Output.xlsx" files
UPDATE transactions 
SET proof = NULL 
WHERE proof LIKE '%Output.xlsx%';

-- Remove any .xlsx files (these are likely default/placeholder)
UPDATE transactions 
SET proof = NULL 
WHERE proof LIKE '%.xlsx%';

-- Remove any .pdf files that are not real URLs
UPDATE transactions 
SET proof = NULL 
WHERE proof LIKE '%.pdf%' AND proof NOT LIKE 'http%';

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

-- Remove any file names that don't look like real URLs
UPDATE transactions 
SET proof = NULL 
WHERE proof IS NOT NULL 
  AND proof != '' 
  AND proof NOT LIKE 'http%' 
  AND proof NOT LIKE 'https%'
  AND (proof LIKE '%.%' OR proof LIKE '%file%' OR proof LIKE '%document%');

-- ========================================
-- STEP 3: Verify Cleanup
-- ========================================
SELECT '=== VERIFICATION AFTER CLEANUP ===' as info;

-- Count transactions after cleanup
SELECT 
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN proof IS NULL THEN 1 END) as null_proof_should_show_upload_button,
  COUNT(CASE WHEN proof IS NOT NULL AND proof != '' THEN 1 END) as real_proof_data
FROM transactions;

-- Show remaining proof data (should only be real URLs or NULL now)
SELECT 'Remaining proof data (should only be real URLs):' as info;
SELECT id, transaction_name, proof 
FROM transactions 
WHERE proof IS NOT NULL AND proof != ''
LIMIT 10;

-- ========================================
-- STEP 4: Final Check
-- ========================================
SELECT '=== FINAL CHECK ===' as info;

-- Check for any remaining problematic values
SELECT 'Checking for any remaining problematic proof values:' as info;
SELECT 
  proof,
  COUNT(*) as count
FROM transactions 
WHERE proof IS NOT NULL 
GROUP BY proof 
ORDER BY count DESC;

SELECT '=== DEFAULT FILE NAMES REMOVAL COMPLETE ===' as info;
SELECT 'Now all transactions should show "Upload the proof" button instead of file names' as result;
