-- Create Transaction Table for Bank Statement Processing
-- Enhanced schema to support comprehensive bank statement processing

-- Create transactions table with enhanced bank statement columns
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core Transaction Data
    date DATE NOT NULL,                    -- Transaction date
    payment_type TEXT NOT NULL,            -- Payment method (UPI, Bank Transfer, etc.)
    transaction_name TEXT NOT NULL,        -- Payer/payee name or transaction description
    description TEXT,                      -- Additional transaction details
    category TEXT NOT NULL,                -- Auto-detected or manual category
    
    -- Amount Fields (Enhanced)
    credit_amount NUMERIC(12,2) DEFAULT 0, -- Credit amount (+₹ amounts)
    debit_amount NUMERIC(12,2) DEFAULT 0,  -- Debit amount (-₹ amounts)
    balance NUMERIC(12,2),                 -- Running balance after transaction
    
    -- File Processing Fields
    source_file TEXT,                      -- Original file name
    source_type TEXT CHECK (source_type IN ('pdf','excel','csv','image','manual')), -- File type
    processing_status TEXT DEFAULT 'processed' CHECK (processing_status IN ('pending','processed','failed','duplicate')),
    
    -- Proof and Documentation
    proof TEXT,                            -- File path or reference to proof
    notes TEXT,                            -- Additional notes
    
    -- System Fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_amounts CHECK (
        (credit_amount > 0 AND debit_amount = 0) OR 
        (debit_amount > 0 AND credit_amount = 0) OR 
        (credit_amount = 0 AND debit_amount = 0)
    ),
    CONSTRAINT valid_category CHECK (
        category IN (
            'food', 'travel', 'shopping', 'bills', 'salary', 'others',
            'business_expense', 'personal_expense', 'travel_transport', 
            'meals_entertainment', 'office_supplies', 'software_subscriptions',
            'utilities', 'income', 'investment', 'refund', 'transfer_in',
            'transfer_out', 'withdrawal', 'deposit', 'loan_payment',
            'insurance', 'medical', 'education', 'entertainment', 'fuel', 'maintenance'
        )
    )
);

-- Create uploads table for enhanced file storage
CREATE TABLE IF NOT EXISTS uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT CHECK (file_type IN ('pdf','jpg','jpeg','png','csv','xls','xlsx')),
    file_size_mb NUMERIC(6,2) CHECK (file_size_mb <= 10),
    status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded','processing','processed','failed')),
    processing_error TEXT,                 -- Error message if processing failed
    extracted_transactions_count INTEGER DEFAULT 0, -- Number of transactions extracted
    metadata JSONB,                        -- Additional file metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Create processing logs table for debugging
CREATE TABLE IF NOT EXISTS processing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id UUID REFERENCES uploads(id) ON DELETE CASCADE,
    log_level TEXT CHECK (log_level IN ('info','warning','error','debug')),
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create duplicate detection table
CREATE TABLE IF NOT EXISTS duplicate_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    duplicate_transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    similarity_score NUMERIC(3,2),        -- 0.0 to 1.0
    detection_method TEXT,                 -- 'exact_match', 'fuzzy_match', 'manual'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE duplicate_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (drop existing ones first)
DROP POLICY IF EXISTS "Allow all operations on transactions" ON transactions;
DROP POLICY IF EXISTS "Allow all operations on uploads" ON uploads;
DROP POLICY IF EXISTS "Allow all operations on processing_logs" ON processing_logs;
DROP POLICY IF EXISTS "Allow all operations on duplicate_transactions" ON duplicate_transactions;

CREATE POLICY "Allow all operations on transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations on uploads" ON uploads FOR ALL USING (true);
CREATE POLICY "Allow all operations on processing_logs" ON processing_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations on duplicate_transactions" ON duplicate_transactions FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_type ON transactions(payment_type);
CREATE INDEX IF NOT EXISTS idx_transactions_source_file ON transactions(source_file);
CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status);
CREATE INDEX IF NOT EXISTS idx_uploads_file_type ON uploads(file_type);
CREATE INDEX IF NOT EXISTS idx_processing_logs_upload_id ON processing_logs(upload_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify the tables were created successfully
SELECT 'Enhanced transaction tables created successfully!' as message;
SELECT COUNT(*) as transaction_count FROM transactions;
SELECT COUNT(*) as upload_count FROM uploads;

-- Show enhanced table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;
