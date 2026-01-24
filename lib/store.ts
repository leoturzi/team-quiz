'use client'

import type { Player, Question, QuizSession, QuizParticipant, Answer } from './types'
import { generateUUID } from './utils'

// In-memory store for demo purposes
// In production, this would be replaced with Supabase

class QuizStore {
  private players: Map<string, Player> = new Map()
  private questions: Map<string, Question> = new Map()
  private sessions: Map<string, QuizSession> = new Map()
  private participants: Map<string, QuizParticipant> = new Map()
  private answers: Map<string, Answer> = new Map()
  private listeners: Set<() => void> = new Set()

  private demoSessionId: string | null = null

  constructor() {
    // Add some sample questions
    this.seedQuestions()
  }

  // Demo mode - seeds all mock data for testing
  seedDemoData(): { playerId: string; playerAlias: string; sessionCode: string } {
    // Create demo players with stats
    const demoPlayers = [
      { alias: 'ByteNinja', correct: 45, total: 50 },
      { alias: 'CodeWizard', correct: 42, total: 50 },
      { alias: 'StackOverflow', correct: 38, total: 48 },
      { alias: 'BugHunter', correct: 35, total: 45 },
      { alias: 'GitGuru', correct: 33, total: 42 },
      { alias: 'ReactRocket', correct: 30, total: 40 },
      { alias: 'TypeScriptTitan', correct: 28, total: 38 },
      { alias: 'AsyncAce', correct: 25, total: 35 },
      { alias: 'APIArtist', correct: 22, total: 32 },
      { alias: 'DevOpsDude', correct: 20, total: 30 },
    ]

    const createdPlayers: Player[] = []
    demoPlayers.forEach((dp) => {
      const id = generateUUID()
      const player: Player = {
        id,
        alias: dp.alias,
        totalQuestionsAnswered: dp.total,
        totalCorrectAnswers: dp.correct,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      }
      this.players.set(id, player)
      createdPlayers.push(player)
    })

    // Create the current user's player
    const currentUserId = generateUUID()
    const currentUser: Player = {
      id: currentUserId,
      alias: 'DemoPlayer',
      totalQuestionsAnswered: 0,
      totalCorrectAnswers: 0,
      createdAt: new Date(),
    }
    this.players.set(currentUserId, currentUser)

    // Store in localStorage for the current user
    if (typeof window !== 'undefined') {
      localStorage.setItem('quiz_player_id', currentUserId)
      localStorage.setItem('quiz_alias', 'DemoPlayer')
    }

    // Create a demo session with the first player as host
    const hostPlayer = createdPlayers[0]
    const sessionId = generateUUID()
    const lobbyCode = 'DEMO42'
    const session: QuizSession = {
      id: sessionId,
      lobbyCode,
      hostPlayerId: hostPlayer.id,
      status: 'waiting',
      currentQuestionIndex: 0,
      questionIds: [],
      createdAt: new Date(),
    }
    this.sessions.set(sessionId, session)
    this.demoSessionId = sessionId

    // Add participants to the session (first 5 players)
    createdPlayers.slice(0, 5).forEach((player) => {
      const participantId = generateUUID()
      const participant: QuizParticipant = {
        id: participantId,
        quizSessionId: sessionId,
        playerId: player.id,
        playerAlias: player.alias,
        joinedAt: new Date(Date.now() - Math.random() * 5 * 60 * 1000),
      }
      this.participants.set(participantId, participant)
    })

    this.notify()

    return {
      playerId: currentUserId,
      playerAlias: 'DemoPlayer',
      sessionCode: lobbyCode,
    }
  }

  getDemoSessionId(): string | null {
    return this.demoSessionId
  }

  clearDemoData() {
    this.players.clear()
    this.sessions.clear()
    this.participants.clear()
    this.answers.clear()
    this.questions.clear()
    this.demoSessionId = null
    this.seedQuestions()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('quiz_player_id')
      localStorage.removeItem('quiz_alias')
    }
    this.notify()
  }

  private seedQuestions() {
    const sampleQuestions: Omit<Question, 'id' | 'createdAt'>[] = [
      {
        questionText: 'What does the "git rebase" command do?',
        correctAnswer: 'Reapplies commits on top of another base tip',
        wrongAnswer1: 'Creates a new branch from the current commit',
        wrongAnswer2: 'Merges two branches together',
        wrongAnswer3: 'Deletes the commit history',
        tags: ['git', 'version-control'],
        flagged: false,
      },
      {
        questionText: 'In React, what hook is used to perform side effects?',
        correctAnswer: 'useEffect',
        wrongAnswer1: 'useState',
        wrongAnswer2: 'useContext',
        wrongAnswer3: 'useMemo',
        tags: ['react', 'javascript'],
        flagged: false,
      },
      {
        questionText: 'What is the time complexity of binary search?',
        correctAnswer: 'O(log n)',
        wrongAnswer1: 'O(n)',
        wrongAnswer2: 'O(n log n)',
        wrongAnswer3: 'O(1)',
        tags: ['algorithms', 'data-structures'],
        flagged: false,
      },
      {
        questionText: 'Which HTTP status code indicates "Not Found"?',
        correctAnswer: '404',
        wrongAnswer1: '500',
        wrongAnswer2: '401',
        wrongAnswer3: '200',
        tags: ['http', 'web'],
        flagged: false,
      },
      {
        questionText: 'What does CSS stand for?',
        correctAnswer: 'Cascading Style Sheets',
        wrongAnswer1: 'Computer Style Sheets',
        wrongAnswer2: 'Creative Style Syntax',
        wrongAnswer3: 'Colorful Style Sheets',
        tags: ['css', 'web'],
        flagged: false,
      },
      {
        questionText: 'In TypeScript, what keyword is used to define a type alias?',
        correctAnswer: 'type',
        wrongAnswer1: 'typedef',
        wrongAnswer2: 'alias',
        wrongAnswer3: 'define',
        tags: ['typescript', 'javascript'],
        flagged: false,
      },
      {
        questionText: 'What is the purpose of the "async" keyword in JavaScript?',
        correctAnswer: 'To declare a function that returns a Promise',
        wrongAnswer1: 'To make synchronous code run faster',
        wrongAnswer2: 'To pause execution indefinitely',
        wrongAnswer3: 'To create a new thread',
        tags: ['javascript', 'async'],
        flagged: false,
      },
      {
        questionText: 'Which SQL command is used to retrieve data from a database?',
        correctAnswer: 'SELECT',
        wrongAnswer1: 'GET',
        wrongAnswer2: 'FETCH',
        wrongAnswer3: 'RETRIEVE',
        tags: ['sql', 'database'],
        flagged: false,
      },
      {
        questionText: 'What is a "closure" in JavaScript?',
        correctAnswer: 'A function that has access to variables from its outer scope',
        wrongAnswer1: 'A way to close a browser window',
        wrongAnswer2: 'A method to end a loop',
        wrongAnswer3: 'A type of error handling',
        tags: ['javascript', 'fundamentals'],
        flagged: false,
      },
      {
        questionText: 'What does REST stand for in API design?',
        correctAnswer: 'Representational State Transfer',
        wrongAnswer1: 'Remote Execution State Transfer',
        wrongAnswer2: 'Request-Response State Transfer',
        wrongAnswer3: 'Rapid Execution Service Technology',
        tags: ['api', 'web'],
        flagged: false,
      },
    ]

    sampleQuestions.forEach((q) => {
      const id = generateUUID()
      this.questions.set(id, {
        ...q,
        id,
        createdAt: new Date(),
      })
    })
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach((listener) => listener())
  }

  // Player methods
  createPlayer(alias: string): Player {
    const id = generateUUID()
    const player: Player = {
      id,
      alias,
      totalQuestionsAnswered: 0,
      totalCorrectAnswers: 0,
      createdAt: new Date(),
    }
    this.players.set(id, player)
    this.notify()
    return player
  }

  getPlayerByAlias(alias: string): Player | undefined {
    return Array.from(this.players.values()).find(
      (p) => p.alias.toLowerCase() === alias.toLowerCase()
    )
  }

  getPlayerById(id: string): Player | undefined {
    return this.players.get(id)
  }

  isAliasAvailable(alias: string): boolean {
    return !this.getPlayerByAlias(alias)
  }

  updatePlayerStats(playerId: string, correct: boolean) {
    const player = this.players.get(playerId)
    if (player) {
      player.totalQuestionsAnswered++
      if (correct) {
        player.totalCorrectAnswers++
      }
      this.notify()
    }
  }

  // Question methods
  addQuestion(question: Omit<Question, 'id' | 'createdAt' | 'flagged'>): Question {
    const id = generateUUID()
    const newQuestion: Question = {
      ...question,
      id,
      flagged: false,
      createdAt: new Date(),
    }
    this.questions.set(id, newQuestion)
    this.notify()
    return newQuestion
  }

  getQuestions(): Question[] {
    return Array.from(this.questions.values())
  }

  getQuestionById(id: string): Question | undefined {
    return this.questions.get(id)
  }

  getRandomQuestions(count: number, tags?: string[]): Question[] {
    let availableQuestions = Array.from(this.questions.values())
    
    if (tags && tags.length > 0) {
      availableQuestions = availableQuestions.filter((q) =>
        q.tags.some((t) => tags.includes(t))
      )
    }

    const shuffled = availableQuestions.sort(() => Math.random() - 0.5)
    return shuffled.slice(0, Math.min(count, shuffled.length))
  }

  getAllTags(): string[] {
    const tags = new Set<string>()
    this.questions.forEach((q) => q.tags.forEach((t) => tags.add(t)))
    return Array.from(tags).sort()
  }

  flagQuestion(questionId: string, reason?: string) {
    const question = this.questions.get(questionId)
    if (question) {
      question.flagged = true
      question.flagReason = reason
      this.notify()
    }
  }

  // Session methods
  createSession(hostPlayerId: string): QuizSession {
    const id = generateUUID()
    const lobbyCode = this.generateLobbyCode()
    const session: QuizSession = {
      id,
      lobbyCode,
      hostPlayerId,
      status: 'waiting',
      currentQuestionIndex: 0,
      questionIds: [],
      createdAt: new Date(),
    }
    this.sessions.set(id, session)
    this.notify()
    return session
  }

  private generateLobbyCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code
  }

  getSessionByCode(code: string): QuizSession | undefined {
    return Array.from(this.sessions.values()).find(
      (s) => s.lobbyCode === code.toUpperCase()
    )
  }

  getSessionById(id: string): QuizSession | undefined {
    return this.sessions.get(id)
  }

  startSession(sessionId: string, questionIds: string[]) {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.status = 'in_progress'
      session.questionIds = questionIds
      session.startedAt = new Date()
      session.currentQuestionIndex = 0
      this.notify()
    }
  }

  nextQuestion(sessionId: string) {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.currentQuestionIndex++
      if (session.currentQuestionIndex >= session.questionIds.length) {
        session.status = 'completed'
        session.endedAt = new Date()
      }
      this.notify()
    }
  }

  // Participant methods
  joinSession(sessionId: string, playerId: string, playerAlias: string): QuizParticipant {
    const id = generateUUID()
    const participant: QuizParticipant = {
      id,
      quizSessionId: sessionId,
      playerId,
      playerAlias,
      joinedAt: new Date(),
    }
    this.participants.set(id, participant)
    this.notify()
    return participant
  }

  getParticipants(sessionId: string): QuizParticipant[] {
    return Array.from(this.participants.values()).filter(
      (p) => p.quizSessionId === sessionId
    )
  }

  isPlayerInSession(sessionId: string, playerId: string): boolean {
    return Array.from(this.participants.values()).some(
      (p) => p.quizSessionId === sessionId && p.playerId === playerId
    )
  }

  // Answer methods
  submitAnswer(
    sessionId: string,
    questionId: string,
    playerId: string,
    selectedAnswer: string,
    correctAnswer: string
  ): Answer {
    const id = generateUUID()
    const isCorrect = selectedAnswer === correctAnswer
    const answer: Answer = {
      id,
      quizSessionId: sessionId,
      questionId,
      playerId,
      selectedAnswer,
      isCorrect,
      answeredAt: new Date(),
    }
    this.answers.set(id, answer)
    this.updatePlayerStats(playerId, isCorrect)
    this.notify()
    return answer
  }

  getAnswersForQuestion(sessionId: string, questionId: string): Answer[] {
    return Array.from(this.answers.values()).filter(
      (a) => a.quizSessionId === sessionId && a.questionId === questionId
    )
  }

  getPlayerAnswer(sessionId: string, questionId: string, playerId: string): Answer | undefined {
    return Array.from(this.answers.values()).find(
      (a) =>
        a.quizSessionId === sessionId &&
        a.questionId === questionId &&
        a.playerId === playerId
    )
  }

  // Scoreboard
  getScoreboard() {
    const players = Array.from(this.players.values())
      .filter((p) => p.totalQuestionsAnswered >= 1)
      .map((p) => ({
        alias: p.alias,
        totalQuestionsAnswered: p.totalQuestionsAnswered,
        totalCorrectAnswers: p.totalCorrectAnswers,
        accuracy:
          p.totalQuestionsAnswered > 0
            ? (p.totalCorrectAnswers / p.totalQuestionsAnswered) * 100
            : 0,
      }))
      .sort((a, b) => b.accuracy - a.accuracy || b.totalCorrectAnswers - a.totalCorrectAnswers)
      .map((p, i) => ({ ...p, rank: i + 1 }))

    return players
  }

  getSessionScoreboard(sessionId: string) {
    const sessionAnswers = Array.from(this.answers.values()).filter(
      (a) => a.quizSessionId === sessionId
    )
    
    const playerStats = new Map<string, { correct: number; total: number; alias: string }>()
    
    sessionAnswers.forEach((answer) => {
      const player = this.players.get(answer.playerId)
      if (!player) return
      
      const stats = playerStats.get(answer.playerId) || { correct: 0, total: 0, alias: player.alias }
      stats.total++
      if (answer.isCorrect) stats.correct++
      playerStats.set(answer.playerId, stats)
    })

    return Array.from(playerStats.entries())
      .map(([, stats]) => ({
        alias: stats.alias,
        totalQuestionsAnswered: stats.total,
        totalCorrectAnswers: stats.correct,
        accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
      }))
      .sort((a, b) => b.totalCorrectAnswers - a.totalCorrectAnswers || b.accuracy - a.accuracy)
      .map((p, i) => ({ ...p, rank: i + 1 }))
  }
}

// Singleton instance
export const store = new QuizStore()
