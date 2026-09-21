import type { Units } from '@/lib/types'

const KG_TO_LB = 2.2046226218

export function toDisplayWeight(kg: number, units: Units): number {
  return units === 'lb' ? Math.round(kg * KG_TO_LB * 10) / 10 : Math.round(kg * 10) / 10
}

export function toKg(value: number, units: Units): number {
  return units === 'lb' ? Math.round((value / KG_TO_LB) * 100) / 100 : value
}

export function formatWeight(kg: number, units: Units): string {
  const value = toDisplayWeight(kg, units)
  return `${trimZero(value)} ${units}`
}

export function trimZero(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)))
}

export function formatVolume(kg: number, units: Units): string {
  const value = toDisplayWeight(kg, units)
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M ${units}`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k ${units}`
  return `${Math.round(value)} ${units}`
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatHours(seconds: number): string {
  const hours = seconds / 3600
  if (hours < 1) return `${Math.round(seconds / 60)} min`
  return `${hours.toFixed(1)} h`
}

export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}

export function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase()
}
