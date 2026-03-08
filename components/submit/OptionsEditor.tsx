'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check, X, Plus, Trash2 } from 'lucide-react'
import type { QuestionType } from '@/lib/types'

export interface OptionEntry {
  text: string
  isCorrect: boolean
}

interface OptionsEditorProps {
  questionType: Exclude<QuestionType, 'sequence'>
  options: OptionEntry[]
  onChange: (options: OptionEntry[]) => void
}

const TYPE_CONFIG = {
  true_false: { min: 2, max: 2, singleCorrect: true },
  multiple_choice: { min: 4, max: 4, singleCorrect: true },
  multiple_answer: { min: 2, max: 8, singleCorrect: false },
} as const

function placeholderFor(type: Exclude<QuestionType, 'sequence'>, idx: number, isCorrect: boolean): string {
  if (type === 'true_false') return isCorrect ? 'e.g. True' : 'e.g. False'
  if (type === 'multiple_choice') return isCorrect ? 'The correct answer' : `Wrong answer ${idx}`
  return `Option ${idx + 1}`
}

export function OptionsEditor({ questionType, options, onChange }: OptionsEditorProps) {
  const config = TYPE_CONFIG[questionType]

  const updateText = (idx: number, text: string) => {
    onChange(options.map((o, i) => (i === idx ? { ...o, text } : o)))
  }

  const toggleCorrect = (idx: number) => {
    if (config.singleCorrect) {
      onChange(options.map((o, i) => ({ ...o, isCorrect: i === idx })))
    } else {
      onChange(options.map((o, i) => (i === idx ? { ...o, isCorrect: !o.isCorrect } : o)))
    }
  }

  const removeOption = (idx: number) => {
    if (options.length <= config.min) return
    onChange(options.filter((_, i) => i !== idx))
  }

  const addOption = () => {
    if (options.length >= config.max) return
    onChange([...options, { text: '', isCorrect: false }])
  }

  const canAdd = options.length < config.max
  const canRemove = options.length > config.min

  if (questionType === 'true_false') {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Select the correct answer <span className="text-destructive">*</span>
        </label>
        <div className="space-y-3">
          {options.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => toggleCorrect(idx)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                opt.isCorrect
                  ? 'border-success bg-success/10 text-success font-medium'
                  : 'border-border/50 bg-card hover:border-primary/50 text-foreground'
              }`}
            >
              <span className={`shrink-0 w-6 h-6 rounded flex items-center justify-center border ${
                opt.isCorrect
                  ? 'border-success bg-success/20 text-success'
                  : 'border-border/50 text-muted-foreground'
              }`}>
                {opt.isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </span>
              {opt.text}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (config.singleCorrect) {
    const correctIdx = options.findIndex((o) => o.isCorrect)
    const correctOption = options[correctIdx] ?? options[0]
    const wrongOptions = options.filter((_, i) => i !== correctIdx)

    return (
      <>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Check className="w-4 h-4 text-success" />
            Correct Answer <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder={placeholderFor(questionType, 0, true)}
            value={correctOption.text}
            onChange={(e) => updateText(correctIdx >= 0 ? correctIdx : 0, e.target.value)}
            required
          />
        </div>

        <div className="space-y-4">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <X className="w-4 h-4 text-destructive" />
            Wrong Answer{wrongOptions.length > 1 ? 's' : ''} <span className="text-destructive">*</span>
          </label>
          <div className="space-y-3">
            {wrongOptions.map((opt, wIdx) => {
              const realIdx = options.indexOf(opt)
              return (
                <Input
                  key={realIdx}
                  placeholder={placeholderFor(questionType, wIdx + 1, false)}
                  value={opt.text}
                  onChange={(e) => updateText(realIdx, e.target.value)}
                  required
                />
              )
            })}
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium text-foreground">
        Options <span className="text-destructive">*</span>
        <span className="text-muted-foreground font-normal ml-2">
          (toggle checkmarks to mark correct answers)
        </span>
      </label>
      <div className="space-y-3">
        {options.map((option, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleCorrect(idx)}
              className={`shrink-0 w-8 h-8 rounded flex items-center justify-center border transition-colors ${
                option.isCorrect
                  ? 'border-success bg-success/20 text-success'
                  : 'border-border/50 text-muted-foreground hover:border-primary/50'
              }`}
            >
              {option.isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </button>
            <Input
              placeholder={placeholderFor(questionType, idx, option.isCorrect)}
              value={option.text}
              onChange={(e) => updateText(idx, e.target.value)}
              className="flex-1"
            />
            {canRemove && (
              <button
                type="button"
                onClick={() => removeOption(idx)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {canAdd && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addOption}
            className="bg-transparent"
          >
            <Plus className="w-4 h-4" />
            Add Option
          </Button>
        )}
      </div>
    </div>
  )
}
