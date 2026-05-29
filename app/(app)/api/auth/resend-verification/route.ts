/**
 * POST /api/auth/resend-verification
 * Resends the Supabase email verification link.
 * Body: { email: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vendo.com.ng'

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${siteUrl}/auth/callback` },
    })

    if (error) {
      console.error('Resend verification error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Resend verification route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
