# 📧 Email Verification Setup Guide

## ✅ What's Been Added

### **New Features:**
1. ✅ Email verification required for new signups
2. ✅ Verification email sent automatically
3. ✅ Custom verification page with instructions
4. ✅ Email callback handler
5. ✅ Middleware checks for verified emails
6. ✅ Redirect flow after verification

---

## 🔧 Setup Steps

### **Step 1: Enable Email Confirmation in Supabase**

1. Go to https://supabase.com/dashboard/project/hilfcbxcjofxsvaikpar
2. Click **Authentication** in the left sidebar
3. Click **Providers** tab
4. Click on **Email** provider
5. **Check** the box for "Confirm email"
6. Set the redirect URL to: `http://localhost:3000/auth/callback`
7. Click **Save**

### **Step 2: Configure Email Templates (Optional)**

1. In Supabase, go to **Authentication** → **Email Templates**
2. Click on **Confirm signup**
3. Customize the email template if desired
4. Make sure the confirmation link points to: `{{ .ConfirmationURL }}`

### **Step 3: Test the Flow**

1. Go to http://localhost:3000/supplier/signup
2. Fill out the signup form with a real email address
3. Click "Create Account"
4. You'll see a success message: "Please check your email to verify your account"
5. Check your email inbox (and spam folder)
6. Click the verification link in the email
7. You'll be redirected to the dashboard

---

## 🔄 User Flow

### **Signup Flow:**
```
1. User fills signup form
   ↓
2. Account created in Supabase Auth
   ↓
3. Supplier data saved to suppliers table
   ↓
4. Verification email sent
   ↓
5. User sees "Check Your Email" message
   ↓
6. User clicks link in email
   ↓
7. Redirected to /auth/callback
   ↓
8. Session established
   ↓
9. Redirected to /supplier/dashboard
```

### **Login Flow (Unverified):**
```
1. User tries to login
   ↓
2. Login successful
   ↓
3. Middleware checks email_confirmed_at
   ↓
4. If not verified → Redirect to /supplier/verify-email
   ↓
5. If verified → Access dashboard
```

---

## 📁 New Files Created

### **1. `/app/supplier/verify-email/page.tsx`**
- Beautiful verification pending page
- Instructions for users
- Link to login page
- Matches your brand design

### **2. `/app/auth/callback/route.ts`**
- Handles email verification callback
- Exchanges code for session
- Redirects to dashboard

### **3. Updated Files:**
- `app/actions/auth.ts` - Returns success message instead of redirect
- `middleware.ts` - Checks for email verification
- `app/supplier/signup/page.tsx` - Shows verification message
- `.env.local` - Added NEXT_PUBLIC_SITE_URL

---

## 🎨 Verification Page Features

The `/supplier/verify-email` page includes:
- ✅ Vendo logo
- ✅ Email icon
- ✅ Clear instructions (3 steps)
- ✅ "Go to Login" button
- ✅ "Try again" link
- ✅ Expiration notice (24 hours)
- ✅ Matches your brand colors (orange + dark theme)

---

## 🔐 Security Features

### **Middleware Protection:**
- ✅ Checks if user is authenticated
- ✅ Checks if email is verified
- ✅ Redirects unverified users to verify page
- ✅ Prevents access to dashboard without verification

### **Email Verification:**
- ✅ Secure token-based verification
- ✅ One-time use links
- ✅ 24-hour expiration
- ✅ Automatic session creation after verification

---

## 🧪 Testing

### **Test Scenario 1: New Signup**
1. Use a real email address
2. Sign up
3. Check email
4. Click verification link
5. Should redirect to dashboard

### **Test Scenario 2: Login Before Verification**
1. Sign up but don't verify
2. Try to login
3. Should redirect to verify-email page
4. Verify email
5. Login again
6. Should access dashboard

### **Test Scenario 3: Already Verified**
1. Sign up and verify
2. Try to access /supplier/signup
3. Should redirect to dashboard (already logged in)

---

## 🎯 Email Configuration

### **Development (localhost):**
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### **Production:**
```env
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

Update this in Supabase:
1. **Authentication** → **URL Configuration**
2. Set **Site URL** to your production domain
3. Add redirect URLs:
   - `https://yourdomain.com/auth/callback`
   - `https://yourdomain.com/supplier/dashboard`

---

## 📧 Email Provider Setup

### **For Production:**

Supabase's default email service has rate limits. For production, configure a custom SMTP provider:

1. Go to **Project Settings** → **Auth**
2. Scroll to **SMTP Settings**
3. Configure your email provider:
   - **SendGrid**
   - **AWS SES**
   - **Mailgun**
   - **Postmark**
   - Or any SMTP service

---

## 🐛 Troubleshooting

### **Email Not Received:**
- Check spam folder
- Verify email provider is configured in Supabase
- Check Supabase logs: **Authentication** → **Logs**
- Rate limit may be hit (wait a few minutes)

### **Verification Link Not Working:**
- Check that callback route exists: `/app/auth/callback/route.ts`
- Verify redirect URL in Supabase matches your site URL
- Check browser console for errors

### **Redirected to Verify Page After Verification:**
- Clear browser cookies
- Check that `email_confirmed_at` is set in Supabase Auth table
- Restart dev server

---

## ✨ Features Summary

### **User Experience:**
- ✅ Clear verification instructions
- ✅ Beautiful branded pages
- ✅ Helpful error messages
- ✅ Smooth redirect flow

### **Security:**
- ✅ Email verification required
- ✅ Protected routes
- ✅ Secure token exchange
- ✅ Session management

### **Developer Experience:**
- ✅ Easy to configure
- ✅ Well-documented
- ✅ Error handling
- ✅ Logging for debugging

---

## 🚀 Next Steps

1. **Enable email confirmation in Supabase** (Step 1 above)
2. **Test with a real email address**
3. **Customize email templates** (optional)
4. **Configure production email provider** (for production)

Your email verification system is now complete! 🎉
