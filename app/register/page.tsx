'use client'

import React from "react"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { store } from '@/lib/store'
import { ArrowLeft, Check, X, User } from 'lucide-react'

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [alias, setAlias] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const redirect = searchParams.get('redirect')
  const code = searchParams.get('code')

  useEffect(() => {
    // Check if already registered
    const storedAlias = localStorage.getItem('quiz_alias')
    const storedPlayerId = localStorage.getItem('quiz_player_id')
    if (storedAlias && storedPlayerId) {
      handleRedirect()
    }
  }, [])

  useEffect(() => {
    if (alias.length < 2) {
      setIsAvailable(null)
      return
    }

    setIsChecking(true)
    const timer = setTimeout(() => {
      const available = store.isAliasAvailable(alias)
      setIsAvailable(available)
      setIsChecking(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [alias])

  const handleRedirect = () => {
    if (redirect === 'create') {
      const playerId = localStorage.getItem('quiz_player_id')
      const playerAlias = localStorage.getItem('quiz_alias')
      if (playerId && playerAlias) {
        const session = store.createSession(playerId)
        store.joinSession(session.id, playerId, playerAlias)
        router.push(`/lobby/${session.lobbyCode}`)
      }
    } else if (redirect === 'join' && code) {
      router.push(`/lobby/${code}`)
    } else {
      router.push('/')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (alias.length < 2) {
      setError('Alias must be at least 2 characters')
      return
    }

    if (alias.length > 20) {
      setError('Alias must be 20 characters or less')
      return
    }

    if (!isAvailable) {
      setError('This alias is already taken')
      return
    }

    setIsSubmitting(true)

    try {
      const player = store.createPlayer(alias)
      localStorage.setItem('quiz_alias', alias)
      localStorage.setItem('quiz_player_id', player.id)
      handleRedirect()
    } catch {
      setError('Failed to register. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <Card className="border-border/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <User className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Choose Your Alias</CardTitle>
            <CardDescription>
              Pick a unique alias to identify yourself in quizzes. No password required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    placeholder="Enter your alias"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value.trim())}
                    className="pr-10 text-lg"
                    maxLength={20}
                    autoFocus
                  />
                  {alias.length >= 2 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isChecking ? (
                        <div className="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                      ) : isAvailable ? (
                        <Check className="w-5 h-5 text-success" />
                      ) : (
                        <X className="w-5 h-5 text-destructive" />
                      )}
                    </div>
                  )}
                </div>
                {alias.length >= 2 && !isChecking && (
                  <p className={`text-sm ${isAvailable ? 'text-success' : 'text-destructive'}`}>
                    {isAvailable ? 'This alias is available!' : 'This alias is already taken'}
                  </p>
                )}
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !isAvailable || alias.length < 2}
              >
                {isSubmitting ? 'Registering...' : 'Continue'}
              </Button>
            </form>

            <p className="mt-6 text-xs text-center text-muted-foreground">
              Your alias will be used to track your scores across quiz sessions. Choose wisely - it cannot be changed later.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <RegisterContent />
    </Suspense>
  )
}
