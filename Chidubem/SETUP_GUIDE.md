# Quick Setup Guide for Vendo Supplier Authentication

## 🚀 Quick Start (3 Steps)

### Step 1: Run Database Migration

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `hilfcbxcjofxsvaikpar`
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the contents of `supabase-migration.sql`
6. Click **Run** or press `Ctrl+Enter`

You should see: "Success. No rows returned"

### Step 2: Verify Environment Variables

Your `.env.local` file is already configured. Verify it contains:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=https://hilfcbxcjofxsvaikpar.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_6YtA6V-Z3mIg4XMsRLhkRg_lkT_G4np
\`\`\`

### Step 3: Start the Development Server

\`\`\`bash
bun dev
\`\`\`

## 🎉 You're Done!

Visit these URLs:
- **Signup**: http://localhost:3000/supplier/signup
- **Login**: http://localhost:3000/supplier/login
- **Dashboard**: http://localhost:3000/supplier/dashboard (requires login)

## 📝 Test the System

### Create a Test Account

1. Go to http://localhost:3000/supplier/signup
2. Fill in the form:
   - Full Name: `John Doe`
   - Business Name: `Acme Corp`
   - Email: `john@acme.com`
   - Phone: `+1 555-0000`
   - Password: `password123`
   - Confirm Password: `password123`
3. Click **Create Account**
4. You should be redirected to the dashboard

### Test Login

1. Go to http://localhost:3000/supplier/login
2. Enter:
   - Email: `john@acme.com`
   - Password: `password123`
3. Click **Sign In**
4. You should be redirected to the dashboard

### Test Dashboard

1. You should see:
   - Welcome message with your name
   - Stats cards (Products, Orders, Revenue)
   - Business information section
   - Logout button
2. Click **Logout** to sign out

## 🔍 Verify Database Setup

After creating an account, verify in Supabase:

1. Go to **Table Editor** in Supabase Dashboard
2. Click on **suppliers** table
3. You should see your supplier record with all fields populated

## 🎨 Features Included

✅ **Pages**
- Signup page with full validation
- Login page
- Protected dashboard

✅ **UI Components**
- Modern dark theme
- Orange brand color (#F97316)
- Loading spinners
- Toast notifications
- Mobile responsive
- Smooth animations

✅ **Security**
- Supabase authentication
- Row Level Security (RLS)
- Protected routes
- Server-side validation

✅ **User Experience**
- Real-time form validation
- Error messages
- Success notifications
- Automatic redirects

## 🛠️ Troubleshooting

### Issue: "Failed to create user"
**Solution**: Check Supabase Auth settings:
1. Go to **Authentication** → **Settings** in Supabase
2. Ensure "Enable email confirmations" is **disabled** for testing
3. Or set up email templates if you want confirmations

### Issue: "User already registered"
**Solution**: 
1. Go to **Authentication** → **Users** in Supabase
2. Delete the existing user
3. Try signing up again

### Issue: Toast notifications not showing
**Solution**: 
- Clear browser cache
- Check browser console for errors
- Ensure ToastProvider is in the layout

### Issue: Redirect not working after login
**Solution**:
- Ensure cookies are enabled
- Check browser console for errors
- Verify Supabase credentials are correct

## 📚 File Structure

\`\`\`
✅ app/actions/auth.ts              - Server actions
✅ app/supplier/layout.tsx          - Supplier layout
✅ app/supplier/signup/page.tsx     - Signup page
✅ app/supplier/login/page.tsx      - Login page
✅ app/supplier/dashboard/page.tsx  - Dashboard (protected)
✅ components/ui/Input.tsx          - Input component
✅ components/ui/Button.tsx         - Button component
✅ components/ui/Card.tsx           - Card component
✅ components/providers/ToastProvider.tsx - Toast provider
✅ lib/supabase/client.ts           - Supabase client
✅ lib/supabase/server.ts           - Supabase server client
✅ supabase-migration.sql           - Database migration
\`\`\`

## 🎯 Next Steps

Now that your authentication system is working, you can:

1. **Customize the Dashboard**
   - Add more stats and metrics
   - Create product management features
   - Add order tracking

2. **Enhance Security**
   - Add email verification
   - Implement password reset
   - Add two-factor authentication

3. **Improve UX**
   - Add profile editing
   - Add avatar upload
   - Add business logo upload

4. **Extend Functionality**
   - Create products table and CRUD
   - Add inventory management
   - Implement order processing

## 💡 Tips

- Use the browser DevTools to inspect network requests
- Check the Supabase logs for debugging
- Test on mobile devices for responsive design
- Use different browsers to ensure compatibility

## 🎨 Brand Colors Reference

- Primary: `#F97316` (orange-500)
- Background: `#111827` (gray-900)
- Card: `#1F2937` (gray-800)
- Border: `#374151` (gray-700)
- Text: `#FFFFFF` (white)
- Text Secondary: `#9CA3AF` (gray-400)

---

**Need Help?** Check the browser console and Supabase logs for detailed error messages.
