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

/**
 * Helper to determine where a user should be redirected based on their role and onboarding status.
 */
export async function getRedirectPath(role: string, supplier?: any | null) {
  // Admins go straight to their dashboard
  if (role === 'ADMIN') return '/admin/dashboard'

  // Support both Prisma (camelCase) and Supabase REST (snake_case)
  const step = supplier?.onboardingStep || supplier?.onboarding_step;

  if (!supplier || step === 'NOT_STARTED') return '/supplier/onboard'
  if (step === 'TERMS_ACCEPTED' || step === 'COMPLETED') return '/supplier/dashboard'
  if (step === 'FIRST_PRODUCT') return '/supplier/onboard/terms'
  if (step === 'KYC_SUBMITTED') return '/supplier/onboard/products'
  if (step === 'PROFILE_COMPLETE') return '/supplier/onboard/kyc'

  return '/supplier/onboard'
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

  // Use helper to determine redirect
  try {
    const path = await getRedirectPath(dbUser.role, dbUser.supplier)
    revalidatePath(path)
    redirect(path)
  } catch (error: any) {
    // Re-throw redirect errors so Next.js can handle them
    if (error.digest?.startsWith('NEXT_REDIRECT')) throw error;
    throw error;
  }
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
export async function signInWithGoogle(): Promise<{ error?: string; url?: string }> {
  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vendo-nu.vercel.app'
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vendo-nu.vercel.app'
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/reset-password`,
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
