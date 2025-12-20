'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

type AuthUser = { id: string; email?: string | null } | null

type AuthContextValue = {
  user: AuthUser
  isLoading: boolean
  token: string | null
  setToken: (t: string | null) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [user] = useState<AuthUser>(null)

  useEffect(() => {
    const t = window.localStorage.getItem('da_token')
    if (t) setToken(t)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (token) window.localStorage.setItem('da_token', token)
    else window.localStorage.removeItem('da_token')
  }, [token])

  const value = useMemo(() => ({ user, isLoading, token, setToken }), [user, isLoading, token])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}

