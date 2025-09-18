-- Fix Policy Conflict Error
-- This script will resolve the "policy already exists" error

-- Drop existing policies first
DROP POLICY IF EXISTS "Allow all operations on transactions" ON transactions;
DROP POLICY IF EXISTS "Allow all operations on uploads" ON uploads;

-- Create the policies again
CREATE POLICY "Allow all operations on transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations on uploads" ON uploads FOR ALL USING (true);

-- Verify the policies were created
SELECT 'Policies created successfully!' as message;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('transactions', 'uploads');
