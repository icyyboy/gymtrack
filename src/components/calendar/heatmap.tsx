'use client'

import { useMemo } from 'react'
import { addDays, format, startOfWeek } from 'date-fns'
import { cn } from '@/lib/utils/cn'

export type DayKind = 'none' | 'trained' | 'rest' | 'planned' | 'missed'

const COLORS: Record<DayKind, string> = {
  none: 'bg-ink-850',
  trained: 'bg-accent',
  rest: 'bg-ink-700',
  planned: 'border border-dashed border-accent/50 bg-transparent',
  missed: 'bg-danger/40'
}

export function Heatmap({
  days,
  weeks = 20,
  onSelect
}: {
  days: Map<string, { kind: DayKind; volume?: number }>
  weeks?: number
  onSelect?: (iso: string) => void
}) {
  const grid = useMemo(() => {
    const end = new Date()
    const start = startOfWeek(addDays(end, -(weeks * 7 - 1)), { weekStartsOn: 1 })
    const columns: string[][] = []
    for (let w = 0; w < weeks; w++) {
      const column: string[] = []
      for (let d = 0; d < 7; d++) column.push(format(addDays(start, w * 7 + d), 'yyyy-MM-dd'))
      columns.push(column)
    }
    return columns
  }, [weeks])

  const todayISO = format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {grid.map((column, i) => (
          <div key={i} className="flex flex-col gap-1">
            {column.map((iso) => {
              const entry = days.get(iso)
              const future = iso > todayISO
              const kind: DayKind = entry?.kind ?? (future ? 'none' : 'none')
              return (
                <button
                  key={iso}
                  onClick={() => onSelect?.(iso)}
                  title={iso}
                  aria-label={iso}
                  className={cn(
                    'h-3.5 w-3.5 rounded-[3px] transition-transform hover:scale-125',
                    COLORS[kind],
                    iso === todayISO && 'ring-1 ring-white/60',
                    future && 'opacity-40'
                  )}
                />
              )
            })}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted">
        <Legend className={COLORS.trained} label="Entrenado" />
        <Legend className={COLORS.rest} label="Descanso planificado" />
        <Legend className={COLORS.planned} label="Planificado" />
        <Legend className={COLORS.missed} label="Perdido" />
      </div>
    </div>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('h-3 w-3 rounded-[3px]', className)} />
      {label}
    </span>
  )
}
