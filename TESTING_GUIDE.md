# 🧪 Excel Processing Testing Guide

## 📋 Test Files Created

I've created 5 different test files to simulate various bank statement formats:

### 1. **HDFC Bank Format** (`test-files/hdfc-bank-statement.csv`)
```
Headers: Txn Date, Description, Debit, Credit, Balance
Format: Separate debit/credit columns
```

### 2. **ICICI Bank Format** (`test-files/icici-bank-statement.csv`)
```
Headers: Date, Narration, Withdrawal, Deposit, Balance
Format: Separate debit/credit columns with different names
```

### 3. **SBI Bank Format** (`test-files/sbi-bank-statement.csv`)
```
Headers: Transaction Date, Particulars, Amount, Balance
Format: Single amount column with +/- values
```

### 4. **Axis Bank Format** (`test-files/axis-bank-statement.csv`)
```
Headers: Value Date, Description, Dr, Cr, Balance
Format: Separate debit/credit columns with Dr/Cr notation
```

### 5. **Custom Format** (`test-files/custom-bank-statement.csv`)
```
Headers: Entry Date, Details, Payment, Receipt, Closing Balance, Account No, Reference
Format: All possible fields including account number and reference ID
```

## 🚀 Step-by-Step Testing Process

### Step 1: Database Setup
```sql
-- Run this in your Supabase SQL Editor first
-- Copy the contents of database/excel-processing-enhancements.sql and execute
```

### Step 2: Test Each File Format

#### Test 1: HDFC Format
1. **Upload**: `test-files/hdfc-bank-statement.csv`
2. **Expected Console Logs**:
   ```
   📊 Processing Excel file with column mapping...
   📋 Excel headers detected: ["Txn Date", "Description", "Debit", "Credit", "Balance"]
   🗺️ Column mapping: {
     "Txn Date": "date",
     "Description": "description", 
     "Debit": "debit",
     "Credit": "credit",
     "Balance": "balance"
   }
   ✅ Excel processing completed: {totalRows: 10, processedRows: 10, skippedRows: 0}
   ```

3. **Expected Database Results**:
   - 10 transactions created
   - `source_type` = 'excel'
   - Proper debit_amount/credit_amount values
   - Auto-detected categories

#### Test 2: ICICI Format
1. **Upload**: `test-files/icici-bank-statement.csv`
2. **Expected Mapping**:
   ```
   "Date": "date"
   "Narration": "description"
   "Withdrawal": "debit"
   "Deposit": "credit"
   "Balance": "balance"
   ```

#### Test 3: SBI Format (Single Amount Column)
1. **Upload**: `test-files/sbi-bank-statement.csv`
2. **Expected Mapping**:
   ```
   "Transaction Date": "date"
   "Particulars": "description"
   "Amount": "amount"
   "Balance": "balance"
   ```
3. **Expected Behavior**:
   - Positive amounts → credit_amount
   - Negative amounts → debit_amount

#### Test 4: Axis Format (Dr/Cr)
1. **Upload**: `test-files/axis-bank-statement.csv`
2. **Expected Mapping**:
   ```
   "Value Date": "date"
   "Description": "description"
   "Dr": "debit"
   "Cr": "credit"
   "Balance": "balance"
   ```

#### Test 5: Custom Format (All Fields)
1. **Upload**: `test-files/custom-bank-statement.csv`
2. **Expected Mapping**:
   ```
   "Entry Date": "date"
   "Details": "description"
   "Payment": "debit"
   "Receipt": "credit"
   "Closing Balance": "balance"
   "Account No": "account_no"
   "Reference": "reference_id"
   ```

## 🔍 Verification Checklist

For each test, verify:

### ✅ Console Logs
- [ ] Headers detected correctly
- [ ] Column mapping successful
- [ ] Processing completed without errors
- [ ] Correct row counts (processed vs skipped)

### ✅ Database Verification
Run these queries after each upload:

```sql
-- Check latest uploads
SELECT 
  file_name,
  file_type_detected,
  transactions_count,
  confidence_score,
  status,
  created_at
FROM uploads 
WHERE file_type_detected = 'excel'
ORDER BY created_at DESC
LIMIT 5;

-- Check transactions from latest upload
SELECT 
  date,
  description,
  debit_amount,
  credit_amount,
  balance,
  category,
  source_type,
  confidence,
  account_no,
  reference_id
FROM transactions 
WHERE source_type = 'excel'
ORDER BY created_at DESC
LIMIT 10;
```

### ✅ Expected Results

| Test File | Expected Transactions | Debit Total | Credit Total | Categories |
|-----------|----------------------|-------------|--------------|------------|
| HDFC | 10 | ₹38,500 | ₹70,000 | salary, business_expense, meals_entertainment |
| ICICI | 10 | ₹38,500 | ₹70,000 | salary, business_expense, meals_entertainment |
| SBI | 10 | ₹38,500 | ₹70,000 | salary, business_expense, meals_entertainment |
| Axis | 10 | ₹38,500 | ₹70,000 | salary, business_expense, meals_entertainment |
| Custom | 10 | ₹38,500 | ₹70,000 | salary, business_expense, meals_entertainment |

## 🚨 Error Testing

### Test Invalid Files
1. **Empty Excel file** - Should show error
2. **Excel with no date column** - Should show "Date column not found"
3. **Excel with no amount columns** - Should show "No amount columns found"
4. **Excel with invalid dates** - Should skip invalid rows

### Test Edge Cases
1. **Mixed data types** in amount columns
2. **Empty rows** between data
3. **Special characters** in descriptions
4. **Very large amounts**

## 📊 Performance Testing

### Large File Test
Create a test file with 100+ transactions and verify:
- Processing time is reasonable
- Memory usage doesn't spike
- All transactions are processed correctly

## 🎯 Success Criteria

The system passes testing if:

1. **✅ All 5 test files process successfully**
2. **✅ Column mapping works for all formats**
3. **✅ Transactions stored with correct amounts**
4. **✅ Categories auto-detected properly**
5. **✅ Error handling works for invalid files**
6. **✅ Console logs provide clear feedback**
7. **✅ Database queries return expected results**

## 🔧 Troubleshooting

### Common Issues & Solutions

1. **"No mapping found for header"**
   - Check if header is in the standardColumnMap
   - Add custom mapping if needed

2. **"Date column not found"**
   - Ensure date column has recognizable header
   - Check for typos in date headers

3. **"No amount columns found"**
   - Verify debit/credit or amount column exists
   - Check column headers match expected patterns

4. **Transactions not appearing**
   - Check browser console for errors
   - Verify database schema updates applied
   - Check Supabase connection

### Debug Commands

```sql
-- Check if schema updates were applied
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'uploads' 
AND column_name IN ('file_type_detected', 'confidence_score', 'column_mapping');

-- Check recent Excel uploads
SELECT * FROM uploads 
WHERE file_type_detected = 'excel' 
ORDER BY created_at DESC;

-- Check Excel transactions
SELECT * FROM transactions 
WHERE source_type = 'excel' 
ORDER BY created_at DESC;
```

## 🎉 Ready to Test!

Start with the HDFC format test file and work through each format. Each test should take about 2-3 minutes to complete and verify.

**Need help with any specific test?** Let me know which format you'd like to test first or if you encounter any issues!
