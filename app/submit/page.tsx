'use client'

import React from "react"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { store } from '@/lib/store'
import type { QuestionType, QuestionStructure } from '@/lib/types'
import { ArrowLeft, PlusCircle, Check, X, Tag, Plus, Trash2, GripVertical } from 'lucide-react'

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  true_false: 'True / False',
  multiple_answer: 'Multiple Answer (Checkboxes)',
  sequence: 'Sequence / Puzzle',
}

export default function SubmitPage() {
  const router = useRouter()
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [questionType, setQuestionType] = useState<QuestionType>('multiple_choice')
  const [questionText, setQuestionText] = useState('')
  const [tags, setTags] = useState('')

  // Multiple choice / true_false state
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [wrongAnswer1, setWrongAnswer1] = useState('')
  const [wrongAnswer2, setWrongAnswer2] = useState('')
  const [wrongAnswer3, setWrongAnswer3] = useState('')

  // Multiple answer state (dynamic options with isCorrect toggle)
  const [multiOptions, setMultiOptions] = useState<{ text: string; isCorrect: boolean }[]>([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ])

  // Sequence state (ordered items)
  const [sequenceItems, setSequenceItems] = useState<string[]>(['', '', '', ''])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [existingTags, setExistingTags] = useState<string[]>([])

  useEffect(() => {
    const loadData = async () => {
      const storedPlayerId = localStorage.getItem('quiz_player_id')
      if (!storedPlayerId) {
        router.push('/register?redirect=submit')
        return
      }
      setPlayerId(storedPlayerId)
      const fetchedTags = await store.getAllTags()
      setExistingTags(fetchedTags)
    }

    loadData()
  }, [router])

  const buildQuestionStructure = (): QuestionStructure => {
    switch (questionType) {
      case 'multiple_choice':
        return {
          options: [
            { text: correctAnswer, isCorrect: true },
            { text: wrongAnswer1, isCorrect: false },
            { text: wrongAnswer2, isCorrect: false },
            { text: wrongAnswer3, isCorrect: false },
          ],
        }
      case 'true_false':
        return {
          options: [
            { text: correctAnswer, isCorrect: true },
            { text: wrongAnswer1, isCorrect: false },
          ],
        }
      case 'multiple_answer':
        return {
          options: multiOptions.filter((o) => o.text.trim()),
        }
      case 'sequence':
        return {
          items: sequenceItems
            .filter((t) => t.trim())
            .map((text, idx) => ({ text, correctPosition: idx + 1 })),
        }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerId) return

    setIsSubmitting(true)

    try {
      const parsedTags = tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0)

      const structure = buildQuestionStructure()

      await store.addQuestion({
        questionText,
        questionType,
        questionStructure: structure,
        correctAnswer: questionType === 'sequence' ? '' : correctAnswer,
        wrongAnswer1: questionType === 'true_false' || questionType === 'sequence' ? '' : wrongAnswer1,
        wrongAnswer2: questionType === 'true_false' || questionType === 'sequence' ? '' : wrongAnswer2,
        wrongAnswer3: questionType === 'true_false' || questionType === 'sequence' ? '' : wrongAnswer3,
        tags: parsedTags,
      })

      setSubmitted(true)
    } catch {
      console.error('Failed to submit question')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = async () => {
    setQuestionType('multiple_choice')
    setQuestionText('')
    setCorrectAnswer('')
    setWrongAnswer1('')
    setWrongAnswer2('')
    setWrongAnswer3('')
    setMultiOptions([
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ])
    setSequenceItems(['', '', '', ''])
    setTags('')
    setSubmitted(false)
    const fetchedTags = await store.getAllTags()
    setExistingTags(fetchedTags)
  }

  const addTag = (tag: string) => {
    const currentTags = tags.split(',').map((t) => t.trim()).filter(Boolean)
    if (!currentTags.includes(tag)) {
      setTags(currentTags.length > 0 ? `${tags}, ${tag}` : tag)
    }
  }

  const isFormValid = (): boolean => {
    if (!questionText.trim()) return false
    switch (questionType) {
      case 'multiple_choice':
        return !!(correctAnswer.trim() && wrongAnswer1.trim() && wrongAnswer2.trim() && wrongAnswer3.trim())
      case 'true_false':
        return !!(correctAnswer.trim() && wrongAnswer1.trim())
      case 'multiple_answer': {
        const filled = multiOptions.filter((o) => o.text.trim())
        const hasCorrect = filled.some((o) => o.isCorrect)
        return filled.length >= 2 && hasCorrect
      }
      case 'sequence':
        return sequenceItems.filter((t) => t.trim()).length >= 2
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 text-center">
          <CardContent className="pt-12 pb-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-6">
              <Check className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Question Submitted!</h2>
            <p className="text-muted-foreground mb-8">
              Your question has been added to the pool and will appear in future quizzes.
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={handleReset}>
                <PlusCircle className="w-4 h-4" />
                Submit Another Question
              </Button>
              <Link href="/">
                <Button variant="outline" className="w-full bg-transparent">
                  Return Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-primary" />
              Submit a Question
            </CardTitle>
            <CardDescription>
              Add a question to the shared pool. Choose a question type and fill in the details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Question Type Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Question Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(QUESTION_TYPE_LABELS) as [QuestionType, string][]).map(([type, label]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setQuestionType(type)}
                      className={`p-3 text-sm rounded-lg border transition-all text-left ${
                        questionType === type
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-border/50 bg-card hover:border-primary/50 text-foreground'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Question <span className="text-destructive">*</span>
                </label>
                <Textarea
                  placeholder="What programming concept or topic would you like to ask about?"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="min-h-[100px] resize-none"
                  required
                />
              </div>

              {/* Type-specific answer fields */}
              {(questionType === 'multiple_choice' || questionType === 'true_false') && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Check className="w-4 h-4 text-success" />
                      Correct Answer <span className="text-destructive">*</span>
                    </label>
                    <Input
                      placeholder={questionType === 'true_false' ? 'e.g. True' : 'The correct answer'}
                      value={correctAnswer}
                      onChange={(e) => setCorrectAnswer(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <X className="w-4 h-4 text-destructive" />
                      Wrong Answer{questionType === 'multiple_choice' ? 's' : ''} <span className="text-destructive">*</span>
                    </label>
                    <div className="space-y-3">
                      <Input
                        placeholder={questionType === 'true_false' ? 'e.g. False' : 'Wrong answer 1'}
                        value={wrongAnswer1}
                        onChange={(e) => setWrongAnswer1(e.target.value)}
                        required
                      />
                      {questionType === 'multiple_choice' && (
                        <>
                          <Input
                            placeholder="Wrong answer 2"
                            value={wrongAnswer2}
                            onChange={(e) => setWrongAnswer2(e.target.value)}
                            required
                          />
                          <Input
                            placeholder="Wrong answer 3"
                            value={wrongAnswer3}
                            onChange={(e) => setWrongAnswer3(e.target.value)}
                            required
                          />
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}

              {questionType === 'multiple_answer' && (
                <div className="space-y-4">
                  <label className="text-sm font-medium text-foreground">
                    Options <span className="text-destructive">*</span>
                    <span className="text-muted-foreground font-normal ml-2">
                      (toggle checkmarks to mark correct answers)
                    </span>
                  </label>
                  <div className="space-y-3">
                    {multiOptions.map((option, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setMultiOptions((prev) =>
                              prev.map((o, i) => (i === idx ? { ...o, isCorrect: !o.isCorrect } : o))
                            )
                          }}
                          className={`shrink-0 w-8 h-8 rounded flex items-center justify-center border transition-colors ${
                            option.isCorrect
                              ? 'border-success bg-success/20 text-success'
                              : 'border-border/50 text-muted-foreground hover:border-primary/50'
                          }`}
                        >
                          {option.isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        </button>
                        <Input
                          placeholder={`Option ${idx + 1}`}
                          value={option.text}
                          onChange={(e) => {
                            setMultiOptions((prev) =>
                              prev.map((o, i) => (i === idx ? { ...o, text: e.target.value } : o))
                            )
                          }}
                          className="flex-1"
                        />
                        {multiOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setMultiOptions((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {multiOptions.length < 8 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setMultiOptions((prev) => [...prev, { text: '', isCorrect: false }])}
                        className="bg-transparent"
                      >
                        <Plus className="w-4 h-4" />
                        Add Option
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {questionType === 'sequence' && (
                <div className="space-y-4">
                  <label className="text-sm font-medium text-foreground">
                    Items in correct order <span className="text-destructive">*</span>
                    <span className="text-muted-foreground font-normal ml-2">
                      (enter items top-to-bottom in the correct sequence)
                    </span>
                  </label>
                  <div className="space-y-3">
                    {sequenceItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="shrink-0 w-8 h-8 rounded flex items-center justify-center border border-border/50 text-muted-foreground text-sm font-medium">
                          <GripVertical className="w-4 h-4" />
                        </span>
                        <span className="text-sm font-bold text-muted-foreground w-6">{idx + 1}.</span>
                        <Input
                          placeholder={`Item ${idx + 1}`}
                          value={item}
                          onChange={(e) => {
                            setSequenceItems((prev) =>
                              prev.map((v, i) => (i === idx ? e.target.value : v))
                            )
                          }}
                          className="flex-1"
                        />
                        {sequenceItems.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setSequenceItems((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {sequenceItems.length < 10 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSequenceItems((prev) => [...prev, ''])}
                        className="bg-transparent"
                      >
                        <Plus className="w-4 h-4" />
                        Add Item
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  Tags (optional)
                </label>
                <Input
                  placeholder="e.g., javascript, react, algorithms"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
                {existingTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {existingTags.slice(0, 10).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addTag(tag)}
                        className="px-2 py-1 text-xs rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting || !isFormValid()}>
                {isSubmitting ? 'Submitting...' : 'Submit Question'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
