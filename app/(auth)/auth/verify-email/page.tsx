'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { toast } from 'sonner'

export default function VerifyEmailPage() {
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  const handleResend = async () => {
    setResending(true)
    try {
      // Get email from sessionStorage if available (set during signup)
      const email = typeof window !== 'undefined' ? sessionStorage.getItem('signup_email') : null
      if (!email) {
        toast.error('Could not find your email. Please sign up again.')
        return
      }
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setResent(true)
        toast.success('Verification email resent! Check your inbox.')
      } else {
        toast.error('Failed to resend. Please try signing up again.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-orange/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-orange/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/vendo-logo.png"
            alt="Vendo Logo"
            width={200}
            height={80}
            className="h-20 w-auto mx-auto"
            priority
          />
        </div>

        {/* Card */}
        <div className="bg-card rounded-3xl shadow-2xl border border-border p-8 text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-orange/10 rounded-full mb-6">
            <svg className="w-10 h-10 text-brand-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-3">Check Your Email</h1>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            We've sent a verification link to your email address. Click the link to verify your account and get started.
          </p>

          {/* Steps */}
          <div className="bg-muted/50 rounded-xl p-4 mb-6 text-left">
            <h3 className="text-sm font-semibold text-foreground mb-2">What to do next:</h3>
            <ol className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-brand-orange font-bold flex-shrink-0">1.</span>
                <span>Check your inbox (and spam/junk folder)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-orange font-bold flex-shrink-0">2.</span>
                <span>Click the verification link in the email</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-orange font-bold flex-shrink-0">3.</span>
                <span>You'll be redirected to sign in</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-orange font-bold flex-shrink-0">4.</span>
                <span>Sign in and complete your supplier onboarding</span>
              </li>
            </ol>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/auth/login"
              className="block w-full py-3 px-6 bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold rounded-xl shadow-lg shadow-brand-orange/30 transition-all duration-200"
            >
              Go to Login
            </Link>

            <button
              onClick={handleResend}
              disabled={resending || resent}
              className="w-full py-3 px-6 border border-border text-foreground hover:bg-muted/50 font-medium rounded-xl transition-all duration-200 disabled:opacity-50 text-sm"
            >
              {resending ? 'Resending...' : resent ? '✓ Email resent!' : "Didn't receive it? Resend email"}
            </button>

            <p className="text-xs text-muted-foreground">
              Still having trouble?{' '}
              <a href="mailto:support@vendo.ng" className="text-brand-orange hover:text-brand-orange/80 font-medium">
                Contact support
              </a>
            </p>
          </div>
        </div>

        <p className="text-center text-muted-foreground text-sm mt-6">
          Verification link expires in 24 hours
        </p>
      </div>
    </div>
  )
}
