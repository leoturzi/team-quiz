'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { store } from '@/lib/store'
import { useQuizTimer } from '@/hooks/use-quiz-timer'
import { QuestionRenderer } from '@/components/quiz/QuestionRenderer'
import type { QuizSession, Question, Answer, ScoreboardEntry, SelectedAnswerData } from '@/lib/types'
import { Flag, ArrowRight, Users, Trophy, Clock, Home, XCircle, Zap } from 'lucide-react'

export default function QuizPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const router = useRouter()
  const [session, setSession] = useState<QuizSession | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [participantCount, setParticipantCount] = useState(0)
  const [isFlagged, setIsFlagged] = useState(false)
  const [sessionScoreboard, setSessionScoreboard] = useState<ScoreboardEntry[]>([])
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isAdvancing, setIsAdvancing] = useState(false)

  const { timeLeft, showResults, timeBombActive, timeBombFlash, timeBombPulse } = useQuizTimer({
    currentQuestion,
    answerCount: answers.length,
    participantCount,
    questionIndex: session?.currentQuestionIndex ?? -1,
    currentQuestionStartedAt: session?.currentQuestionStartedAt,
  })

  const displayedQuestionIndexRef = useRef<number>(-1)

  const updateFromStore = useCallback(async () => {
    const currentSession = store.getSessionById(sessionId)
    if (!currentSession) {
      router.push('/')
      return
    }

    setSession(currentSession)

    if (currentSession.status === 'completed') {
      store.getSessionScoreboard(sessionId).then(setSessionScoreboard).catch(console.error)
      return
    }

    const questionIndex = currentSession.currentQuestionIndex
    const questionId = currentSession.questionIds[questionIndex]
    const questionChanged = questionIndex !== displayedQuestionIndexRef.current

    if (questionChanged) {
      setSelectedAnswer(null)
      setHasAnswered(false)
      setAnswers([])
      displayedQuestionIndexRef.current = questionIndex
    }

    let question = store.getQuestionById(questionId)

    if (!question) {
      await store.refreshQuestion(questionId)
      question = store.getQuestionById(questionId)
    }

    if (question && questionChanged) {
      setCurrentQuestion(question)
      setIsFlagged(question.flagged)
    }

    if (question) {
      setAnswers(store.getAnswersForQuestion(sessionId, questionId))
    }
    setParticipantCount(store.getParticipants(sessionId).length)
  }, [sessionId, router])

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
      
      await store.refreshParticipants(sessionId)
      if (!isMounted) return
      setParticipantCount(store.getParticipants(sessionId).length)

      const questionId = currentSession.questionIds[currentSession.currentQuestionIndex]
      let question = store.getQuestionById(questionId)
      
      if (!question) {
        await store.refreshQuestion(questionId)
        question = store.getQuestionById(questionId)
      }
      
      if (!isMounted) return

      if (question) {
        setCurrentQuestion(question)
        setIsFlagged(question.flagged)
        displayedQuestionIndexRef.current = currentSession.currentQuestionIndex

        let existingAnswer = store.getPlayerAnswer(sessionId, questionId, storedPlayerId)
        if (!existingAnswer) {
          existingAnswer = await store.refreshPlayerAnswer(sessionId, questionId, storedPlayerId) || undefined
        }
        if (!isMounted) return
        if (existingAnswer) {
          setSelectedAnswer(existingAnswer.selectedAnswer)
          setHasAnswered(true)
        }
        
        await store.refreshAnswersForQuestion(sessionId, questionId)
        if (!isMounted) return
        setAnswers(store.getAnswersForQuestion(sessionId, questionId))
      }
    }

    loadQuiz()

    const unsubscribeRealtime = store.subscribeToSession(sessionId)
    const unsubscribeStore = store.subscribe(updateFromStore)

    return () => {
      isMounted = false
      unsubscribeRealtime()
      unsubscribeStore()
    }
  }, [sessionId, router, updateFromStore])

  const handleAnswer = async (answer: string, answerData?: SelectedAnswerData) => {
    if (hasAnswered || showResults || !currentQuestion || !playerId) return

    setSelectedAnswer(answer)
    setHasAnswered(true)

    try {
      await store.submitAnswer(
        sessionId,
        currentQuestion.id,
        playerId,
        answer,
        answerData
      )
      await store.refreshAnswersForQuestion(sessionId, currentQuestion.id)
      setAnswers(store.getAnswersForQuestion(sessionId, currentQuestion.id))
    } catch (error) {
      console.error('Failed to submit answer:', error)
    }
  }

  const handleNextQuestion = async () => {
    if (!session || !isHost || isAdvancing) return
    setIsAdvancing(true)
    try {
      await store.nextQuestion(sessionId)
      await updateFromStore()
    } catch (error) {
      console.error('Failed to advance question:', error)
    } finally {
      setIsAdvancing(false)
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

  const handleCancelQuiz = async () => {
    if (!session || !isHost) return
    setIsCancelling(true)
    try {
      await store.cancelSession(sessionId)
      router.push('/')
    } catch (error) {
      console.error('Failed to cancel quiz:', error)
      setIsCancelling(false)
    }
  }

  if (!session || !currentQuestion) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

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
              key={timeBombPulse}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                timeLeft <= 10
                  ? 'bg-destructive/20 text-destructive'
                  : timeLeft <= 30
                    ? 'bg-accent/20 text-accent'
                    : 'bg-secondary text-secondary-foreground'
              } ${timeBombFlash ? 'time-bomb-active animate-time-bomb-impact' : ''}`}
            >
              {timeBombActive ? (
                <Zap className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
              {timeLeft >= 60
                ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`
                : `${timeLeft}s`}
            </div>
            {isHost && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelDialog(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                Cancel Quiz
              </Button>
            )}
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
            <div className="flex items-center justify-center gap-2 mb-2">
              {currentQuestion.questionType !== 'multiple_choice' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium uppercase tracking-wide">
                  {currentQuestion.questionType.replace('_', ' ')}
                </span>
              )}
            </div>
            <p className="text-xl font-medium text-foreground text-center text-balance">
              {currentQuestion.questionText}
            </p>
          </CardContent>
        </Card>

        {/* Question Type Renderer */}
        <QuestionRenderer
          question={currentQuestion}
          selectedAnswer={selectedAnswer}
          hasAnswered={hasAnswered}
          showResults={showResults}
          answers={answers}
          onAnswer={handleAnswer}
        />

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
                className="flex-1 bg-transparent cursor-pointer"
              >
                <Flag className={`w-4 h-4 ${isFlagged ? 'text-accent' : ''}`} />
                {isFlagged ? 'Flagged for Review' : 'Flag Question'}
              </Button>
              {isHost && session.currentQuestionIndex < session.questionIds.length - 1 && (
                <Button onClick={handleNextQuestion} disabled={isAdvancing} className="flex-1 cursor-pointer">
                  Next Question
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
              {isHost && session.currentQuestionIndex === session.questionIds.length - 1 && (
                <Button onClick={handleNextQuestion} disabled={isAdvancing} className="flex-1 cursor-pointer">
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

        {/* Cancel Quiz Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Quiz Session?</DialogTitle>
              <DialogDescription>
                This will cancel the current quiz session and rollback all player statistics. 
                All answers submitted during this session will be removed, and player stats 
                will be reverted to their previous values. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(false)}
                disabled={isCancelling}
                className="cursor-pointer"
              >
                Keep Quiz
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelQuiz}
                disabled={isCancelling}
                className="cursor-pointer"
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel Quiz'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}
