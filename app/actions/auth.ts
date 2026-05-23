'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export interface SignupData {
  full_name: string
  email: string
  password: string
}

export async function signup(data: SignupData) {
  const supabase = await createClient()

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      // After clicking the email link, Supabase exchanges the code here
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://vendo-nu.vercel.app'}/auth/callback`,
      data: {
        full_name: data.full_name,
      },
    },
  })

  if (authError) {
    console.error('Signup auth error:', authError)
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: 'Failed to create user' }
  }

  // Create the Prisma User row with the same UUID from Supabase Auth
  // The webhook will also try to upsert, but this ensures the user row exists immediately
  try {
    await prisma.user.create({
      data: {
        id: authData.user.id, // Use Supabase-generated UUID
        email: data.email,
        name: data.full_name,
        role: 'CUSTOMER', // New users start as CUSTOMER, become SUPPLIER after onboarding
      },
    })
  } catch (err) {
    // If user already exists (e.g. webhook fired first), that's fine
    if ((err as any).code === 'P2002') {
      console.log('User already exists (webhook likely created it already)')
    } else {
      console.error('Prisma user create error:', err)
      return { error: 'Failed to create user account' }
    }
  }

  return {
    success: true,
    message: 'Account created! Please check your email to verify your account.',
  }
}

export async function login(email: string, password: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  if (!data.user) {
    return { error: 'Login failed' }
  }

  // Get the Prisma User row — it should already exist from signup/webhook
  // If not, fall back to creating it with role='CUSTOMER'
  let dbUser
  try {
    // Search by email because manually created admins might have a mismatched Supabase Auth ID
    dbUser = await prisma.user.findUnique({
      where: { email: data.user.email! },
      include: { supplier: true },
    })

    // If user doesn't exist in Prisma yet
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata?.full_name ?? null,
          role: 'CUSTOMER',
        },
        include: { supplier: true },
      })
    }
  } catch (err) {
    console.warn('Prisma lookup bypassed/failed during login...', err);
    // Fallback if Prisma is blocked
    const { data: restDbUser, error: restError } = await supabase
      .from("User")
      .select("*, Supplier(*)")
      .eq("email", data.user.email)
      .maybeSingle(); // Use maybeSingle to not error on 0 rows
      
    if (restError) {
      console.error("REST db check error:", restError);
    }
      
    if (restDbUser) {
      dbUser = restDbUser;
      if (dbUser?.Supplier?.length > 0) {
        dbUser.supplier = dbUser.Supplier[0]; 
      }
    } else {
      return { error: 'Database error. Please try again.' };
    }
  }

  // ── Route based on role ──────────────────────────────────────────────────
  // Admins go straight to their dashboard — they have no supplier profile
  if (dbUser.role === 'ADMIN') {
    revalidatePath('/admin/dashboard')
    redirect('/admin/dashboard')
  }

  // ── Route supplier to the correct onboarding step ────────────────────────
  const step = dbUser.supplier?.onboardingStep

  if (!dbUser.supplier || step === 'NOT_STARTED') {
    revalidatePath('/supplier/onboard')
    redirect('/supplier/onboard')
  }

  if (step === 'TERMS_ACCEPTED' || step === 'COMPLETED') {
    revalidatePath('/supplier/dashboard')
    redirect('/supplier/dashboard')
  }

  if (step === 'FIRST_PRODUCT') {
    revalidatePath('/supplier/onboard/terms')
    redirect('/supplier/onboard/terms')
  }

  if (step === 'KYC_SUBMITTED') {
    revalidatePath('/supplier/onboard/products')
    redirect('/supplier/onboard/products')
  }

  if (step === 'PROFILE_COMPLETE') {
    revalidatePath('/supplier/onboard/kyc')
    redirect('/supplier/onboard/kyc')
  }

  // Fallback — should never reach here but just in case
  revalidatePath('/supplier/onboard')
  redirect('/supplier/onboard')
}

export async function logout() {
  const supabase = await createClient()

  try {
    await supabase.auth.signOut()
  } catch (error) {
    console.error('Error during sign out:', error)
  }

  revalidatePath('/', 'layout')
  redirect('/auth/login')
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// OAuth Login with Google
export async function signInWithGoogle() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `https://vendo-nu.vercel.app/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { url: data.url }
}

// Forgot Password - Send reset email
export async function forgotPassword(email: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `https://vendo-nu.vercel.app/auth/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, message: 'Password reset email sent. Please check your inbox.' }
}

// Reset Password
export async function resetPassword(newPassword: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, message: 'Password updated successfully. You can now login with your new password.' }
}
