'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { store } from '@/lib/store'
import { validatePlayer } from '@/actions/players'
import { QuestionForm, type QuestionFormData } from '@/components/submit/QuestionForm'
import { ArrowLeft, PlusCircle, Check } from 'lucide-react'

export default function SubmitPage() {
  const router = useRouter()
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [existingTags, setExistingTags] = useState<string[]>([])
  const [formKey, setFormKey] = useState(0)

  useEffect(() => {
    const loadData = async () => {
      const storedPlayerId = localStorage.getItem('quiz_player_id')
      if (!storedPlayerId) {
        router.push('/register?redirect=submit')
        return
      }
      const playerExists = await validatePlayer(storedPlayerId)
      if (!playerExists) {
        localStorage.removeItem('quiz_player_id')
        localStorage.removeItem('quiz_alias')
        router.push('/register?redirect=submit')
        return
      }
      setPlayerId(storedPlayerId)
      const fetchedTags = await store.getAllTags()
      setExistingTags(fetchedTags)
    }

    loadData()
  }, [router])

  const handleSubmit = async (data: QuestionFormData) => {
    if (!playerId) return
    setIsSubmitting(true)

    try {
      await store.addQuestion({
        questionText: data.questionText,
        questionType: data.questionType,
        questionStructure: data.questionStructure,
        tags: data.tags,
      })
      setSubmitted(true)
    } catch {
      console.error('Failed to submit question')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = async () => {
    setSubmitted(false)
    setFormKey((k) => k + 1)
    const fetchedTags = await store.getAllTags()
    setExistingTags(fetchedTags)
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
            <QuestionForm
              key={formKey}
              existingTags={existingTags}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
