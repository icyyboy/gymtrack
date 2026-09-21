'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import type { PlanFull, PlanSlot, ScheduleMode } from '@/lib/types'

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']

export function ScheduleEditor({
  plan,
  slots,
  onModeChange,
  onSlotsChange
}: {
  plan: PlanFull
  slots: PlanSlot[]
  onModeChange: (mode: ScheduleMode) => void
  onSlotsChange: (slots: PlanSlot[]) => void
}) {
  const isWeekly = plan.mode === 'weekly'

  function addSlot(kind: 'workout' | 'rest') {
    const slot: PlanSlot = {
      id: `tmp-${crypto.randomUUID()}`,
      plan_id: plan.id,
      user_id: plan.user_id,
      kind,
      workout_id: kind === 'workout' ? plan.workouts[0]?.id ?? null : null,
      position: slots.length,
      weekday: isWeekly ? slots.length % 7 : null,
      label: null
    }
    onSlotsChange([...slots, slot])
  }

  function update(index: number, patch: Partial<PlanSlot>) {
    onSlotsChange(slots.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  function remove(index: number) {
    onSlotsChange(slots.filter((_, i) => i !== index).map((s, i) => ({ ...s, position: i })))
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onModeChange('sequential')}
          className={`rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
            !isWeekly ? 'border-accent bg-accent-soft text-white' : 'border-ink-700 bg-ink-850 text-muted'
          }`}
        >
          <span className="block font-medium">Ciclo secuencial</span>
          <span className="mt-0.5 block text-xs text-muted">
            Dia A, B, C, descanso... sin depender del dia de la semana
          </span>
        </button>
        <button
          onClick={() => onModeChange('weekly')}
          className={`rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
            isWeekly ? 'border-accent bg-accent-soft text-white' : 'border-ink-700 bg-ink-850 text-muted'
          }`}
        >
          <span className="block font-medium">Dias fijos</span>
          <span className="mt-0.5 block text-xs text-muted">Lunes pecho, miercoles espalda...</span>
        </button>
      </div>

      {slots.length === 0 && (
        <p className="rounded-xl border border-dashed border-ink-700 px-4 py-6 text-center text-sm text-muted">
          Anade dias al ciclo para que la app sepa que toca cada dia.
        </p>
      )}

      <ol className="space-y-2">
        {slots.map((slot, index) => (
          <li key={slot.id} className="flex items-center gap-2 rounded-xl border border-ink-800 bg-ink-900 p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-800 font-num text-xs text-muted-strong">
              {isWeekly ? WEEKDAYS[slot.weekday ?? 0]?.slice(0, 2) : index + 1}
            </span>

            {isWeekly && (
              <Select
                value={String(slot.weekday ?? 1)}
                onChange={(e) => update(index, { weekday: Number(e.target.value) })}
                className="py-2 text-sm"
              >
                {WEEKDAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </Select>
            )}

            <Select
              value={slot.kind === 'rest' ? 'rest' : slot.workout_id ?? ''}
              onChange={(e) => {
                const value = e.target.value
                if (value === 'rest') update(index, { kind: 'rest', workout_id: null })
                else update(index, { kind: 'workout', workout_id: value })
              }}
              className="py-2 text-sm"
            >
              <option value="rest">Descanso</option>
              {plan.workouts.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>

            <button
              onClick={() => remove(index)}
              className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger"
              aria-label="Quitar dia"
            >
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ol>

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => addSlot('workout')}>
          <Plus size={14} /> Dia de entreno
        </Button>
        <Button variant="ghost" size="sm" onClick={() => addSlot('rest')}>
          <Plus size={14} /> Dia de descanso
        </Button>
      </div>
    </div>
  )
}
