'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import type { Question, QuestionOption } from '@/lib/types'
import { Check, X, Square, CheckSquare } from 'lucide-react'

interface AnswerDistItem {
  answer: string
  count: number
  percentage: number
}

interface MultipleAnswerRendererProps {
  question: Question
  selectedAnswers: string[]
  hasAnswered: boolean
  showResults: boolean
  onSubmitAnswers: (answers: string[]) => void
  answerDistribution: AnswerDistItem[]
}

export function MultipleAnswerRenderer({
  question,
  selectedAnswers,
  hasAnswered,
  showResults,
  onSubmitAnswers,
  answerDistribution,
}: MultipleAnswerRendererProps) {
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set())

  const shuffledOptions = useMemo(() => {
    const structure = question.questionStructure as { options: QuestionOption[] }
    return [...structure.options].sort(() => Math.random() - 0.5)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id])

  const toggleOption = (text: string) => {
    if (hasAnswered || showResults) return
    setLocalSelected((prev) => {
      const next = new Set(prev)
      if (next.has(text)) {
        next.delete(text)
      } else {
        next.add(text)
      }
      return next
    })
  }

  const handleSubmit = () => {
    if (localSelected.size === 0) return
    onSubmitAnswers(Array.from(localSelected))
  }

  const displaySelected = hasAnswered ? new Set(selectedAnswers) : localSelected

  return (
    <div className="space-y-3 mb-6">
      <p className="text-sm text-muted-foreground text-center">
        Select all correct answers
      </p>
      <div className="grid gap-3">
        {shuffledOptions.map((option) => {
          const isCorrect = option.isCorrect
          const isSelected = displaySelected.has(option.text)
          const dist = answerDistribution.find((d) => d.answer === option.text)

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
              key={option.text}
              type="button"
              onClick={() => toggleOption(option.text)}
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
                  {showResults ? (
                    isCorrect ? (
                      <Check className="w-5 h-5 text-success shrink-0" />
                    ) : isSelected ? (
                      <X className="w-5 h-5 text-destructive shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-muted-foreground shrink-0" />
                    )
                  ) : isSelected ? (
                    <CheckSquare className="w-5 h-5 text-primary shrink-0" />
                  ) : (
                    <Square className="w-5 h-5 text-muted-foreground shrink-0" />
                  )}
                  <span className={`font-medium ${showResults && isCorrect ? 'text-success' : showResults && isSelected && !isCorrect ? 'text-destructive' : 'text-foreground'}`}>
                    {option.text}
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
      {!hasAnswered && !showResults && (
        <Button
          onClick={handleSubmit}
          disabled={localSelected.size === 0}
          className="w-full cursor-pointer"
        >
          Lock In ({localSelected.size} selected)
        </Button>
      )}
    </div>
  )
}
