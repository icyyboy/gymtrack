// ---------------------------------------------------------------------
// Reglas de racha replicadas en cliente para previsualizar el estado sin
// esperar al servidor. La fuente de verdad es compute_streak() en SQL:
// si cambian las reglas hay que tocar los dos sitios (y solo estas dos
// constantes en el 90% de los casos).
// ---------------------------------------------------------------------
import { daysBetween, todayISO } from '@/lib/utils/date'

export const MAX_CONSECUTIVE_REST_DAYS = 2
export const MAX_GAP = MAX_CONSECUTIVE_REST_DAYS + 1

export interface StreakState {
  current: number
  best: number
  brokenOn: string | null
  /** dias de descanso consumidos desde el ultimo entrenamiento */
  restUsed: number
  /** dias que quedan para entrenar antes de perder la racha */
  daysLeft: number
  atRisk: boolean
}

export function computeStreak(completedDates: string[], today = todayISO()): StreakState {
  const unique = Array.from(new Set(completedDates)).sort()
  if (unique.length === 0) {
    return { current: 0, best: 0, brokenOn: null, restUsed: 0, daysLeft: 0, atRisk: false }
  }

  let run = 0
  let best = 0
  let brokenOn: string | null = null
  let prev: string | null = null

  for (const day of unique) {
    if (prev === null) run = 1
    else if (daysBetween(day, prev) <= MAX_GAP) run += 1
    else {
      brokenOn = day
      run = 1
    }
    best = Math.max(best, run)
    prev = day
  }

  const last = unique[unique.length - 1]
  const sinceLast = daysBetween(today, last)
  const alive = sinceLast <= MAX_GAP
  const current = alive ? run : 0
  if (!alive) brokenOn = last

  return {
    current,
    best,
    brokenOn,
    restUsed: Math.max(0, sinceLast),
    daysLeft: Math.max(0, MAX_GAP - sinceLast),
    atRisk: alive && sinceLast >= MAX_CONSECUTIVE_REST_DAYS
  }
}
