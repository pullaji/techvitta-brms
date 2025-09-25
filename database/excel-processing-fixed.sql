-- Fixed Excel Processing Enhancements for BRMS
-- This version checks for actual column names in your database

-- Add enhanced columns to existing uploads table (if it exists)
DO $$
BEGIN
    -- Check if uploads table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'uploads') THEN
        -- Add columns if they don't exist
        ALTER TABLE uploads ADD COLUMN IF NOT EXISTS file_type_detected VARCHAR(50);
        ALTER TABLE uploads ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 1.0;
        ALTER TABLE uploads ADD COLUMN IF NOT EXISTS transactions_count INTEGER DEFAULT 0;
        ALTER TABLE uploads ADD COLUMN IF NOT EXISTS column_mapping JSONB;
        ALTER TABLE uploads ADD COLUMN IF NOT EXISTS processing_metadata JSONB;
        
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
          confidence_score = 1.0
        WHERE file_type_detected IS NULL;
        
        RAISE NOTICE 'Uploads table enhanced successfully';
    ELSE
        RAISE NOTICE 'Uploads table does not exist - skipping uploads enhancements';
    END IF;
END $$;

-- Add enhanced columns to existing transactions table (if it exists)
DO $$
BEGIN
    -- Check if transactions table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transactions') THEN
        -- Add columns if they don't exist
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual';
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS confidence DECIMAL(3,2) DEFAULT 1.0;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS account_no TEXT;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference_id TEXT;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS file_path TEXT;
        
        -- Update existing transactions to have default values
        UPDATE transactions 
        SET 
          source_type = 'manual',
          confidence = 1.0
        WHERE source_type IS NULL;
        
        RAISE NOTICE 'Transactions table enhanced successfully';
    ELSE
        RAISE NOTICE 'Transactions table does not exist - skipping transactions enhancements';
    END IF;
END $$;

-- Create indexes for better performance (only if tables exist)
DO $$
BEGIN
    -- Index for uploads table
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'uploads') THEN
        CREATE INDEX IF NOT EXISTS idx_uploads_file_type ON uploads(file_type_detected);
        RAISE NOTICE 'Uploads indexes created successfully';
    END IF;
    
    -- Indexes for transactions table
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transactions') THEN
        CREATE INDEX IF NOT EXISTS idx_transactions_source_type ON transactions(source_type);
        CREATE INDEX IF NOT EXISTS idx_transactions_account_no ON transactions(account_no);
        CREATE INDEX IF NOT EXISTS idx_transactions_reference_id ON transactions(reference_id);
        RAISE NOTICE 'Transactions indexes created successfully';
    END IF;
END $$;

-- Create views for analytics (only if tables exist and have the right columns)
DO $$
DECLARE
    uploads_has_created_at BOOLEAN := FALSE;
    uploads_has_uploaded_at BOOLEAN := FALSE;
    transactions_has_date BOOLEAN := FALSE;
    transactions_has_transaction_date BOOLEAN := FALSE;
BEGIN
    -- Check what columns exist in uploads table
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'uploads') THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'uploads' AND column_name = 'created_at'
        ) INTO uploads_has_created_at;
        
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'uploads' AND column_name = 'uploaded_at'
        ) INTO uploads_has_uploaded_at;
        
        -- Create Excel processing stats view with correct date column
        IF uploads_has_created_at THEN
            EXECUTE 'CREATE OR REPLACE VIEW excel_processing_stats AS
            SELECT 
              DATE(created_at) as processing_date,
              COUNT(*) as total_files,
              COUNT(CASE WHEN file_type_detected = ''excel'' THEN 1 END) as excel_files,
              COUNT(CASE WHEN status = ''processed'' THEN 1 END) as successfully_processed,
              COUNT(CASE WHEN status = ''failed'' THEN 1 END) as failed_files,
              AVG(confidence_score) as avg_confidence_score,
              SUM(transactions_count) as total_transactions_extracted
            FROM uploads 
            WHERE created_at >= CURRENT_DATE - INTERVAL ''30 days''
            GROUP BY DATE(created_at)
            ORDER BY processing_date DESC';
            RAISE NOTICE 'Excel processing stats view created successfully (using created_at)';
        ELSIF uploads_has_uploaded_at THEN
            EXECUTE 'CREATE OR REPLACE VIEW excel_processing_stats AS
            SELECT 
              DATE(uploaded_at) as processing_date,
              COUNT(*) as total_files,
              COUNT(CASE WHEN file_type_detected = ''excel'' THEN 1 END) as excel_files,
              COUNT(CASE WHEN status = ''processed'' THEN 1 END) as successfully_processed,
              COUNT(CASE WHEN status = ''failed'' THEN 1 END) as failed_files,
              AVG(confidence_score) as avg_confidence_score,
              SUM(transactions_count) as total_transactions_extracted
            FROM uploads 
            WHERE uploaded_at >= CURRENT_DATE - INTERVAL ''30 days''
            GROUP BY DATE(uploaded_at)
            ORDER BY processing_date DESC';
            RAISE NOTICE 'Excel processing stats view created successfully (using uploaded_at)';
        ELSE
            RAISE NOTICE 'Uploads table exists but has no date column - skipping stats view';
        END IF;
    END IF;
    
    -- Check what columns exist in transactions table
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transactions') THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transactions' AND column_name = 'date'
        ) INTO transactions_has_date;
        
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transactions' AND column_name = 'transaction_date'
        ) INTO transactions_has_transaction_date;
        
        -- Create transaction source analysis view with correct date column
        IF transactions_has_date THEN
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
            RAISE NOTICE 'Transaction source analysis view created successfully (using date)';
        ELSIF transactions_has_transaction_date THEN
            EXECUTE 'CREATE OR REPLACE VIEW transaction_source_analysis AS
            SELECT 
              source_type,
              COUNT(*) as transaction_count,
              COUNT(DISTINCT source_file) as unique_files,
              AVG(confidence) as avg_confidence,
              SUM(credit_amount) as total_credits,
              SUM(debit_amount) as total_debits,
              MIN(transaction_date) as earliest_transaction,
              MAX(transaction_date) as latest_transaction
            FROM transactions 
            WHERE transaction_date >= CURRENT_DATE - INTERVAL ''90 days''
            GROUP BY source_type
            ORDER BY transaction_count DESC';
            RAISE NOTICE 'Transaction source analysis view created successfully (using transaction_date)';
        ELSE
            RAISE NOTICE 'Transactions table exists but has no date column - skipping analysis view';
        END IF;
    END IF;
END $$;

-- Success message
SELECT 'Excel processing enhancements applied successfully!' as message;
