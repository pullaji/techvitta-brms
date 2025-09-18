# Separate Credit and Debit Columns Setup

## ✅ **Separate Credit and Debit Columns Added Successfully!**

I've updated the transactions table to have separate "Credit" and "Debit" columns as you requested. Now positive amounts (+₹) go in the Credit column and negative amounts (-₹) go in the Debit column.

### **📊 Updated Table Structure:**

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `date` | DATE | Transaction date | "2025-05-15" |
| `payment_type` | TEXT | Payment method | "Single Transfer", "UPI receipt" |
| `transaction_name` | TEXT | Payer/Payee name | "Malakala Venkatesh" |
| `description` | TEXT | Transaction description | "Bank Transfer Received" |
| `category` | TEXT | Transaction category | "Income" |
| **`credit_amount`** | NUMERIC | **Positive amounts (+₹)** | 20000.00 |
| **`debit_amount`** | NUMERIC | **Negative amounts (-₹)** | 1500.00 |
| `proof` | TEXT | Proof file reference | "bank_statement.pdf" |
| `status` | TEXT | Transaction status | "processed" |

### **🎯 How It Works:**

1. **✅ Credit Column**: Shows positive amounts with +₹ symbol (green color)
2. **✅ Debit Column**: Shows negative amounts with -₹ symbol (red color)
3. **✅ Smart Logic**: 
   - If amount > 0 → goes to Credit column, Debit column shows "-"
   - If amount < 0 → goes to Debit column, Credit column shows "-"
   - Only one column will have a value, the other shows "-"

### **🚀 Complete Setup Script:**

Run this updated SQL script in your **Supabase SQL Editor**:

```sql
-- Drop existing table if it exists (WARNING: This will delete all data!)
DROP TABLE IF EXISTS transactions CASCADE;

-- Create Transaction Table with separate Credit and Debit columns
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Bank Statement Columns (from your image)
    date DATE NOT NULL,
    payment_type TEXT NOT NULL,
    transaction_name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    
    -- Separate Credit and Debit columns as requested
    credit_amount NUMERIC(12,2) DEFAULT 0, -- Credit amount (+₹ amounts go here)
    debit_amount NUMERIC(12,2) DEFAULT 0,  -- Debit amount (-₹ amounts go here)
    
    proof TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processed','failed','archived')),
    
    -- System fields
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create uploads table
CREATE TABLE IF NOT EXISTS uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT CHECK (file_type IN ('pdf','jpg','png','csv','xls','xlsx')),
    file_size_mb NUMERIC(6,2),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations on uploads" ON uploads FOR ALL USING (true);

-- Insert sample data with separate Credit and Debit columns
INSERT INTO transactions (date, payment_type, transaction_name, description, category, credit_amount, debit_amount, proof, status, notes) VALUES
('2025-05-15', 'Single Transfer', 'Malakala Venkatesh', 'Bank Transfer Received', 'Income', 20000.00, 0.00, 'bank_statement_2025_05_15.pdf', 'processed', 'Bank statement transaction'),
('2025-05-14', 'Single Transfer', 'Malakala Venkatesh', 'Bank Transfer Received', 'Income', 50000.00, 0.00, 'bank_statement_2025_05_14.pdf', 'processed', 'Bank statement transaction'),
('2025-05-14', 'UPI receipt', 'Dasari Taranga Naveen', 'UPI Payment Received', 'Income', 30000.00, 0.00, 'upi_receipt_2025_05_14.pdf', 'processed', 'Bank statement transaction'),
('2025-05-13', 'UPI Payment', 'Amazon Purchase', 'Online Shopping', 'Expense', 0.00, 1500.00, 'upi_receipt_2025_05_13.pdf', 'processed', 'Online purchase');

-- Verify setup
SELECT 'Success! Separate Credit and Debit columns created.' as message, COUNT(*) as transaction_count FROM transactions;
SELECT * FROM transactions ORDER BY date DESC;
```

### **📱 Updated UI Features:**

1. **Enhanced Table View**: 
   - **Credit Column**: Shows positive amounts with +₹ symbol in green
   - **Debit Column**: Shows negative amounts with -₹ symbol in red
   - Clear visual separation between credit and debit transactions

2. **Form Fields**: 
   - Separate Credit Amount and Debit Amount input fields
   - Users can enter either credit or debit amount (not both)
   - Form validation ensures proper data entry

3. **Visual Improvements**:
   - **Green color** for credit amounts (+₹)
   - **Red color** for debit amounts (-₹)
   - Clear column headers: "Credit (+₹)" and "Debit (-₹)"
   - Better organization and readability

### **🎯 Examples:**

| Transaction | Credit Column | Debit Column |
|-------------|---------------|--------------|
| Income ₹20,000 | +₹20,000 | - |
| Expense ₹1,500 | - | -₹1,500 |
| Salary ₹50,000 | +₹50,000 | - |
| Rent Payment ₹10,000 | - | -₹10,000 |

### **🚀 Ready to Use:**

1. **Run the SQL script** above in Supabase
2. **Refresh your browser** (Ctrl + Shift + R)
3. **Navigate to Transactions page** - you'll see separate Credit and Debit columns
4. **Upload bank statements** - amounts will be automatically placed in correct columns
5. **Add/edit transactions** - separate fields for credit and debit amounts

**Your transactions table now has separate Credit and Debit columns exactly as requested! 🎉**
