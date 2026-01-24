'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { store } from '@/lib/store'
import type { QuizSession, Question, Answer, ScoreboardEntry } from '@/lib/types'
import { Flag, ArrowRight, Check, X, Users, Trophy, Clock, Home } from 'lucide-react'

interface ShuffledAnswers {
  answers: string[]
  correctIndex: number
}

function shuffleAnswers(question: Question): ShuffledAnswers {
  const answers = [
    question.correctAnswer,
    question.wrongAnswer1,
    question.wrongAnswer2,
    question.wrongAnswer3,
  ]
  const shuffled = [...answers].sort(() => Math.random() - 0.5)
  return {
    answers: shuffled,
    correctIndex: shuffled.indexOf(question.correctAnswer),
  }
}

export default function QuizPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const router = useRouter()
  const [session, setSession] = useState<QuizSession | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [shuffledAnswers, setShuffledAnswers] = useState<ShuffledAnswers | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [timeLeft, setTimeLeft] = useState(60)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [participantCount, setParticipantCount] = useState(0)
  const [isFlagged, setIsFlagged] = useState(false)
  const [sessionScoreboard, setSessionScoreboard] = useState<ScoreboardEntry[]>([])

  // Update UI from store cache (realtime updates the cache automatically)
  const updateFromStore = useCallback(() => {
    const currentSession = store.getSessionById(sessionId)
    if (!currentSession) return

    setSession(currentSession)

    if (currentSession.status === 'completed') {
      // Load scoreboard only when completed
      store.getSessionScoreboard(sessionId).then(setSessionScoreboard).catch(console.error)
      return
    }

    const questionId = currentSession.questionIds[currentSession.currentQuestionIndex]
    const question = store.getQuestionById(questionId)

    if (question && (!currentQuestion || currentQuestion.id !== question.id)) {
      setCurrentQuestion(question)
      setShuffledAnswers(shuffleAnswers(question))
      setSelectedAnswer(null)
      setHasAnswered(false)
      setShowResults(false)
      setTimeLeft(60)
      setIsFlagged(question.flagged)
    }

    // Update from cache (realtime handles updates)
    setAnswers(store.getAnswersForQuestion(sessionId, questionId))
    setParticipantCount(store.getParticipants(sessionId).length)
  }, [sessionId, currentQuestion])

  useEffect(() => {
    let isMounted = true

    const loadQuiz = async () => {
      const storedPlayerId = localStorage.getItem('quiz_player_id')
      if (!storedPlayerId) {
        router.push('/')
        return
      }
      if (!isMounted) return
      setPlayerId(storedPlayerId)

      let currentSession = store.getSessionById(sessionId)
      if (!currentSession) {
        const refreshed = await store.refreshSession(sessionId)
        currentSession = refreshed || undefined
      }
      
      if (!isMounted) return

      if (!currentSession) {
        router.push('/')
        return
      }

      setSession(currentSession)
      setIsHost(currentSession.hostPlayerId === storedPlayerId)
      
      // Refresh participants
      await store.refreshParticipants(sessionId)
      if (!isMounted) return
      setParticipantCount(store.getParticipants(sessionId).length)

      const questionId = currentSession.questionIds[currentSession.currentQuestionIndex]
      let question = store.getQuestionById(questionId)
      
      // If question not in cache, fetch it
      if (!question) {
        await store.refreshQuestion(questionId)
        question = store.getQuestionById(questionId)
      }
      
      if (!isMounted) return

      if (question) {
        setCurrentQuestion(question)
        setShuffledAnswers(shuffleAnswers(question))
        setIsFlagged(question.flagged)

        // Check if player has already answered
        let existingAnswer = store.getPlayerAnswer(sessionId, questionId, storedPlayerId)
        if (!existingAnswer) {
          existingAnswer = await store.refreshPlayerAnswer(sessionId, questionId, storedPlayerId) || undefined
        }
        if (!isMounted) return
        if (existingAnswer) {
          setSelectedAnswer(existingAnswer.selectedAnswer)
          setHasAnswered(true)
        }
      }
    }

    loadQuiz()

    // Subscribe to realtime updates for this session
    // Realtime will update the store cache, then we update UI
    const unsubscribeRealtime = store.subscribeToSession(sessionId)
    
    // Subscribe to store updates to sync UI when cache changes
    const unsubscribeStore = store.subscribe(updateFromStore)

    return () => {
      isMounted = false
      unsubscribeRealtime()
      unsubscribeStore()
    }
  }, [sessionId, router, updateFromStore])

  // Timer effect
  useEffect(() => {
    if (showResults || !currentQuestion) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setShowResults(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [showResults, currentQuestion])

  // Auto-show results when all participants have answered
  useEffect(() => {
    if (!showResults && answers.length >= participantCount && participantCount > 0) {
      setShowResults(true)
    }
  }, [answers.length, participantCount, showResults])

  const handleSelectAnswer = async (answer: string) => {
    if (hasAnswered || showResults || !currentQuestion || !playerId) return

    setSelectedAnswer(answer)
    setHasAnswered(true)

    try {
      await store.submitAnswer(
        sessionId,
        currentQuestion.id,
        playerId,
        answer,
        currentQuestion.correctAnswer
      )
      // Refresh answers to show updated distribution
      await store.refreshAnswersForQuestion(sessionId, currentQuestion.id)
      setAnswers(store.getAnswersForQuestion(sessionId, currentQuestion.id))
    } catch (error) {
      console.error('Failed to submit answer:', error)
    }
  }

  const handleNextQuestion = async () => {
    if (!session || !isHost) return
    try {
      await store.nextQuestion(sessionId)
      // Realtime will update the store, then updateFromStore will sync UI
      // But we can manually trigger it to ensure immediate update
      updateFromStore()
    } catch (error) {
      console.error('Failed to advance question:', error)
    }
  }

  const handleFlagQuestion = async () => {
    if (!currentQuestion) return
    try {
      await store.flagQuestion(currentQuestion.id, 'Flagged during quiz')
      setIsFlagged(true)
    } catch (error) {
      console.error('Failed to flag question:', error)
    }
  }

  // Calculate answer distribution
  const answerDistribution = useMemo(() => {
    if (!shuffledAnswers) return []
    return shuffledAnswers.answers.map((answer) => {
      const count = answers.filter((a) => a.selectedAnswer === answer).length
      const percentage = answers.length > 0 ? (count / answers.length) * 100 : 0
      return { answer, count, percentage }
    })
  }, [shuffledAnswers, answers])

  if (!session || !currentQuestion || !shuffledAnswers) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  // Quiz completed screen
  if (session.status === 'completed') {
    const playerStats = sessionScoreboard.find((s) => {
      const player = store.getPlayerById(playerId || '')
      return player && s.alias === player.alias
    })

    return (
      <main className="min-h-screen bg-background py-8 px-4">
        <div className="container mx-auto max-w-2xl">
          <Card className="border-border/50 text-center">
            <CardContent className="pt-12 pb-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                <Trophy className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Quiz Complete!</h2>
              {playerStats && (
                <p className="text-xl text-muted-foreground mb-8">
                  You got{' '}
                  <span className="text-primary font-bold">{playerStats.totalCorrectAnswers}</span>{' '}
                  out of{' '}
                  <span className="font-bold">{playerStats.totalQuestionsAnswered}</span> correct (
                  {playerStats.accuracy.toFixed(0)}%)
                </p>
              )}

              {/* Session Scoreboard */}
              <div className="mt-8 text-left">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-accent" />
                  Session Results
                </h3>
                <div className="space-y-2">
                  {sessionScoreboard.map((entry, index) => (
                    <div
                      key={entry.alias}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        index === 0
                          ? 'bg-primary/20'
                          : index === 1
                            ? 'bg-accent/10'
                            : 'bg-secondary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-lg font-bold ${
                            index === 0
                              ? 'text-primary'
                              : index === 1
                                ? 'text-accent'
                                : 'text-muted-foreground'
                          }`}
                        >
                          #{entry.rank}
                        </span>
                        <span className="font-medium text-foreground">{entry.alias}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-foreground">
                          {entry.totalCorrectAnswers}/{entry.totalQuestionsAnswered}
                        </span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({entry.accuracy.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-8">
                <Link href="/scoreboard">
                  <Button className="w-full">
                    <Trophy className="w-4 h-4" />
                    View Global Scoreboard
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" className="w-full bg-transparent">
                    <Home className="w-4 h-4" />
                    Return Home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-muted-foreground">
            Question {session.currentQuestionIndex + 1} of {session.questionIds.length}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              {answers.length}/{participantCount} answered
            </div>
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                timeLeft <= 10
                  ? 'bg-destructive/20 text-destructive'
                  : timeLeft <= 30
                    ? 'bg-accent/20 text-accent'
                    : 'bg-secondary text-secondary-foreground'
              }`}
            >
              <Clock className="w-4 h-4" />
              {timeLeft}s
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <Progress
          value={((session.currentQuestionIndex + 1) / session.questionIds.length) * 100}
          className="h-2 mb-8"
        />

        {/* Question Card */}
        <Card className="border-border/50 mb-6">
          <CardContent className="pt-8 pb-6">
            <p className="text-xl font-medium text-foreground text-center text-balance">
              {currentQuestion.questionText}
            </p>
          </CardContent>
        </Card>

        {/* Answer Options */}
        <div className="grid gap-3 mb-6">
          {shuffledAnswers.answers.map((answer, index) => {
            const isCorrect = answer === currentQuestion.correctAnswer
            const isSelected = selectedAnswer === answer
            const dist = answerDistribution[index]

            let buttonClass = 'p-4 text-left rounded-lg border transition-all relative overflow-hidden '

            if (showResults) {
              if (isCorrect) {
                buttonClass += 'border-success bg-success/10 '
              } else if (isSelected) {
                buttonClass += 'border-destructive bg-destructive/10 '
              } else {
                buttonClass += 'border-border/50 bg-secondary/30 opacity-60 '
              }
            } else if (isSelected) {
              buttonClass += 'border-primary bg-primary/10 '
            } else if (hasAnswered) {
              buttonClass += 'border-border/50 bg-secondary/30 opacity-60 cursor-not-allowed '
            } else {
              buttonClass += 'border-border/50 bg-card hover:border-primary/50 hover:bg-secondary/50 cursor-pointer '
            }

            return (
              <button
                key={answer}
                type="button"
                onClick={() => handleSelectAnswer(answer)}
                disabled={hasAnswered || showResults}
                className={buttonClass}
              >
                {showResults && (
                  <div
                    className={`absolute inset-y-0 left-0 transition-all ${
                      isCorrect ? 'bg-success/20' : 'bg-secondary/30'
                    }`}
                    style={{ width: `${dist?.percentage || 0}%` }}
                  />
                )}
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {showResults && (
                      isCorrect ? (
                        <Check className="w-5 h-5 text-success shrink-0" />
                      ) : isSelected ? (
                        <X className="w-5 h-5 text-destructive shrink-0" />
                      ) : null
                    )}
                    <span className={`font-medium ${showResults && isCorrect ? 'text-success' : showResults && isSelected ? 'text-destructive' : 'text-foreground'}`}>
                      {answer}
                    </span>
                  </div>
                  {showResults && (
                    <span className="text-sm text-muted-foreground">
                      {dist?.count || 0} ({(dist?.percentage || 0).toFixed(0)}%)
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Status / Controls */}
        {hasAnswered && !showResults && (
          <Card className="border-border/50">
            <CardContent className="py-6 text-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-foreground font-medium">Answer locked in!</p>
              <p className="text-sm text-muted-foreground">
                Waiting for other participants...
              </p>
            </CardContent>
          </Card>
        )}

        {showResults && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleFlagQuestion}
                disabled={isFlagged}
                className="flex-1 bg-transparent"
              >
                <Flag className={`w-4 h-4 ${isFlagged ? 'text-accent' : ''}`} />
                {isFlagged ? 'Flagged for Review' : 'Flag Question'}
              </Button>
              {isHost && session.currentQuestionIndex < session.questionIds.length - 1 && (
                <Button onClick={handleNextQuestion} className="flex-1">
                  Next Question
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
              {isHost && session.currentQuestionIndex === session.questionIds.length - 1 && (
                <Button onClick={handleNextQuestion} className="flex-1">
                  Finish Quiz
                  <Trophy className="w-4 h-4" />
                </Button>
              )}
            </div>
            {!isHost && (
              <p className="text-sm text-center text-muted-foreground">
                Waiting for host to continue...
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
