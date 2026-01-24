'use client'

import type { Player, Question, QuizSession, QuizParticipant, Answer, ScoreboardEntry } from './types'
import { generateUUID } from './utils'
import * as playerActions from '@/actions/players'
import * as questionActions from '@/actions/questions'
import * as quizActions from '@/actions/quiz'
import { createClient } from './supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Client-side cache with server action integration
// Maintains subscription pattern for reactivity while using Supabase backend

class QuizStore {
  // Client-side cache
  private players: Map<string, Player> = new Map()
  private questions: Map<string, Question> = new Map()
  private sessions: Map<string, QuizSession> = new Map()
  private participants: Map<string, QuizParticipant> = new Map()
  private answers: Map<string, Answer> = new Map()
  private listeners: Set<() => void> = new Set()
  
  // Demo mode support
  private demoSessionId: string | null = null
  private isDemoMode: boolean = false

  // Realtime subscriptions
  private supabase = createClient()
  private activeChannels: Map<string, RealtimeChannel> = new Map()

  constructor() {
    // Questions will be loaded on-demand when needed
    // Don't load here to avoid calling server actions during module initialization
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach((listener) => listener())
  }

  // ============ Player Methods ============

  async createPlayer(alias: string): Promise<Player> {
    const player = await playerActions.registerPlayer(alias)
    this.players.set(player.id, player)
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

  async isAliasAvailable(alias: string): Promise<boolean> {
    // Check cache first
    if (this.getPlayerByAlias(alias)) {
      return false
    }
    // Check server
    return await playerActions.checkAliasAvailable(alias)
  }

  async refreshPlayer(playerId: string): Promise<void> {
    const player = await playerActions.getPlayerById(playerId)
    if (player) {
      this.players.set(player.id, player)
      this.notify()
    }
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
    // Also update on server (fire and forget)
    playerActions.updatePlayerStats(playerId, correct).catch(console.error)
  }

  // ============ Question Methods ============

  async addQuestion(question: Omit<Question, 'id' | 'createdAt' | 'flagged'>): Promise<Question> {
    const newQuestion = await questionActions.submitQuestion({
      questionText: question.questionText,
      correctAnswer: question.correctAnswer,
      wrongAnswer1: question.wrongAnswer1,
      wrongAnswer2: question.wrongAnswer2,
      wrongAnswer3: question.wrongAnswer3,
      tags: question.tags,
    })
    this.questions.set(newQuestion.id, newQuestion)
    this.notify()
    return newQuestion
  }

  getQuestions(): Question[] {
    return Array.from(this.questions.values())
  }

  getQuestionById(id: string): Question | undefined {
    return this.questions.get(id)
  }

  async refreshQuestion(questionId: string): Promise<void> {
    const question = await questionActions.getQuestionById(questionId)
    if (question) {
      this.questions.set(question.id, question)
      this.notify()
    }
  }

  async refreshQuestions(): Promise<void> {
    // Load questions from server (for now, we'll load them on demand)
    // In a real app, you might want pagination or filtering
    try {
      // Get a reasonable number of questions
      const questions = await questionActions.getRandomQuestions(100)
      questions.forEach((q) => {
        this.questions.set(q.id, q)
      })
      this.notify()
    } catch (error) {
      console.error('Failed to refresh questions:', error)
    }
  }

  async getRandomQuestions(count: number, tags?: string[]): Promise<Question[]> {
    const questions = await questionActions.getRandomQuestions(count, tags)
    // Cache the questions
    questions.forEach((q) => {
      this.questions.set(q.id, q)
    })
    return questions
  }

  async getAllTags(): Promise<string[]> {
    return await questionActions.getAllTags()
  }

  async flagQuestion(questionId: string, reason?: string): Promise<void> {
    await questionActions.flagQuestion(questionId, reason)
    const question = this.questions.get(questionId)
    if (question) {
      question.flagged = true
      question.flagReason = reason
      this.notify()
    } else {
      // Refresh from server if not in cache
      await this.refreshQuestion(questionId)
    }
  }

  // ============ Session Methods ============

  async createSession(hostPlayerId: string): Promise<QuizSession> {
    const session = await quizActions.createQuizSession(hostPlayerId)
    this.sessions.set(session.id, session)
    this.notify()
    return session
  }

  getSessionByCode(code: string): QuizSession | undefined {
    return Array.from(this.sessions.values()).find(
      (s) => s.lobbyCode === code.toUpperCase()
    )
  }

  async refreshSessionByCode(code: string): Promise<QuizSession | null> {
    const session = await quizActions.getSessionByCode(code)
    if (session) {
      this.sessions.set(session.id, session)
      this.notify()
    }
    return session
  }

  getSessionById(id: string): QuizSession | undefined {
    return this.sessions.get(id)
  }

  async refreshSession(id: string): Promise<QuizSession | null> {
    const session = await quizActions.getSessionById(id)
    if (session) {
      this.sessions.set(session.id, session)
      this.notify()
    }
    return session
  }

  async startSession(sessionId: string, questionIds: string[]): Promise<void> {
    await quizActions.startQuiz(sessionId, questionIds)
    const session = this.sessions.get(sessionId)
    if (session) {
      session.status = 'in_progress'
      session.questionIds = questionIds
      session.startedAt = new Date()
      session.currentQuestionIndex = 0
      this.notify()
    } else {
      await this.refreshSession(sessionId)
    }
  }

  async nextQuestion(sessionId: string): Promise<void> {
    await quizActions.nextQuestion(sessionId)
    const session = this.sessions.get(sessionId)
    if (session) {
      session.currentQuestionIndex++
      if (session.currentQuestionIndex >= session.questionIds.length) {
        session.status = 'completed'
        session.endedAt = new Date()
      }
      this.notify()
    } else {
      await this.refreshSession(sessionId)
    }
  }

  // ============ Participant Methods ============

  async joinSession(sessionId: string, playerId: string, playerAlias: string): Promise<QuizParticipant> {
    const participant = await quizActions.joinQuizSession(sessionId, playerId)
    this.participants.set(participant.id, participant)
    this.notify()
    return participant
  }

  getParticipants(sessionId: string): QuizParticipant[] {
    return Array.from(this.participants.values()).filter(
      (p) => p.quizSessionId === sessionId
    )
  }

  async refreshParticipants(sessionId: string): Promise<void> {
    const participants = await quizActions.getParticipants(sessionId)
    participants.forEach((p) => {
      this.participants.set(p.id, p)
    })
    this.notify()
  }

  isPlayerInSession(sessionId: string, playerId: string): boolean {
    return Array.from(this.participants.values()).some(
      (p) => p.quizSessionId === sessionId && p.playerId === playerId
    )
  }

  // ============ Answer Methods ============

  async submitAnswer(
    sessionId: string,
    questionId: string,
    playerId: string,
    selectedAnswer: string,
    correctAnswer: string
  ): Promise<Answer> {
    const answer = await quizActions.submitAnswer(
      sessionId,
      questionId,
      playerId,
      selectedAnswer,
      correctAnswer
    )
    this.answers.set(answer.id, answer)
    this.updatePlayerStats(playerId, answer.isCorrect)
    this.notify()
    return answer
  }

  getAnswersForQuestion(sessionId: string, questionId: string): Answer[] {
    return Array.from(this.answers.values()).filter(
      (a) => a.quizSessionId === sessionId && a.questionId === questionId
    )
  }

  async refreshAnswersForQuestion(sessionId: string, questionId: string): Promise<void> {
    const answers = await quizActions.getAnswersForQuestion(sessionId, questionId)
    answers.forEach((a) => {
      this.answers.set(a.id, a)
    })
    this.notify()
  }

  getPlayerAnswer(sessionId: string, questionId: string, playerId: string): Answer | undefined {
    return Array.from(this.answers.values()).find(
      (a) =>
        a.quizSessionId === sessionId &&
        a.questionId === questionId &&
        a.playerId === playerId
    )
  }

  async refreshPlayerAnswer(sessionId: string, questionId: string, playerId: string): Promise<Answer | null> {
    const answer = await quizActions.getPlayerAnswer(sessionId, questionId, playerId)
    if (answer) {
      this.answers.set(answer.id, answer)
      this.notify()
    }
    return answer
  }

  // ============ Scoreboard Methods ============

  async getScoreboard(): Promise<ScoreboardEntry[]> {
    return await quizActions.getScoreboard()
  }

  async getSessionScoreboard(sessionId: string): Promise<ScoreboardEntry[]> {
    return await quizActions.getSessionScoreboard(sessionId)
  }

  // ============ Demo Mode Methods ============

  seedDemoData(): { playerId: string; playerAlias: string; sessionCode: string } {
    this.isDemoMode = true
    
    // Create demo players with stats (in-memory only for demo)
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
    if (!this.isDemoMode) return
    
    this.players.clear()
    this.sessions.clear()
    this.participants.clear()
    this.answers.clear()
    this.demoSessionId = null
    this.isDemoMode = false
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('quiz_player_id')
      localStorage.removeItem('quiz_alias')
    }
    
    // Questions will be loaded on-demand when needed
    this.notify()
  }

  private seedQuestions() {
    // This is now handled by refreshQuestions() which loads from server
    // Keeping for backward compatibility but it's a no-op
  }

  // ============ Realtime Subscription Methods ============

  /**
   * Subscribe to realtime updates for a quiz session
   * This will listen for changes to:
   * - quiz_sessions (status, current_question_index)
   * - quiz_participants (new joins)
   * - answers (new submissions)
   */
  subscribeToSession(sessionId: string): () => void {
    // Don't subscribe if already subscribed
    if (this.activeChannels.has(sessionId)) {
      return () => this.unsubscribeFromSession(sessionId)
    }

    const channel = this.supabase
      .channel(`quiz-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_sessions',
        },
        async (payload) => {
          // Filter in callback since subscription filters require specific RLS setup
          const data = payload.new as any
          if (!data || data.id !== sessionId) return
          
          if (payload.eventType === 'UPDATE') {
            const sessionData = data
            const session: QuizSession = {
              id: sessionData.id,
              lobbyCode: sessionData.lobby_code,
              hostPlayerId: sessionData.host_player_id || '',
              status: sessionData.status,
              currentQuestionIndex: sessionData.current_question_index,
              questionIds: sessionData.question_ids || [],
              createdAt: new Date(sessionData.created_at),
              startedAt: sessionData.started_at ? new Date(sessionData.started_at) : undefined,
              endedAt: sessionData.ended_at ? new Date(sessionData.ended_at) : undefined,
            }
            this.sessions.set(session.id, session)
            this.notify()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_participants',
        },
        async (payload) => {
          // Filter in callback since subscription filters require specific RLS setup
          const data = payload.new as any
          if (!data || data.quiz_session_id !== sessionId) return
          
          if (payload.eventType === 'INSERT') {
            const participantData = data
            const player = await playerActions.getPlayerById(participantData.player_id)
            const participant: QuizParticipant = {
              id: participantData.id,
              quizSessionId: participantData.quiz_session_id,
              playerId: participantData.player_id,
              playerAlias: player?.alias || 'Unknown',
              joinedAt: new Date(participantData.joined_at),
            }
            this.participants.set(participant.id, participant)
            this.notify()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'answers',
        },
        async (payload) => {
          // Filter in callback since subscription filters require specific RLS setup
          const data = payload.new as any
          if (!data || data.quiz_session_id !== sessionId) return
          
          if (payload.eventType === 'INSERT') {
            const answerData = data
            const answer: Answer = {
              id: answerData.id,
              quizSessionId: answerData.quiz_session_id,
              questionId: answerData.question_id,
              playerId: answerData.player_id,
              selectedAnswer: answerData.selected_answer,
              isCorrect: answerData.is_correct,
              answeredAt: new Date(answerData.answered_at),
            }
            this.answers.set(answer.id, answer)
            this.notify()
          }
        }
      )
      .subscribe()

    this.activeChannels.set(sessionId, channel)

    // Return cleanup function
    return () => this.unsubscribeFromSession(sessionId)
  }

  /**
   * Unsubscribe from realtime updates for a quiz session
   */
  unsubscribeFromSession(sessionId: string): void {
    const channel = this.activeChannels.get(sessionId)
    if (channel) {
      this.supabase.removeChannel(channel)
      this.activeChannels.delete(sessionId)
    }
  }

  /**
   * Unsubscribe from all active realtime channels
   */
  unsubscribeAll(): void {
    this.activeChannels.forEach((channel, sessionId) => {
      this.supabase.removeChannel(channel)
    })
    this.activeChannels.clear()
  }
}

// Singleton instance
export const store = new QuizStore()
