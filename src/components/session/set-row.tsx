'use client'

import { Check, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { Units } from '@/lib/types'
import { trimZero } from '@/lib/utils/format'

export interface SetDraft {
  id?: string
  key: string
  setIndex: number
  weight: string
  reps: string
  rir: string
  isWarmup: boolean
  completed: boolean
  saving?: boolean
}

export function SetRow({
  draft,
  previous,
  units,
  onChange,
  onToggle,
  onRepeatPrevious,
  onDelete
}: {
  draft: SetDraft
  previous?: { weight: number; reps: number }
  units: Units
  onChange: (patch: Partial<SetDraft>) => void
  onToggle: () => void
  onRepeatPrevious: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-[30px_52px_1fr_1fr_44px_38px_26px] items-center gap-1.5 rounded-xl px-2 py-2 transition-colors',
        draft.completed ? 'bg-accent/15' : 'bg-ink-850'
      )}
    >
      <span
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-lg font-num text-xs',
          draft.isWarmup ? 'bg-warn/15 text-warn' : 'bg-ink-800 text-muted-strong'
        )}
        title={draft.isWarmup ? 'Calentamiento' : undefined}
      >
        {draft.isWarmup ? 'W' : draft.setIndex}
      </span>

      <button
        onClick={onRepeatPrevious}
        disabled={!previous}
        className="truncate text-left font-num text-xs text-muted disabled:opacity-40"
        title="Repetir la serie anterior"
      >
        {previous ? `${trimZero(previous.weight)}×${previous.reps}` : '—'}
      </button>

      <input
        inputMode="decimal"
        type="number"
        step="0.5"
        value={draft.weight}
        onChange={(e) => onChange({ weight: e.target.value })}
        placeholder={units}
        aria-label={`Peso serie ${draft.setIndex}`}
        className="h-11 w-full rounded-lg border border-ink-700 bg-ink-900 text-center font-num text-[15px] focus:border-accent focus:outline-none"
      />
      <input
        inputMode="numeric"
        type="number"
        value={draft.reps}
        onChange={(e) => onChange({ reps: e.target.value })}
        placeholder="reps"
        aria-label={`Repeticiones serie ${draft.setIndex}`}
        className="h-11 w-full rounded-lg border border-ink-700 bg-ink-900 text-center font-num text-[15px] focus:border-accent focus:outline-none"
      />
      <input
        inputMode="numeric"
        type="number"
        value={draft.rir}
        onChange={(e) => onChange({ rir: e.target.value })}
        placeholder="RIR"
        aria-label={`RIR serie ${draft.setIndex}`}
        className="h-11 w-full rounded-lg border border-ink-700 bg-ink-900 text-center font-num text-xs text-muted-strong focus:border-accent focus:outline-none"
      />

      <button
        onClick={onToggle}
        aria-pressed={draft.completed}
        aria-label={draft.completed ? 'Desmarcar serie' : 'Marcar serie'}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
          draft.completed ? 'bg-accent text-ink-950' : 'border border-ink-700 bg-ink-900 text-muted hover:text-white'
        )}
      >
        <Check size={16} strokeWidth={3} />
      </button>

      <button
        onClick={onDelete}
        className="flex h-9 w-6 items-center justify-center text-muted transition-colors hover:text-danger"
        aria-label="Eliminar serie"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
