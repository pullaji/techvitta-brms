-- Setup Proof Storage Configuration
-- This script sets up the storage bucket and policies for proof uploads

-- Create storage bucket for uploads (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'uploads',
    'uploads',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

-- Create storage policies for uploads bucket
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'uploads');

-- Allow authenticated users to view their own files
CREATE POLICY "Allow authenticated users to view files" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'uploads');

-- Allow authenticated users to update their own files
CREATE POLICY "Allow authenticated users to update files" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'uploads')
WITH CHECK (bucket_id = 'uploads');

-- Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated users to delete files" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'uploads');

-- Allow public access to view files (for proof images)
CREATE POLICY "Allow public access to view files" ON storage.objects
FOR SELECT TO anon
USING (bucket_id = 'uploads');

-- Create a function to generate unique file paths
CREATE OR REPLACE FUNCTION generate_unique_file_path(
    p_bucket_id TEXT,
    p_file_name TEXT,
    p_user_id UUID DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
    file_ext TEXT;
    base_name TEXT;
    unique_path TEXT;
    counter INTEGER := 0;
BEGIN
    -- Extract file extension
    file_ext := LOWER(SPLIT_PART(p_file_name, '.', -1));
    base_name := SPLIT_PART(p_file_name, '.', 1);
    
    -- Generate unique path
    unique_path := COALESCE(p_user_id::TEXT, 'anonymous') || '/' || 
                   EXTRACT(EPOCH FROM NOW())::TEXT || '_' || 
                   base_name || '.' || file_ext;
    
    -- Check if file already exists and generate new name if needed
    WHILE EXISTS (
        SELECT 1 FROM storage.objects 
        WHERE bucket_id = p_bucket_id AND name = unique_path
    ) LOOP
        counter := counter + 1;
        unique_path := COALESCE(p_user_id::TEXT, 'anonymous') || '/' || 
                       EXTRACT(EPOCH FROM NOW())::TEXT || '_' || 
                       base_name || '_' || counter::TEXT || '.' || file_ext;
    END LOOP;
    
    RETURN unique_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to clean up orphaned files
CREATE OR REPLACE FUNCTION cleanup_orphaned_files()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    file_record RECORD;
BEGIN
    -- Find files in storage that don't have corresponding records in uploads table
    FOR file_record IN
        SELECT name, bucket_id
        FROM storage.objects
        WHERE bucket_id = 'uploads'
        AND created_at < NOW() - INTERVAL '1 hour' -- Only check files older than 1 hour
        AND NOT EXISTS (
            SELECT 1 FROM uploads 
            WHERE file_url LIKE '%' || name || '%'
        )
    LOOP
        -- Delete the orphaned file
        DELETE FROM storage.objects 
        WHERE bucket_id = file_record.bucket_id 
        AND name = file_record.name;
        
        deleted_count := deleted_count + 1;
    END LOOP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for storage usage statistics
CREATE OR REPLACE VIEW storage_usage_stats AS
SELECT 
    bucket_id,
    COUNT(*) as file_count,
    SUM(metadata->>'size')::BIGINT as total_size_bytes,
    ROUND(SUM(metadata->>'size')::BIGINT / 1024.0 / 1024.0, 2) as total_size_mb,
    MIN(created_at) as oldest_file,
    MAX(created_at) as newest_file
FROM storage.objects
WHERE bucket_id = 'uploads'
GROUP BY bucket_id;

-- Test the setup
SELECT 'Storage bucket and policies created successfully!' as status;

-- Show current storage usage
SELECT * FROM storage_usage_stats;

-- Show bucket configuration
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'uploads';
