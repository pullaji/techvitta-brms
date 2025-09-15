-- Migration script to fix existing admin table structure
-- Run this if you get the password_hash constraint error

-- Drop the password_hash column if it exists
ALTER TABLE admin DROP COLUMN IF EXISTS password_hash;

-- Now run the sync function to add existing auth users
SELECT sync_existing_auth_users();

-- Verify the admin table structure and data
SELECT * FROM admin;
