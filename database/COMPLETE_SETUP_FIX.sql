-- COMPLETE SETUP FIX for PDF Reports and Saved Reports
-- This script fixes all the issues with PDF generation and saved reports

-- ==============================================
-- 1. CREATE SAVED_REPORTS TABLE
-- ==============================================

-- Drop table if exists (for clean setup)
DROP TABLE IF EXISTS public.saved_reports CASCADE;

-- Create the table with all required columns
CREATE TABLE public.saved_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_name TEXT NOT NULL,
    report_type TEXT DEFAULT 'filtered_transactions',
    transaction_ids UUID[] NOT NULL,
    filters_applied JSONB,
    total_transactions INTEGER NOT NULL DEFAULT 0,
    total_credits DECIMAL(15,2) DEFAULT 0,
    total_debits DECIMAL(15,2) DEFAULT 0,
    date_range JSONB,
    pdf_url TEXT,
    pdf_filename TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_saved_reports_created_at ON public.saved_reports(created_at DESC);
CREATE INDEX idx_saved_reports_report_type ON public.saved_reports(report_type);
CREATE INDEX idx_saved_reports_created_by ON public.saved_reports(created_by);

-- Enable Row Level Security (RLS)
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Users can view own saved reports" ON public.saved_reports
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create own saved reports" ON public.saved_reports
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own saved reports" ON public.saved_reports
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own saved reports" ON public.saved_reports
    FOR DELETE USING (auth.uid() = created_by);

-- Grant necessary permissions
GRANT ALL ON public.saved_reports TO authenticated;
GRANT ALL ON public.saved_reports TO service_role;

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_saved_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_saved_reports_updated_at
    BEFORE UPDATE ON public.saved_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_saved_reports_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.saved_reports IS 'Stores filtered transaction reports saved by users from the Transactions page';
COMMENT ON COLUMN public.saved_reports.transaction_ids IS 'Array of transaction UUIDs that were included in this saved report';
COMMENT ON COLUMN public.saved_reports.filters_applied IS 'JSON object containing the filters that were applied when saving (search, date range, etc.)';
COMMENT ON COLUMN public.saved_reports.date_range IS 'JSON object with start and end dates of the filtered transactions';
COMMENT ON COLUMN public.saved_reports.pdf_url IS 'URL to the generated PDF report stored in Supabase storage';
COMMENT ON COLUMN public.saved_reports.pdf_filename IS 'Filename of the generated PDF report';

-- ==============================================
-- 2. CREATE STORAGE BUCKET FOR PDF REPORTS
-- ==============================================

-- Create the reports bucket for PDF storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'reports',
    'reports',
    true,
    52428800, -- 50MB limit
    ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies for the reports bucket
CREATE POLICY "Users can upload PDF reports" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'reports' 
        AND auth.uid() IS NOT NULL
        AND (storage.foldername(name))[1] = 'pdf-reports'
    );

CREATE POLICY "Users can view PDF reports" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'reports' 
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can delete their own PDF reports" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'reports' 
        AND auth.uid() IS NOT NULL
    );

-- ==============================================
-- 3. SUCCESS MESSAGE
-- ==============================================

SELECT 'Setup completed successfully! Created saved_reports table and reports storage bucket.' as message;
