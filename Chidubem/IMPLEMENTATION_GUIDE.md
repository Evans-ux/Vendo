# Implementation Guide - Complete Auth Flow

## Changes Needed:

### 1. Update `app/actions/auth.ts`
- Remove business_name and phone from SignupData
- Change email redirect to /auth/login
- Update login to check onboarding status and redirect accordingly

### 2. Update `app/(auth)/auth/signup/page.tsx`
- Remove business_name and phone fields
- Keep only: full_name, email, password, confirmPassword

### 3. Update `app/(auth)/auth/callback/route.ts`
- Redirect to /auth/login after email verification

### 4. Create Webhook `app/api/webhooks/supabase/route.ts`
- Handle user.created event
- Insert into users table via Prisma
- Retry mechanism (5 attempts)

### 5. Update Middleware
- Check onboarding status
- Redirect to onboarding if NOT_STARTED
- Redirect to dashboard if COMPLETED

## Flow:
1. Signup → Email sent
2. Click email link → Redirect to /auth/login
3. Login → Check onboarding status
4. If NOT_STARTED → /supplier/onboard
5. If COMPLETED → /supplier/dashboard
