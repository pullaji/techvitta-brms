-- Quick fix to add missing columns to existing transactions table
-- This is a minimal migration that just adds the required columns

-- Add the missing columns that are causing the error
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS source_file TEXT,
ADD COLUMN IF NOT EXISTS source_type TEXT,
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'processed',
ADD COLUMN IF NOT EXISTS balance NUMERIC(12,2);

-- Update existing records to have default values
UPDATE transactions 
SET 
    source_type = 'manual',
    processing_status = 'processed'
WHERE source_type IS NULL OR processing_status IS NULL;

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_transactions_source_file ON transactions(source_file);
CREATE INDEX IF NOT EXISTS idx_transactions_source_type ON transactions(source_type);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN ('source_file', 'source_type', 'processing_status', 'balance')
ORDER BY column_name;
