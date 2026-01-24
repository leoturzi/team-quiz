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
import { ArrowLeft, PlusCircle, Check, X, Tag } from 'lucide-react'

export default function SubmitPage() {
  const router = useRouter()
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    questionText: '',
    correctAnswer: '',
    wrongAnswer1: '',
    wrongAnswer2: '',
    wrongAnswer3: '',
    tags: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [existingTags, setExistingTags] = useState<string[]>([])

  useEffect(() => {
    const storedPlayerId = localStorage.getItem('quiz_player_id')
    if (!storedPlayerId) {
      router.push('/register?redirect=submit')
      return
    }
    setPlayerId(storedPlayerId)
    setExistingTags(store.getAllTags())
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerId) return

    setIsSubmitting(true)

    try {
      const tags = formData.tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0)

      store.addQuestion({
        questionText: formData.questionText,
        correctAnswer: formData.correctAnswer,
        wrongAnswer1: formData.wrongAnswer1,
        wrongAnswer2: formData.wrongAnswer2,
        wrongAnswer3: formData.wrongAnswer3,
        tags,
        submittedBy: playerId,
      })

      setSubmitted(true)
    } catch {
      console.error('Failed to submit question')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setFormData({
      questionText: '',
      correctAnswer: '',
      wrongAnswer1: '',
      wrongAnswer2: '',
      wrongAnswer3: '',
      tags: '',
    })
    setSubmitted(false)
    setExistingTags(store.getAllTags())
  }

  const addTag = (tag: string) => {
    const currentTags = formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
    if (!currentTags.includes(tag)) {
      setFormData((prev) => ({
        ...prev,
        tags: currentTags.length > 0 ? `${prev.tags}, ${tag}` : tag,
      }))
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
              Add a question to the shared pool. Include one correct answer and three wrong answers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Question Text */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Question <span className="text-destructive">*</span>
                </label>
                <Textarea
                  placeholder="What programming concept or topic would you like to ask about?"
                  value={formData.questionText}
                  onChange={(e) => setFormData((prev) => ({ ...prev, questionText: e.target.value }))}
                  className="min-h-[100px] resize-none"
                  required
                />
              </div>

              {/* Correct Answer */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Check className="w-4 h-4 text-success" />
                  Correct Answer <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="The correct answer"
                  value={formData.correctAnswer}
                  onChange={(e) => setFormData((prev) => ({ ...prev, correctAnswer: e.target.value }))}
                  required
                />
              </div>

              {/* Wrong Answers */}
              <div className="space-y-4">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <X className="w-4 h-4 text-destructive" />
                  Wrong Answers <span className="text-destructive">*</span>
                </label>
                <div className="space-y-3">
                  <Input
                    placeholder="Wrong answer 1"
                    value={formData.wrongAnswer1}
                    onChange={(e) => setFormData((prev) => ({ ...prev, wrongAnswer1: e.target.value }))}
                    required
                  />
                  <Input
                    placeholder="Wrong answer 2"
                    value={formData.wrongAnswer2}
                    onChange={(e) => setFormData((prev) => ({ ...prev, wrongAnswer2: e.target.value }))}
                    required
                  />
                  <Input
                    placeholder="Wrong answer 3"
                    value={formData.wrongAnswer3}
                    onChange={(e) => setFormData((prev) => ({ ...prev, wrongAnswer3: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  Tags (optional)
                </label>
                <Input
                  placeholder="e.g., javascript, react, algorithms"
                  value={formData.tags}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
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

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Question'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
