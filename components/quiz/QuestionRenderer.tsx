'use client'

import type { Question, SelectedAnswerData } from '@/lib/types'
import type { Answer } from '@/lib/types'
import { MultipleChoiceRenderer } from './MultipleChoiceRenderer'
import { MultipleAnswerRenderer } from './MultipleAnswerRenderer'
import { SequenceRenderer } from './SequenceRenderer'
import { useMemo } from 'react'

interface QuestionRendererProps {
  question: Question
  selectedAnswer: string | null
  hasAnswered: boolean
  showResults: boolean
  answers: Answer[]
  onAnswer: (selectedAnswer: string, answerData?: SelectedAnswerData) => void
}

export function QuestionRenderer({
  question,
  selectedAnswer,
  hasAnswered,
  showResults,
  answers,
  onAnswer,
}: QuestionRendererProps) {
  const answerDistribution = useMemo(() => {
    if (question.questionType === 'sequence') return []

    const structure = question.questionStructure as { options: { text: string; isCorrect: boolean }[] }
    return structure.options.map((option) => {
      const count = answers.filter((a) => {
        if (a.selectedAnswerData?.type === 'multiple') {
          return a.selectedAnswerData.values.includes(option.text)
        }
        return a.selectedAnswer === option.text
      }).length
      const percentage = answers.length > 0 ? (count / answers.length) * 100 : 0
      return { answer: option.text, count, percentage }
    })
  }, [question, answers])

  const handleSingleAnswer = (answer: string) => {
    onAnswer(answer, { type: 'single', value: answer })
  }

  const handleMultipleAnswers = (selectedAnswers: string[]) => {
    onAnswer(selectedAnswers.join(', '), { type: 'multiple', values: selectedAnswers })
  }

  const handleSequenceOrder = (order: string[]) => {
    onAnswer(order.join(' → '), { type: 'sequence', order })
  }

  switch (question.questionType) {
    case 'true_false':
    case 'multiple_choice':
      return (
        <MultipleChoiceRenderer
          question={question}
          selectedAnswer={selectedAnswer}
          hasAnswered={hasAnswered}
          showResults={showResults}
          onSelectAnswer={handleSingleAnswer}
          answerDistribution={answerDistribution}
        />
      )

    case 'multiple_answer':
      return (
        <MultipleAnswerRenderer
          question={question}
          selectedAnswers={selectedAnswer ? selectedAnswer.split(', ') : []}
          hasAnswered={hasAnswered}
          showResults={showResults}
          onSubmitAnswers={handleMultipleAnswers}
          answerDistribution={answerDistribution}
        />
      )

    case 'sequence':
      return (
        <SequenceRenderer
          question={question}
          selectedOrder={selectedAnswer ? selectedAnswer.split(' → ') : []}
          hasAnswered={hasAnswered}
          showResults={showResults}
          onSubmitOrder={handleSequenceOrder}
        />
      )

    default:
      return (
        <MultipleChoiceRenderer
          question={question}
          selectedAnswer={selectedAnswer}
          hasAnswered={hasAnswered}
          showResults={showResults}
          onSelectAnswer={handleSingleAnswer}
          answerDistribution={answerDistribution}
        />
      )
  }
}
