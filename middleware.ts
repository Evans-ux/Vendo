import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Create a Supabase client
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get the user session
  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes that require authentication
  const protectedRoutes = ['/supplier/dashboard']
  
  // Auth routes that should redirect to dashboard if already logged in
  const authRoutes = ['/supplier/login', '/supplier/signup']

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // If trying to access protected route without session, redirect to login
  if (isProtectedRoute && !user) {
    const url = new URL('/supplier/login', request.url)
    return NextResponse.redirect(url)
  }

  // If trying to access protected route with unverified email, redirect to verify page
  if (isProtectedRoute && user && !user.email_confirmed_at) {
    const url = new URL('/supplier/verify-email', request.url)
    return NextResponse.redirect(url)
  }

  // If trying to access auth routes with verified session, redirect to dashboard
  if (isAuthRoute && user && user.email_confirmed_at) {
    const url = new URL('/supplier/dashboard', request.url)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/supplier/:path*']
}
