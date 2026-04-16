import { useState, useEffect, useRef } from 'react'
import type { Question } from '@/lib/types'

const DEFAULT_QUESTION_DURATION_SECONDS = 60
const TIME_BOMB_PENALTY_SECONDS = 5
const TIME_BOMB_THRESHOLD_RATIO = 0.25
const TIME_BOMB_VISUAL_MS = 1800
const TIME_BOMB_MIN_TIME_LEFT_SECONDS = 10

interface UseQuizTimerParams {
  currentQuestion: Question | null
  answerCount: number
  participantCount: number
  questionIndex: number
  currentQuestionStartedAt?: Date | null
  forceEnded?: boolean
}

interface UseQuizTimerReturn {
  timeLeft: number
  showResults: boolean
  timeBombActive: boolean
  timeBombFlash: boolean
  timeBombPulse: number
}

function computeRemainingSeconds(duration: number, startedAt?: Date | null): number {
  if (!startedAt) return duration
  const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000)
  return Math.max(0, duration - elapsed)
}

export function useQuizTimer({
  currentQuestion,
  answerCount,
  participantCount,
  questionIndex,
  currentQuestionStartedAt,
  forceEnded,
}: UseQuizTimerParams): UseQuizTimerReturn {
  const duration = currentQuestion?.timeLimitSeconds ?? DEFAULT_QUESTION_DURATION_SECONDS
  const [timeLeft, setTimeLeft] = useState(() => computeRemainingSeconds(duration, currentQuestionStartedAt))
  const [showResults, setShowResults] = useState(() => computeRemainingSeconds(duration, currentQuestionStartedAt) <= 0)
  const [timeBombFlash, setTimeBombFlash] = useState(false)
  const [timeBombPulse, setTimeBombPulse] = useState(0)

  const prevAnswerCountRef = useRef(0)
  const bombVisualTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [prevQuestionIndex, setPrevQuestionIndex] = useState(questionIndex)
  const [prevQuestionId, setPrevQuestionId] = useState<string | null>(currentQuestion?.id ?? null)

  // Reset state synchronously during render when question changes.
  // Using the "adjust state during render" pattern (not useEffect) so the
  // stale showResults=true is never committed to the DOM.
  const questionId = currentQuestion?.id ?? null

  // Reset when question index OR question identity changes.
  // This covers the case where the session index updates before the
  // question payload has been loaded from the store.
  if (questionIndex !== prevQuestionIndex || questionId !== prevQuestionId) {
    setPrevQuestionIndex(questionIndex)
    setPrevQuestionId(questionId)
    const remaining = computeRemainingSeconds(duration, currentQuestionStartedAt)
    setTimeLeft(remaining)
    setShowResults(remaining <= 0)
    setTimeBombFlash(false)
    setTimeBombPulse(0)
    if (bombVisualTimeoutRef.current) {
      clearTimeout(bombVisualTimeoutRef.current)
      bombVisualTimeoutRef.current = null
    }
    prevAnswerCountRef.current = 0
  }

  // Host force-ended the question — immediately expire the timer
  useEffect(() => {
    if (forceEnded && !showResults) {
      setTimeLeft(0)
    }
  }, [forceEnded, showResults])

  // Base countdown (1s tick)
  useEffect(() => {
    if (showResults || !currentQuestion) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [showResults, currentQuestion])

  // Time bomb: deduct seconds when answers arrive past the 50% threshold
  useEffect(() => {
    if (showResults || participantCount === 0) return

    const threshold = Math.ceil(participantCount * TIME_BOMB_THRESHOLD_RATIO)
    const currentCount = answerCount
    const prevCount = prevAnswerCountRef.current

    if (currentCount > prevCount && currentCount > threshold) {
      const newAnswersPastThreshold = currentCount - Math.max(prevCount, threshold)
      if (newAnswersPastThreshold > 0) {
        setTimeLeft((prev) => {
          // Once timer is at/under the floor, disable bomb effects.
          if (prev <= TIME_BOMB_MIN_TIME_LEFT_SECONDS) {
            return prev
          }

          const penalty = newAnswersPastThreshold * TIME_BOMB_PENALTY_SECONDS
          const next = Math.max(TIME_BOMB_MIN_TIME_LEFT_SECONDS, prev - penalty)

          // Trigger bomb visuals only when a deduction actually happens.
          if (next < prev) {
            setTimeBombFlash(true)
            setTimeBombPulse((pulse) => pulse + 1)
            if (bombVisualTimeoutRef.current) {
              clearTimeout(bombVisualTimeoutRef.current)
            }
            bombVisualTimeoutRef.current = setTimeout(() => {
              setTimeBombFlash(false)
              bombVisualTimeoutRef.current = null
            }, TIME_BOMB_VISUAL_MS)
          }

          return next
        })
      }
    }

    prevAnswerCountRef.current = currentCount
  }, [answerCount, participantCount, showResults])

  // Trigger results when timer reaches 0
  useEffect(() => {
    if (timeLeft <= 0 && !showResults && currentQuestion) {
      setShowResults(true)
    }
  }, [timeLeft, showResults, currentQuestion])

  // Trigger results when all participants have answered
  useEffect(() => {
    if (!showResults && answerCount >= participantCount && participantCount > 0) {
      setShowResults(true)
    }
  }, [answerCount, participantCount, showResults])

  useEffect(() => {
    return () => {
      if (bombVisualTimeoutRef.current) {
        clearTimeout(bombVisualTimeoutRef.current)
      }
    }
  }, [])

  const timeBombActive = timeBombFlash

  return { timeLeft, showResults, timeBombActive, timeBombFlash, timeBombPulse }
}
