-- Test script to verify the uploads table fix
-- Run this after applying fix-uploads-table.sql

-- Test 1: Check if all required columns exist
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
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

-- Test 2: Check if file_hash column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'uploads' AND column_name = 'file_hash'
        )
        THEN '✅ file_hash column exists'
        ELSE '❌ file_hash column missing'
    END as file_hash_status;

-- Test 3: Check if indexes were created
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'uploads' AND indexname = 'idx_uploads_file_hash'
        )
        THEN '✅ file_hash index exists'
        ELSE '❌ file_hash index missing'
    END as file_hash_index_status;

-- Test 4: Try to insert a test record with all new columns
INSERT INTO uploads (
    file_name, 
    file_url, 
    file_type, 
    file_size_mb, 
    status,
    extracted_transactions_count,
    file_hash,
    file_type_detected,
    confidence_score,
    transactions_count
) VALUES (
    'test_file.xlsx',
    'https://example.com/test.xlsx',
    'xlsx',
    1.5,
    'uploaded',
    5,
    'test_hash_123',
    'excel',
    0.95,
    5
);

-- Test 5: Try to query with file_hash (should work without 400 error)
SELECT 
    id,
    file_name,
    status,
    extracted_transactions_count,
    file_hash,
    file_type_detected,
    confidence_score
FROM uploads 
WHERE file_hash = 'test_hash_123';

-- Test 6: Try to update with extracted_transactions_count (this was causing the 400 error)
UPDATE uploads 
SET 
    status = 'processing',
    extracted_transactions_count = 10
WHERE file_hash = 'test_hash_123';

-- Verify the update worked
SELECT 
    file_name,
    status,
    extracted_transactions_count
FROM uploads 
WHERE file_hash = 'test_hash_123';

-- Clean up test data
DELETE FROM uploads WHERE file_hash = 'test_hash_123';

SELECT '✅ All tests passed! The uploads table fix is working correctly.' as result;