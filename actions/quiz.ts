'use server'

import { createClient } from '@/lib/supabase/server'
import type {
  QuizSession,
  QuizParticipant,
  Answer,
  ScoreboardEntry,
  QuestionType,
  QuestionStructure,
  SelectedAnswerData,
} from '@/lib/types'

/**
 * Evaluate whether an answer is correct based on question type.
 * Centralised server-side so clients never need the answer key.
 */
function evaluateAnswer(
  questionType: QuestionType,
  questionStructure: QuestionStructure,
  answerData: SelectedAnswerData
): boolean {
  switch (questionType) {
    case 'multiple_choice':
    case 'true_false': {
      if (answerData.type !== 'single') return false
      const options = (questionStructure as { options: { text: string; isCorrect: boolean }[] }).options
      const correct = options.find((o) => o.isCorrect)
      return correct?.text === answerData.value
    }

    case 'multiple_answer': {
      if (answerData.type !== 'multiple') return false
      const options = (questionStructure as { options: { text: string; isCorrect: boolean }[] }).options
      const correctTexts = new Set(options.filter((o) => o.isCorrect).map((o) => o.text))
      const selectedSet = new Set(answerData.values)
      if (correctTexts.size !== selectedSet.size) return false
      for (const text of correctTexts) {
        if (!selectedSet.has(text)) return false
      }
      return true
    }

    case 'sequence': {
      if (answerData.type !== 'sequence') return false
      const items = (questionStructure as { items: { text: string; correctPosition: number }[] }).items
      const correctOrder = [...items]
        .sort((a, b) => a.correctPosition - b.correctPosition)
        .map((i) => i.text)
      if (answerData.order.length !== correctOrder.length) return false
      return answerData.order.every((text, idx) => text === correctOrder[idx])
    }

    default:
      return false
  }
}

function mapRowToAnswer(a: any): Answer {
  return {
    id: a.id,
    quizSessionId: a.quiz_session_id,
    questionId: a.question_id,
    playerId: a.player_id,
    selectedAnswer: a.selected_answer,
    selectedAnswerData: a.selected_answer_data || undefined,
    isCorrect: a.is_correct,
    answeredAt: new Date(a.answered_at),
  }
}

/**
 * Generate a unique lobby code
 */
function generateLobbyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/**
 * Create a new quiz session
 */
export async function createQuizSession(hostPlayerId: string): Promise<QuizSession> {
  const supabase = await createClient()

  let lobbyCode = generateLobbyCode()
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    const { data: existing } = await supabase
      .from('quiz_sessions')
      .select('id')
      .eq('lobby_code', lobbyCode)
      .single()

    if (!existing) {
      break
    }

    lobbyCode = generateLobbyCode()
    attempts++
  }

  if (attempts >= maxAttempts) {
    throw new Error('Failed to generate unique lobby code')
  }

  const { data, error } = await supabase
    .from('quiz_sessions')
    .insert({
      lobby_code: lobbyCode,
      host_player_id: hostPlayerId,
      status: 'waiting' as const,
      current_question_index: 0,
      question_ids: [] as string[],
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to create quiz session: ${error?.message || 'Unknown error'}`)
  }

  return {
    id: data.id,
    lobbyCode: data.lobby_code,
    hostPlayerId: data.host_player_id || '',
    status: data.status,
    currentQuestionIndex: data.current_question_index,
    questionIds: data.question_ids || [],
    createdAt: new Date(data.created_at),
    startedAt: data.started_at ? new Date(data.started_at) : undefined,
    endedAt: data.ended_at ? new Date(data.ended_at) : undefined,
  }
}

/**
 * Get quiz session by lobby code
 */
export async function getSessionByCode(code: string): Promise<QuizSession | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('quiz_sessions')
    .select('*')
    .eq('lobby_code', code.toUpperCase())
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    lobbyCode: data.lobby_code,
    hostPlayerId: data.host_player_id || '',
    status: data.status,
    currentQuestionIndex: data.current_question_index,
    questionIds: data.question_ids || [],
    createdAt: new Date(data.created_at),
    startedAt: data.started_at ? new Date(data.started_at) : undefined,
    endedAt: data.ended_at ? new Date(data.ended_at) : undefined,
  }
}

/**
 * Get quiz session by ID
 */
export async function getSessionById(id: string): Promise<QuizSession | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('quiz_sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    lobbyCode: data.lobby_code,
    hostPlayerId: data.host_player_id || '',
    status: data.status,
    currentQuestionIndex: data.current_question_index,
    questionIds: data.question_ids || [],
    createdAt: new Date(data.created_at),
    startedAt: data.started_at ? new Date(data.started_at) : undefined,
    endedAt: data.ended_at ? new Date(data.ended_at) : undefined,
  }
}

/**
 * Join a quiz session
 */
export async function joinQuizSession(
  sessionId: string,
  playerId: string
): Promise<QuizParticipant> {
  const supabase = await createClient()

  const { data: playerData, error: playerError } = await supabase
    .from('players')
    .select('alias')
    .eq('id', playerId)
    .single()

  if (playerError || !playerData) {
    throw new Error('Player not found. Please register again.')
  }

  const { data: existing } = await supabase
    .from('quiz_participants')
    .select('*')
    .eq('quiz_session_id', sessionId)
    .eq('player_id', playerId)
    .single()

  if (existing) {
    return {
      id: existing.id,
      quizSessionId: existing.quiz_session_id,
      playerId: existing.player_id,
      playerAlias: playerData.alias || '',
      joinedAt: new Date(existing.joined_at),
    }
  }

  const { data, error } = await supabase
    .from('quiz_participants')
    .insert({
      quiz_session_id: sessionId,
      player_id: playerId,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to join session: ${error.message}`)
  }

  const { data: player } = await supabase
    .from('players')
    .select('alias')
    .eq('id', playerId)
    .single()

  return {
    id: data.id,
    quizSessionId: data.quiz_session_id,
    playerId: data.player_id,
    playerAlias: player?.alias || '',
    joinedAt: new Date(data.joined_at),
  }
}

/**
 * Get all participants for a session
 */
export async function getParticipants(
  sessionId: string
): Promise<QuizParticipant[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('quiz_participants')
    .select(`
      *,
      players:player_id (
        alias
      )
    `)
    .eq('quiz_session_id', sessionId)

  if (error) {
    console.error('Error fetching participants:', error)
    return []
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    quizSessionId: p.quiz_session_id,
    playerId: p.player_id,
    playerAlias: p.players?.alias || '',
    joinedAt: new Date(p.joined_at),
  }))
}

/**
 * Start a quiz session
 */
export async function startQuiz(
  sessionId: string,
  questionIds: string[]
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('quiz_sessions')
    .update({
      status: 'in_progress' as const,
      question_ids: questionIds,
      current_question_index: 0,
      started_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (error) {
    throw new Error(`Failed to start quiz: ${error.message}`)
  }
}

/**
 * Advance to next question
 */
export async function nextQuestion(sessionId: string): Promise<void> {
  const supabase = await createClient()

  const { data: session, error: fetchError } = await supabase
    .from('quiz_sessions')
    .select('current_question_index, question_ids')
    .eq('id', sessionId)
    .single()

  if (fetchError || !session) {
    throw new Error('Session not found')
  }

  const nextIndex = (session.current_question_index || 0) + 1
  const questionIds = session.question_ids || []
  const isComplete = nextIndex >= questionIds.length

  const { error } = await supabase
    .from('quiz_sessions')
    .update({
      current_question_index: nextIndex,
      status: (isComplete ? 'completed' : 'in_progress') as 'completed' | 'in_progress',
      ended_at: isComplete ? new Date().toISOString() : null,
    })
    .eq('id', sessionId)

  if (error) {
    throw new Error(`Failed to advance question: ${error.message}`)
  }
}

/**
 * Submit an answer — correctness is evaluated server-side.
 *
 * For backward compatibility, `selectedAnswer` (string) still works for
 * multiple_choice and true_false. New question types should pass
 * `selectedAnswerData` with the structured payload.
 */
export async function submitAnswer(
  sessionId: string,
  questionId: string,
  playerId: string,
  selectedAnswer: string,
  _correctAnswer?: string,
  selectedAnswerData?: SelectedAnswerData
): Promise<Answer> {
  const supabase = await createClient()

  const { data: questionRow, error: qError } = await supabase
    .from('questions')
    .select('question_type, question_structure, correct_answer')
    .eq('id', questionId)
    .single()

  if (qError || !questionRow) {
    throw new Error(`Question not found: ${qError?.message || 'Unknown error'}`)
  }

  const questionType: QuestionType = questionRow.question_type || 'multiple_choice'
  const questionStructure: QuestionStructure = questionRow.question_structure || {
    options: [{ text: questionRow.correct_answer, isCorrect: true }],
  }

  const answerData: SelectedAnswerData = selectedAnswerData || {
    type: 'single',
    value: selectedAnswer,
  }

  const isCorrect = evaluateAnswer(questionType, questionStructure, answerData)

  const { data, error } = await supabase
    .from('answers')
    .insert({
      quiz_session_id: sessionId,
      question_id: questionId,
      player_id: playerId,
      selected_answer: selectedAnswer,
      selected_answer_data: answerData,
      is_correct: isCorrect,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to submit answer: ${error.message}`)
  }

  const { data: player } = await supabase
    .from('players')
    .select('total_questions_answered, total_correct_answers')
    .eq('id', playerId)
    .single()

  if (player) {
    await supabase
      .from('players')
      .update({
        total_questions_answered: (player.total_questions_answered || 0) + 1,
        total_correct_answers: isCorrect
          ? (player.total_correct_answers || 0) + 1
          : (player.total_correct_answers || 0),
        updated_at: new Date().toISOString(),
      })
      .eq('id', playerId)
  }

  if (!data) {
    throw new Error('Failed to create answer record')
  }

  return mapRowToAnswer(data)
}

/**
 * Get answers for a specific question in a session
 */
export async function getAnswersForQuestion(
  sessionId: string,
  questionId: string
): Promise<Answer[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('answers')
    .select('*')
    .eq('quiz_session_id', sessionId)
    .eq('question_id', questionId)

  if (error) {
    console.error('Error fetching answers:', error)
    return []
  }

  return (data || []).map(mapRowToAnswer)
}

/**
 * Get player's answer for a specific question
 */
export async function getPlayerAnswer(
  sessionId: string,
  questionId: string,
  playerId: string
): Promise<Answer | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('answers')
    .select('*')
    .eq('quiz_session_id', sessionId)
    .eq('question_id', questionId)
    .eq('player_id', playerId)
    .single()

  if (error || !data) {
    return null
  }

  return mapRowToAnswer(data)
}

/**
 * Get global scoreboard
 */
export async function getScoreboard(): Promise<ScoreboardEntry[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('players')
    .select('id, alias, total_questions_answered, total_correct_answers')
    .gte('total_questions_answered', 1)
    .order('total_correct_answers', { ascending: false })

  if (error) {
    console.error('Error fetching scoreboard:', error)
    return []
  }

  return (data || [])
    .map((p: any) => ({
      alias: p.alias,
      totalQuestionsAnswered: p.total_questions_answered || 0,
      totalCorrectAnswers: p.total_correct_answers || 0,
      accuracy:
        (p.total_questions_answered || 0) > 0
          ? ((p.total_correct_answers || 0) / (p.total_questions_answered || 0)) * 100
          : 0,
    }))
    .sort((a, b) => b.accuracy - a.accuracy || b.totalCorrectAnswers - a.totalCorrectAnswers)
    .map((p, i) => ({ ...p, rank: i + 1 }))
}

/**
 * Get session scoreboard
 */
export async function getSessionScoreboard(
  sessionId: string
): Promise<ScoreboardEntry[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('answers')
    .select(`
      player_id,
      is_correct,
      players:player_id (
        alias
      )
    `)
    .eq('quiz_session_id', sessionId)

  if (error) {
    console.error('Error fetching session scoreboard:', error)
    return []
  }

  const playerStats = new Map<
    string,
    { correct: number; total: number; alias: string }
  >()

  ;(data || []).forEach((answer: any) => {
    const playerId = answer.player_id
    const alias = answer.players?.alias || 'Unknown'
    const stats = playerStats.get(playerId) || {
      correct: 0,
      total: 0,
      alias,
    }
    stats.total++
    if (answer.is_correct) stats.correct++
    playerStats.set(playerId, stats)
  })

  return Array.from(playerStats.values())
    .map((stats) => ({
      alias: stats.alias,
      totalQuestionsAnswered: stats.total,
      totalCorrectAnswers: stats.correct,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
    }))
    .sort((a, b) => b.totalCorrectAnswers - a.totalCorrectAnswers || b.accuracy - a.accuracy)
    .map((p, i) => ({ ...p, rank: i + 1 }))
}

/**
 * Cancel a quiz session and rollback all player stats
 */
export async function cancelQuizSession(sessionId: string): Promise<void> {
  const supabase = await createClient()

  const { data: answers, error: answersError } = await supabase
    .from('answers')
    .select('player_id, is_correct')
    .eq('quiz_session_id', sessionId)

  if (answersError) {
    throw new Error(`Failed to fetch answers: ${answersError.message}`)
  }

  const playerRollbacks = new Map<string, { total: number; correct: number }>()
  
  answers?.forEach((answer) => {
    const current = playerRollbacks.get(answer.player_id) || { total: 0, correct: 0 }
    current.total++
    if (answer.is_correct) {
      current.correct++
    }
    playerRollbacks.set(answer.player_id, current)
  })

  for (const [playerId, rollback] of playerRollbacks.entries()) {
    const { data: player } = await supabase
      .from('players')
      .select('total_questions_answered, total_correct_answers')
      .eq('id', playerId)
      .single()

    if (player) {
      const { error: updateError } = await supabase
        .from('players')
        .update({
          total_questions_answered: Math.max(0, (player.total_questions_answered || 0) - rollback.total),
          total_correct_answers: Math.max(0, (player.total_correct_answers || 0) - rollback.correct),
          updated_at: new Date().toISOString(),
        })
        .eq('id', playerId)

      if (updateError) {
        console.error(`Failed to rollback stats for player ${playerId}:`, updateError)
      }
    }
  }

  const { error: deleteError } = await supabase
    .from('quiz_sessions')
    .delete()
    .eq('id', sessionId)

  if (deleteError) {
    throw new Error(`Failed to cancel session: ${deleteError.message}`)
  }
}
