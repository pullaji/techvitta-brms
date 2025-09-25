-- Migration script to add missing columns to existing transactions table
-- This script adds the new columns needed for enhanced bank statement processing

-- Add missing columns to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS balance NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS source_file TEXT,
ADD COLUMN IF NOT EXISTS source_type TEXT CHECK (source_type IN ('pdf','excel','csv','image','manual')),
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'processed' CHECK (processing_status IN ('pending','processed','failed','duplicate'));

-- Update existing records to have default values
UPDATE transactions 
SET 
    source_type = 'manual',
    processing_status = 'processed'
WHERE source_type IS NULL OR processing_status IS NULL;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_transactions_source_file ON transactions(source_file);
CREATE INDEX IF NOT EXISTS idx_transactions_source_type ON transactions(source_type);
CREATE INDEX IF NOT EXISTS idx_transactions_processing_status ON transactions(processing_status);

-- Update the category constraint to include new categories
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS valid_category;

ALTER TABLE transactions 
ADD CONSTRAINT valid_category CHECK (
    category IN (
        'food', 'travel', 'shopping', 'bills', 'salary', 'others',
        'business_expense', 'personal_expense', 'travel_transport', 
        'meals_entertainment', 'office_supplies', 'software_subscriptions',
        'utilities', 'income', 'investment', 'refund', 'transfer_in',
        'transfer_out', 'withdrawal', 'deposit', 'loan_payment',
        'insurance', 'medical', 'education', 'entertainment', 'fuel', 'maintenance'
    )
);

-- Create the new tables if they don't exist
CREATE TABLE IF NOT EXISTS uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT CHECK (file_type IN ('pdf','jpg','jpeg','png','csv','xls','xlsx')),
    file_size_mb NUMERIC(6,2) CHECK (file_size_mb <= 10),
    status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded','processing','processed','failed')),
    processing_error TEXT,
    extracted_transactions_count INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS processing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id UUID REFERENCES uploads(id) ON DELETE CASCADE,
    log_level TEXT CHECK (log_level IN ('info','warning','error','debug')),
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS duplicate_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    duplicate_transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    similarity_score NUMERIC(3,2),
    detection_method TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on new tables
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE duplicate_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for new tables
DROP POLICY IF EXISTS "Allow all operations on uploads" ON uploads;
DROP POLICY IF EXISTS "Allow all operations on processing_logs" ON processing_logs;
DROP POLICY IF EXISTS "Allow all operations on duplicate_transactions" ON duplicate_transactions;

CREATE POLICY "Allow all operations on uploads" ON uploads FOR ALL USING (true);
CREATE POLICY "Allow all operations on processing_logs" ON processing_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations on duplicate_transactions" ON duplicate_transactions FOR ALL USING (true);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status);
CREATE INDEX IF NOT EXISTS idx_uploads_file_type ON uploads(file_type);
CREATE INDEX IF NOT EXISTS idx_processing_logs_upload_id ON processing_logs(upload_id);

-- Verify the migration was successful
SELECT 'Migration completed successfully!' as message;

-- Show the updated table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;

-- Show count of existing transactions
SELECT COUNT(*) as existing_transactions FROM transactions;