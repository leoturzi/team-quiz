'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, GripVertical } from 'lucide-react'

interface SequenceEditorProps {
  items: string[]
  onChange: (items: string[]) => void
}

const MIN_ITEMS = 2
const MAX_ITEMS = 10

function getDuplicateIndices(values: string[]): Set<number> {
  const seen = new Map<string, number>()
  const dupes = new Set<number>()
  values.forEach((v, i) => {
    const normalized = v.trim().toLowerCase()
    if (!normalized) return
    if (seen.has(normalized)) {
      dupes.add(seen.get(normalized)!)
      dupes.add(i)
    } else {
      seen.set(normalized, i)
    }
  })
  return dupes
}

export function SequenceEditor({ items, onChange }: SequenceEditorProps) {
  const duplicates = getDuplicateIndices(items)

  const updateItem = (idx: number, text: string) => {
    onChange(items.map((v, i) => (i === idx ? text : v)))
  }

  const removeItem = (idx: number) => {
    if (items.length <= MIN_ITEMS) return
    onChange(items.filter((_, i) => i !== idx))
  }

  const addItem = () => {
    if (items.length >= MAX_ITEMS) return
    onChange([...items, ''])
  }

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium text-foreground">
        Items in correct order <span className="text-destructive">*</span>
        <span className="text-muted-foreground font-normal ml-2">
          (enter items top-to-bottom in the correct sequence)
        </span>
      </label>
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="shrink-0 w-8 h-8 rounded flex items-center justify-center border border-border/50 text-muted-foreground text-sm font-medium">
              <GripVertical className="w-4 h-4" />
            </span>
            <span className="text-sm font-bold text-muted-foreground w-6">{idx + 1}.</span>
            <div className="flex-1">
              <Input
                placeholder={`Item ${idx + 1}`}
                value={item}
                onChange={(e) => updateItem(idx, e.target.value)}
                className={duplicates.has(idx) ? 'border-destructive' : ''}
              />
              {duplicates.has(idx) && (
                <p className="text-xs text-destructive mt-1">Duplicate item</p>
              )}
            </div>
            {items.length > MIN_ITEMS && (
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {items.length < MAX_ITEMS && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            className="bg-transparent"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        )}
      </div>
    </div>
  )
}
