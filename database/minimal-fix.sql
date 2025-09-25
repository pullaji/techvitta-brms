-- Minimal fix - just add the column causing the 400 error
-- This is the smallest possible fix to resolve the immediate issue

-- Add the missing column that's causing the 400 error
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS extracted_transactions_count INTEGER DEFAULT 0;

-- Verify the column was added
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'uploads' AND column_name = 'extracted_transactions_count'
        )
        THEN '✅ extracted_transactions_count column added successfully'
        ELSE '❌ Failed to add extracted_transactions_count column'
    END as result;

-- Test the update that was causing the 400 error
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
        
        RAISE NOTICE '✅ SUCCESS: The 400 error should now be fixed!';
    ELSE
        RAISE NOTICE 'ℹ️ No existing uploads to test with, but the column is ready.';
    END IF;
END $$;

SELECT 'Minimal fix completed!' as message;
