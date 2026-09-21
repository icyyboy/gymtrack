import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns'

export const ISO = 'yyyy-MM-dd'

export function todayISO(): string {
  return format(new Date(), ISO)
}

export function toISO(date: Date): string {
  return format(date, ISO)
}

export function fromISO(value: string): Date {
  return parseISO(value)
}

export function daysBetween(a: string, b: string): number {
  return differenceInCalendarDays(parseISO(a), parseISO(b))
}

export function weekdayIndex(date: Date): number {
  return date.getDay() // 0 = domingo
}

/** Rango de dias (ISO) hacia atras desde hoy, incluido hoy. */
export function lastNDays(n: number): string[] {
  const end = new Date()
  const days: string[] = []
  for (let i = n - 1; i >= 0; i--) days.push(toISO(addDays(end, -i)))
  return days
}

/** Primer dia (lunes) de la cuadricula del heatmap. */
export function heatmapStart(days: number): Date {
  return startOfWeek(addDays(new Date(), -(days - 1)), { weekStartsOn: 1 })
}

export { addDays, format, startOfWeek }
