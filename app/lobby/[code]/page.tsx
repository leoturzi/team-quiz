'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { store } from '@/lib/store'
import type { QuizSession, QuizParticipant } from '@/lib/types'
import { ArrowLeft, Copy, Check, Users, Play, Loader2, Tag, X } from 'lucide-react'

export default function LobbyPage() {
  const params = useParams()
  const code = params.code as string
  const router = useRouter()
  const [session, setSession] = useState<QuizSession | null>(null)
  const [participants, setParticipants] = useState<QuizParticipant[]>([])
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [playerAlias, setPlayerAlias] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])

  const refreshData = useCallback(async () => {
    // Try cache first
    let currentSession = store.getSessionByCode(code)
    
    // If not in cache, fetch from server
    if (!currentSession) {
      currentSession = await store.refreshSessionByCode(code)
    }
    
    if (currentSession) {
      setSession(currentSession)
      setParticipants(store.getParticipants(currentSession.id))
      
      // Refresh participants from server
      await store.refreshParticipants(currentSession.id)
      setParticipants(store.getParticipants(currentSession.id))

      // Check if quiz has started
      if (currentSession.status === 'in_progress') {
        router.push(`/quiz/${currentSession.id}`)
      }
    }
  }, [code, router])

  useEffect(() => {
    const loadSession = async () => {
      const storedPlayerId = localStorage.getItem('quiz_player_id')
      const storedAlias = localStorage.getItem('quiz_alias')

      if (!storedPlayerId || !storedAlias) {
        router.push(`/register?redirect=join&code=${code}`)
        return
      }

      setPlayerId(storedPlayerId)
      setPlayerAlias(storedAlias)
      
      // Load tags
      store.getAllTags().then(setAvailableTags).catch(console.error)

      // Find or join the session
      let currentSession = store.getSessionByCode(code)
      
      // If not in cache, fetch from server
      if (!currentSession) {
        currentSession = await store.refreshSessionByCode(code)
      }

      if (!currentSession) {
        setError('Quiz session not found. Please check the code and try again.')
        return
      }

      if (currentSession.status !== 'waiting') {
        if (currentSession.status === 'in_progress') {
          // Check if player is already a participant
          if (store.isPlayerInSession(currentSession.id, storedPlayerId)) {
            router.push(`/quiz/${currentSession.id}`)
            return
          }
        }
        setError('This quiz has already started or ended.')
        return
      }

      setSession(currentSession)
      setIsHost(currentSession.hostPlayerId === storedPlayerId)

      // Join session if not already joined
      if (!store.isPlayerInSession(currentSession.id, storedPlayerId)) {
        await store.joinSession(currentSession.id, storedPlayerId, storedAlias)
      }

      // Refresh participants
      await store.refreshParticipants(currentSession.id)
      setParticipants(store.getParticipants(currentSession.id))
    }

    loadSession()

    // Subscribe to store updates
    const unsubscribe = store.subscribe(refreshData)

    return () => unsubscribe()
  }, [code, router, refreshData])

  const copyCode = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const startQuiz = async () => {
    if (!session || !isHost) return

    setIsStarting(true)

    try {
      // Get random questions
      const questions = await store.getRandomQuestions(10, selectedTags.length > 0 ? selectedTags : undefined)

      if (questions.length < 5) {
        setError('Not enough questions available. Please add more questions or remove tag filters.')
        setIsStarting(false)
        return
      }

      await store.startSession(session.id, questions.map((q) => q.id))
      router.push(`/quiz/${session.id}`)
    } catch (error) {
      console.error('Failed to start quiz:', error)
      setError('Failed to start quiz. Please try again.')
      setIsStarting(false)
    }
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 text-center">
          <CardContent className="pt-12 pb-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-6">
              <X className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Error</h2>
            <p className="text-muted-foreground mb-8">{error}</p>
            <Link href="/">
              <Button>Return Home</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Leave Lobby
        </Link>

        {/* Lobby Code Display */}
        <Card className="border-border/50 mb-6">
          <CardHeader className="text-center pb-4">
            <CardDescription>Lobby Code</CardDescription>
            <div className="flex items-center justify-center gap-4">
              <CardTitle className="text-4xl tracking-[0.3em] font-mono">
                {session.lobbyCode}
              </CardTitle>
              <Button
                variant="outline"
                size="icon"
                onClick={copyCode}
                className="shrink-0 bg-transparent"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Share this code with your team to join
            </p>
          </CardHeader>
        </Card>

        {/* Participants List */}
        <Card className="border-border/50 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Participants ({participants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <span className="font-medium text-foreground">
                    {participant.playerAlias}
                    {participant.playerId === session.hostPlayerId && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                        Host
                      </span>
                    )}
                    {participant.playerId === playerId && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                        You
                      </span>
                    )}
                  </span>
                </div>
              ))}
              {participants.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Waiting for participants to join...
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Host Controls */}
        {isHost ? (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Host Controls</CardTitle>
              <CardDescription>
                Configure and start the quiz when everyone is ready
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tag Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  Filter by Tags (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                {selectedTags.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Questions will be filtered to include: {selectedTags.join(', ')}
                  </p>
                )}
              </div>

              <Button
                onClick={startQuiz}
                disabled={participants.length < 1 || isStarting}
                className="w-full"
                size="lg"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Quiz
                  </>
                )}
              </Button>
              {participants.length < 1 && (
                <p className="text-sm text-center text-muted-foreground">
                  Waiting for at least 1 participant to join
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50">
            <CardContent className="py-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-foreground font-medium">Waiting for host to start...</p>
              <p className="text-sm text-muted-foreground mt-1">
                The quiz will begin when the host is ready
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
