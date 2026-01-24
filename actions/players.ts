'use server'

import { createClient } from '@/lib/supabase/server'
import type { Player } from '@/lib/types'

/**
 * Check if an alias is available
 */
export async function checkAliasAvailable(alias: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('players')
    .select('id')
    .eq('alias', alias)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "not found" which means alias is available
    console.error('Error checking alias:', error)
    return false
  }

  return !data
}

/**
 * Register a new player with an alias
 */
export async function registerPlayer(alias: string): Promise<Player> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('players')
    .insert({
      alias,
      total_questions_answered: 0,
      total_correct_answers: 0,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to register player: ${error?.message || 'Unknown error'}`)
  }

  return {
    id: data.id,
    alias: data.alias,
    totalQuestionsAnswered: data.total_questions_answered,
    totalCorrectAnswers: data.total_correct_answers,
    createdAt: new Date(data.created_at),
  }
}

/**
 * Get player by alias
 */
export async function getPlayerByAlias(alias: string): Promise<Player | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('alias', alias)
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    alias: data.alias,
    totalQuestionsAnswered: data.total_questions_answered,
    totalCorrectAnswers: data.total_correct_answers,
    createdAt: new Date(data.created_at),
  }
}

/**
 * Get player by ID
 */
export async function getPlayerById(id: string): Promise<Player | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    alias: data.alias,
    totalQuestionsAnswered: data.total_questions_answered,
    totalCorrectAnswers: data.total_correct_answers,
    createdAt: new Date(data.created_at),
  }
}

/**
 * Update player stats after answering a question
 */
export async function updatePlayerStats(
  playerId: string,
  isCorrect: boolean
): Promise<void> {
  const supabase = await createClient()

  // First get current stats
  const { data: player, error: fetchError } = await supabase
    .from('players')
    .select('total_questions_answered, total_correct_answers')
    .eq('id', playerId)
    .single()

  if (fetchError || !player) {
    throw new Error('Player not found')
  }

  const { error } = await supabase
    .from('players')
    .update({
      total_questions_answered: (player.total_questions_answered || 0) + 1,
      total_correct_answers: isCorrect
        ? (player.total_correct_answers || 0) + 1
        : (player.total_correct_answers || 0),
      updated_at: new Date().toISOString(),
    })
    .eq('id', playerId)

  if (error) {
    throw new Error(`Failed to update player stats: ${error.message}`)
  }
}
