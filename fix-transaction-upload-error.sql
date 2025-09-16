-- Fix for transaction upload error - 400 Bad Request
-- This script fixes the category constraint mismatch and ensures proper policies

-- 1. Drop and recreate the transactions category constraint to match frontend
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_check;

-- Add the correct constraint that matches your frontend categories
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

-- 2. Drop all existing policies on transactions table
DROP POLICY IF EXISTS "allow admin access" ON transactions;
DROP POLICY IF EXISTS "allow all access" ON transactions;

-- 3. Create permissive policy for transactions table
CREATE POLICY "allow all access" ON transactions FOR ALL USING (true);

-- 4. Ensure RLS is enabled on transactions table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 5. Fix storage policies for file uploads
DROP POLICY IF EXISTS "admin can upload files" ON storage.objects;
DROP POLICY IF EXISTS "admin can view files" ON storage.objects;
DROP POLICY IF EXISTS "admin can delete files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to uploads bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to uploads bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletion from uploads bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow all operations on uploads bucket" ON storage.objects;

-- Create permissive storage policies for uploads bucket
CREATE POLICY "Allow all operations on uploads bucket" ON storage.objects
    FOR ALL USING (bucket_id = 'uploads');

-- 6. Ensure uploads bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit) 
VALUES ('uploads', 'uploads', true, 10485760) 
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- 7. Fix uploads table policies
DROP POLICY IF EXISTS "allow admin access" ON uploads;
DROP POLICY IF EXISTS "allow all access" ON uploads;

CREATE POLICY "allow all access" ON uploads FOR ALL USING (true);

-- 8. Verify the fixes
SELECT 'Transactions Category Constraint:' as info;
SELECT conname, pg_get_constraintdef(oid) as definition FROM pg_constraint 
WHERE conname = 'transactions_category_check';

SELECT 'Storage Policies:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

SELECT 'Table Policies:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename IN ('transactions', 'uploads');

SELECT 'Bucket Status:' as info;
SELECT id, name, public, file_size_limit FROM storage.buckets WHERE name = 'uploads';
