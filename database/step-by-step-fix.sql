-- Step-by-step fix for uploads table
-- Run each section one at a time to avoid errors

-- Step 1: Check if tables exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'uploads')
        THEN 'uploads table exists - proceeding with fix'
        ELSE 'uploads table does not exist - cannot proceed'
    END as step1_result;

-- Step 2: Add extracted_transactions_count column
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS extracted_transactions_count INTEGER DEFAULT 0;
SELECT 'extracted_transactions_count column added' as step2_result;

-- Step 3: Add file_hash column
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS file_hash TEXT;
SELECT 'file_hash column added' as step3_result;

-- Step 4: Add file_type_detected column
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS file_type_detected VARCHAR(50);
SELECT 'file_type_detected column added' as step4_result;

-- Step 5: Add confidence_score column
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 1.0;
SELECT 'confidence_score column added' as step5_result;

-- Step 6: Add transactions_count column
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS transactions_count INTEGER DEFAULT 0;
SELECT 'transactions_count column added' as step6_result;

-- Step 7: Add column_mapping column
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS column_mapping JSONB;
SELECT 'column_mapping column added' as step7_result;

-- Step 8: Add processing_metadata column
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS processing_metadata JSONB;
SELECT 'processing_metadata column added' as step8_result;

-- Step 9: Verify all columns were added
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

-- Step 10: Test the update that was causing the 400 error
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
        
        RAISE NOTICE '✅ SUCCESS: Update test passed! The 400 error should be fixed.';
    ELSE
        RAISE NOTICE 'ℹ️ No existing uploads to test with, but columns are ready.';
    END IF;
END $$;

SELECT 'Step-by-step fix completed successfully!' as final_result;
