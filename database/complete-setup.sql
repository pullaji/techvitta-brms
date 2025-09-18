-- Complete Database Setup for TechVitta BRMS
-- Run this script in your Supabase SQL Editor to create all required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create admin table
CREATE TABLE IF NOT EXISTS admin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(12,2) NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('receipt','bank_transfer','upi','cash','other')),
    category TEXT CHECK (category IN (
        'business_expense',
        'personal_expense', 
        'travel_transport',
        'meals_entertainment',
        'office_supplies',
        'software_subscriptions',
        'utilities',
        'income',
        'salary',
        'business_income',
        'investment',
        'refund',
        'transfer_in',
        'transfer_out',
        'withdrawal',
        'deposit',
        'loan_payment',
        'insurance',
        'medical',
        'education',
        'shopping',
        'entertainment',
        'fuel',
        'maintenance'
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

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_name TEXT NOT NULL,
    report_type TEXT CHECK (report_type IN ('financial','audit','custom')),
    parameters JSONB,
    file_url TEXT,
    status TEXT DEFAULT 'generating' CHECK (status IN ('generating','completed','failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    generated_at TIMESTAMPTZ
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action TEXT NOT NULL,
    resource TEXT,
    details TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON uploads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uploads_file_type ON uploads(file_type);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Insert default admin user (password: admin123)
INSERT INTO admin (username, email, password_hash, full_name) 
VALUES (
    'admin', 
    'admin@techvitta.com', 
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- bcrypt hash for 'admin123'
    'System Administrator'
) ON CONFLICT (username) DO NOTHING;

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES
('app_name', '"TechVitta BRMS"', 'Application name'),
('currency', '"INR"', 'Default currency'),
('date_format', '"DD/MM/YYYY"', 'Default date format'),
('max_file_size_mb', '10', 'Maximum file upload size in MB'),
('allowed_file_types', '["pdf","jpg","png","csv","xls","xlsx"]', 'Allowed file types for upload')
ON CONFLICT (key) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all operations for now - adjust based on your security needs)
CREATE POLICY "Allow all operations on admin" ON admin FOR ALL USING (true);
CREATE POLICY "Allow all operations on transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations on uploads" ON uploads FOR ALL USING (true);
CREATE POLICY "Allow all operations on reports" ON reports FOR ALL USING (true);
CREATE POLICY "Allow all operations on audit_logs" ON audit_logs FOR ALL USING (true);
CREATE POLICY "Allow all operations on settings" ON settings FOR ALL USING (true);

-- Verify tables were created
SELECT 
    table_name, 
    table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Show table row counts
SELECT 
    'admin' as table_name, COUNT(*) as row_count FROM admin
UNION ALL
SELECT 
    'transactions' as table_name, COUNT(*) as row_count FROM transactions
UNION ALL
SELECT 
    'uploads' as table_name, COUNT(*) as row_count FROM uploads
UNION ALL
SELECT 
    'reports' as table_name, COUNT(*) as row_count FROM reports
UNION ALL
SELECT 
    'audit_logs' as table_name, COUNT(*) as row_count FROM audit_logs
UNION ALL
SELECT 
    'settings' as table_name, COUNT(*) as row_count FROM settings;
