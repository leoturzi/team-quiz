'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { store } from '@/lib/store'
import type { QuizSession, QuizParticipant } from '@/lib/types'
import { ArrowLeft, Copy, Check, Users, Play, Loader2, Tag, X, HelpCircle, XCircle } from 'lucide-react'

const MIN_QUESTIONS = 5
const MAX_QUESTIONS = 30
const DEFAULT_QUESTIONS = 10
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
  const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTIONS)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  // Update UI from store cache (realtime updates the cache automatically)
  const updateFromStore = useCallback(() => {
    const currentSession = store.getSessionByCode(code)
    if (currentSession) {
      setSession(currentSession)
      setParticipants(store.getParticipants(currentSession.id))

      // Check if quiz has started
      if (currentSession.status === 'in_progress') {
        router.push(`/quiz/${currentSession.id}`)
      }
    } else {
      // Session was deleted (cancelled by host)
      setSession(null)
      setParticipants([])
      router.push('/')
    }
  }, [code, router])

  useEffect(() => {
    let unsubscribeRealtime: (() => void) | null = null
    let unsubscribeStore: (() => void) | null = null
    let isMounted = true

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
        const refreshed = await store.refreshSessionByCode(code)
        currentSession = refreshed || undefined
      }

      if (!isMounted) return

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
        try {
          await store.joinSession(currentSession.id, storedPlayerId, storedAlias)
        } catch (error: any) {
          // If player doesn't exist, redirect to registration
          if (error?.message?.includes('Player not found')) {
            localStorage.removeItem('quiz_player_id')
            localStorage.removeItem('quiz_alias')
            router.push(`/register?redirect=join&code=${code}`)
            return
          }
          throw error
        }
      }

      if (!isMounted) return

      // Initial load of participants from server
      await store.refreshParticipants(currentSession.id)
      setParticipants(store.getParticipants(currentSession.id))
      
      // Subscribe to realtime updates for this session
      // Realtime will update the store cache, then we update UI
      unsubscribeRealtime = store.subscribeToSession(currentSession.id)
      
      // Subscribe to store updates to sync UI when cache changes
      unsubscribeStore = store.subscribe(updateFromStore)
    }

    loadSession()

    // Cleanup function runs synchronously when component unmounts
    return () => {
      isMounted = false
      unsubscribeRealtime?.()
      unsubscribeStore?.()
    }
  }, [code, router, updateFromStore])

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
      const questions = await store.getRandomQuestions(questionCount, selectedTags.length > 0 ? selectedTags : undefined)

      if (questions.length < questionCount) {
        setError(`Not enough questions available. Only ${questions.length} questions found. Please reduce the count or remove tag filters.`)
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

  const handleCancelQuiz = async () => {
    if (!session || !isHost) return
    setIsCancelling(true)
    try {
      await store.cancelSession(session.id)
      router.push('/')
    } catch (error) {
      console.error('Failed to cancel quiz:', error)
      setError('Failed to cancel quiz. Please try again.')
      setIsCancelling(false)
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
              {/* Question Count Slider */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-muted-foreground" />
                  Number of Questions
                </label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[questionCount]}
                    onValueChange={(value) => setQuestionCount(value[0])}
                    min={MIN_QUESTIONS}
                    max={MAX_QUESTIONS}
                    step={1}
                    className="flex-1 cursor-pointer"
                  />
                  <span className="text-2xl font-bold text-primary w-12 text-right tabular-nums">
                    {questionCount}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Select between {MIN_QUESTIONS} and {MAX_QUESTIONS} questions
                </p>
              </div>

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
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer ${
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

              <div className="space-y-3">
                <Button
                  onClick={startQuiz}
                  disabled={participants.length < 1 || isStarting}
                  className="w-full cursor-pointer"
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
                <Button
                  variant="outline"
                  onClick={() => setShowCancelDialog(true)}
                  disabled={isStarting || isCancelling}
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel Session
                </Button>
              </div>
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

        {/* Cancel Session Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Quiz Session?</DialogTitle>
              <DialogDescription>
                {session?.status === 'waiting' 
                  ? 'This will cancel the quiz session. All participants will be removed and the session will be deleted. This action cannot be undone.'
                  : 'This will cancel the current quiz session and rollback all player statistics. All answers submitted during this session will be removed, and player stats will be reverted to their previous values. This action cannot be undone.'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(false)}
                disabled={isCancelling}
                className="cursor-pointer"
              >
                Keep Session
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelQuiz}
                disabled={isCancelling}
                className="cursor-pointer"
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel Session'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}
