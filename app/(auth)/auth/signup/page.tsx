'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { signup } from '@/app/actions/auth'
import { toast } from 'sonner'

export default function SignupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({ full_name: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!formData.full_name.trim()) e.full_name = 'Full name is required'
    if (!formData.email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = 'Email is invalid'
    if (!formData.password) e.password = 'Password is required'
    else if (formData.password.length < 8) e.password = 'Password must be at least 8 characters'
    if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsLoading(true)
    try {
      const { confirmPassword, ...signupData } = formData
      const result = await signup(signupData)
      if (result?.error) toast.error(result.error)
      else if (result?.success) {
        toast.success('Account created! Check your email to verify.')
        router.push('/auth/verify-email')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
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

          <h2 className="text-3xl font-bold text-brand-cream mb-3">Start selling today</h2>
          <p className="text-brand-cream/50 text-lg max-w-xs mx-auto leading-relaxed">
            Join hundreds of Nigerian suppliers already selling through Vee AI on Telegram and WhatsApp.
          </p>

          <div className="mt-10 space-y-3">
            {["✓ No website needed", "✓ AI handles customer support", "✓ Get paid via Paystack", "✓ Free to join"].map(item => (
              <p key={item} className="text-brand-cream/60 text-sm">{item}</p>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          <div className="mb-8">
            <Link href="/">
              <Image src="/vendo-logo.png" alt="Vendo" width={160} height={52} className="h-14 w-auto object-contain" priority />
            </Link>
            <h1 className="text-3xl font-bold text-white mt-6 mb-1">Create account</h1>
            <p className="text-gray-400 text-sm">Set up your supplier account in minutes</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { label: "Full Name", name: "full_name", type: "text", placeholder: "John Doe", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
                { label: "Email Address", name: "email", type: "email", placeholder: "you@example.com", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
                { label: "Password", name: "password", type: "password", placeholder: "Min. 8 characters", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
                { label: "Confirm Password", name: "confirmPassword", type: "password", placeholder: "••••••••", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
              ].map(field => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-300 mb-2">{field.label}</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={field.icon} />
                      </svg>
                    </div>
                    <input
                      type={field.type}
                      name={field.name}
                      value={formData[field.name as keyof typeof formData]}
                      onChange={handleChange}
                      disabled={isLoading}
                      placeholder={field.placeholder}
                      className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-all disabled:opacity-50"
                    />
                  </div>
                  {errors[field.name] && <p className="mt-1.5 text-sm text-red-400">{errors[field.name]}</p>}
                </div>
              ))}

              <button type="submit" disabled={isLoading}
                className="w-full py-4 bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold rounded-xl shadow-lg shadow-brand-orange/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2">
                {isLoading ? (
                  <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating account...</>
                ) : (
                  <>Create Account<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg></>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-brand-orange hover:text-brand-orange/80 font-semibold transition-colors">Sign in</Link>
              </p>
            </div>
          </div>

          <p className="text-center text-gray-600 text-xs mt-6">By signing up, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  )
}
