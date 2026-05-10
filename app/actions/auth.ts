'use server'

import { createServerClient } from '@/lib/supabase/server'
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
  const supabase = await createServerClient()

  // Sign up the user with email confirmation
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/supplier/dashboard`,
      data: {
        full_name: data.full_name,
        business_name: data.business_name,
        phone: data.phone,
      }
    }
  })

  if (authError) {
    console.error('Auth error:', authError)
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: 'Failed to create user' }
  }

  console.log('User created:', authData.user.id)

  // Try using the database function first
  const { error: rpcError } = await supabase.rpc('create_supplier', {
    user_id: authData.user.id,
    p_full_name: data.full_name,
    p_business_name: data.business_name,
    p_email: data.email,
    p_phone: data.phone,
  })

  if (rpcError) {
    console.error('RPC error:', rpcError)
    
    // If function doesn't exist, try direct insert
    const { error: insertError } = await supabase
      .from('suppliers')
      .insert({
        id: authData.user.id,
        full_name: data.full_name,
        business_name: data.business_name,
        email: data.email,
        phone: data.phone,
      })

    if (insertError) {
      console.error('Insert error:', insertError)
      return { error: `Failed to create supplier profile: ${insertError.message}` }
    }
  }

  console.log('Supplier created successfully')
  
  // Return success with message about email verification
  return { 
    success: true, 
    message: 'Account created! Please check your email to verify your account.' 
  }
}

export async function login(email: string, password: string) {
  const supabase = await createServerClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/supplier/dashboard')
  redirect('/supplier/dashboard')
}

export async function logout() {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  revalidatePath('/supplier/login')
  redirect('/supplier/login')
}

export async function getUser() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getSupplier() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: supplier } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', user.id)
    .single()

  return supplier
}
