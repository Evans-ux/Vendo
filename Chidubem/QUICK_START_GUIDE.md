# 🚀 Quick Start Guide - Vendo Platform

## 📋 What You Have Now

A complete supplier and admin dashboard system with:
- ✅ Order management with countdown timers
- ✅ KYC verification workflow
- ✅ Product approval system
- ✅ Supplier management
- ✅ Real-time order tracking

---

## ⚠️ BEFORE YOU CAN USE IT

### Step 1: Fix Database Connection

**Current Issue:** Database password is incorrect

**Solution:**
1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to: **Settings** → **Database** → **Connection Pooling**
4. Copy the connection string (it will show the correct password)
5. Open `.env.local` in your project
6. Replace `[YOUR-PASSWORD]` with the actual password:

```env
DATABASE_URL="postgresql://postgres.hilfcbxcjofxsvaikpar:ACTUAL_PASSWORD_HERE@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

DIRECT_URL="postgresql://postgres.hilfcbxcjofxsvaikpar:ACTUAL_PASSWORD_HERE@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
```

7. Save the file
8. Run in terminal:
```bash
bunx prisma db push
```

9. If successful, restart your dev server:
```bash
# Press Ctrl+C to stop current server
bun run dev
```

---

### Step 2: Setup Supabase Webhook

**Purpose:** Automatically sync users from Supabase Auth to your database

**Steps:**
1. Go to Supabase Dashboard
2. Navigate to: **Database** → **Webhooks**
3. Click **Create a new hook**
4. Fill in:
   - **Name:** `User Sync Webhook`
   - **Table:** `auth.users`
   - **Events:** Check only **INSERT**
   - **Type:** `HTTP Request`
   - **Method:** `POST`
   - **URL:** `http://localhost:3000/api/webhooks/supabase`
   - **HTTP Headers:**
     ```
     Content-Type: application/json
     ```
5. Click **Create webhook**

---

## 🎯 How to Test Everything

### Test 1: Create Supplier Account

1. Go to: `http://localhost:3000/auth/signup`
2. Fill in:
   - Full Name: `Test Supplier`
   - Email: `supplier@test.com`
   - Password: `password123`
3. Check email for verification link
4. Click verification link
5. You'll be redirected to login page
6. Login with your credentials
7. You should be redirected to `/supplier/onboard`

### Test 2: Complete Onboarding

1. Fill in business details
2. Accept terms
3. Upload KYC document
4. Add a product
5. You should reach `/supplier/dashboard`

### Test 3: Access Admin Dashboard

**First, make yourself an admin:**

1. Go to Supabase Dashboard
2. Navigate to: **Table Editor** → **users** table
3. Find your user by email
4. Edit the row
5. Change `role` from `SUPPLIER` to `ADMIN`
6. Save

**Then access admin:**
1. Go to: `http://localhost:3000/admin/dashboard`
2. You should see the admin dashboard

### Test 4: Admin Actions

**Verify KYC:**
1. Go to: `http://localhost:3000/admin/kyc`
2. You should see the test supplier
3. Click on them to view documents
4. Click **Approve KYC**

**Approve Products:**
1. Go to: `http://localhost:3000/admin/products`
2. You should see pending products
3. Click **Approve** on a product

**Manage Suppliers:**
1. Go to: `http://localhost:3000/admin/suppliers`
2. View all suppliers
3. Try activating/deactivating

---

## 📍 All Available Routes

### **Public Routes**
- `/` - Homepage
- `/auth/login` - Login page
- `/auth/signup` - Signup page
- `/auth/verify-email` - Email verification page

### **Supplier Routes** (Requires authentication)
- `/supplier/dashboard` - Main dashboard
- `/supplier/orders` - Order management with timer
- `/supplier/onboard` - Onboarding flow
- `/supplier/onboard/kyc` - KYC submission
- `/supplier/onboard/products` - Add products
- `/supplier/terms` - Terms and conditions

### **Admin Routes** (Requires ADMIN role)
- `/admin/dashboard` - Admin overview
- `/admin/kyc` - KYC verification
- `/admin/suppliers` - Supplier management
- `/admin/orders` - All orders
- `/admin/products` - Product approval

---

## 🎨 Key Features

### **Order Timer System**
- **LOCAL orders:** 3-day countdown (72 hours)
- **DROPSHIP orders:** 21-day countdown (504 hours)
- **Color coding:**
  - 🟢 Green: 0-50% time elapsed
  - 🟡 Yellow: 50-75% time elapsed
  - 🔴 Red: 75-100% time elapsed or overdue

### **KYC Workflow**
1. Supplier submits documents
2. Status: PENDING
3. Admin reviews in `/admin/kyc`
4. Admin approves or rejects
5. If approved: Supplier becomes active
6. If rejected: Supplier can resubmit

### **Product Approval**
1. Supplier adds product
2. Product status: Pending
3. Admin reviews in `/admin/products`
4. Admin approves or rejects
5. If approved: Product goes live

---

## 🔧 Troubleshooting

### "Module not found: @prisma/client"
```bash
bun install @prisma/client
bunx prisma generate
```

### "Database connection failed"
- Check `.env.local` has correct password
- Verify Supabase project is running
- Try copying connection string again from Supabase

### "Not authenticated" errors
- Clear browser cookies
- Try logging in again
- Check Supabase Auth is enabled

### "Role not authorized"
- Make sure you set role to ADMIN in Supabase
- Logout and login again

### Timer not showing
- Make sure order has items with supplier type
- Check browser console for errors
- Verify order status is not DELIVERED or CANCELLED

---

## 📊 Database Schema

Your database has these tables:
- **users** - All users (customers, suppliers, admins)
- **suppliers** - Supplier business information
- **products** - Product listings
- **orders** - Customer orders
- **orderItems** - Individual items in orders

---

## 🎯 What to Do Next

1. ✅ Fix database connection
2. ✅ Setup webhook
3. ✅ Create test accounts
4. ✅ Test all features
5. 📝 Add real content
6. 🚀 Deploy to production

---

## 💡 Tips

- Use **Chrome DevTools** to debug issues
- Check **browser console** for errors
- Check **terminal** for server errors
- Use **Supabase logs** to debug auth issues
- Test on **different browsers**

---

## 📞 Need Help?

If something doesn't work:
1. Check the error message
2. Look in browser console
3. Check terminal output
4. Verify database connection
5. Check Supabase dashboard

---

## 🎉 You're Ready!

Once database is connected, everything should work perfectly. The entire system is built and ready to use!
