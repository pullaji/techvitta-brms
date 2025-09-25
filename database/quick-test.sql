-- Quick test to verify the fix works
-- Run this after applying fix-uploads-table.sql

-- Check if the key column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'uploads' AND column_name = 'extracted_transactions_count'
        )
        THEN '✅ extracted_transactions_count column exists'
        ELSE '❌ extracted_transactions_count column missing'
    END as status;

-- Test the update that was causing the 400 error
-- First, let's see if there are any existing uploads
SELECT COUNT(*) as existing_uploads FROM uploads;

-- If there are existing uploads, test the update
DO $$
DECLARE
    upload_count INTEGER;
    test_id UUID;
BEGIN
    SELECT COUNT(*) INTO upload_count FROM uploads;
    
    IF upload_count > 0 THEN
        -- Get the first upload ID
        SELECT id INTO test_id FROM uploads LIMIT 1;
        
        -- Test the update that was causing the 400 error
        UPDATE uploads 
        SET 
            status = 'processing',
            extracted_transactions_count = 5
        WHERE id = test_id;
        
        RAISE NOTICE '✅ Update test successful! The 400 error should be fixed.';
    ELSE
        RAISE NOTICE 'ℹ️ No existing uploads to test with, but columns should be added successfully.';
    END IF;
END $$;

SELECT 'Quick test completed!' as result;
