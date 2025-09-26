-- Fix uploads table to add missing columns
-- This addresses the 400 error when updating uploads table

-- Add extracted_transactions_count column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'uploads' AND column_name = 'extracted_transactions_count'
    ) THEN
        ALTER TABLE uploads ADD COLUMN extracted_transactions_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added extracted_transactions_count column to uploads table';
    ELSE
        RAISE NOTICE 'extracted_transactions_count column already exists';
    END IF;
END $$;

-- Add other potentially missing columns
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'uploads' AND column_name = 'file_hash'
    ) THEN
        ALTER TABLE uploads ADD COLUMN file_hash TEXT;
        RAISE NOTICE 'Added file_hash column to uploads table';
    ELSE
        RAISE NOTICE 'file_hash column already exists';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'uploads' AND column_name = 'file_type_detected'
    ) THEN
        ALTER TABLE uploads ADD COLUMN file_type_detected TEXT;
        RAISE NOTICE 'Added file_type_detected column to uploads table';
    ELSE
        RAISE NOTICE 'file_type_detected column already exists';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'uploads' AND column_name = 'confidence_score'
    ) THEN
        ALTER TABLE uploads ADD COLUMN confidence_score NUMERIC(3,2);
        RAISE NOTICE 'Added confidence_score column to uploads table';
    ELSE
        RAISE NOTICE 'confidence_score column already exists';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'uploads' AND column_name = 'transactions_count'
    ) THEN
        ALTER TABLE uploads ADD COLUMN transactions_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added transactions_count column to uploads table';
    ELSE
        RAISE NOTICE 'transactions_count column already exists';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'uploads' AND column_name = 'column_mapping'
    ) THEN
        ALTER TABLE uploads ADD COLUMN column_mapping JSONB;
        RAISE NOTICE 'Added column_mapping column to uploads table';
    ELSE
        RAISE NOTICE 'column_mapping column already exists';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'uploads' AND column_name = 'processing_metadata'
    ) THEN
        ALTER TABLE uploads ADD COLUMN processing_metadata JSONB;
        RAISE NOTICE 'Added processing_metadata column to uploads table';
    ELSE
        RAISE NOTICE 'processing_metadata column already exists';
    END IF;
END $$;

-- Create index on file_hash for better performance
CREATE INDEX IF NOT EXISTS idx_uploads_file_hash ON uploads(file_hash);

-- Verify the fix
SELECT 
    '✅ uploads table fix completed' as status,
    COUNT(*) as total_columns
FROM information_schema.columns 
WHERE table_name = 'uploads';

-- ========================================
-- FIX CREDIT/DEBIT AMOUNT CONSTRAINT ISSUE
-- ========================================

-- Remove the problematic constraint that prevents both amounts from being positive
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS valid_amounts;

-- Add a new flexible constraint
ALTER TABLE transactions 
ADD CONSTRAINT valid_amounts_flexible CHECK (
    credit_amount >= 0 AND 
    debit_amount >= 0 AND 
    (credit_amount > 0 OR debit_amount > 0)
);

-- Fix any null values
UPDATE transactions SET credit_amount = 0 WHERE credit_amount IS NULL;
UPDATE transactions SET debit_amount = 0 WHERE debit_amount IS NULL;

SELECT '✅ Credit/Debit amount constraint fixed!' as message;
