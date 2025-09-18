-- Quick Database Setup - Run this first to create the transactions table
-- Copy and paste this entire script into your Supabase SQL Editor

-- Create transactions table with all required categories
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(12,2) NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('receipt','bank_transfer','upi','cash','other')),
    category TEXT CHECK (category IN (
        'business_expense', 'personal_expense', 'travel_transport',
        'meals_entertainment', 'office_supplies', 'software_subscriptions',
        'utilities', 'income', 'salary', 'business_income', 'investment',
        'refund', 'transfer_in', 'transfer_out', 'withdrawal', 'deposit',
        'loan_payment', 'insurance', 'medical', 'education', 'shopping',
        'entertainment', 'fuel', 'maintenance'
    )),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processed','failed','archived')),
    notes TEXT,
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
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

-- Create policies to allow all operations (adjust for production)
CREATE POLICY "Allow all operations on transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations on uploads" ON uploads FOR ALL USING (true);

-- Test the setup
INSERT INTO transactions (amount, transaction_type, category, notes)
VALUES (100.00, 'receipt', 'business_expense', 'Test transaction - can be deleted')
RETURNING id, amount, category;

-- Verify tables exist
SELECT 'Setup completed successfully!' as message;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('transactions', 'uploads');
