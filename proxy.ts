import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { prisma } from '@/lib/prisma';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the auth token
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protected routes that require authentication
  const protectedRoutes = ['/supplier/dashboard', '/supplier/onboard'];
  
  // Auth routes that should redirect if already logged in
  const authRoutes = ['/auth/login', '/auth/signup'];

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // If trying to access protected route without session, redirect to login
  if (isProtectedRoute && !user) {
    const url = new URL('/auth/login', request.url);
    return NextResponse.redirect(url);
  }

  // If user is logged in and trying to access auth routes, check onboarding status
  if (isAuthRoute && user) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { supplier: true }
      });

      // If no supplier record or onboarding not completed, redirect to onboarding
      if (!dbUser?.supplier || dbUser.supplier.onboardingStep !== 'COMPLETED') {
        const url = new URL('/supplier/onboard', request.url);
        return NextResponse.redirect(url);
      }

      // If onboarding completed, redirect to dashboard
      const url = new URL('/supplier/dashboard', request.url);
      return NextResponse.redirect(url);
    } catch (error) {
      console.error('Error checking user status:', error);
    }
  }

  // If accessing dashboard but onboarding not completed, redirect to onboarding
  if (pathname.startsWith('/supplier/dashboard') && user) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { supplier: true }
      });

      if (!dbUser?.supplier || dbUser.supplier.onboardingStep !== 'COMPLETED') {
        const url = new URL('/supplier/onboard', request.url);
        return NextResponse.redirect(url);
      }
    } catch (error) {
      console.error('Error checking user status:', error);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
