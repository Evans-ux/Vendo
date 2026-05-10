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

-- Create policies with more permissive insert policy
-- Allow users to read their own supplier data
CREATE POLICY "Users can read own supplier data"
  ON suppliers
  FOR SELECT
  USING (auth.uid() = id);

-- Allow authenticated users to insert supplier data (more permissive for signup)
CREATE POLICY "Allow authenticated users to insert their supplier data"
  ON suppliers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own supplier data
CREATE POLICY "Users can update own supplier data"
  ON suppliers
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

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
