-- Basic Excel Processing Setup - No procedural blocks
-- This version uses only basic SQL statements

-- First, let's see what tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('uploads', 'transactions')
ORDER BY table_name;

-- Add columns to uploads table (will fail gracefully if table doesn't exist)
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS file_type_detected VARCHAR(50);
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 1.0;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS transactions_count INTEGER DEFAULT 0;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS column_mapping JSONB;

-- Add columns to transactions table (will fail gracefully if table doesn't exist)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS confidence DECIMAL(3,2) DEFAULT 1.0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS account_no TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference_id TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS file_path TEXT;

-- Update existing records in uploads table
UPDATE uploads 
SET 
  file_type_detected = CASE 
    WHEN file_name ILIKE '%.pdf' THEN 'pdf'
    WHEN file_name ILIKE '%.xlsx' OR file_name ILIKE '%.xls' THEN 'excel'
    WHEN file_name ILIKE '%.jpg' OR file_name ILIKE '%.jpeg' OR file_name ILIKE '%.png' THEN 'image'
    WHEN file_name ILIKE '%.csv' THEN 'csv'
    ELSE 'unknown'
  END,
  confidence_score = 1.0
WHERE file_type_detected IS NULL;

-- Update existing records in transactions table
UPDATE transactions 
SET 
  source_type = 'manual',
  confidence = 1.0
WHERE source_type IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_uploads_file_type ON uploads(file_type_detected);
CREATE INDEX IF NOT EXISTS idx_transactions_source_type ON transactions(source_type);

-- Verify the changes
SELECT 'Basic Excel processing setup completed!' as message;
