# 📊 Create Test Excel Files

Since I can't create actual Excel files directly, here's how you can quickly create test files:

## 🚀 Quick Excel File Creation

### Method 1: Copy-Paste into Excel (Recommended)

1. **Open Microsoft Excel or Google Sheets**
2. **Copy the data below** for each format
3. **Paste into the spreadsheet**
4. **Save as .xlsx file**

### Method 2: Use the Test Data Generator

I've created a test utility in `src/utils/testExcelProcessing.ts` that you can use to verify the column mapping logic without uploading files.

## 📋 Test Data for Each Format

### 1. HDFC Bank Format
```
Txn Date	Description	Debit	Credit	Balance
2024-01-15	Salary Credit		50000	50000
2024-01-16	Rent Payment	15000		35000
2024-01-17	Grocery Shopping	2500		32500
2024-01-18	Freelance Payment		8000	40500
2024-01-19	Fuel Expense	2000		38500
2024-01-20	Bank Transfer	10000		28500
2024-01-21	Online Purchase	3500		25000
2024-01-22	Investment Return		12000	37000
2024-01-23	Medical Bill	4500		32500
2024-01-24	ATM Withdrawal	3000		29500
```

### 2. ICICI Bank Format
```
Date	Narration	Withdrawal	Deposit	Balance
2024-01-15	Salary Credit		50000	50000
2024-01-16	Office Rent	15000		35000
2024-01-17	Food & Beverages	2500		32500
2024-01-18	Client Payment		8000	40500
2024-01-19	Petrol Expense	2000		38500
2024-01-20	Transfer to Savings	10000		28500
2024-01-21	Amazon Purchase	3500		25000
2024-01-22	Dividend Income		12000	37000
2024-01-23	Hospital Bill	4500		32500
2024-01-24	Cash Withdrawal	3000		29500
```

### 3. SBI Bank Format (Single Amount Column)
```
Transaction Date	Particulars	Amount	Balance
2024-01-15	Salary Credit	50000	50000
2024-01-16	Office Rent	-15000	35000
2024-01-17	Food & Beverages	-2500	32500
2024-01-18	Client Payment	8000	40500
2024-01-19	Petrol Expense	-2000	38500
2024-01-20	Transfer to Savings	-10000	28500
2024-01-21	Amazon Purchase	-3500	25000
2024-01-22	Dividend Income	12000	37000
2024-01-23	Hospital Bill	-4500	32500
2024-01-24	Cash Withdrawal	-3000	29500
```

### 4. Axis Bank Format (Dr/Cr)
```
Value Date	Description	Dr	Cr	Balance
2024-01-15	Salary Credit		50000	50000
2024-01-16	Office Rent	15000		35000
2024-01-17	Food & Beverages	2500		32500
2024-01-18	Client Payment		8000	40500
2024-01-19	Petrol Expense	2000		38500
2024-01-20	Transfer to Savings	10000		28500
2024-01-21	Amazon Purchase	3500		25000
2024-01-22	Dividend Income		12000	37000
2024-01-23	Hospital Bill	4500		32500
2024-01-24	Cash Withdrawal	3000		29500
```

### 5. Custom Format (All Fields)
```
Entry Date	Details	Payment	Receipt	Closing Balance	Account No	Reference
2024-01-15	Salary Credit		50000	50000	1234567890	TXN001
2024-01-16	Office Rent	15000		35000	1234567890	TXN002
2024-01-17	Food & Beverages	2500		32500	1234567890	TXN003
2024-01-18	Client Payment		8000	40500	1234567890	TXN004
2024-01-19	Petrol Expense	2000		38500	1234567890	TXN005
2024-01-20	Transfer to Savings	10000		28500	1234567890	TXN006
2024-01-21	Amazon Purchase	3500		25000	1234567890	TXN007
2024-01-22	Dividend Income		12000	37000	1234567890	TXN008
2024-01-23	Hospital Bill	4500		32500	1234567890	TXN009
2024-01-24	Cash Withdrawal	3000		29500	1234567890	TXN010
```

## 🧪 Alternative: Test with Your Real Bank Statements

Instead of creating test files, you can also test with your actual bank statement Excel files:

1. **Export your bank statement as Excel**
2. **Upload it to your app**
3. **Check the console logs** to see how columns are mapped
4. **Verify the results** in your database

## 🔧 Browser Console Testing

You can also test the column mapping logic directly in your browser:

1. **Open your app**
2. **Open browser console** (F12)
3. **Run this command**:
   ```javascript
   // Test the column mapping logic
   window.testExcelProcessing?.testColumnMapping();
   ```

## 📝 Expected Results for Each Format

| Format | Expected Mappings | Expected Transactions |
|--------|------------------|---------------------|
| HDFC | Txn Date→date, Description→description, Debit→debit, Credit→credit | 10 transactions |
| ICICI | Date→date, Narration→description, Withdrawal→debit, Deposit→credit | 10 transactions |
| SBI | Transaction Date→date, Particulars→description, Amount→amount | 10 transactions |
| Axis | Value Date→date, Description→description, Dr→debit, Cr→credit | 10 transactions |
| Custom | Entry Date→date, Details→description, Payment→debit, Receipt→credit, Account No→account_no, Reference→reference_id | 10 transactions |

## 🎯 Testing Tips

1. **Start with HDFC format** - it's the most straightforward
2. **Check browser console** for detailed mapping logs
3. **Verify database results** after each upload
4. **Test error handling** with invalid files
5. **Try with your real bank statements** once basic testing works

Ready to create your test files and start testing!
