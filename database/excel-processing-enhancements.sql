-- Excel Processing Enhancements for BRMS
-- Run this SQL in your Supabase SQL Editor to add enhanced columns for Excel processing

-- Add enhanced columns to existing uploads table
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS has_text_layer BOOLEAN DEFAULT FALSE;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS ocr_used BOOLEAN DEFAULT FALSE;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 1.0;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS extracted_text TEXT;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS transactions_count INTEGER DEFAULT 0;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS file_type_detected VARCHAR(50);
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS column_mapping JSONB;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS processing_metadata JSONB;

-- Add enhanced columns to existing transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS account_no TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference_id TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS confidence DECIMAL(3,2) DEFAULT 1.0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS processing_metadata JSONB;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_source_type ON transactions(source_type);
CREATE INDEX IF NOT EXISTS idx_transactions_account_no ON transactions(account_no);
CREATE INDEX IF NOT EXISTS idx_transactions_reference_id ON transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_uploads_file_type ON uploads(file_type_detected);

-- Add comments for documentation
COMMENT ON COLUMN uploads.has_text_layer IS 'Indicates if PDF has extractable text layer';
COMMENT ON COLUMN uploads.ocr_used IS 'Indicates if OCR was used for processing';
COMMENT ON COLUMN uploads.confidence_score IS 'Overall confidence score for file processing (0.0-1.0)';
COMMENT ON COLUMN uploads.extracted_text IS 'Raw extracted text from file';
COMMENT ON COLUMN uploads.transactions_count IS 'Number of transactions successfully extracted';
COMMENT ON COLUMN uploads.processing_time_ms IS 'Time taken to process file in milliseconds';
COMMENT ON COLUMN uploads.file_type_detected IS 'Detected file type (pdf, excel, image, csv)';
COMMENT ON COLUMN uploads.column_mapping IS 'Excel column mapping information (JSON)';
COMMENT ON COLUMN uploads.processing_metadata IS 'Additional processing metadata (JSON)';

COMMENT ON COLUMN transactions.file_path IS 'Path to source file in storage';
COMMENT ON COLUMN transactions.account_no IS 'Account number from bank statement';
COMMENT ON COLUMN transactions.reference_id IS 'Transaction reference ID';
COMMENT ON COLUMN transactions.confidence IS 'Confidence score for this transaction (0.0-1.0)';
COMMENT ON COLUMN transactions.source_type IS 'Source type: manual, excel, pdf, image, csv';
COMMENT ON COLUMN transactions.processing_metadata IS 'Additional processing metadata for this transaction (JSON)';

-- Update existing uploads to have default values
UPDATE uploads 
SET 
  file_type_detected = CASE 
    WHEN file_name ILIKE '%.pdf' THEN 'pdf'
    WHEN file_name ILIKE '%.xlsx' OR file_name ILIKE '%.xls' THEN 'excel'
    WHEN file_name ILIKE '%.jpg' OR file_name ILIKE '%.jpeg' OR file_name ILIKE '%.png' THEN 'image'
    WHEN file_name ILIKE '%.csv' THEN 'csv'
    ELSE 'unknown'
  END,
  confidence_score = 1.0,
  has_text_layer = false,
  ocr_used = false
WHERE file_type_detected IS NULL;

-- Update existing transactions to have default values
UPDATE transactions 
SET 
  source_type = 'manual',
  confidence = 1.0
WHERE source_type IS NULL;

-- Create a view for Excel processing statistics (only if uploads table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'uploads') THEN
        EXECUTE 'CREATE OR REPLACE VIEW excel_processing_stats AS
        SELECT 
          DATE(created_at) as processing_date,
          COUNT(*) as total_files,
          COUNT(CASE WHEN file_type_detected = ''excel'' THEN 1 END) as excel_files,
          COUNT(CASE WHEN status = ''processed'' THEN 1 END) as successfully_processed,
          COUNT(CASE WHEN status = ''failed'' THEN 1 END) as failed_files,
          AVG(processing_time_ms) as avg_processing_time_ms,
          AVG(confidence_score) as avg_confidence_score,
          SUM(transactions_count) as total_transactions_extracted
        FROM uploads 
        WHERE created_at >= CURRENT_DATE - INTERVAL ''30 days''
        GROUP BY DATE(created_at)
        ORDER BY processing_date DESC';
    END IF;
END $$;

-- Create a view for transaction source analysis (only if transactions table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transactions') THEN
        EXECUTE 'CREATE OR REPLACE VIEW transaction_source_analysis AS
        SELECT 
          source_type,
          COUNT(*) as transaction_count,
          COUNT(DISTINCT source_file) as unique_files,
          AVG(confidence) as avg_confidence,
          SUM(credit_amount) as total_credits,
          SUM(debit_amount) as total_debits,
          MIN(date) as earliest_transaction,
          MAX(date) as latest_transaction
        FROM transactions 
        WHERE date >= CURRENT_DATE - INTERVAL ''90 days''
        GROUP BY source_type
        ORDER BY transaction_count DESC';
    END IF;
END $$;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT ON excel_processing_stats TO authenticated;
-- GRANT SELECT ON transaction_source_analysis TO authenticated;

-- Success message
SELECT 'Excel processing enhancements applied successfully!' as message;
