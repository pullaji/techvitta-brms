-- Create Transaction Table for Bank Statement Columns
-- This creates a table to store the exact columns from your bank statement

-- Create transactions table with bank statement columns
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Bank Statement Columns (from your image)
    date DATE NOT NULL,                    -- "15 May, 2025"
    payment_type TEXT NOT NULL,            -- "Payment Type" column - "Single Transfer", "UPI receipt"
    transaction_name TEXT NOT NULL,        -- "Transaction Name" column - "Malakala Venkatesh", "Dasari Taranga Naveen"
    description TEXT,                      -- "Description" column
    category TEXT NOT NULL,                -- "Category" column
    
    -- Separate Credit and Debit columns as requested
    credit_amount NUMERIC(12,2) DEFAULT 0, -- Credit amount (+₹ amounts go here)
    debit_amount NUMERIC(12,2) DEFAULT 0,  -- Debit amount (-₹ amounts go here)
    
    proof TEXT,                            -- "Proof" column - file path or reference
    
    -- Additional system fields
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create uploads table for file storage
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

-- Create policies to allow all operations (drop existing ones first)
DROP POLICY IF EXISTS "Allow all operations on transactions" ON transactions;
DROP POLICY IF EXISTS "Allow all operations on uploads" ON uploads;

CREATE POLICY "Allow all operations on transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations on uploads" ON uploads FOR ALL USING (true);

-- Insert sample transactions based on your bank statement image
INSERT INTO transactions (date, payment_type, transaction_name, description, category, credit_amount, debit_amount, proof, notes) VALUES
('2025-05-15', 'Single Transfer', 'Malakala Venkatesh', 'Bank Transfer Received', 'Income', 20000.00, 0.00, 'bank_statement_2025_05_15.pdf', 'Bank statement transaction'),
('2025-05-14', 'Single Transfer', 'Malakala Venkatesh', 'Bank Transfer Received', 'Income', 50000.00, 0.00, 'bank_statement_2025_05_14.pdf', 'Bank statement transaction'),
('2025-05-14', 'UPI receipt', 'Dasari Taranga Naveen', 'UPI Payment Received', 'Income', 30000.00, 0.00, 'upi_receipt_2025_05_14.pdf', 'Bank statement transaction');

-- Verify the table was created and data was inserted
SELECT 'Transaction table created successfully!' as message;
SELECT COUNT(*) as transaction_count FROM transactions;
SELECT * FROM transactions ORDER BY date DESC;

-- Show table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;
