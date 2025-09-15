-- Manual sync script to add existing auth users to admin table
-- Run this in your Supabase SQL Editor

-- First, let's see what auth users exist
SELECT id, email, created_at FROM auth.users;

-- Sync all existing auth users to admin table automatically
-- This will add all auth users to the admin table
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

-- Verify the admin users were added
SELECT * FROM admin;
