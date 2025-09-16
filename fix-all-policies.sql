-- Comprehensive fix for all RLS policies
-- Run this in your Supabase SQL Editor

-- 1. Fix storage policies (most important for file uploads)
DROP POLICY IF EXISTS "admin can upload files" ON storage.objects;
DROP POLICY IF EXISTS "admin can view files" ON storage.objects;
DROP POLICY IF EXISTS "admin can delete files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to uploads bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to uploads bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletion from uploads bucket" ON storage.objects;

-- Create permissive storage policies for uploads bucket
DROP POLICY IF EXISTS "Allow all operations on uploads bucket" ON storage.objects;
CREATE POLICY "Allow all operations on uploads bucket" ON storage.objects
    FOR ALL USING (bucket_id = 'uploads');

-- 2. Fix uploads table schema to handle both file extensions and document types
-- Drop the existing check constraint
ALTER TABLE uploads DROP CONSTRAINT IF EXISTS uploads_file_type_check;

-- Add a new column for document type (what the app actually uses)
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS document_type TEXT;

-- Update the file_type constraint to allow actual file extensions
ALTER TABLE uploads ADD CONSTRAINT uploads_file_type_check 
    CHECK (file_type IN ('pdf','jpg','jpeg','png','gif','csv','xls','xlsx','txt','doc','docx'));

-- Add constraint for document type
ALTER TABLE uploads ADD CONSTRAINT uploads_document_type_check 
    CHECK (document_type IN ('bank_statement','receipt','upi_proof','other'));

-- 2.5. Fix transactions table category constraint to match frontend categories
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_category_check 
    CHECK (category IN (
        'Business Expense',
        'Personal Expense', 
        'Travel & Transport',
        'Meals & Entertainment',
        'Office Supplies',
        'Software & Subscriptions',
        'Utilities',
        'Other'
    ));

-- 3. Ensure database table policies are permissive
DROP POLICY IF EXISTS "allow admin access" ON admin;
DROP POLICY IF EXISTS "allow admin access" ON transactions;
DROP POLICY IF EXISTS "allow admin access" ON uploads;
DROP POLICY IF EXISTS "allow admin access" ON reports;
DROP POLICY IF EXISTS "allow admin access" ON audit_logs;

-- Create permissive policies for all tables
DROP POLICY IF EXISTS "allow all access" ON admin;
DROP POLICY IF EXISTS "allow all access" ON transactions;
DROP POLICY IF EXISTS "allow all access" ON uploads;
DROP POLICY IF EXISTS "allow all access" ON reports;
DROP POLICY IF EXISTS "allow all access" ON audit_logs;

CREATE POLICY "allow all access" ON admin FOR ALL USING (true);
CREATE POLICY "allow all access" ON transactions FOR ALL USING (true);
CREATE POLICY "allow all access" ON uploads FOR ALL USING (true);
CREATE POLICY "allow all access" ON reports FOR ALL USING (true);
CREATE POLICY "allow all access" ON audit_logs FOR ALL USING (true);

-- 4. Verify bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit) 
VALUES ('uploads', 'uploads', true, 10485760) 
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- 5. Show current policies for verification
SELECT 'Storage Policies:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

SELECT 'Table Policies:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename IN ('admin', 'transactions', 'uploads', 'reports', 'audit_logs');

SELECT 'Bucket Status:' as info;
SELECT id, name, public, file_size_limit FROM storage.buckets WHERE name = 'uploads';
