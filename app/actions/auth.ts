'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export interface SignupData {
  full_name: string
  business_name: string
  email: string
  phone: string
  password: string
}

export async function signup(data: SignupData) {
  const supabase = await createClient()

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
      data: {
        full_name: data.full_name,
        business_name: data.business_name,
        phone: data.phone,
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

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

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
