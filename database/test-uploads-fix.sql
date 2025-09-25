-- Test script to verify uploads table fix
-- Run this after applying fix-uploads-table.sql

-- Test 1: Check if uploads table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'uploads') 
        THEN '✅ uploads table exists'
        ELSE '❌ uploads table missing'
    END as test_1_table_exists;

-- Test 2: Check if file_hash column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'uploads' AND column_name = 'file_hash'
        ) 
        THEN '✅ file_hash column exists'
        ELSE '❌ file_hash column missing'
    END as test_2_column_exists;

-- Test 3: Check if unique index exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'uploads' AND indexname = 'idx_uploads_file_hash_unique'
        ) 
        THEN '✅ unique index exists'
        ELSE '❌ unique index missing'
    END as test_3_index_exists;

-- Test 4: Try to insert a test record (should work without errors)
DO $$
BEGIN
    INSERT INTO uploads (file_name, file_url, file_type, file_size_mb, status, file_hash) 
    VALUES ('test_file.pdf', 'https://example.com/test.pdf', 'pdf', 1.0, 'uploaded', 'test_hash_123')
    ON CONFLICT (file_hash) DO NOTHING;
    
    RAISE NOTICE '✅ Test insert successful';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Test insert failed: %', SQLERRM;
END $$;

-- Test 5: Try to query with file_hash (should work without 400 error)
DO $$
DECLARE
    result_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO result_count 
    FROM uploads 
    WHERE file_hash = 'test_hash_123';
    
    RAISE NOTICE '✅ Test query successful, found % records', result_count;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Test query failed: %', SQLERRM;
END $$;

-- Clean up test data
DELETE FROM uploads WHERE file_hash = 'test_hash_123';

SELECT 'All tests completed!' as final_status;
