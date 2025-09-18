# Fix Amount Display Issue

## ❌ **Problem Identified**

The Credit and Debit columns are showing "-" instead of actual amounts because:

1. **Old Database Schema**: Your existing transactions were created with an old `amount` column
2. **New Schema**: We now use separate `credit_amount` and `debit_amount` columns
3. **Missing Data**: The new columns don't have values for existing transactions

## ✅ **Solution**

I've created a fix script that will update your existing data to work with the new schema.

### **🚀 Quick Fix Steps:**

1. **Run the Fix Script** in your **Supabase SQL Editor**:

```sql
-- Add the new columns if they don't exist
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS credit_amount NUMERIC(12,2) DEFAULT 0;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS debit_amount NUMERIC(12,2) DEFAULT 0;

-- Update existing transactions to populate the new columns
UPDATE transactions 
SET 
  credit_amount = COALESCE(amount, 0),
  debit_amount = 0
WHERE amount > 0;

UPDATE transactions 
SET 
  credit_amount = 0,
  debit_amount = ABS(COALESCE(amount, 0))
WHERE amount < 0;

-- Set default values for any remaining null values
UPDATE transactions 
SET credit_amount = 0 WHERE credit_amount IS NULL;
UPDATE transactions 
SET debit_amount = 0 WHERE debit_amount IS NULL;

-- Verify the fix
SELECT 
  id, date, payment_type, transaction_name, 
  credit_amount, debit_amount, status 
FROM transactions 
ORDER BY created_at DESC;
```

2. **Refresh Your Browser** (Ctrl + Shift + R)

3. **Check the Transactions Page** - amounts should now display properly

### **📊 What This Fix Does:**

- ✅ **Adds missing columns** (`credit_amount`, `debit_amount`)
- ✅ **Migrates old data** from `amount` column to new columns
- ✅ **Sets proper values**:
  - Positive amounts → Credit column (+₹)
  - Negative amounts → Debit column (-₹)
- ✅ **Handles null values** by setting defaults
- ✅ **Preserves all existing data**

### **🎯 Expected Result:**

After running the fix script, your transactions table will show:

| Date | Payment Type | Transaction Name | Credit (+₹) | Debit (-₹) |
|------|-------------|------------------|-------------|------------|
| 5/15/2025 | Single Transfer | Malakala Venkatesh | +₹20,000 | - |
| 5/14/2025 | Single Transfer | Malakala Venkatesh | +₹50,000 | - |
| 5/14/2025 | UPI receipt | Dasari Taranga Naveen | +₹30,000 | - |

### **🔧 Alternative: Complete Fix Script**

If you want a more comprehensive fix, run the complete script from `database/complete-fix-amounts.sql` which includes:

- Detailed verification steps
- Summary statistics
- Error handling
- Optional cleanup of old columns

**Run the fix script and your amounts will display properly! 🎉**
