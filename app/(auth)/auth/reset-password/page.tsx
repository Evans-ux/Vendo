'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { resetPassword } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Check if user has a valid session for password reset
  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          setIsValidSession(true)
        } else {
          toast.error('Invalid or expired reset link', {
            description: 'Please request a new password reset link.',
          })
          router.push('/auth/forgot-password')
        }
      } catch (error) {
        console.error('Session check error:', error)
        toast.error('Failed to verify reset link')
        router.push('/auth/forgot-password')
      } finally {
        setCheckingSession(false)
      }
    }

    checkSession()
  }, [router])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    try {
      const result = await resetPassword(formData.password)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Password updated successfully!', {
          description: 'You can now login with your new password.',
        })
        
        // Redirect to login after a short delay
        setTimeout(() => {
          router.push('/auth/login')
        }, 2000)
      }
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

  const passwordStrength = () => {
    if (!formData.password) return 0
    
    let strength = 0
    if (formData.password.length >= 8) strength += 1
    if (/[A-Z]/.test(formData.password)) strength += 1
    if (/[a-z]/.test(formData.password)) strength += 1
    if (/[0-9]/.test(formData.password)) strength += 1
    if (/[^A-Za-z0-9]/.test(formData.password)) strength += 1
    
    return strength
  }

  const getStrengthColor = () => {
    const strength = passwordStrength()
    if (strength <= 2) return 'bg-red-500'
    if (strength <= 3) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStrengthText = () => {
    const strength = passwordStrength()
    if (strength <= 2) return 'Weak'
    if (strength <= 3) return 'Medium'
    return 'Strong'
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-brand-charcoal flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Verifying reset link...</p>
        </div>
      </div>
    )
  }

  if (!isValidSession) {
    return null
  }

  return (
    <div className="min-h-screen bg-brand-charcoal flex">
      {/* Left panel — image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0d1117] flex-col items-center justify-center p-12">
        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] rounded-full bg-green-500/15 blur-[140px]" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[400px] h-[400px] rounded-full bg-brand-cream/5 blur-[120px]" />
        </div>

        <div className="relative z-10 text-center">
          {/* Lock image */}
          <div className="relative mb-8 flex justify-center">
            <div className="absolute inset-0 bg-green-500/20 blur-[80px] rounded-full" />
            <div className="relative z-10 w-64 h-64 rounded-2xl bg-gradient-to-br from-green-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
                <Lock className="w-16 h-16 text-white" />
              </div>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-brand-cream mb-3">Create New Password</h2>
          <p className="text-brand-cream/50 text-lg max-w-xs mx-auto leading-relaxed">
            Choose a strong, secure password to protect your Vendo account.
          </p>

          {/* Password tips */}
          <div className="mt-10 space-y-4">
            <div className="flex items-center gap-3 text-brand-cream/70">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm">At least 8 characters</span>
            </div>
            <div className="flex items-center gap-3 text-brand-cream/70">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm">Mix of uppercase & lowercase</span>
            </div>
            <div className="flex items-center gap-3 text-brand-cream/70">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm">Include numbers & symbols</span>
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
            <h1 className="text-3xl font-bold text-white mt-6 mb-1">Reset Password</h1>
            <p className="text-gray-400 text-sm">Create a new password for your account</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-gray-500" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isLoading}
                    placeholder="Enter new password"
                    className="w-full pl-12 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-all disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1.5 text-sm text-red-400">{errors.password}</p>}
                
                {/* Password strength indicator */}
                {formData.password && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">Password strength</span>
                      <span className={`text-xs font-medium ${getStrengthColor().replace('bg-', 'text-')}`}>
                        {getStrengthText()}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${getStrengthColor()} transition-all duration-300`}
                        style={{ width: `${(passwordStrength() / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-gray-500" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={isLoading}
                    placeholder="Confirm new password"
                    className="w-full pl-12 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent transition-all disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="mt-1.5 text-sm text-red-400">{errors.confirmPassword}</p>}
                
                {/* Match indicator */}
                {formData.password && formData.confirmPassword && (
                  <div className="mt-2">
                    {formData.password === formData.confirmPassword ? (
                      <div className="flex items-center gap-2 text-green-500 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        Passwords match
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-400 text-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Passwords do not match
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold rounded-xl shadow-lg shadow-brand-orange/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Updating password...
                  </>
                ) : (
                  <>
                    Reset Password
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">
                Remember your password?{' '}
                <Link href="/auth/login" className="text-brand-orange hover:text-brand-orange/80 font-semibold transition-colors">
                  Back to login
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lock className="w-3 h-3 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white mb-1">Password Security Tips</p>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Use a unique password not used on other sites</li>
                  <li>• Avoid common words, names, or dates</li>
                  <li>• Consider using a password manager</li>
                  <li>• Enable two-factor authentication when available</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}