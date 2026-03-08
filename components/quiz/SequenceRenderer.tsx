'use client'

import { useState, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import type { Question, SequenceItem } from '@/lib/types'
import { GripVertical, Check, X } from 'lucide-react'

interface SequenceRendererProps {
  question: Question
  selectedOrder: string[]
  hasAnswered: boolean
  showResults: boolean
  onSubmitOrder: (order: string[]) => void
}

function SortableItem({ id, text, disabled }: { id: string; text: string; disabled: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
        isDragging
          ? 'border-primary bg-primary/10 shadow-lg'
          : 'border-border/50 bg-card'
      } ${disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
    >
      {!disabled && (
        <div {...attributes} {...listeners}>
          <GripVertical className="w-5 h-5 text-muted-foreground shrink-0" />
        </div>
      )}
      <span className="font-medium text-foreground">{text}</span>
    </div>
  )
}

export function SequenceRenderer({
  question,
  selectedOrder,
  hasAnswered,
  showResults,
  onSubmitOrder,
}: SequenceRendererProps) {
  const correctOrder = useMemo(() => {
    const structure = question.questionStructure as { items: SequenceItem[] }
    return [...structure.items]
      .sort((a, b) => a.correctPosition - b.correctPosition)
      .map((i) => i.text)
  }, [question.questionStructure])

  const initialOrder = useMemo(() => {
    const structure = question.questionStructure as { items: SequenceItem[] }
    return [...structure.items]
      .sort(() => Math.random() - 0.5)
      .map((i) => i.text)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id])

  const [items, setItems] = useState<string[]>(initialOrder)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.indexOf(active.id as string)
        const newIndex = prev.indexOf(over.id as string)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  const handleSubmit = () => {
    onSubmitOrder(items)
  }

  const displayItems = hasAnswered ? (selectedOrder.length > 0 ? selectedOrder : items) : items

  if (showResults) {
    return (
      <div className="space-y-3 mb-6">
        <p className="text-sm text-muted-foreground text-center">
          Correct order shown below
        </p>
        <div className="grid gap-2">
          {correctOrder.map((text, idx) => {
            const playerItem = displayItems[idx]
            const isCorrectPosition = playerItem === text
            return (
              <div
                key={`${text}-${idx}`}
                className={`flex items-center gap-3 p-4 rounded-lg border ${
                  isCorrectPosition
                    ? 'border-success bg-success/10'
                    : 'border-destructive bg-destructive/10'
                }`}
              >
                <span className="text-sm font-bold text-muted-foreground w-6">{idx + 1}.</span>
                {isCorrectPosition ? (
                  <Check className="w-5 h-5 text-success shrink-0" />
                ) : (
                  <X className="w-5 h-5 text-destructive shrink-0" />
                )}
                <div className="flex-1">
                  <span className={`font-medium ${isCorrectPosition ? 'text-success' : 'text-destructive'}`}>
                    {playerItem}
                  </span>
                  {!isCorrectPosition && (
                    <span className="text-sm text-muted-foreground ml-2">
                      (correct: {text})
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (hasAnswered) {
    return (
      <div className="space-y-3 mb-6">
        <p className="text-sm text-muted-foreground text-center">
          Your submitted order
        </p>
        <div className="grid gap-2">
          {displayItems.map((text, idx) => (
            <div
              key={`${text}-${idx}`}
              className="flex items-center gap-3 p-4 rounded-lg border border-primary/30 bg-primary/5"
            >
              <span className="text-sm font-bold text-muted-foreground w-6">{idx + 1}.</span>
              <span className="font-medium text-foreground">{text}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 mb-6">
      <p className="text-sm text-muted-foreground text-center">
        Drag items into the correct order
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="grid gap-2">
            {items.map((text) => (
              <SortableItem key={text} id={text} text={text} disabled={false} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button onClick={handleSubmit} className="w-full cursor-pointer">
        Lock In Order
      </Button>
    </div>
  )
}
