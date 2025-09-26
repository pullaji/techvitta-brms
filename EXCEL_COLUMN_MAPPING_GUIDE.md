# Excel Column Mapping Guide

## 🎯 Overview

This guide explains how to properly format your Excel files to ensure accurate transaction extraction and mapping in the BRMS system.

## ✅ Required Excel Format

Your Excel file must have **proper column headers** in the first row. The system will automatically map these headers to the correct transaction fields.

### 📋 Required Columns

| Column Header | Description | Example | Required |
|---------------|-------------|---------|----------|
| **Date** | Transaction date | 2024-01-15 | ✅ Yes |
| **Description** | Transaction description | "Salary Credit" | ⚠️ Optional |
| **Debit** | Debit amount (money going out) | 2000.00 | ✅ Yes* |
| **Credit** | Credit amount (money coming in) | 50000.00 | ✅ Yes* |
| **Balance** | Running balance | 150000.00 | ⚠️ Optional |

*Note: You need either Debit OR Credit columns (or both).*

### 🔄 Alternative Column Names

The system recognizes these alternative names for each column:

#### Date Column
- `Date`
- `Transaction Date`
- `Txn Date`
- `Tran Date`
- `Value Date`
- `Posting Date`
- `Entry Date`

#### Description Column
- `Description`
- `Narration`
- `Particulars`
- `Details`
- `Remarks`
- `Transaction Name`
- `Narrative`
- `Memo`
- `Note`

#### Debit Column
- `Debit`
- `Debit Amount`
- `Withdrawal`
- `Payment`
- `Outflow`
- `Expense`
- `Dr`
- `Amount_DR`

#### Credit Column
- `Credit`
- `Credit Amount`
- `Deposit`
- `Receipt`
- `Inflow`
- `Income`
- `Cr`
- `Amount_CR`

#### Balance Column
- `Balance`
- `Closing Balance`
- `Running Balance`
- `Available Balance`
- `Balance_After`
- `Running Bal`
- `Closing Bal`

## 📊 Example Excel Format

### ✅ Correct Format

| Date | Description | Debit | Credit | Balance |
|------|-------------|-------|--------|---------|
| 2024-01-15 | Salary Credit | | 50000 | 150000 |
| 2024-01-16 | ATM Withdrawal | 2000 | | 148000 |
| 2024-01-17 | UPI Payment | 1500 | | 146500 |
| 2024-01-18 | Interest Credit | | 500 | 147000 |

### ❌ Incorrect Formats

#### Missing Headers
| | | | | |
|--|--|--|--|--|
| 2024-01-15 | Salary Credit | | 50000 | 150000 |
| 2024-01-16 | ATM Withdrawal | 2000 | | 148000 |

#### Numeric Headers
| 1 | 2 | 3 | 4 | 5 |
|--|--|--|--|--|
| 2024-01-15 | Salary Credit | | 50000 | 150000 |
| 2024-01-16 | ATM Withdrawal | 2000 | | 148000 |

#### Branch Codes Mixed with Amounts
| Date | Description | Branch Code | Debit | Credit | Balance |
|------|-------------|-------------|-------|--------|---------|
| 2024-01-15 | Salary Credit | 001 | | 50000 | 150000 |
| 2024-01-16 | ATM Withdrawal | 001 | 2000 | | 148000 |

*Note: Branch codes are automatically ignored and won't be mapped to amount fields.*

## 🚫 What Gets Ignored

The system automatically ignores these types of data to prevent incorrect mapping:

- **Branch Codes**: Numbers like 001, 002, 1234
- **Reference Numbers**: 6-12 digit codes like 123456789
- **Account Numbers**: 10-20 digit numbers
- **Date Serial Numbers**: Excel date numbers (40000+)
- **Empty Cells**: Blank or whitespace-only cells

## 🔧 Troubleshooting

### Problem: "No proper headers detected"
**Solution**: Ensure your Excel file has text headers in the first row, not numbers or empty cells.

### Problem: "No amount columns found"
**Solution**: Make sure you have columns named "Debit" and/or "Credit" (or their alternatives listed above).

### Problem: "Date column not found"
**Solution**: Ensure you have a column named "Date" (or one of its alternatives listed above).

### Problem: Branch codes being treated as amounts
**Solution**: This should no longer happen with the updated system. Branch codes are automatically detected and ignored.

## 📝 Best Practices

1. **Use Clear Headers**: Use descriptive column headers like "Date", "Description", "Debit", "Credit"
2. **Consistent Format**: Keep the same format throughout your Excel file
3. **No Merged Cells**: Avoid merged cells in the header row
4. **Clean Data**: Remove any extra rows or columns that aren't transaction data
5. **Date Format**: Use standard date formats (YYYY-MM-DD, DD/MM/YYYY, etc.)

## 🧪 Testing Your Excel File

Before uploading, verify that:
- ✅ First row contains proper column headers
- ✅ Date column is present and contains valid dates
- ✅ Debit and/or Credit columns are present
- ✅ Amount values are numeric (no text or codes)
- ✅ No merged cells in the header row

## 📞 Support

If you're still having issues with Excel file processing, please:
1. Check that your file follows the format described above
2. Verify that all required columns are present
3. Ensure column headers are properly named
4. Contact support with a sample of your Excel file structure
