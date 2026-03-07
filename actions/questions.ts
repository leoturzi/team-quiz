'use server'

import { createClient } from '@/lib/supabase/server'
import type { Question, QuestionType, QuestionStructure } from '@/lib/types'

function mapRowToQuestion(q: any): Question {
  const questionType: QuestionType = q.question_type || 'multiple_choice'

  let questionStructure: QuestionStructure = q.question_structure
  if (!questionStructure) {
    questionStructure = {
      options: [
        { text: q.correct_answer, isCorrect: true },
        { text: q.wrong_answer_1, isCorrect: false },
        { text: q.wrong_answer_2, isCorrect: false },
        { text: q.wrong_answer_3, isCorrect: false },
      ],
    }
  }

  return {
    id: q.id,
    questionText: q.question_text,
    questionType,
    questionStructure,
    correctAnswer: q.correct_answer ?? '',
    wrongAnswer1: q.wrong_answer_1 ?? '',
    wrongAnswer2: q.wrong_answer_2 ?? '',
    wrongAnswer3: q.wrong_answer_3 ?? '',
    tags: q.tags || [],
    flagged: q.flagged || false,
    flagReason: q.flag_reason || undefined,
    createdAt: new Date(q.created_at),
  }
}

/**
 * Build the flat legacy columns from the structured data so old columns
 * stay in sync during the transition period.
 */
function buildLegacyColumns(
  questionType: QuestionType,
  structure: QuestionStructure
): { correct_answer: string; wrong_answer_1: string; wrong_answer_2: string; wrong_answer_3: string } {
  if (questionType === 'sequence') {
    const items = (structure as { items: { text: string; correctPosition: number }[] }).items
    return {
      correct_answer: items.map((i) => i.text).join(' → '),
      wrong_answer_1: '',
      wrong_answer_2: '',
      wrong_answer_3: '',
    }
  }

  const options = (structure as { options: { text: string; isCorrect: boolean }[] }).options
  const correct = options.find((o) => o.isCorrect)?.text ?? ''
  const wrong = options.filter((o) => !o.isCorrect).map((o) => o.text)

  return {
    correct_answer: correct,
    wrong_answer_1: wrong[0] ?? '',
    wrong_answer_2: wrong[1] ?? '',
    wrong_answer_3: wrong[2] ?? '',
  }
}

/**
 * Submit a new question (supports all question types)
 */
export async function submitQuestion(data: {
  questionText: string
  questionType?: QuestionType
  questionStructure?: QuestionStructure
  correctAnswer?: string
  wrongAnswer1?: string
  wrongAnswer2?: string
  wrongAnswer3?: string
  tags?: string[]
}): Promise<Question> {
  const supabase = await createClient()

  const questionType: QuestionType = data.questionType || 'multiple_choice'

  let questionStructure: QuestionStructure
  if (data.questionStructure) {
    questionStructure = data.questionStructure
  } else {
    questionStructure = {
      options: [
        { text: data.correctAnswer || '', isCorrect: true },
        { text: data.wrongAnswer1 || '', isCorrect: false },
        { text: data.wrongAnswer2 || '', isCorrect: false },
        { text: data.wrongAnswer3 || '', isCorrect: false },
      ],
    }
  }

  const legacy = buildLegacyColumns(questionType, questionStructure)

  const { data: question, error } = await supabase
    .from('questions')
    .insert({
      question_text: data.questionText,
      question_type: questionType,
      question_structure: questionStructure,
      correct_answer: legacy.correct_answer,
      wrong_answer_1: legacy.wrong_answer_1,
      wrong_answer_2: legacy.wrong_answer_2,
      wrong_answer_3: legacy.wrong_answer_3,
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
