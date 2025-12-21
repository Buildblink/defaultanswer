'use client'

import React, { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type ProtectedRouteProps = {
  children: React.ReactNode
  requiredRole?: 'viewer' | 'editor' | 'admin'
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return
        setSession(data.session ?? null)
        setIsLoading(false)
      })
      .catch(() => {
        if (!isMounted) return
        setSession(null)
        setIsLoading(false)
      })

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!isMounted) return
        setSession(nextSession)
      }
    )

    return () => {
      isMounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Checking your session...
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!session) {
    const handleSendMagicLink = async () => {
      if (!email.trim()) {
        setMessage('Enter your email to receive a magic link.')
        return
      }
      setSending(true)
      setMessage(null)
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/brain`,
        },
      })
      if (error) {
        setMessage(error.message || 'Unable to send magic link.')
      } else {
        setMessage('Magic link sent. Check your email to continue.')
      }
      setSending(false)
    }

    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Please sign in</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You need to be signed in to access this area.
            </p>
            <div className="space-y-3">
              <Input
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="button" onClick={handleSendMagicLink} disabled={sending}>
                {sending ? 'Sending...' : 'Send magic link'}
              </Button>
              {message && <p className="text-sm text-muted-foreground">{message}</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
