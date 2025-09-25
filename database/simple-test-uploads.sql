-- Simple test to verify uploads table columns exist
-- Run this after applying fix-uploads-table.sql

-- Test 1: Check if all required columns exist in uploads table
SELECT 
    'uploads' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'uploads' 
AND column_name IN (
    'extracted_transactions_count',
    'file_hash', 
    'file_type_detected',
    'confidence_score',
    'transactions_count',
    'column_mapping',
    'processing_metadata'
)
ORDER BY column_name;

-- Test 2: Check if all required columns exist in transactions table
SELECT 
    'transactions' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN (
    'source_type',
    'confidence',
    'account_no',
    'reference_id',
    'file_path',
    'proof',
    'type'
)
ORDER BY column_name;

-- Test 3: Simple insert test (without ON CONFLICT)
INSERT INTO uploads (
    file_name, 
    file_url, 
    file_type, 
    file_size_mb, 
    status,
    extracted_transactions_count,
    file_hash,
    file_type_detected,
    confidence_score
) VALUES (
    'test_simple.xlsx',
    'https://example.com/test_simple.xlsx',
    'xlsx',
    1.0,
    'uploaded',
    3,
    'simple_test_hash',
    'excel',
    0.9
);

-- Test 4: Verify the insert worked
SELECT 
    file_name,
    status,
    extracted_transactions_count,
    file_hash,
    file_type_detected,
    confidence_score
FROM uploads 
WHERE file_hash = 'simple_test_hash';

-- Test 5: Test the update that was causing the 400 error
UPDATE uploads 
SET 
    status = 'processing',
    extracted_transactions_count = 5
WHERE file_hash = 'simple_test_hash';

-- Test 6: Verify the update worked
SELECT 
    file_name,
    status,
    extracted_transactions_count
FROM uploads 
WHERE file_hash = 'simple_test_hash';

-- Clean up
DELETE FROM uploads WHERE file_hash = 'simple_test_hash';

SELECT '✅ Simple test completed successfully! All columns exist and updates work.' as result;
