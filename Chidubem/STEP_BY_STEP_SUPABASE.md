# 🎯 Step-by-Step Supabase Setup Guide

## STEP 1: Create the Suppliers Table

### 1.1 Open Supabase Dashboard
1. Open your web browser
2. Go to: https://supabase.com/dashboard/project/hilfcbxcjofxsvaikpar
3. You should see your project dashboard

### 1.2 Open SQL Editor
1. Look at the **left sidebar**
2. Find and click on **"SQL Editor"** (it has a database icon)
3. You'll see the SQL Editor page

### 1.3 Create New Query
1. At the top of the page, click the **"New query"** button (green button)
2. A blank SQL editor will appear

### 1.4 Copy the SQL Code
1. Open the file `supabase-migration-with-function.sql` in your project
2. **OR** copy this code:

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

### 1.5 Paste and Run
1. **Paste** the SQL code into the editor
2. Click the **"Run"** button (or press Ctrl+Enter on Windows, Cmd+Enter on Mac)
3. Wait a few seconds
4. You should see: **"Success. No rows returned"** at the bottom

### 1.6 Verify Table Was Created
1. In the left sidebar, click **"Table Editor"**
2. You should now see a table called **"suppliers"**
3. Click on it to see the columns

---

## STEP 2: Enable Email Confirmation

### 2.1 Go to Authentication Settings
1. In the left sidebar, click **"Authentication"** (shield icon)
2. You'll see the Authentication page

### 2.2 Open Providers Tab
1. At the top of the page, you'll see tabs: "Users", "Providers", "Policies", etc.
2. Click on the **"Providers"** tab

### 2.3 Configure Email Provider
1. You'll see a list of providers (Email, Phone, Google, etc.)
2. Find **"Email"** in the list
3. Click on **"Email"** to expand it

### 2.4 Enable Email Confirmation
1. You'll see a toggle/checkbox that says **"Confirm email"**
2. **Turn it ON** (check the box or toggle it)
3. Scroll down and click **"Save"** button at the bottom

---

## STEP 3: Configure URL Settings

### 3.1 Go to URL Configuration
1. Still in **Authentication** section
2. Look at the tabs at the top
3. Click on **"URL Configuration"** tab

### 3.2 Set Site URL
1. Find the field labeled **"Site URL"**
2. Clear any existing value
3. Type: `https://vendo-nu.vercel.app`
4. Press Enter or Tab

### 3.3 Add Redirect URLs
1. Find the section labeled **"Redirect URLs"**
2. You'll see a text area
3. Add these URLs (one per line):
```
http://localhost:3000/auth/callback
http://localhost:3000/supplier/dashboard
http://localhost:3000/**
```

### 3.4 Save Settings
1. Scroll down
2. Click the **"Save"** button

---

## STEP 4: Verify Everything Was Created

### 4.1 Check Suppliers Table
1. Click **"Table Editor"** in the left sidebar
2. Look for **"suppliers"** in the list of tables
3. Click on it
4. You should see these columns:
   - id
   - full_name
   - business_name
   - email
   - phone
   - created_at
   - updated_at

### 4.2 Check RLS Policies
1. While viewing the suppliers table
2. Look at the top right
3. Click the **shield icon** or **"RLS"** button
4. You should see 3 policies:
   - "Users can read own supplier data"
   - "Users can update own supplier data"
   - "Enable insert for authenticated users during signup"

### 4.3 Check Database Function
1. In the left sidebar, click **"Database"**
2. Click on **"Functions"** in the submenu
3. You should see **"create_supplier"** in the list
4. If you click on it, you'll see the function code

---

## STEP 5: Test Your Setup

### 5.1 Start Your Dev Server
1. Open your terminal/command prompt
2. Navigate to your project folder: `cd C:\Users\cex\Vendo`
3. Run: `bun run dev`
4. Wait for it to say "Ready"

### 5.2 Open Signup Page
1. Open your web browser
2. Go to: http://localhost:3000/supplier/signup

### 5.3 Create Test Account
1. Fill out the form:
   - Full Name: Test User
   - Business Name: Test Business
   - Email: **YOUR REAL EMAIL** (you need to receive the verification email)
   - Phone: +1234567890
   - Password: test123
   - Confirm Password: test123
2. Click **"Create Account"**

### 5.4 Check for Success Message
1. You should see a green toast notification
2. It should say: "Please check your email to verify your account"
3. The form should clear

### 5.5 Check Your Email
1. Open your email inbox
2. Look for an email from Supabase
3. **Check your spam folder** if you don't see it
4. The subject will be something like "Confirm Your Email"

### 5.6 Click Verification Link
1. Open the email
2. Click the **"Confirm your email"** button/link
3. You should be redirected to: http://localhost:3000/supplier/dashboard

### 5.7 Verify Data in Supabase
1. Go back to Supabase dashboard
2. Click **"Table Editor"** → **"suppliers"**
3. You should see your data:
   - Your full name
   - Your business name
   - Your email
   - Your phone number
   - Created timestamp

---

## ✅ Success Checklist

After completing all steps, you should have:

- [x] Suppliers table exists in Table Editor
- [x] 3 RLS policies on suppliers table
- [x] create_supplier function exists
- [x] Email confirmation is enabled
- [x] Redirect URLs are configured
- [x] Site URL is set to localhost:3000
- [x] Test signup works
- [x] Verification email received
- [x] Data appears in suppliers table

---

## 🐛 Common Issues and Solutions

### Issue 1: "Success. No rows returned" doesn't appear
**Solution:**
- Check if there are any red error messages
- Make sure you copied the ENTIRE SQL code
- Try running it again

### Issue 2: Can't find "suppliers" table
**Solution:**
- Refresh the page
- Click "Table Editor" again
- Make sure the SQL ran successfully (check for "Success" message)

### Issue 3: Email not received
**Solution:**
- Check spam folder
- Wait 2-3 minutes (emails can be delayed)
- Check Authentication → Logs to see if email was sent
- Supabase free tier has rate limits (3 emails per hour)

### Issue 4: "RLS policy violation" error
**Solution:**
- Make sure you ran the SQL in Step 1
- Check that policies exist (Step 4.2)
- Try running the SQL again

### Issue 5: Verification link doesn't work
**Solution:**
- Make sure you completed Step 3 (URL Configuration)
- Check that redirect URLs include `/auth/callback`
- Clear browser cookies and try again

---

## 📞 Need Help?

If something doesn't work:

1. **Check the error message** - it usually tells you what's wrong
2. **Check Supabase logs**: Authentication → Logs
3. **Check browser console**: Press F12 and look for errors
4. **Check terminal/server logs**: Look for error messages

---

## 🎉 You're Done!

Once you complete all 5 steps and the test works, your authentication system is fully set up and ready to use!

Your users can now:
✅ Sign up with email verification
✅ Receive verification emails
✅ Verify their accounts
✅ Login securely
✅ Access their dashboard

Congratulations! 🚀
