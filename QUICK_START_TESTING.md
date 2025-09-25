# 🚀 Quick Start Testing Guide

## ⚡ 5-Minute Test Setup

### Step 1: Database Setup (2 minutes)
```sql
-- Copy and paste the contents of database/excel-processing-minimal.sql into your Supabase SQL Editor
-- OR copy this minimal version:

-- Add essential columns to uploads table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'uploads') THEN
        ALTER TABLE uploads ADD COLUMN IF NOT EXISTS file_type_detected VARCHAR(50);
        ALTER TABLE uploads ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 1.0;
        ALTER TABLE uploads ADD COLUMN IF NOT EXISTS transactions_count INTEGER DEFAULT 0;
        ALTER TABLE uploads ADD COLUMN IF NOT EXISTS column_mapping JSONB;
        RAISE NOTICE 'Uploads table enhanced successfully';
    END IF;
END $$;

-- Add essential columns to transactions table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transactions') THEN
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual';
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS confidence DECIMAL(3,2) DEFAULT 1.0;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS account_no TEXT;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference_id TEXT;
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS file_path TEXT;
        RAISE NOTICE 'Transactions table enhanced successfully';
    END IF;
END $$;

SELECT 'Minimal Excel processing setup completed successfully!' as message;
```

### Step 2: Test with HDFC Format (2 minutes)
1. **Go to your Upload page**
2. **Upload**: `test-files/hdfc-bank-statement.csv`
3. **Check browser console** - you should see:
   ```
   📊 Processing Excel file with column mapping...
   📋 Excel headers detected: ["Txn Date", "Description", "Debit", "Credit", "Balance"]
   ✅ Excel processing completed: {totalRows: 10, processedRows: 10, skippedRows: 0}
   ```

### Step 3: Verify Results (1 minute)
```sql
-- Run this query in Supabase SQL Editor:
SELECT 
  file_name,
  file_type_detected,
  transactions_count,
  confidence_score,
  status
FROM uploads 
WHERE file_type_detected = 'excel'
ORDER BY created_at DESC
LIMIT 1;

-- Check transactions:
SELECT 
  date,
  description,
  debit_amount,
  credit_amount,
  category,
  source_type
FROM transactions 
WHERE source_type = 'excel'
ORDER BY created_at DESC
LIMIT 5;
```

## 🎯 Expected Results

After uploading `hdfc-bank-statement.csv`, you should see:

### Console Output:
```
🚀 Starting Excel processing with column mapping...
📋 Excel headers detected: ["Txn Date", "Description", "Debit", "Credit", "Balance"]
🗺️ Column mapping: {"Txn Date": "date", "Description": "description", "Debit": "debit", "Credit": "credit", "Balance": "balance"}
✅ Excel processing completed: {totalRows: 10, processedRows: 10, skippedRows: 0}
```

### Database Results:
- **1 upload record** with `file_type_detected = 'excel'`
- **10 transactions** with `source_type = 'excel'`
- **Proper amounts**: Debits in `debit_amount`, Credits in `credit_amount`
- **Auto-categories**: Based on description keywords

## 🔧 Quick Debug Commands

If something doesn't work, run these:

```sql
-- Check if columns were added:
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'uploads' AND column_name = 'file_type_detected';

-- Check recent uploads:
SELECT * FROM uploads ORDER BY created_at DESC LIMIT 3;

-- Check recent transactions:
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5;
```

## 🚨 Common Issues & Quick Fixes

1. **"Column mapping not found"**
   - Check browser console for exact error
   - Verify file is CSV/Excel format

2. **"No transactions created"**
   - Check if database schema updates were applied
   - Verify Supabase connection

3. **"Processing failed"**
   - Check browser console for detailed error
   - Try with the provided test files first

## ✅ Success Checklist

- [ ] Database schema updated successfully
- [ ] Test file uploads without errors
- [ ] Console shows column mapping logs
- [ ] Transactions appear in database
- [ ] Amounts are stored correctly
- [ ] Categories are auto-detected

## 🎉 Next Steps

Once the quick test works:
1. **Test other formats**: Try ICICI, SBI, Axis formats
2. **Test with your real bank statements**
3. **Customize category detection** for your needs
4. **Add custom header mappings** if needed

**Ready to test?** Start with the database setup and then upload the HDFC test file!
