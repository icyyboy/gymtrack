'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { exerciseName } from '@/lib/i18n'
import type { Locale, WorkoutExerciseFull } from '@/lib/types'

export function SortableExercise({
  item,
  locale,
  onChange,
  onRemove
}: {
  item: WorkoutExerciseFull
  locale: Locale
  onChange: (patch: Partial<WorkoutExerciseFull>) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-2xl border bg-ink-900 p-3 ${
        isDragging ? 'border-accent/50 opacity-90' : 'border-ink-800'
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab touch-none rounded-lg p-1 text-muted hover:text-white active:cursor-grabbing"
          aria-label="Reordenar ejercicio"
        >
          <GripVertical size={18} />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{exerciseName(item.exercise, locale)}</p>

          <div className="mt-3 grid grid-cols-4 gap-2">
            <Input
              label="Series"
              type="number"
              inputMode="numeric"
              min={1}
              value={item.target_sets}
              onChange={(e) => onChange({ target_sets: Number(e.target.value) })}
              className="px-2 py-2 text-center"
            />
            <Input
              label="Reps"
              type="number"
              inputMode="numeric"
              value={item.target_reps_min ?? ''}
              onChange={(e) => onChange({ target_reps_min: e.target.value ? Number(e.target.value) : null })}
              className="px-2 py-2 text-center"
            />
            <Input
              label="RIR"
              type="number"
              inputMode="decimal"
              value={item.target_rir ?? ''}
              onChange={(e) => onChange({ target_rir: e.target.value ? Number(e.target.value) : null })}
              className="px-2 py-2 text-center"
            />
            <Input
              label="Desc. s"
              type="number"
              inputMode="numeric"
              step={15}
              value={item.rest_seconds}
              onChange={(e) => onChange({ rest_seconds: Number(e.target.value) })}
              className="px-2 py-2 text-center"
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={item.is_warmup}
                onChange={(e) => onChange({ is_warmup: e.target.checked })}
                className="h-4 w-4 rounded border-ink-600 bg-ink-850 accent-accent"
              />
              Calentamiento
            </label>
            <button
              onClick={onRemove}
              className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
              aria-label="Quitar ejercicio"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </li>
  )
}
