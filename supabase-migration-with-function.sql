-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own supplier data" ON suppliers;
DROP POLICY IF EXISTS "Users can insert own supplier data" ON suppliers;
DROP POLICY IF EXISTS "Users can update own supplier data" ON suppliers;
DROP POLICY IF EXISTS "Allow authenticated users to insert their supplier data" ON suppliers;

-- Create suppliers table (if not exists)
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow users to read their own supplier data
CREATE POLICY "Users can read own supplier data"
  ON suppliers
  FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own supplier data
CREATE POLICY "Users can update own supplier data"
  ON suppliers
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create a function to handle supplier creation (bypasses RLS)
CREATE OR REPLACE FUNCTION create_supplier(
  user_id UUID,
  p_full_name TEXT,
  p_business_name TEXT,
  p_email TEXT,
  p_phone TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
BEGIN
  INSERT INTO suppliers (id, full_name, business_name, email, phone)
  VALUES (user_id, p_full_name, p_business_name, p_email, p_phone);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_supplier TO authenticated;

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index on email for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);
