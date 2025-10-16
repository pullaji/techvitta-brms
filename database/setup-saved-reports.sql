-- Quick setup script for saved_reports table
-- Run this in your Supabase SQL editor to create the required table

-- Drop table if exists (for clean setup)
DROP TABLE IF EXISTS public.saved_reports CASCADE;

-- Create the table
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

-- Create indexes
CREATE INDEX idx_saved_reports_created_at ON public.saved_reports(created_at DESC);
CREATE INDEX idx_saved_reports_report_type ON public.saved_reports(report_type);
CREATE INDEX idx_saved_reports_created_by ON public.saved_reports(created_by);

-- Enable RLS
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own saved reports" ON public.saved_reports
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create own saved reports" ON public.saved_reports
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own saved reports" ON public.saved_reports
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own saved reports" ON public.saved_reports
    FOR DELETE USING (auth.uid() = created_by);

-- Grant permissions
GRANT ALL ON public.saved_reports TO authenticated;
GRANT ALL ON public.saved_reports TO service_role;

-- Create update trigger
CREATE OR REPLACE FUNCTION update_saved_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_saved_reports_updated_at
    BEFORE UPDATE ON public.saved_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_saved_reports_updated_at();

-- Success message
SELECT 'saved_reports table created successfully!' as message;
