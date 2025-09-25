-- Minimal fix for 400 Bad Request error - Only essential columns
-- Run this in Supabase SQL Editor

-- Add only the missing column causing the 400 error
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS extracted_transactions_count INTEGER DEFAULT 0;

-- Add the other essential columns for Excel processing
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS credit_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS debit_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'excel';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source_file TEXT;

SELECT '✅ Minimal fix applied - Excel uploads should work now' as message;
