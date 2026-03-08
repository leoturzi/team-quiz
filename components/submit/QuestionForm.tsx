'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tag } from 'lucide-react'
import type { QuestionType, QuestionStructure } from '@/lib/types'
import { OptionsEditor, type OptionEntry } from './OptionsEditor'
import { SequenceEditor } from './SequenceEditor'

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  true_false: 'True / False',
  multiple_answer: 'Multiple Answer (Checkboxes)',
  sequence: 'Sequence / Puzzle',
}

const DEFAULT_OPTIONS: Record<Exclude<QuestionType, 'sequence'>, OptionEntry[]> = {
  multiple_choice: [
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ],
  true_false: [
    { text: 'True', isCorrect: true },
    { text: 'False', isCorrect: false },
  ],
  multiple_answer: [
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ],
}

const DEFAULT_SEQUENCE_ITEMS = ['', '', '', '']

export interface QuestionFormData {
  questionText: string
  questionType: QuestionType
  questionStructure: QuestionStructure
  tags: string[]
}

interface QuestionFormProps {
  existingTags: string[]
  isSubmitting: boolean
  onSubmit: (data: QuestionFormData) => void
}

export function QuestionForm({ existingTags, isSubmitting, onSubmit }: QuestionFormProps) {
  const [questionType, setQuestionType] = useState<QuestionType>('multiple_choice')
  const [questionText, setQuestionText] = useState('')
  const [tags, setTags] = useState('')
  const [options, setOptions] = useState<OptionEntry[]>(DEFAULT_OPTIONS.multiple_choice)
  const [sequenceItems, setSequenceItems] = useState<string[]>(DEFAULT_SEQUENCE_ITEMS)

  const handleTypeChange = (type: QuestionType) => {
    setQuestionType(type)
    if (type === 'sequence') return
    if (type === 'true_false') {
      setOptions(DEFAULT_OPTIONS.true_false)
      return
    }
    setOptions(DEFAULT_OPTIONS[type].map((d, i) => {
      const existing = options[i]
      if (!existing) return d
      return { text: existing.text, isCorrect: d.isCorrect }
    }))
  }

  const buildStructure = (): QuestionStructure => {
    if (questionType === 'sequence') {
      return {
        items: sequenceItems
          .filter((t) => t.trim())
          .map((text, idx) => ({ text, correctPosition: idx + 1 })),
      }
    }
    return { options: options.filter((o) => o.text.trim()) }
  }

  const isValid = (): boolean => {
    if (!questionText.trim()) return false
    if (questionType === 'sequence') {
      return sequenceItems.filter((t) => t.trim()).length >= 2
    }
    const filled = options.filter((o) => o.text.trim())
    const hasCorrect = filled.some((o) => o.isCorrect)
    if (questionType === 'multiple_choice') return filled.length >= 4 && hasCorrect
    if (questionType === 'true_false') return filled.length >= 2 && hasCorrect
    return filled.length >= 2 && hasCorrect
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsedTags = tags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0)
    onSubmit({
      questionText,
      questionType,
      questionStructure: buildStructure(),
      tags: parsedTags,
    })
  }

  const addTag = (tag: string) => {
    const current = tags.split(',').map((t) => t.trim()).filter(Boolean)
    if (!current.includes(tag)) {
      setTags(current.length > 0 ? `${tags}, ${tag}` : tag)
    }
  }

  return (
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
              onClick={() => handleTypeChange(type)}
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

      {/* Type-specific answer editor */}
      {questionType === 'sequence' ? (
        <SequenceEditor items={sequenceItems} onChange={setSequenceItems} />
      ) : (
        <OptionsEditor
          questionType={questionType}
          options={options}
          onChange={setOptions}
        />
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

      <Button type="submit" className="w-full" disabled={isSubmitting || !isValid()}>
        {isSubmitting ? 'Submitting...' : 'Submit Question'}
      </Button>
    </form>
  )
}