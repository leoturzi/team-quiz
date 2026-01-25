'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { store } from '@/lib/store'
import { getQuestionCount } from '@/actions/questions'
import { Users, PlusCircle, Trophy, Play, Zap, Sparkles } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [alias, setAlias] = useState<string | null>(null)
  const [lobbyCode, setLobbyCode] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isLoadingDemo, setIsLoadingDemo] = useState(false)
  const [questionCount, setQuestionCount] = useState<number>(0)

  useEffect(() => {
    const storedAlias = localStorage.getItem('quiz_alias')
    const storedPlayerId = localStorage.getItem('quiz_player_id')
    if (storedAlias && storedPlayerId) {
      setAlias(storedAlias)
    }
    
    // Fetch question count from server
    getQuestionCount().then(setQuestionCount)
  }, [])

  const handleCreateQuiz = async () => {
    if (!alias) {
      router.push('/register?redirect=create')
      return
    }

    setIsCreating(true)
    const playerId = localStorage.getItem('quiz_player_id')
    if (!playerId) {
      router.push('/register?redirect=create')
      return
    }

    try {
      const session = await store.createSession(playerId)
      await store.joinSession(session.id, playerId, alias)
      router.push(`/lobby/${session.lobbyCode}`)
    } catch (error) {
      console.error('Failed to create quiz:', error)
      setIsCreating(false)
    }
  }

  const handleJoinQuiz = () => {
    if (!alias) {
      router.push(`/register?redirect=join&code=${lobbyCode}`)
      return
    }

    if (lobbyCode.trim().length < 4) return
    router.push(`/lobby/${lobbyCode.toUpperCase()}`)
  }

  const handleTryDemo = () => {
    setIsLoadingDemo(true)
    const { playerAlias, sessionCode } = store.seedDemoData()
    setAlias(playerAlias)
    // Short delay for visual feedback
    setTimeout(() => {
      router.push(`/lobby/${sessionCode}`)
    }, 500)
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            <span>Interactive Dev Training</span>
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-foreground mb-4 text-balance">
            GDP Quiz
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Make dev training sessions interactive. Submit questions, compete with your team, and learn together.
          </p>
          {alias && (
            <p className="mt-4 text-sm text-muted-foreground">
              Welcome back, <span className="text-primary font-semibold">{alias}</span>
            </p>
          )}
        </div>

        {/* Demo Mode Banner */}
        <Card className="mb-8 border-accent/50 bg-accent/5">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent/20">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Try Demo Mode</h3>
                <p className="text-sm text-muted-foreground">
                  Experience the full game with mock players and an active lobby
                </p>
              </div>
            </div>
            <Button
              onClick={handleTryDemo}
              disabled={isLoadingDemo}
              className="bg-accent hover:bg-accent/90 text-accent-foreground whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              {isLoadingDemo ? 'Loading Demo...' : 'Try Demo'}
            </Button>
          </CardContent>
        </Card>

        {/* Main Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Join Quiz Card */}
          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Join a Quiz
              </CardTitle>
              <CardDescription>
                Enter a lobby code to join an existing quiz session
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input
                placeholder="Enter lobby code"
                value={lobbyCode}
                onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                className="text-center text-lg tracking-widest uppercase"
                maxLength={6}
              />
              <Button
                onClick={handleJoinQuiz}
                disabled={lobbyCode.trim().length < 4}
                className="w-full"
              >
                <Play className="w-4 h-4" />
                Join Quiz
              </Button>
            </CardContent>
          </Card>

          {/* Create Quiz Card */}
          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-accent" />
                Host a Quiz
              </CardTitle>
              <CardDescription>
                Create a new quiz session and invite your team
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Start a new quiz session with questions from the shared pool. You will get a code to share with participants.
              </p>
              <Button
                onClick={handleCreateQuiz}
                disabled={isCreating}
                variant="secondary"
                className="w-full"
              >
                <Zap className="w-4 h-4" />
                {isCreating ? 'Creating...' : 'Create Quiz'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Actions */}
        <div className="grid md:grid-cols-2 gap-4">
          <Link href="/submit" className="block">
            <Card className="border-border/50 hover:border-primary/30 transition-colors h-full">
              <CardContent className="flex items-center gap-4 py-6">
                <div className="p-3 rounded-lg bg-primary/10">
                  <PlusCircle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Submit a Question</h3>
                  <p className="text-sm text-muted-foreground">
                    Add questions to the shared pool
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/scoreboard" className="block">
            <Card className="border-border/50 hover:border-primary/30 transition-colors h-full">
              <CardContent className="flex items-center gap-4 py-6">
                <div className="p-3 rounded-lg bg-accent/10">
                  <Trophy className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Scoreboard</h3>
                  <p className="text-sm text-muted-foreground">
                    View global rankings and stats
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Info Section */}
        <div className="mt-12 text-center">
          <div className="inline-flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>Pool of questions: {questionCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span>Anonymous Aliases</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span>Real-time Multiplayer</span>
            </div>
          </div>
        </div>

        {!alias && (
          <div className="mt-8 text-center">
            <Link href="/register">
              <Button variant="outline" size="lg">
                Register Your Alias
              </Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
