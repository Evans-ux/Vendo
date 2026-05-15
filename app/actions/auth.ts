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
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
      data: {
        full_name: data.full_name,
      },
    },
  })

  if (authError) {
    console.error('Auth error:', authError)
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: 'Failed to create user' }
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

  // Check onboarding status and route accordingly.
  // NOTE: redirect() throws internally in Next.js — it must NOT be inside try/catch,
  // otherwise the catch block swallows it and always sends the user to onboarding.
  const dbUser = await prisma.user.findUnique({
    where: { email: data.user.email! },
    include: { supplier: true },
  }).catch(() => null)

  // Admins go straight to their dashboard — they have no supplier profile
  if (dbUser?.role === 'ADMIN') {
    revalidatePath('/admin/dashboard')
    redirect('/admin/dashboard')
  }

  const step = dbUser?.supplier?.onboardingStep

  // Route to the correct step they left off at
  if (!dbUser || !dbUser.supplier || step === 'NOT_STARTED') {
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

  // Fallback
  revalidatePath('/supplier/dashboard')
  redirect('/supplier/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/')
  redirect('/auth/login')
}

export async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
