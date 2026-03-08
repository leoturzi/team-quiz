'use server'

import { createClient } from '@/lib/supabase/server'
import type { Question, QuestionType, QuestionStructure } from '@/lib/types'

function mapRowToQuestion(q: any): Question {
  return {
    id: q.id,
    questionText: q.question_text,
    questionType: q.question_type || 'multiple_choice',
    questionStructure: q.question_structure,
    tags: q.tags || [],
    flagged: q.flagged || false,
    flagReason: q.flag_reason || undefined,
    createdAt: new Date(q.created_at),
  }
}

/**
 * Submit a new question (supports all question types)
 */
export async function submitQuestion(data: {
  questionText: string
  questionType?: QuestionType
  questionStructure: QuestionStructure
  tags?: string[]
}): Promise<Question> {
  const supabase = await createClient()

  const { data: question, error } = await supabase
    .from('questions')
    .insert({
      question_text: data.questionText,
      question_type: data.questionType || 'multiple_choice',
      question_structure: data.questionStructure,
      tags: data.tags || [],
      flagged: false,
    })
    .select()
    .single()

  if (error || !question) {
    throw new Error(`Failed to submit question: ${error?.message || 'Unknown error'}`)
  }

  return mapRowToQuestion(question)
}

/**
 * Get all available tags from questions
 */
export async function getAllTags(): Promise<string[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('questions')
    .select('tags')

  if (error) {
    console.error('Error fetching tags:', error)
    return []
  }

  const tagsSet = new Set<string>()
  data?.forEach((q) => {
    if (q.tags && Array.isArray(q.tags)) {
      q.tags.forEach((tag: string) => tagsSet.add(tag))
    }
  })

  return Array.from(tagsSet).sort()
}

/**
 * Get random questions (with optional tag filter)
 */
export async function getRandomQuestions(
  count: number,
  tags?: string[]
): Promise<Question[]> {
  const supabase = await createClient()

  let query = supabase.from('questions').select('*').eq('flagged', false)

  if (tags && tags.length > 0) {
    query = query.contains('tags', tags)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching questions:', error)
    return []
  }

  const shuffled = [...(data || [])].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, Math.min(count, shuffled.length))

  return selected.map(mapRowToQuestion)
}

/**
 * Get question by ID
 */
export async function getQuestionById(id: string): Promise<Question | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  return mapRowToQuestion(data)
}

/**
 * Flag a question for review
 */
export async function flagQuestion(
  questionId: string,
  reason?: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('questions')
    .update({
      flagged: true,
      flag_reason: reason || null,
    })
    .eq('id', questionId)

  if (error) {
    throw new Error(`Failed to flag question: ${error.message}`)
  }
}

/**
 * Get the total count of available (non-flagged) questions
 */
export async function getQuestionCount(): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('flagged', false)

  if (error) {
    console.error('Error fetching question count:', error)
    return 0
  }

  return count || 0
}
