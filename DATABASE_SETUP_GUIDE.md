# Database Setup Guide for PDF Reports

## Quick Setup (Required for Reports Page)

To enable the Reports page functionality, you need to run the database setup script in your Supabase SQL Editor.

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Create a new query

### Step 2: Run the Setup Script
Copy and paste the contents of `database/COMPLETE_SETUP_FIX.sql` into the SQL Editor and run it.

**OR** run this simplified version:

```sql
-- Create saved_reports table
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
    pdf_url TEXT,
    pdf_filename TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Create storage bucket for PDF reports (optional)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'reports',
    'reports',
    true,
    52428800, -- 50MB limit
    ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies
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
```

### Step 3: Verify Setup
After running the script, you should see:
- ✅ `saved_reports` table created
- ✅ `reports` storage bucket created (optional)
- ✅ RLS policies enabled

## What This Enables

### ✅ Reports Page Functionality
- Save filtered transactions from Transactions page
- View saved reports in Reports page
- Download PDF reports from Reports page
- Delete saved reports

### ✅ PDF Generation
- Generate PDF reports with transaction summaries
- Download PDFs locally or from cloud storage
- Proper table formatting and layout

## Testing the Setup

1. **Go to Transactions page**
2. **Click "Save" button** - should save to Reports page instead of downloading
3. **Go to Reports page** - should see your saved report
4. **Click "Download PDF"** - should download the PDF file

## Troubleshooting

### If you get "Database table not found" error:
- Make sure you ran the SQL setup script
- Check that the `saved_reports` table exists in your Supabase database

### If PDF download doesn't work:
- The system will fallback to local PDF generation
- Check browser console for any errors
- Make sure you have transactions to save

### If storage upload fails:
- The system will continue without cloud storage
- PDFs will still be generated and downloaded locally
- Check that the `reports` storage bucket exists

## Success! 🎉

Once setup is complete, your workflow will be:
1. **Transactions page** → Click "Save" → Report saved to database
2. **Reports page** → View saved reports → Click "Download PDF" → PDF downloads

No more direct downloads from the Save button - everything goes through the Reports page as requested!
