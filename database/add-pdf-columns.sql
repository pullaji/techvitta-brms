-- Add PDF columns to existing saved_reports table
-- Run this in your Supabase SQL editor to add the missing columns

-- Add pdf_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'saved_reports' 
                   AND column_name = 'pdf_url') THEN
        ALTER TABLE public.saved_reports ADD COLUMN pdf_url TEXT;
    END IF;
END $$;

-- Add pdf_filename column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'saved_reports' 
                   AND column_name = 'pdf_filename') THEN
        ALTER TABLE public.saved_reports ADD COLUMN pdf_filename TEXT;
    END IF;
END $$;

-- Success message
SELECT 'PDF columns added successfully to saved_reports table!' as message;
