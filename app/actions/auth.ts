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
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/login`,
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

  // Check if user exists in database and get onboarding status
  try {
    const user = await prisma.user.findUnique({
      where: { id: data.user.id },
      include: { supplier: true }
    })

    // If no supplier record, redirect to onboarding
    if (!user?.supplier) {
      revalidatePath('/supplier/onboard')
      redirect('/supplier/onboard')
    }

    // Check onboarding status
    if (user.supplier.onboardingStep === 'COMPLETED') {
      revalidatePath('/supplier/dashboard')
      redirect('/supplier/dashboard')
    } else {
      revalidatePath('/supplier/onboard')
      redirect('/supplier/onboard')
    }
  } catch (error) {
    console.error('Error checking user status:', error)
    // If user doesn't exist in DB yet, redirect to onboarding
    revalidatePath('/supplier/onboard')
    redirect('/supplier/onboard')
  }
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
