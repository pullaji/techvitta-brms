-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create admin table (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS admin (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop the password_hash column if it exists (for existing installations)
ALTER TABLE admin DROP COLUMN IF EXISTS password_hash;

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(12,2) NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('receipt','bank_transfer','upi','cash','other')),
    category TEXT CHECK (category IN ('business_expense','personal_expense','travel_transport','meals_entertainment','office_supplies','software_subscriptions','utilities')),
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
    status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded','processing','processed','failed')),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type TEXT NOT NULL CHECK (report_type IN ('tax_summary','monthly_expense','yearly_summary')),
    file_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type ON transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status);
CREATE INDEX IF NOT EXISTS idx_uploads_file_type ON uploads(file_type);
CREATE INDEX IF NOT EXISTS idx_uploads_uploaded_at ON uploads(uploaded_at);

CREATE INDEX IF NOT EXISTS idx_reports_report_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Function to sync auth users with admin table
CREATE OR REPLACE FUNCTION sync_auth_user_to_admin()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update admin record when auth user is created/updated
    INSERT INTO admin (id, email, full_name, created_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.created_at
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create audit trigger functions
CREATE OR REPLACE FUNCTION log_transaction_changes() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs(action, details, created_at)
    VALUES ('transaction_' || TG_OP, row_to_json(NEW), NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION log_upload_changes() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs(action, details, created_at)
    VALUES ('upload_' || TG_OP, row_to_json(NEW), NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers (drop existing ones first)
DROP TRIGGER IF EXISTS transactions_audit ON transactions;
DROP TRIGGER IF EXISTS uploads_audit ON uploads;

CREATE TRIGGER transactions_audit
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION log_transaction_changes();

CREATE TRIGGER uploads_audit
    AFTER INSERT OR UPDATE OR DELETE ON uploads
    FOR EACH ROW EXECUTE FUNCTION log_upload_changes();

-- Trigger to sync auth users with admin table
CREATE TRIGGER sync_auth_to_admin
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION sync_auth_user_to_admin();

-- Function to manually sync existing auth users to admin table
CREATE OR REPLACE FUNCTION sync_existing_auth_users()
RETURNS void AS $$
BEGIN
    -- Insert all existing auth users into admin table
    INSERT INTO admin (id, email, full_name, created_at)
    SELECT 
        id,
        email,
        COALESCE(raw_user_meta_data->>'full_name', email),
        created_at
    FROM auth.users
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;
END;
$$ LANGUAGE plpgsql;

-- Run the sync function to add existing auth users to admin table
SELECT sync_existing_auth_users();

-- Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('uploads', 'uploads', true) 
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on tables
ALTER TABLE admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "allow admin access" ON admin;
DROP POLICY IF EXISTS "allow admin access" ON transactions;
DROP POLICY IF EXISTS "allow admin access" ON uploads;
DROP POLICY IF EXISTS "allow admin access" ON reports;
DROP POLICY IF EXISTS "allow admin access" ON audit_logs;

-- RLS policies - Admin has full access to everything
CREATE POLICY "allow admin access" ON admin
    FOR ALL
    USING (true);

CREATE POLICY "allow admin access" ON transactions
    FOR ALL
    USING (true);

CREATE POLICY "allow admin access" ON uploads
    FOR ALL
    USING (true);

CREATE POLICY "allow admin access" ON reports
    FOR ALL
    USING (true);

CREATE POLICY "allow admin access" ON audit_logs
    FOR ALL
    USING (true);

-- Storage policies for file uploads (admin can upload/view/delete all files)
-- Drop existing storage policies first
DROP POLICY IF EXISTS "admin can upload files" ON storage.objects;
DROP POLICY IF EXISTS "admin can view files" ON storage.objects;
DROP POLICY IF EXISTS "admin can delete files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

CREATE POLICY "admin can upload files" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "admin can view files" ON storage.objects
    FOR SELECT USING (bucket_id = 'uploads');

CREATE POLICY "admin can delete files" ON storage.objects
    FOR DELETE USING (bucket_id = 'uploads');
