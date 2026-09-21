// ---------------------------------------------------------------------
// Resuelve que toca entrenar un dia concreto.
//
// Modo 'weekly'     -> los slots llevan weekday (0 domingo .. 6 sabado).
// Modo 'sequential' -> los slots se recorren en bucle desde
//                      cycle_start_date, independientemente del dia
//                      de la semana. Un ciclo puede tener 3, 5 u 8 dias.
// ---------------------------------------------------------------------
import type { PlanFull, PlanSlot, Workout } from '@/lib/types'
import { daysBetween, fromISO } from '@/lib/utils/date'

export interface ScheduledDay {
  date: string
  slot: PlanSlot | null
  workout: Workout | null
  isRest: boolean
}

export function resolveDay(plan: PlanFull | null, dateISO: string): ScheduledDay {
  if (!plan || plan.plan_slots.length === 0) {
    return { date: dateISO, slot: null, workout: null, isRest: false }
  }

  const slot =
    plan.mode === 'weekly'
      ? plan.plan_slots.find((s) => s.weekday === fromISO(dateISO).getDay()) ?? null
      : sequentialSlot(plan, dateISO)

  const workout = slot?.workout_id
    ? plan.workouts.find((w) => w.id === slot.workout_id) ?? null
    : null

  return { date: dateISO, slot, workout, isRest: slot?.kind === 'rest' }
}

function sequentialSlot(plan: PlanFull, dateISO: string): PlanSlot | null {
  const slots = [...plan.plan_slots].sort((a, b) => a.position - b.position)
  if (slots.length === 0) return null
  const offset = daysBetween(dateISO, plan.cycle_start_date)
  const index = ((offset % slots.length) + slots.length) % slots.length
  return slots[index] ?? null
}

/** Devuelve los proximos `count` dias planificados a partir de una fecha. */
export function upcomingDays(plan: PlanFull | null, fromISODate: string, count: number): ScheduledDay[] {
  const out: ScheduledDay[] = []
  const start = fromISO(fromISODate)
  for (let i = 0; i < count; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    out.push(resolveDay(plan, iso))
  }
  return out
}

export function nextTrainingDay(plan: PlanFull | null, fromISODate: string): ScheduledDay | null {
  return upcomingDays(plan, fromISODate, 14).slice(1).find((d) => d.workout) ?? null
}
