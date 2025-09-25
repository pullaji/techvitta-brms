-- Simple fix for transactions table - just add missing columns
-- This version only adds columns without trying to update existing data

-- Add all the missing columns that the code is trying to insert
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS credit_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS debit_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'bank_transfer';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_name TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_file TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS balance NUMERIC(12,2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS proof TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add the missing columns from our previous fix
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS confidence DECIMAL(3,2) DEFAULT 1.0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS account_no TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference_id TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('debit', 'credit'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_payment_type ON transactions(payment_type);
CREATE INDEX IF NOT EXISTS idx_transactions_source_type ON transactions(source_type);
CREATE INDEX IF NOT EXISTS idx_transactions_source_file ON transactions(source_file);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN (
    'credit_amount',
    'debit_amount', 
    'payment_type',
    'transaction_name',
    'description',
    'source_file',
    'source_type',
    'balance',
    'proof',
    'date',
    'confidence',
    'account_no',
    'reference_id',
    'file_path',
    'type'
)
ORDER BY column_name;

SELECT 'Simple transactions table fix completed! Excel transactions should now work.' as message;
