export interface Player {
  id: string
  alias: string
  totalQuestionsAnswered: number
  totalCorrectAnswers: number
  createdAt: Date
}

export type QuestionType = 'multiple_choice' | 'true_false' | 'multiple_answer' | 'sequence'

export interface QuestionOption {
  text: string
  isCorrect: boolean
}

export interface SequenceItem {
  text: string
  correctPosition: number
}

export type QuestionStructure =
  | { options: QuestionOption[] }
  | { items: SequenceItem[] }

export interface Question {
  id: string
  questionText: string
  questionType: QuestionType
  questionStructure: QuestionStructure
  tags: string[]
  flagged: boolean
  flagReason?: string
  timeLimitSeconds: number
  createdAt: Date
}

export type SelectedAnswerData =
  | { type: 'single'; value: string }
  | { type: 'multiple'; values: string[] }
  | { type: 'sequence'; order: string[] }

export interface QuizSession {
  id: string
  lobbyCode: string
  hostPlayerId: string
  status: 'waiting' | 'in_progress' | 'completed'
  currentQuestionIndex: number
  questionIds: string[]
  createdAt: Date
  startedAt?: Date
  endedAt?: Date
  currentQuestionStartedAt?: Date
}

export interface QuizParticipant {
  id: string
  quizSessionId: string
  playerId: string
  playerAlias: string
  joinedAt: Date
}

export interface Answer {
  id: string
  quizSessionId: string
  questionId: string
  playerId: string
  selectedAnswer: string
  selectedAnswerData?: SelectedAnswerData
  isCorrect: boolean
  answeredAt: Date
}

export interface ScoreboardEntry {
  rank: number
  alias: string
  totalQuestionsAnswered: number
  totalCorrectAnswers: number
  accuracy: number
}

// ---- Helpers ----

export function getCorrectAnswerText(question: Question): string {
  if (question.questionType === 'sequence') return ''
  const structure = question.questionStructure as { options: QuestionOption[] }
  return structure.options.find((o) => o.isCorrect)?.text ?? ''
}

export function getOptionTexts(question: Question): string[] {
  if (question.questionType === 'sequence') {
    const structure = question.questionStructure as { items: SequenceItem[] }
    return structure.items.map((i) => i.text)
  }
  const structure = question.questionStructure as { options: QuestionOption[] }
  return structure.options.map((o) => o.text)
}
