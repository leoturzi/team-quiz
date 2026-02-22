import { useState, useEffect, useRef } from 'react'
import type { Question } from '@/lib/types'

const QUESTION_DURATION_SECONDS = 60
const TIME_BOMB_PENALTY_SECONDS = 5
const TIME_BOMB_THRESHOLD_RATIO = 0.25
const TIME_BOMB_VISUAL_MS = 1800
const TIME_BOMB_MIN_TIME_LEFT_SECONDS = 10

interface UseQuizTimerParams {
  currentQuestion: Question | null
  answerCount: number
  participantCount: number
  questionIndex: number
}

interface UseQuizTimerReturn {
  timeLeft: number
  showResults: boolean
  timeBombActive: boolean
  timeBombFlash: boolean
  timeBombPulse: number
}

export function useQuizTimer({
  currentQuestion,
  answerCount,
  participantCount,
  questionIndex,
}: UseQuizTimerParams): UseQuizTimerReturn {
  const [timeLeft, setTimeLeft] = useState(QUESTION_DURATION_SECONDS)
  const [showResults, setShowResults] = useState(false)
  const [timeBombFlash, setTimeBombFlash] = useState(false)
  const [timeBombPulse, setTimeBombPulse] = useState(0)

  const prevAnswerCountRef = useRef(0)
  const bombVisualTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [prevQuestionIndex, setPrevQuestionIndex] = useState(questionIndex)

  // Reset state synchronously during render when question changes.
  // Using the "adjust state during render" pattern (not useEffect) so the
  // stale showResults=true is never committed to the DOM.
  if (questionIndex !== prevQuestionIndex) {
    setPrevQuestionIndex(questionIndex)
    setTimeLeft(QUESTION_DURATION_SECONDS)
    setShowResults(false)
    setTimeBombFlash(false)
    setTimeBombPulse(0)
    if (bombVisualTimeoutRef.current) {
      clearTimeout(bombVisualTimeoutRef.current)
      bombVisualTimeoutRef.current = null
    }
    prevAnswerCountRef.current = 0
  }

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
