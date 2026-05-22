import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

// Next.js 16 proxy (previously called middleware) — Edge runtime only.
// NEVER import Prisma, pg, or any Node.js-only module here.
// Session refresh is handled by Supabase SSR. Route protection
// that needs DB access belongs in Server Component layouts/pages.

export async function proxy(request: NextRequest) {
  // Skip session check for Telegram Webhook
  if (request.nextUrl.pathname.startsWith('/api/telegram')) {
    return;
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (svg, png, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
