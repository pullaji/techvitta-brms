# Quick Fix Guide - Clear All Errors

## 🚨 Current Errors
- ❌ 404 Error: `saved_reports` table does not exist
- ❌ 400 Error: `reports` storage bucket not found  
- ⚠️ Warning: Table width too wide for PDF page

## ✅ Solution (5 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"

### Step 2: Run the Fix Script
1. Copy the entire contents of `database/FIX_ALL_ERRORS.sql`
2. Paste it into the SQL Editor
3. Click "Run" button

### Step 3: Verify Success
You should see this message:
```
SUCCESS: All errors fixed! saved_reports table and reports storage bucket created.
```

### Step 4: Test the Application
1. Go to your Transactions page
2. Click "Save" button
3. Should see: "Report saved successfully! X transactions saved to Reports page"
4. Go to Reports page - should see your saved report
5. Click "Download PDF" - should download without errors

## 🎯 What This Fixes

### ✅ Database Errors (404)
- Creates `saved_reports` table
- Sets up proper permissions and policies
- Enables Reports page functionality

### ✅ Storage Errors (400)  
- Creates `reports` storage bucket
- Sets up PDF upload/download policies
- Enables cloud PDF storage

### ✅ PDF Warnings
- Fixed table column widths
- No more "units width could not fit page" warnings
- Better PDF layout

## 🔧 Alternative: Manual Setup

If you prefer to run commands individually:

```sql
-- 1. Create table
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

-- 2. Enable RLS
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

-- 3. Create policies
CREATE POLICY "Users can view own saved reports" ON public.saved_reports
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create own saved reports" ON public.saved_reports
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- 4. Create storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('reports', 'reports', true, 52428800, ARRAY['application/pdf']);

-- 5. Grant permissions
GRANT ALL ON public.saved_reports TO authenticated;
GRANT ALL ON public.saved_reports TO service_role;
```

## 🎉 After Setup

Your workflow will be:
1. **Transactions page** → Click "Save" → ✅ Success message
2. **Reports page** → See saved reports → Click "Download PDF" → ✅ PDF downloads
3. **No more errors** in console!

The system will work perfectly once you run the SQL script! 🚀
