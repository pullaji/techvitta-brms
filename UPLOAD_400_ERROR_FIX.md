# Fix for 400 Bad Request Error on Uploads Table

## Problem
You're getting a 400 Bad Request error when trying to PATCH the uploads table:
```
PATCH https://xxvugyypiiukupsnyzqy.supabase.co/rest/v1/uploads?id=eq.aedfe128-3601-484c-8c64-c055ddc47921 400 (Bad Request)
```

## Root Cause
The error was caused by the application trying to update the `uploads` table with columns that don't exist in the current database schema. Specifically, the code in `src/services/supabaseApi.ts` was attempting to update:

```sql
UPDATE uploads SET 
  status = 'processing',
  extracted_transactions_count = 5  -- ❌ This column doesn't exist!
WHERE id = 'some-uuid';
```

But the `extracted_transactions_count` column was missing from the `uploads` table.

## Missing Columns
The following columns are missing from your database schema:

### uploads table:
- `extracted_transactions_count` - Number of transactions extracted from the file
- `file_hash` - Hash of the file for duplicate detection
- `file_type_detected` - Auto-detected file type
- `confidence_score` - Processing confidence score
- `transactions_count` - Total transaction count
- `column_mapping` - Excel column mapping data
- `processing_metadata` - Additional processing metadata

### transactions table:
- `source_type` - Source of the transaction (manual, excel, pdf, etc.)
- `confidence` - Processing confidence
- `account_no` - Account number
- `reference_id` - Reference ID
- `file_path` - Path to source file
- `proof` - Proof image URL
- `type` - Transaction type (debit/credit)

## Solution

### Step 1: Run the Database Fix
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `database/fix-uploads-table.sql`
4. Run the SQL script

### Step 2: Verify the Fix
1. Run the test script `database/test-uploads-fix.sql` in Supabase SQL Editor
2. Check that all tests pass

### Step 3: Test File Upload
1. Try uploading a file in your application
2. Check browser console - should no longer see 400 errors
3. Verify that transactions are created successfully

## Code Changes Made
The code in `src/services/supabaseApi.ts` already has error handling for missing columns:

```typescript
// Check if file with this hash already exists (only if file_hash column exists)
try {
  const { data: existingUpload, error: hashCheckError } = await supabase
    .from('uploads')
    .select('id, file_name, status, extracted_transactions_count')
    .eq('file_hash', fileHashCheck.hash)
    .single();
} catch (columnError: any) {
  // If file_hash column doesn't exist, skip duplicate check
  if (columnError.message?.includes('column "file_hash" does not exist')) {
    console.log('file_hash column not available, skipping duplicate check');
  } else {
    throw columnError;
  }
}
```

## Expected Results After Fix
1. ✅ File uploads work without 400 errors
2. ✅ Duplicate file detection works
3. ✅ Transaction extraction counts are properly stored
4. ✅ Excel processing works correctly
5. ✅ Proof uploads work properly

## Troubleshooting
If you still get errors after applying the fix:

1. **Check column existence:**
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'uploads' 
   AND column_name = 'extracted_transactions_count';
   ```

2. **Check browser console** - should see "file_hash column not available" message (if database fix not applied) or duplicate detection working (if database fix applied)

3. **Verify RLS policies** - make sure you have proper permissions to update the uploads table

4. **Check Supabase logs** - look for any database errors in the Supabase dashboard

## Files Created
- `database/fix-uploads-table.sql` - Main fix script
- `database/test-uploads-fix.sql` - Test script to verify the fix
- `UPLOAD_400_ERROR_FIX.md` - This documentation

The fix is comprehensive and adds all the missing columns that the application code expects to use.