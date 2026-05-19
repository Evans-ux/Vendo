import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(errorDescription || error)}`, request.url))
  }

  if (code) {
    const supabase = await createClient()
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Code exchange error:', exchangeError)
      return NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(exchangeError.message)}`, request.url))
    }

    // If this is a new OAuth user, create a user record in our database
    if (data.user && data.user.identities && data.user.identities.length > 0) {
      const identity = data.user.identities[0]
      
      // Check if user already exists in our database
      const existingUser = await prisma.user.findUnique({
        where: { email: data.user.email! },
      })

      if (!existingUser) {
        // Create new user record for OAuth user
        await prisma.user.create({
          data: {
            email: data.user.email!,
            name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || '',
            role: 'CUSTOMER', // Default role, can be updated later
          },
        })
      }
    }
  }

  // Check if user is authenticated and redirect accordingly
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Check user role and redirect accordingly
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    include: { supplier: true },
  }).catch(() => null)

  // Admins go to admin dashboard
  if (dbUser?.role === 'ADMIN') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  // Suppliers with onboarding
  if (dbUser?.supplier) {
    const step = dbUser.supplier.onboardingStep
    
    if (step === 'TERMS_ACCEPTED' || step === 'COMPLETED') {
      return NextResponse.redirect(new URL('/supplier/dashboard', request.url))
    }
    
    if (step === 'FIRST_PRODUCT') {
      return NextResponse.redirect(new URL('/supplier/onboard/terms', request.url))
    }
    
    if (step === 'KYC_SUBMITTED') {
      return NextResponse.redirect(new URL('/supplier/onboard/products', request.url))
    }
    
    if (step === 'PROFILE_COMPLETE') {
      return NextResponse.redirect(new URL('/supplier/onboard/kyc', request.url))
    }
  }

  // New users go to onboarding
  return NextResponse.redirect(new URL('/supplier/onboard', request.url))
}
