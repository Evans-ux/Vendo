import Link from 'next/link'
import Image from 'next/image'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Image 
              src="/vendo-logo.png" 
              alt="Vendo Logo" 
              width={200}
              height={80}
              className="h-20 w-auto"
              priority
            />
          </div>
        </div>

        {/* Card */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 p-8 text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-500/10 rounded-full mb-6">
            <svg className="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          {/* Content */}
          <h1 className="text-3xl font-bold text-white mb-3">
            Check Your Email
          </h1>
          <p className="text-gray-400 mb-6 leading-relaxed">
            We've sent a verification link to your email address. Please click the link to verify your account and complete the registration process.
          </p>

          {/* Instructions */}
          <div className="bg-gray-900/50 rounded-xl p-4 mb-6 text-left">
            <h3 className="text-sm font-semibold text-white mb-2">Next Steps:</h3>
            <ol className="text-sm text-gray-400 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-orange-500 font-bold">1.</span>
                <span>Check your email inbox (and spam folder)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 font-bold">2.</span>
                <span>Click the verification link in the email</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 font-bold">3.</span>
                <span>You'll be redirected to your dashboard</span>
              </li>
            </ol>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/supplier/login"
              className="block w-full py-3 px-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-200"
            >
              Go to Login
            </Link>
            
            <p className="text-sm text-gray-500">
              Didn't receive the email?{' '}
              <Link href="/supplier/signup" className="text-orange-500 hover:text-orange-400 font-medium">
                Try again
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          The verification link will expire in 24 hours
        </p>
      </div>
    </div>
  )
}
