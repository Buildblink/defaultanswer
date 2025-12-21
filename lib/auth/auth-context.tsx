'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

type AuthUser = { id: string; email?: string | null } | null

type AuthContextValue = {
  user: AuthUser
  isLoading: boolean
  token: string | null
  session: Session | null
  accessToken?: string
  setToken: (t: string | null) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [user, setUser] = useState<AuthUser>(null)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    const t = window.localStorage.getItem('da_token')
    if (t) setToken(t)
  }, [])

  useEffect(() => {
    if (token) window.localStorage.setItem('da_token', token)
    else window.localStorage.removeItem('da_token')
  }, [token])

  useEffect(() => {
    let isMounted = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return
        setSession(data.session ?? null)
        setUser(data.session?.user ? { id: data.session.user.id, email: data.session.user.email } : null)
        setIsLoading(false)
      })
      .catch(() => {
        if (!isMounted) return
        setSession(null)
        setUser(null)
        setIsLoading(false)
      })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return
      setSession(nextSession)
      setUser(nextSession?.user ? { id: nextSession.user.id, email: nextSession.user.email } : null)
    })

    return () => {
      isMounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      token,
      session,
      accessToken: session?.access_token,
      setToken,
    }),
    [user, isLoading, token, session]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}

