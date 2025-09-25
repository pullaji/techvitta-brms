-- Simple Excel Processing Setup - Standard SQL without procedural blocks
-- This version uses basic SQL statements that work in any PostgreSQL context

-- Add essential columns to uploads table
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS file_type_detected VARCHAR(50);
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 1.0;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS transactions_count INTEGER DEFAULT 0;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS column_mapping JSONB;

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

-- Add essential columns to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS confidence DECIMAL(3,2) DEFAULT 1.0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS account_no TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference_id TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS file_path TEXT;

-- Update existing records in transactions table
UPDATE transactions 
SET 
  source_type = 'manual',
  confidence = 1.0
WHERE source_type IS NULL;

-- Create essential indexes
CREATE INDEX IF NOT EXISTS idx_uploads_file_type ON uploads(file_type_detected);
CREATE INDEX IF NOT EXISTS idx_transactions_source_type ON transactions(source_type);

-- Success message
SELECT 'Simple Excel processing setup completed successfully!' as message;
