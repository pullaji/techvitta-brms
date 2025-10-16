-- Create saved_reports table for storing filtered transaction reports
-- This table stores references to saved filtered transactions from the Transactions page

CREATE TABLE IF NOT EXISTS public.saved_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_name TEXT NOT NULL,
    report_type TEXT DEFAULT 'filtered_transactions',
    transaction_ids UUID[] NOT NULL,
    filters_applied JSONB,
    total_transactions INTEGER NOT NULL DEFAULT 0,
    total_credits DECIMAL(15,2) DEFAULT 0,
    total_debits DECIMAL(15,2) DEFAULT 0,
    date_range JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_saved_reports_created_at ON public.saved_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_reports_report_type ON public.saved_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_saved_reports_created_by ON public.saved_reports(created_by);

-- Enable Row Level Security (RLS)
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- Policy: Users can only see their own saved reports
CREATE POLICY "Users can view own saved reports" ON public.saved_reports
    FOR SELECT USING (auth.uid() = created_by);

-- Policy: Users can insert their own saved reports
CREATE POLICY "Users can create own saved reports" ON public.saved_reports
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own saved reports
CREATE POLICY "Users can update own saved reports" ON public.saved_reports
    FOR UPDATE USING (auth.uid() = created_by);

-- Policy: Users can delete their own saved reports
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
