'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/store'
import LoginScreen from '@/components/LoginScreen'
import Dashboard from '@/components/Dashboard'

export default function Home() {
  const { isAuthenticated } = useAuthStore()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen">
      {!isAuthenticated ? <LoginScreen /> : <Dashboard />}
    </main>
  )
} 