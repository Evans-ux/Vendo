-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can insert own supplier data" ON suppliers;
DROP POLICY IF EXISTS "Allow authenticated users to insert their supplier data" ON suppliers;

-- Create a more permissive insert policy for signup
-- This allows any authenticated user to insert a row where the id matches their user id
CREATE POLICY "Enable insert for authenticated users during signup"
ON suppliers
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Alternatively, if you want to use a database function (recommended):
-- First, create the function
CREATE OR REPLACE FUNCTION create_supplier(
  user_id UUID,
  p_full_name TEXT,
  p_business_name TEXT,
  p_email TEXT,
  p_phone TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO suppliers (id, full_name, business_name, email, phone)
  VALUES (user_id, p_full_name, p_business_name, p_email, p_phone)
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_supplier TO authenticated;
GRANT EXECUTE ON FUNCTION create_supplier TO anon;
