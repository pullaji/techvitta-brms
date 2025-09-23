-- SIMPLE FIX - NO ERRORS VERSION
-- This script avoids column reference issues by being more careful

-- ========================================
-- STEP 1: Add Missing Columns Safely
-- ========================================
SELECT 'Adding missing columns...' as status;

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
ADD COLUMN IF NOT EXISTS proof TEXT;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ========================================
-- STEP 2: Set Default Values for New Columns
-- ========================================
SELECT 'Setting default values...' as status;

-- Set defaults for all new columns
UPDATE transactions 
SET credit_amount = 0 WHERE credit_amount IS NULL;

UPDATE transactions 
SET debit_amount = 0 WHERE debit_amount IS NULL;

UPDATE transactions 
SET date = CURRENT_DATE WHERE date IS NULL;

UPDATE transactions 
SET payment_type = 'receipt' WHERE payment_type IS NULL;

UPDATE transactions 
SET transaction_name = 'Unknown Transaction' WHERE transaction_name IS NULL;

UPDATE transactions 
SET description = 'Transaction' WHERE description IS NULL;

UPDATE transactions 
SET category = 'business_expense' WHERE category IS NULL;

-- Don't set dummy proof values - leave as NULL for real data
-- UPDATE transactions 
-- SET proof = 'No proof' WHERE proof IS NULL;

UPDATE transactions 
SET notes = 'Migrated from old schema' WHERE notes IS NULL;

UPDATE transactions 
SET created_at = NOW() WHERE created_at IS NULL;

UPDATE transactions 
SET updated_at = NOW() WHERE updated_at IS NULL;

-- ========================================
-- STEP 3: Migrate Amount Data (if amount column exists)
-- ========================================
SELECT 'Migrating amount data...' as status;

-- Only migrate if amount column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'amount') THEN
        -- Migrate positive amounts to credit_amount
        UPDATE transactions 
        SET credit_amount = amount
        WHERE amount > 0 AND credit_amount = 0;
        
        -- Migrate negative amounts to debit_amount
        UPDATE transactions 
        SET debit_amount = ABS(amount)
        WHERE amount < 0 AND debit_amount = 0;
        
        RAISE NOTICE 'Amount data migrated successfully';
    ELSE
        RAISE NOTICE 'Amount column not found, skipping migration';
    END IF;
END $$;

-- ========================================
-- STEP 4: Fix Row Level Security
-- ========================================
SELECT 'Fixing Row Level Security...' as status;

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on transactions" ON transactions;
DROP POLICY IF EXISTS "Allow all operations on uploads" ON uploads;

CREATE POLICY "Allow all operations on transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations on uploads" ON uploads FOR ALL USING (true);

-- ========================================
-- STEP 5: Verification
-- ========================================
SELECT '=== VERIFICATION ===' as info;

-- Check table structure
SELECT 'Final table structure:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;

-- Check sample data
SELECT 'Sample transactions:' as info;
SELECT 
  id,
  date,
  payment_type,
  transaction_name,
  category,
  credit_amount,
  debit_amount
FROM transactions 
ORDER BY created_at DESC 
LIMIT 3;

-- Summary
SELECT 
  '=== SUMMARY ===' as info,
  COUNT(*) as total_transactions,
  SUM(credit_amount) as total_credits,
  SUM(debit_amount) as total_debits
FROM transactions;

SELECT '🎉 FIX COMPLETED SUCCESSFULLY! 🎉' as message;
