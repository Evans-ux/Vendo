# 📋 Complete Supabase Setup Checklist

## ✅ Everything You Need to Do in Supabase

### **Step 1: Create the Suppliers Table**

1. Go to https://supabase.com/dashboard/project/hilfcbxcjofxsvaikpar
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste this SQL:

```sql
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own supplier data" ON suppliers;
DROP POLICY IF EXISTS "Users can insert own supplier data" ON suppliers;
DROP POLICY IF EXISTS "Users can update own supplier data" ON suppliers;
DROP POLICY IF EXISTS "Allow authenticated users to insert their supplier data" ON suppliers;
DROP POLICY IF EXISTS "Enable insert for authenticated users during signup" ON suppliers;

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

-- Allow insert during signup (permissive for authenticated users)
CREATE POLICY "Enable insert for authenticated users during signup"
  ON suppliers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

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
```

5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success. No rows returned"

---

### **Step 2: Enable Email Confirmation**

1. In Supabase dashboard, click **Authentication** in the left sidebar
2. Click **Providers** tab at the top
3. Find **Email** in the list and click on it
4. **Check** the box that says **"Confirm email"**
5. Click **Save**

---

### **Step 3: Configure URL Settings**

1. Still in **Authentication**, click **URL Configuration** tab
2. Set **Site URL** to: `http://localhost:3000`
3. In **Redirect URLs**, add these URLs (one per line):
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/supplier/dashboard
   http://localhost:3000/**
   ```
4. Click **Save**

---

### **Step 4: Verify Your Setup**

#### **Check the Suppliers Table:**
1. Click **Table Editor** in the left sidebar
2. You should see a table called **suppliers**
3. Click on it to see the columns:
   - id (uuid)
   - full_name (text)
   - business_name (text)
   - email (text)
   - phone (text)
   - created_at (timestamp)
   - updated_at (timestamp)

#### **Check RLS Policies:**
1. In **Table Editor**, click on **suppliers** table
2. Click the **RLS** button at the top
3. You should see 3 policies:
   - "Users can read own supplier data"
   - "Users can update own supplier data"
   - "Enable insert for authenticated users during signup"

#### **Check the Function:**
1. Click **Database** in the left sidebar
2. Click **Functions**
3. You should see **create_supplier** function

---

### **Step 5: Test Email Delivery (Optional but Recommended)**

1. Go to **Authentication** → **Logs**
2. This is where you'll see email delivery logs
3. After a signup, check here to see if emails are being sent

---

## 🎯 Summary - What Each Step Does

### **Step 1: Suppliers Table**
- Creates the table to store supplier data (name, business, phone)
- Sets up Row Level Security (RLS) for data protection
- Creates a function to insert supplier data (bypasses RLS during signup)
- Creates policies so users can only see/edit their own data

### **Step 2: Email Confirmation**
- Requires users to verify their email before accessing the dashboard
- Sends verification email automatically on signup
- Prevents fake/spam accounts

### **Step 3: URL Configuration**
- Tells Supabase where to redirect after email verification
- Allows your localhost app to receive auth callbacks
- Required for email verification to work

---

## ✅ Verification Checklist

After completing all steps, verify:

- [ ] Suppliers table exists in Table Editor
- [ ] RLS is enabled on suppliers table
- [ ] 3 RLS policies exist
- [ ] create_supplier function exists
- [ ] Email confirmation is enabled
- [ ] Redirect URLs are configured
- [ ] Site URL is set to http://localhost:3000

---

## 🧪 Test Your Setup

1. Go to http://localhost:3000/supplier/signup
2. Fill out the form with a **real email address**
3. Click "Create Account"
4. You should see: "Please check your email to verify your account"
5. Check your email (and spam folder)
6. Click the verification link
7. You should be redirected to the dashboard
8. Check **Table Editor** → **suppliers** - you should see your data!

---

## 🐛 Troubleshooting

### **"new row violates row-level security policy"**
- Make sure you ran the SQL in Step 1
- Check that the "Enable insert for authenticated users during signup" policy exists

### **"function create_supplier does not exist"**
- Run the SQL in Step 1 again
- Check **Database** → **Functions** to verify it was created

### **Email not received**
- Check spam folder
- Check **Authentication** → **Logs** for email delivery status
- Supabase has rate limits (3 emails per hour in free tier)
- Wait a few minutes and try again

### **Verification link doesn't work**
- Make sure redirect URLs are configured in Step 3
- Check that `/app/auth/callback/route.ts` exists in your code
- Clear browser cookies and try again

### **Can't see supplier data**
- Check **Table Editor** → **suppliers** (not Authentication → Users)
- The auth table only shows email/id
- Supplier data (phone, business name) is in the suppliers table

---

## 📊 What Data Goes Where

### **Authentication Table** (`auth.users`)
Managed by Supabase, stores:
- ✅ User ID (UUID)
- ✅ Email
- ✅ Password (hashed)
- ✅ Email confirmed status
- ✅ Created at / Last sign in

### **Suppliers Table** (`public.suppliers`)
Your custom table, stores:
- ✅ User ID (links to auth.users)
- ✅ Full Name
- ✅ Business Name
- ✅ Phone
- ✅ Email (duplicate for easy access)
- ✅ Created at / Updated at

---

## 🚀 You're Done!

Once you complete all 5 steps above, your authentication system will be fully functional with:

✅ User signup with email verification
✅ Secure login
✅ Protected dashboard
✅ Supplier data storage
✅ Row-level security
✅ Email verification flow

If you have any issues, check the troubleshooting section above! 🎉
