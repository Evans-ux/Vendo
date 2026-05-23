'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { forgotPassword } from '@/app/actions/auth'
import { toast } from 'sonner'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState('')

  const validateEmail = () => {
    if (!email.trim()) {
      setError('Email is required')
      return false
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address')
      return false
    }
    setError('')
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateEmail()) return

    setIsLoading(true)
    try {
      const result = await forgotPassword(email)
      if (result?.error) {
        toast.error(result.error)
        setError(result.error)
      } else {
        setEmailSent(true)
        toast.success('Password reset email sent!', {
          description: 'Please check your inbox for the reset link.',
        })
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-charcoal flex">
      {/* Left panel — image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0d1117] flex-col items-center justify-center p-12">
        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] rounded-full bg-brand-orange/15 blur-[140px]" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[400px] h-[400px] rounded-full bg-brand-cream/5 blur-[120px]" />
        </div>

        <div className="relative z-10 text-center">
          {/* Lock image */}
          <div className="relative mb-8 flex justify-center">
            <div className="absolute inset-0 bg-blue-500/20 blur-[80px] rounded-full" />
            <div className="relative z-10 w-64 h-64 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-brand-cream mb-3">Reset Your Password</h2>
          <p className="text-brand-cream/50 text-lg max-w-xs mx-auto leading-relaxed">
            We'll send you a secure link to reset your password and regain access to your account.
          </p>

          {/* Security info */}
          <div className="mt-10 space-y-4">
            <div className="flex items-center gap-3 text-brand-cream/70">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm">Secure password reset link</span>
            </div>
            <div className="flex items-center gap-3 text-brand-cream/70">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm">Link expires in 24 hours</span>
            </div>
            <div className="flex items-center gap-3 text-brand-cream/70">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm">One-time use only</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Back button */}
          <div className="mb-6">
            <Link href="/auth/login" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </div>

          {/* Logo */}
          <div className="mb-8">
            <Link href="/">
              <Image src="/vendo-logo.png" alt="Vendo" width={160} height={52} className="h-14 w-auto object-contain" priority />
            </Link>
            <h1 className="text-3xl font-bold text-white mt-6 mb-1">Forgot Password</h1>
            <p className="text-gray-400 text-sm">
              {emailSent 
                ? 'Check your email for the reset link' 
                : 'Enter your email to receive a password reset link'}
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
            {emailSent ? (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                  <Mail className="w-10 h-10 text-green-500" />
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Check Your Email</h3>
                  <p className="text-gray-400">
                    We've sent a password reset link to <span className="text-brand-orange font-medium">{email}</span>
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="text-left space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs text-blue-400">1</span>
                      </div>
                      <p className="text-sm text-gray-400">Open the email from Vendo</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs text-blue-400">2</span>
                      </div>
                      <p className="text-sm text-gray-400">Click the "Reset Password" button</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs text-blue-400">3</span>
                      </div>
                      <p className="text-sm text-gray-400">Create your new password</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <p className="text-sm text-gray-500 mb-4">Didn't receive the email?</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setEmailSent(false)}
                      className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors"
                    >
                      Try another email
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isLoading}
                      className="flex-1 py-3 bg-brand-orange hover:bg-brand-orange/90 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                    >
                      {isLoading ? 'Resending...' : 'Resend email'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="w-5 h-5 text-gray-500" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (error) setError('')
                      }}
                      disabled={isLoading}
                      placeholder="you@example.com"
                      className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-all disabled:opacity-50"
                    />
                  </div>
                  {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
                  <p className="mt-2 text-xs text-gray-500">
                    Enter the email address associated with your Vendo account
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold rounded-xl shadow-lg shadow-brand-orange/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending reset link...
                    </>
                  ) : (
                    <>
                      Send Reset Link
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">
                Remember your password?{' '}
                <Link href="/auth/login" className="text-brand-orange hover:text-brand-orange/80 font-semibold transition-colors">
                  Back to login
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white mb-1">Security Notice</p>
                <p className="text-xs text-gray-400">
                  The password reset link will expire in 24 hours and can only be used once. 
                  If you didn't request this, you can safely ignore this email.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}