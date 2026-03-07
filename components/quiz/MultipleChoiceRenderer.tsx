'use client'

import { useMemo } from 'react'
import type { Question, QuestionOption } from '@/lib/types'
import { Check, X } from 'lucide-react'

interface AnswerDistItem {
  answer: string
  count: number
  percentage: number
}

interface MultipleChoiceRendererProps {
  question: Question
  selectedAnswer: string | null
  hasAnswered: boolean
  showResults: boolean
  onSelectAnswer: (answer: string) => void
  answerDistribution: AnswerDistItem[]
}

export function MultipleChoiceRenderer({
  question,
  selectedAnswer,
  hasAnswered,
  showResults,
  onSelectAnswer,
  answerDistribution,
}: MultipleChoiceRendererProps) {
  const shuffledOptions = useMemo(() => {
    const structure = question.questionStructure as { options: QuestionOption[] }
    return [...structure.options].sort(() => Math.random() - 0.5)
  // Only re-shuffle when question changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id])

  return (
    <div className="grid gap-3 mb-6">
      {shuffledOptions.map((option) => {
        const isCorrect = option.isCorrect
        const isSelected = selectedAnswer === option.text
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
            onClick={() => onSelectAnswer(option.text)}
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
  )
}
