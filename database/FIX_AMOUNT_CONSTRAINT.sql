-- FIX AMOUNT CONSTRAINT ERROR
-- This fixes the "null value in column amount violates not-null constraint" error

-- ========================================
-- STEP 1: Check Current Database Structure
-- ========================================
SELECT 'Current transactions table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;

-- ========================================
-- STEP 2: Fix Amount Column Constraint
-- ========================================
-- Option 1: Make amount column nullable (if it still exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'amount') THEN
        -- Make amount column nullable
        ALTER TABLE transactions ALTER COLUMN amount DROP NOT NULL;
        RAISE NOTICE 'Made amount column nullable';
        
        -- Set default value for existing null amounts
        UPDATE transactions SET amount = 0 WHERE amount IS NULL;
        RAISE NOTICE 'Set default values for null amounts';
    ELSE
        RAISE NOTICE 'Amount column does not exist, skipping';
    END IF;
END $$;

-- ========================================
-- STEP 3: Ensure All Required Columns Exist
-- ========================================
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
-- STEP 4: Set Default Values for All Columns
-- ========================================
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

UPDATE transactions 
SET proof = 'No proof' WHERE proof IS NULL;

UPDATE transactions 
SET notes = 'Migrated from old schema' WHERE notes IS NULL;

UPDATE transactions 
SET created_at = NOW() WHERE created_at IS NULL;

UPDATE transactions 
SET updated_at = NOW() WHERE updated_at IS NULL;

-- If amount column still exists, ensure it has values
UPDATE transactions 
SET amount = 0 WHERE amount IS NULL;

-- ========================================
-- STEP 5: Migrate Data from amount to credit_amount/debit_amount
-- ========================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'amount') THEN
        -- Migrate positive amounts to credit_amount
        UPDATE transactions 
        SET credit_amount = amount
        WHERE amount > 0 AND (credit_amount IS NULL OR credit_amount = 0);
        
        -- Migrate negative amounts to debit_amount
        UPDATE transactions 
        SET debit_amount = ABS(amount)
        WHERE amount < 0 AND (debit_amount IS NULL OR debit_amount = 0);
        
        RAISE NOTICE 'Amount data migrated to credit_amount/debit_amount';
    END IF;
END $$;

-- ========================================
-- STEP 6: Fix Row Level Security
-- ========================================
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on transactions" ON transactions;
DROP POLICY IF EXISTS "Allow all operations on uploads" ON uploads;

CREATE POLICY "Allow all operations on transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations on uploads" ON uploads FOR ALL USING (true);

-- ========================================
-- STEP 7: Verification
-- ========================================
SELECT 'Final table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;

SELECT 'Sample transactions:' as info;
SELECT 
  id,
  date,
  payment_type,
  transaction_name,
  category,
  credit_amount,
  debit_amount,
  amount
FROM transactions 
ORDER BY created_at DESC 
LIMIT 3;

SELECT '🎉 AMOUNT CONSTRAINT FIXED! 🎉' as message;
