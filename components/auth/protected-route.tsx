'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import type { UserRole } from '@/lib/types/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  fallbackPath?: string
}

export function ProtectedRoute({ 
  children, 
  allowedRoles, 
  fallbackPath = '/' 
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user || !profile) {
        router.push(fallbackPath)
        return
      }

      if (allowedRoles && !allowedRoles.includes(profile.role)) {
        router.push(fallbackPath)
        return
      }
    }
  }, [user, profile, loading, allowedRoles, fallbackPath, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">認証を確認中...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return null
  }

  return <>{children}</>
}
