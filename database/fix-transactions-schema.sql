-- Fix transactions table schema to match what the code expects
-- This fixes the issue where Excel transactions are not showing up

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

-- Update existing records to have proper values
-- First check what date column exists
DO $$
BEGIN
  -- Try to update with transaction_date if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'transaction_date') THEN
    UPDATE transactions 
    SET 
      payment_type = COALESCE(payment_type, 'bank_transfer'),
      source_type = COALESCE(source_type, 'manual'),
      confidence = COALESCE(confidence, 1.0),
      credit_amount = CASE 
        WHEN amount > 0 THEN amount 
        ELSE 0 
      END,
      debit_amount = CASE 
        WHEN amount < 0 THEN ABS(amount) 
        ELSE 0 
      END,
      transaction_name = COALESCE(transaction_name, notes),
      description = COALESCE(description, notes),
      date = COALESCE(date, transaction_date::date)
    WHERE payment_type IS NULL OR source_type IS NULL;
  ELSE
    -- If transaction_date doesn't exist, just update without date mapping
    UPDATE transactions 
    SET 
      payment_type = COALESCE(payment_type, 'bank_transfer'),
      source_type = COALESCE(source_type, 'manual'),
      confidence = COALESCE(confidence, 1.0),
      credit_amount = CASE 
        WHEN amount > 0 THEN amount 
        ELSE 0 
      END,
      debit_amount = CASE 
        WHEN amount < 0 THEN ABS(amount) 
        ELSE 0 
      END,
      transaction_name = COALESCE(transaction_name, notes),
      description = COALESCE(description, notes)
    WHERE payment_type IS NULL OR source_type IS NULL;
  END IF;
END $$;

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

SELECT 'Transactions table schema fixed successfully! Excel transactions should now work.' as message;
