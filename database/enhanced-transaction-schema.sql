-- Enhanced Transaction Schema for Comprehensive Bank Statement Processing
-- This script ensures the database supports all required fields for bank statement parsing

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create or update transactions table with enhanced schema
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
            'business_expense', 'personal_expense', 'travel_transport',
            'meals_entertainment', 'office_supplies', 'software_subscriptions',
            'utilities', 'salary', 'business_income', 'investment', 'refund',
            'transfer_in', 'transfer_out', 'withdrawal', 'deposit', 'loan_payment',
            'insurance', 'medical', 'education', 'shopping', 'entertainment',
            'fuel', 'maintenance', 'others'
        )
    )
);

-- Add missing columns if they don't exist (for existing installations)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS date DATE;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS payment_type TEXT;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS transaction_name TEXT;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS credit_amount NUMERIC(12,2) DEFAULT 0;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS debit_amount NUMERIC(12,2) DEFAULT 0;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS balance NUMERIC(12,2);

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS source_file TEXT;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS source_type TEXT CHECK (source_type IN ('pdf','excel','csv','image','manual'));

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'processed' CHECK (processing_status IN ('pending','processed','failed','duplicate'));

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS proof TEXT;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create uploads table for tracking file uploads
CREATE TABLE IF NOT EXISTS uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT CHECK (file_type IN ('pdf','jpg','png','csv','xls','xlsx')),
    file_size_mb NUMERIC(6,2) CHECK (file_size_mb <= 10),
    status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded','processing','processed','failed')),
    extracted_transactions_count INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_source_file ON transactions(source_file);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_type ON transactions(payment_type);
CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status);
CREATE INDEX IF NOT EXISTS idx_uploads_file_type ON uploads(file_type);

-- Enable Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (adjust for production)
CREATE POLICY "Allow all operations on transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations on uploads" ON uploads FOR ALL USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_uploads_updated_at 
    BEFORE UPDATE ON uploads 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing (optional)
INSERT INTO transactions (
    date, payment_type, transaction_name, description, category, 
    credit_amount, debit_amount, source_file, source_type, notes
) VALUES 
(
    CURRENT_DATE, 'bank_transfer', 'Sample Credit Transaction', 
    'Sample credit transaction for testing', 'business_income', 
    1000.00, 0, 'sample.csv', 'csv', 'Sample data for testing'
),
(
    CURRENT_DATE, 'upi', 'Sample Debit Transaction', 
    'Sample debit transaction for testing', 'business_expense', 
    0, 500.00, 'sample.csv', 'csv', 'Sample data for testing'
)
ON CONFLICT DO NOTHING;

-- Verify the setup
SELECT 'Enhanced transaction schema setup completed successfully!' as status;
SELECT 'Tables created/updated: transactions, uploads' as tables;
SELECT 'Indexes created for better performance' as indexes;
SELECT 'Sample data inserted for testing' as sample_data;
