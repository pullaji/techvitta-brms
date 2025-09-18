# Transaction Table Setup - Bank Statement Columns

## 🎯 What You Need to Do

Your database doesn't have the transaction table yet. Here's how to create it with the exact columns from your bank statement image:

### **🗄️ Step 1: Create Transaction Table**

Go to your **Supabase Dashboard** → **SQL Editor** and run this script:

```sql
-- Create Transaction Table for Bank Statement Columns
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Bank Statement Columns (from your image)
    date DATE NOT NULL,                    -- "15 May, 2025"
    payment_type TEXT NOT NULL,            -- "Single Transfer", "UPI receipt"
    transaction_name TEXT NOT NULL,        -- "Malakala Venkatesh", "Dasari Taranga Naveen"
    category TEXT NOT NULL,                -- "Income"
    amount NUMERIC(12,2) NOT NULL,         -- 20000.00, 50000.00, 30000.00
    is_credit BOOLEAN DEFAULT true,        -- true for +₹ amounts
    
    -- System fields
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processed','failed','archived')),
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
    file_size_mb NUMERIC(6,2) CHECK (file_size_mb <= 10),
    status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded','processed','failed')),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations on uploads" ON uploads FOR ALL USING (true);

-- Insert sample transactions from your bank statement
INSERT INTO transactions (date, payment_type, transaction_name, category, amount, is_credit, notes) VALUES
('2025-05-15', 'Single Transfer', 'Malakala Venkatesh', 'Income', 20000.00, true, 'Bank statement transaction'),
('2025-05-14', 'Single Transfer', 'Malakala Venkatesh', 'Income', 50000.00, true, 'Bank statement transaction'),
('2025-05-14', 'UPI receipt', 'Dasari Taranga Naveen', 'Income', 30000.00, true, 'Bank statement transaction');

-- Verify the setup
SELECT 'Transaction table created successfully!' as message;
SELECT COUNT(*) as transaction_count FROM transactions;
SELECT * FROM transactions ORDER BY date DESC;
```

### **📊 Table Structure Created:**

The table will have these exact columns from your bank statement:

| Column | Type | Example | Description |
|--------|------|---------|-------------|
| `date` | DATE | 2025-05-15 | Transaction date |
| `payment_type` | TEXT | "Single Transfer" | Payment method |
| `transaction_name` | TEXT | "Malakala Venkatesh" | Payer/Payee name |
| `category` | TEXT | "Income" | Transaction category |
| `amount` | NUMERIC | 20000.00 | Transaction amount |
| `is_credit` | BOOLEAN | true | Whether it's income (+) |

### **🧪 Step 2: Test the Setup**

After running the SQL, test it:

```sql
-- Check if table exists and has data
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions';
SELECT * FROM transactions;
```

### **🔄 Step 3: Refresh Your Application**

1. **Hard refresh your browser** (Ctrl + Shift + R)
2. **Go to Transactions page**
3. **You should see the 3 sample transactions** from your bank statement
4. **No more "Error loading transactions" message**

### **🎯 What Happens Next:**

1. ✅ **Transactions page loads** without errors
2. ✅ **Shows your 3 bank statement transactions**
3. ✅ **You can upload PDF files** and they'll create new transactions
4. ✅ **All columns match** your bank statement format

**Run the SQL script above, then refresh your application. Your transactions page will work perfectly! 🎉**
