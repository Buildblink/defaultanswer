'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { token, isLoading } = useAuth()

  if (isLoading) return null

  if (!token) {
    router.push('/')
    return null
  }

  return <>{children}</>
}
