-- Duplicate Prevention Schema
-- Adds file hash tracking and transaction deduplication constraints

-- Add file hash column to uploads table
ALTER TABLE uploads 
ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- Add unique constraint on file hash to prevent duplicate file uploads
CREATE UNIQUE INDEX IF NOT EXISTS idx_uploads_file_hash_unique 
ON uploads(file_hash) 
WHERE file_hash IS NOT NULL;

-- Add composite unique constraint for transaction deduplication
-- This prevents exact duplicates based on key transaction fields
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_unique_composite 
ON transactions(date, payment_type, transaction_name, credit_amount, debit_amount)
WHERE credit_amount > 0 OR debit_amount > 0;

-- Add index for faster duplicate detection queries
CREATE INDEX IF NOT EXISTS idx_transactions_dedup_lookup 
ON transactions(date, payment_type, credit_amount, debit_amount);

-- Add index for transaction name similarity searches
CREATE INDEX IF NOT EXISTS idx_transactions_name_search 
ON transactions USING gin(to_tsvector('english', transaction_name));

-- Create function to check for similar transactions
CREATE OR REPLACE FUNCTION check_similar_transactions(
    p_date DATE,
    p_payment_type TEXT,
    p_transaction_name TEXT,
    p_credit_amount NUMERIC,
    p_debit_amount NUMERIC,
    p_tolerance NUMERIC DEFAULT 0.01
) RETURNS TABLE(
    id UUID,
    similarity_score NUMERIC,
    match_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        CASE 
            WHEN t.date = p_date THEN 25 ELSE 0 
        END +
        CASE 
            WHEN ABS((t.credit_amount - t.debit_amount) - (p_credit_amount - p_debit_amount)) <= p_tolerance THEN 30 ELSE 0 
        END +
        CASE 
            WHEN LOWER(REGEXP_REPLACE(REGEXP_REPLACE(t.transaction_name, '\b(imps|upi|neft|rtgs)/\d+\b', '', 'gi'), '\s+', ' ', 'g')) = 
                 LOWER(REGEXP_REPLACE(REGEXP_REPLACE(p_transaction_name, '\b(imps|upi|neft|rtgs)/\d+\b', '', 'gi'), '\s+', ' ', 'g')) THEN 25 ELSE 0 
        END +
        CASE 
            WHEN t.payment_type = p_payment_type THEN 10 ELSE 0 
        END +
        CASE 
            WHEN t.category = (
                SELECT category FROM transactions 
                WHERE date = p_date 
                AND payment_type = p_payment_type 
                AND ABS((credit_amount - debit_amount) - (p_credit_amount - p_debit_amount)) <= p_tolerance
                LIMIT 1
            ) THEN 10 ELSE 0 
        END AS similarity_score,
        CASE 
            WHEN t.date = p_date AND ABS((t.credit_amount - t.debit_amount) - (p_credit_amount - p_debit_amount)) <= p_tolerance 
                 AND LOWER(REGEXP_REPLACE(REGEXP_REPLACE(t.transaction_name, '\b(imps|upi|neft|rtgs)/\d+\b', '', 'gi'), '\s+', ' ', 'g')) = 
                     LOWER(REGEXP_REPLACE(REGEXP_REPLACE(p_transaction_name, '\b(imps|upi|neft|rtgs)/\d+\b', '', 'gi'), '\s+', ' ', 'g'))
            THEN 'Exact match after normalization'
            WHEN t.date = p_date AND ABS((t.credit_amount - t.debit_amount) - (p_credit_amount - p_debit_amount)) <= p_tolerance
            THEN 'Date and amount match'
            ELSE 'Partial match'
        END AS match_reason
    FROM transactions t
    WHERE t.date = p_date
    AND t.payment_type = p_payment_type
    AND ABS((t.credit_amount - t.debit_amount) - (p_credit_amount - p_debit_amount)) <= p_tolerance
    AND (
        LOWER(REGEXP_REPLACE(REGEXP_REPLACE(t.transaction_name, '\b(imps|upi|neft|rtgs)/\d+\b', '', 'gi'), '\s+', ' ', 'g')) = 
        LOWER(REGEXP_REPLACE(REGEXP_REPLACE(p_transaction_name, '\b(imps|upi|neft|rtgs)/\d+\b', '', 'gi'), '\s+', ' ', 'g'))
        OR SIMILARITY(t.transaction_name, p_transaction_name) > 0.8
    )
    ORDER BY similarity_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to insert transaction with duplicate prevention
CREATE OR REPLACE FUNCTION insert_transaction_with_dedup(
    p_date DATE,
    p_payment_type TEXT,
    p_transaction_name TEXT,
    p_description TEXT,
    p_category TEXT,
    p_credit_amount NUMERIC,
    p_debit_amount NUMERIC,
    p_balance NUMERIC DEFAULT NULL,
    p_source_file TEXT DEFAULT NULL,
    p_source_type TEXT DEFAULT 'manual',
    p_proof TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS TABLE(
    inserted BOOLEAN,
    transaction_id UUID,
    duplicate_id UUID,
    similarity_score NUMERIC,
    match_reason TEXT
) AS $$
DECLARE
    similar_transaction RECORD;
    new_transaction_id UUID;
    is_duplicate BOOLEAN := FALSE;
    duplicate_threshold NUMERIC := 80;
BEGIN
    -- Check for similar transactions
    SELECT * INTO similar_transaction
    FROM check_similar_transactions(p_date, p_payment_type, p_transaction_name, p_credit_amount, p_debit_amount)
    WHERE similarity_score >= duplicate_threshold
    LIMIT 1;
    
    -- If similar transaction found, return duplicate info
    IF FOUND THEN
        is_duplicate := TRUE;
        RETURN QUERY SELECT 
            FALSE as inserted,
            NULL::UUID as transaction_id,
            similar_transaction.id as duplicate_id,
            similar_transaction.similarity_score,
            similar_transaction.match_reason;
        RETURN;
    END IF;
    
    -- Insert new transaction if no duplicate found
    INSERT INTO transactions (
        date, payment_type, transaction_name, description, category,
        credit_amount, debit_amount, balance, source_file, source_type,
        proof, notes, created_at, updated_at
    ) VALUES (
        p_date, p_payment_type, p_transaction_name, p_description, p_category,
        p_credit_amount, p_debit_amount, p_balance, p_source_file, p_source_type,
        p_proof, p_notes, NOW(), NOW()
    ) RETURNING id INTO new_transaction_id;
    
    RETURN QUERY SELECT 
        TRUE as inserted,
        new_transaction_id as transaction_id,
        NULL::UUID as duplicate_id,
        100::NUMERIC as similarity_score,
        'New transaction inserted' as match_reason;
END;
$$ LANGUAGE plpgsql;

-- Create view for duplicate analysis
CREATE OR REPLACE VIEW transaction_duplicates AS
SELECT 
    t1.id as transaction1_id,
    t2.id as transaction2_id,
    t1.date,
    t1.transaction_name as name1,
    t2.transaction_name as name2,
    t1.credit_amount - t1.debit_amount as amount1,
    t2.credit_amount - t2.debit_amount as amount2,
    ABS((t1.credit_amount - t1.debit_amount) - (t2.credit_amount - t2.debit_amount)) as amount_difference,
    CASE 
        WHEN LOWER(REGEXP_REPLACE(REGEXP_REPLACE(t1.transaction_name, '\b(imps|upi|neft|rtgs)/\d+\b', '', 'gi'), '\s+', ' ', 'g')) = 
             LOWER(REGEXP_REPLACE(REGEXP_REPLACE(t2.transaction_name, '\b(imps|upi|neft|rtgs)/\d+\b', '', 'gi'), '\s+', ' ', 'g'))
        THEN 'Exact normalized match'
        WHEN SIMILARITY(t1.transaction_name, t2.transaction_name) > 0.8
        THEN 'High similarity'
        ELSE 'Low similarity'
    END as match_type,
    t1.source_file as file1,
    t2.source_file as file2
FROM transactions t1
JOIN transactions t2 ON t1.date = t2.date 
    AND t1.payment_type = t2.payment_type
    AND t1.id < t2.id  -- Avoid duplicate pairs
WHERE ABS((t1.credit_amount - t1.debit_amount) - (t2.credit_amount - t2.debit_amount)) <= 0.01
AND (
    LOWER(REGEXP_REPLACE(REGEXP_REPLACE(t1.transaction_name, '\b(imps|upi|neft|rtgs)/\d+\b', '', 'gi'), '\s+', ' ', 'g')) = 
    LOWER(REGEXP_REPLACE(REGEXP_REPLACE(t2.transaction_name, '\b(imps|upi|neft|rtgs)/\d+\b', '', 'gi'), '\s+', ' ', 'g'))
    OR SIMILARITY(t1.transaction_name, t2.transaction_name) > 0.8
);

-- Create function to clean up duplicates (manual cleanup)
CREATE OR REPLACE FUNCTION cleanup_duplicate_transactions()
RETURNS TABLE(
    removed_count INTEGER,
    kept_count INTEGER
) AS $$
DECLARE
    duplicate_record RECORD;
    removed_count INTEGER := 0;
    kept_count INTEGER := 0;
BEGIN
    -- Remove duplicates, keeping the one with the most complete data
    FOR duplicate_record IN 
        SELECT 
            transaction1_id,
            transaction2_id,
            CASE 
                WHEN LENGTH(COALESCE(t1.description, '')) > LENGTH(COALESCE(t2.description, '')) THEN transaction1_id
                WHEN LENGTH(COALESCE(t1.description, '')) < LENGTH(COALESCE(t2.description, '')) THEN transaction2_id
                WHEN t1.created_at < t2.created_at THEN transaction1_id
                ELSE transaction2_id
            END as keep_id,
            CASE 
                WHEN LENGTH(COALESCE(t1.description, '')) > LENGTH(COALESCE(t2.description, '')) THEN transaction2_id
                WHEN LENGTH(COALESCE(t1.description, '')) < LENGTH(COALESCE(t2.description, '')) THEN transaction1_id
                WHEN t1.created_at < t2.created_at THEN transaction2_id
                ELSE transaction1_id
            END as remove_id
        FROM transaction_duplicates td
        JOIN transactions t1 ON td.transaction1_id = t1.id
        JOIN transactions t2 ON td.transaction2_id = t2.id
    LOOP
        -- Remove the duplicate
        DELETE FROM transactions WHERE id = duplicate_record.remove_id;
        removed_count := removed_count + 1;
        kept_count := kept_count + 1;
    END LOOP;
    
    RETURN QUERY SELECT removed_count, kept_count;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically update file hash when file is uploaded
CREATE OR REPLACE FUNCTION update_file_hash()
RETURNS TRIGGER AS $$
BEGIN
    -- If file_hash is not provided, generate a simple hash based on file properties
    IF NEW.file_hash IS NULL THEN
        NEW.file_hash := MD5(
            COALESCE(NEW.file_name, '') || 
            COALESCE(NEW.file_size_mb::TEXT, '') || 
            COALESCE(NEW.file_type, '') ||
            COALESCE(NEW.created_at::TEXT, '')
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_file_hash
    BEFORE INSERT ON uploads
    FOR EACH ROW
    EXECUTE FUNCTION update_file_hash();

-- Insert sample data for testing
INSERT INTO uploads (file_name, file_url, file_type, file_size_mb, status) VALUES 
('test_bank_statement.pdf', 'https://example.com/test.pdf', 'pdf', 2.5, 'processed')
ON CONFLICT (file_hash) DO NOTHING;

-- Verify the setup
SELECT 'Duplicate prevention schema setup completed successfully!' as status;
SELECT 'Added file hash tracking to uploads table' as file_tracking;
SELECT 'Added transaction deduplication constraints' as transaction_dedup;
SELECT 'Created duplicate detection functions' as functions;
SELECT 'Created duplicate cleanup utilities' as cleanup;
