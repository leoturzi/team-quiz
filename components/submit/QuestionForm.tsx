'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tag, Clock } from 'lucide-react'
import type { QuestionType, QuestionStructure } from '@/lib/types'
import { OptionsEditor, type OptionEntry } from './OptionsEditor'
import { SequenceEditor } from './SequenceEditor'
import { MarkdownRenderer } from '@/components/quiz/MarkdownRenderer'

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
  timeLimitSeconds: number
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
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(1)
  const [timeLimitExtraSeconds, setTimeLimitExtraSeconds] = useState(0)

  const handleTypeChange = (type: QuestionType) => {
    setQuestionType(type)
    if (type !== 'sequence') {
      setOptions(DEFAULT_OPTIONS[type])
    }
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

  const hasDuplicates = (values: string[]): boolean => {
    const seen = new Set<string>()
    for (const v of values) {
      const normalized = v.trim().toLowerCase()
      if (!normalized) continue
      if (seen.has(normalized)) return true
      seen.add(normalized)
    }
    return false
  }

  const totalTimeLimitSeconds = timeLimitMinutes * 60 + timeLimitExtraSeconds

  const isValid = (): boolean => {
    if (!questionText.trim()) return false
    if (totalTimeLimitSeconds < 1) return false
    if (questionType === 'sequence') {
      const filled = sequenceItems.filter((t) => t.trim())
      return filled.length >= 2 && !hasDuplicates(sequenceItems)
    }
    const filled = options.filter((o) => o.text.trim())
    if (hasDuplicates(filled.map((o) => o.text))) return false
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
      timeLimitSeconds: totalTimeLimitSeconds,
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
          placeholder={"What programming concept or topic would you like to ask about?\nUse ```<language> for code blocks.\nEg. ```js function myFunction()..."}
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          className="min-h-[100px] resize-none font-mono text-sm"
          required
        />
        {questionText.trim() && (
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Preview</span>
            <div className="rounded-lg border border-border/50 bg-card p-4 max-h-64 overflow-y-auto">
              <MarkdownRenderer content={questionText} />
            </div>
          </div>
        )}
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

      {/* Time Limit */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          Time Limit
        </label>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={59}
              value={timeLimitMinutes}
              onChange={(e) => setTimeLimitMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
              className="w-20 text-center"
            />
            <span className="text-sm text-muted-foreground">min</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={45}
              step={15}
              value={timeLimitExtraSeconds}
              onChange={(e) => {
                const raw = parseInt(e.target.value) || 0
                const clamped = Math.max(0, Math.min(45, Math.round(raw / 15) * 15))
                setTimeLimitExtraSeconds(clamped)
              }}
              className="w-20 text-center"
            />
            <span className="text-sm text-muted-foreground">sec</span>
          </div>
        </div>
        {totalTimeLimitSeconds < 1 && (
          <p className="text-xs text-destructive">Time limit must be at least 1 second.</p>
        )}
      </div>

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