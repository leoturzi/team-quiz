export interface Player {
  id: string
  alias: string
  totalQuestionsAnswered: number
  totalCorrectAnswers: number
  createdAt: Date
}

export interface Question {
  id: string
  questionText: string
  correctAnswer: string
  wrongAnswer1: string
  wrongAnswer2: string
  wrongAnswer3: string
  tags: string[]
  flagged: boolean
  flagReason?: string
  createdAt: Date
}

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
