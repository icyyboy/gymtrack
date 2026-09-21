'use client'

import { Pause, Plus } from 'lucide-react'
import { formatClock } from '@/lib/utils/format'

export function RestTimer({
  secondsLeft,
  total,
  onAdd,
  onSkip
}: {
  secondsLeft: number
  total: number
  onAdd: (seconds: number) => void
  onSkip: () => void
}) {
  const progress = total > 0 ? 1 - secondsLeft / total : 0

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-ink-800 bg-ink-900/95 px-4 pt-3 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-num text-2xl font-semibold tabular-nums text-accent">
              {formatClock(secondsLeft)}
            </span>
            <span className="text-xs text-muted">descanso</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${Math.min(100, progress * 100)}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => onAdd(30)}
          className="flex h-11 items-center gap-1 rounded-xl border border-ink-700 bg-ink-850 px-3 text-sm text-muted-strong hover:text-white"
        >
          <Plus size={14} /> 30s
        </button>
        <button
          onClick={onSkip}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-ink-700 bg-ink-850 text-muted-strong hover:text-white"
          aria-label="Saltar descanso"
        >
          <Pause size={16} />
        </button>
      </div>
    </div>
  )
}
