-- Fix uploads table to add missing file_hash column
-- This resolves the 400 error when querying uploads table

-- Check if uploads table exists and add file_hash column if missing
DO $$
BEGIN
    -- Check if uploads table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'uploads') THEN
        -- Add file_hash column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'uploads' AND column_name = 'file_hash'
        ) THEN
            ALTER TABLE uploads ADD COLUMN file_hash TEXT;
            RAISE NOTICE 'Added file_hash column to uploads table';
        ELSE
            RAISE NOTICE 'file_hash column already exists in uploads table';
        END IF;
        
        -- Add unique index on file_hash if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'uploads' AND indexname = 'idx_uploads_file_hash_unique'
        ) THEN
            CREATE UNIQUE INDEX idx_uploads_file_hash_unique 
            ON uploads(file_hash) 
            WHERE file_hash IS NOT NULL;
            RAISE NOTICE 'Added unique index on file_hash column';
        ELSE
            RAISE NOTICE 'Unique index on file_hash already exists';
        END IF;
        
    ELSE
        RAISE NOTICE 'uploads table does not exist - creating it';
        
        -- Create uploads table with all necessary columns
        CREATE TABLE uploads (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            file_name TEXT NOT NULL,
            file_url TEXT NOT NULL,
            file_type TEXT CHECK (file_type IN ('pdf','jpg','jpeg','png','csv','xls','xlsx')),
            file_size_mb NUMERIC(6,2) CHECK (file_size_mb <= 10),
            status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded','processing','processed','failed')),
            processing_error TEXT,
            extracted_transactions_count INTEGER DEFAULT 0,
            file_hash TEXT,
            metadata JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            processed_at TIMESTAMPTZ
        );
        
        -- Add unique index on file_hash
        CREATE UNIQUE INDEX idx_uploads_file_hash_unique 
        ON uploads(file_hash) 
        WHERE file_hash IS NOT NULL;
        
        RAISE NOTICE 'Created uploads table with file_hash column';
    END IF;
END $$;

-- Verify the fix
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'uploads') 
        THEN '✅ uploads table exists'
        ELSE '❌ uploads table missing'
    END as table_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'uploads' AND column_name = 'file_hash'
        ) 
        THEN '✅ file_hash column exists'
        ELSE '❌ file_hash column missing'
    END as column_status;

SELECT 'Uploads table fix completed successfully!' as message;
