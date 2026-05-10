'use client'

import { useState } from 'react'
import { logout } from '@/app/actions/auth'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

interface Supplier {
  id: string
  full_name: string
  business_name: string
  email: string
  phone: string
  created_at: string
}

interface DashboardClientProps {
  supplier: Supplier | null
}

export default function DashboardClient({ supplier }: DashboardClientProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      toast.success('Logged out successfully')
    } catch (error) {
      toast.error('Failed to logout')
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Vendo</h1>
              <p className="text-sm text-gray-400">Supplier Dashboard</p>
            </div>
            <Button
              variant="secondary"
              onClick={handleLogout}
              isLoading={isLoggingOut}
              className="w-auto px-6"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Welcome back, {supplier?.full_name}!
          </h2>
          <p className="text-gray-400">
            Manage your supplier account and business information
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="hover:border-orange-500 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Products</p>
                <p className="text-3xl font-bold text-white">0</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="hover:border-orange-500 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-white">0</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="hover:border-orange-500 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Revenue</p>
                <p className="text-3xl font-bold text-white">$0</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {/* Business Information */}
        <Card>
          <h3 className="text-xl font-bold text-white mb-6">Business Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Business Name
              </label>
              <p className="text-white text-lg">{supplier?.business_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Full Name
              </label>
              <p className="text-white text-lg">{supplier?.full_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Email
              </label>
              <p className="text-white text-lg">{supplier?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Phone
              </label>
              <p className="text-white text-lg">{supplier?.phone}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Member Since
              </label>
              <p className="text-white text-lg">
                {supplier?.created_at ? new Date(supplier.created_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Account Status
              </label>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500/10 text-green-500">
                Active
              </span>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}
