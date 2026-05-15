'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { login } from '@/app/actions/auth'
import { toast } from 'sonner'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!formData.email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = 'Email is invalid'
    if (!formData.password) e.password = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsLoading(true)
    try {
      const result = await login(formData.email, formData.password)
      if (result?.error) toast.error(result.error)
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  // Admin link — signs in first, then the server action routes admins to /admin/dashboard.
  // Non-admins just land on their supplier dashboard as normal.
  const handleAdminAccess = () => {
    if (!formData.email || !formData.password) {
      toast.error('Sign in with your admin credentials first.')
      return
    }
    handleSubmit({ preventDefault: () => {} } as React.FormEvent)
  }

  return (
    <div className="min-h-screen bg-brand-charcoal flex">
      {/* ── Left panel — image ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0d1117] flex-col items-center justify-center p-12">
        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] rounded-full bg-brand-orange/15 blur-[140px]" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[400px] h-[400px] rounded-full bg-brand-cream/5 blur-[120px]" />
        </div>

        <div className="relative z-10 text-center">
          {/* Bag image */}
          <div className="relative mb-8 flex justify-center">
            <div className="absolute inset-0 bg-brand-orange/20 blur-[80px] rounded-full" />
            <Image
              src="/vendo-baglogo.png"
              alt="Vendo"
              width={320}
              height={320}
              className="relative z-10 drop-shadow-[0_0_60px_rgba(249,115,22,0.4)]"
              priority
            />
          </div>

          <h2 className="text-3xl font-bold text-brand-cream mb-3">Welcome back</h2>
          <p className="text-brand-cream/50 text-lg max-w-xs mx-auto leading-relaxed">
            Your AI-powered storefront is waiting. Sign in to manage your products and orders.
          </p>

          {/* Stats */}
          <div className="flex gap-8 justify-center mt-10">
            {[["10%", "Commission"], ["<3s", "AI Response"], ["100%", "Free to start"]].map(([val, label]) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-bold text-brand-orange">{val}</p>
                <p className="text-brand-cream/40 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8">
            <Link href="/">
              <Image src="/vendo-logo.png" alt="Vendo" width={160} height={52} className="h-14 w-auto object-contain" priority />
            </Link>
            <h1 className="text-3xl font-bold text-white mt-6 mb-1">Sign in</h1>
            <p className="text-gray-400 text-sm">Enter your credentials to access your supplier dashboard</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={isLoading} placeholder="you@example.com"
                    className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-all disabled:opacity-50" />
                </div>
                {errors.email && <p className="mt-1.5 text-sm text-red-400">{errors.email}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">Password</label>
                  <Link href="#" className="text-sm text-brand-orange hover:text-brand-orange/80 transition-colors">Forgot?</Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} disabled={isLoading} placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-all disabled:opacity-50" />
                </div>
                {errors.password && <p className="mt-1.5 text-sm text-red-400">{errors.password}</p>}
              </div>

              <button type="submit" disabled={isLoading}
                className="w-full py-4 bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold rounded-xl shadow-lg shadow-brand-orange/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2">
                {isLoading ? (
                  <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Signing in...</>
                ) : (
                  <>Sign In<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg></>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">
                Don&apos;t have an account?{' '}
                <Link href="/auth/signup" className="text-brand-orange hover:text-brand-orange/80 font-semibold transition-colors">Sign up free</Link>
              </p>
            </div>
          </div>

          <p className="text-center text-gray-600 text-xs mt-6">🔒 Protected by industry-standard encryption</p>

          {/* Admin access — signs in and routes based on role */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleAdminAccess}
              className="text-xs text-gray-700 hover:text-gray-500 transition-colors"
            >
              Admin access →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
