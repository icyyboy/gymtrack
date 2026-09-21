'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, parseISO, startOfWeek } from 'date-fns'
import { useApp } from '@/providers/app-provider'
import { useToast } from '@/providers/toast-provider'
import {
  getExerciseHistory,
  getExercises,
  getMuscleDistribution,
  getRecords,
  getSessions,
  getStats
} from '@/lib/data/queries'
import { exerciseName, muscleName } from '@/lib/i18n'
import { getMuscleGroups } from '@/lib/data/queries'
import { formatHours, formatVolume, toDisplayWeight } from '@/lib/utils/format'
import { Card, SectionHeader, StatTile } from '@/components/ui/card'
import { Select } from '@/components/ui/input'
import { EmptyState, Skeleton } from '@/components/ui/states'
import { MuscleBars, ProgressLine, VolumeTrend } from '@/components/stats/charts'
import { TopBar } from '@/components/layout/nav'
import type { ExerciseWithMuscle, MuscleGroup, PersonalRecord, UserStats, WorkoutSession } from '@/lib/types'

type RecordRow = PersonalRecord & { exercise: { id: string; name_es: string; name_en: string } }

export default function StatsPage() {
  const { supabase, profile } = useApp()
  const toast = useToast()
  const units = profile?.units ?? 'kg'
  const locale = profile?.locale ?? 'es'

  const [stats, setStats] = useState<UserStats | null>(null)
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [records, setRecords] = useState<RecordRow[]>([])
  const [groups, setGroups] = useState<MuscleGroup[]>([])
  const [distribution, setDistribution] = useState<Map<string, number>>(new Map())
  const [exercises, setExercises] = useState<ExerciseWithMuscle[]>([])
  const [selectedExercise, setSelectedExercise] = useState('')
  const [history, setHistory] = useState<{ label: string; value: number }[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!profile) return
    try {
      const [s, rows, prs, mg, dist, ex] = await Promise.all([
        getStats(supabase, profile.id),
        getSessions(supabase, 120),
        getRecords(supabase, 12),
        getMuscleGroups(supabase),
        getMuscleDistribution(supabase, 90),
        getExercises(supabase)
      ])
      setStats(s)
      setSessions(rows)
      setRecords(prs as RecordRow[])
      setGroups(mg)
      setDistribution(dist)
      setExercises(ex)
    } catch {
      toast('No hemos podido cargar el progreso.', 'error')
    } finally {
      setLoading(false)
    }
  }, [supabase, profile, toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!selectedExercise) {
      setHistory([])
      return
    }
    void getExerciseHistory(supabase, selectedExercise).then((rows) => {
      const byDay = new Map<string, number>()
      for (const row of rows) {
        const day = row.session?.session_date ?? row.completed_at?.slice(0, 10)
        if (!day || row.session?.status !== 'completed') continue
        const best = toDisplayWeight(Number(row.weight), units)
        byDay.set(day, Math.max(byDay.get(day) ?? 0, best))
      }
      setHistory(
        Array.from(byDay.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-20)
          .map(([day, value]) => ({ label: format(parseISO(day), 'd MMM'), value }))
      )
    })
  }, [selectedExercise, supabase, units])

  const weeklyVolume = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of sessions) {
      const week = format(startOfWeek(parseISO(s.session_date), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      map.set(week, (map.get(week) ?? 0) + toDisplayWeight(Number(s.total_volume), units))
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([week, value]) => ({ label: format(parseISO(week), 'd MMM'), value: Math.round(value) }))
  }, [sessions, units])

  const frequency = useMemo(() => {
    if (sessions.length === 0) return 0
    const days = new Set(sessions.map((s) => s.session_date))
    const first = sessions[sessions.length - 1]?.session_date
    if (!first) return 0
    const weeks = Math.max(1, (Date.now() - parseISO(first).getTime()) / (7 * 86400000))
    return Math.round((days.size / weeks) * 10) / 10
  }, [sessions])

  const muscleData = useMemo(
    () =>
      groups
        .map((g) => ({
          label: muscleName(g, locale),
          value: Math.round(toDisplayWeight(distribution.get(g.id) ?? 0, units))
        }))
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value),
    [groups, distribution, units, locale]
  )

  if (loading) {
    return (
      <>
        <TopBar title="Progreso" />
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-48" />
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar title="Progreso" />

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Entrenamientos" value={`${stats?.total_sessions ?? 0}`} />
        <StatTile label="Volumen total" value={formatVolume(stats?.total_volume ?? 0, units)} />
        <StatTile label="Tiempo entrenado" value={formatHours(stats?.total_duration_seconds ?? 0)} />
        <StatTile label="Frecuencia" value={`${frequency}`} sub="dias por semana" />
      </div>

      <section className="mt-8">
        <SectionHeader title={`Volumen semanal (${units})`} />
        <Card>
          {weeklyVolume.length === 0 ? (
            <EmptyState title="Sin datos todavia" description="Completa un entrenamiento para ver la evolucion." />
          ) : (
            <VolumeTrend data={weeklyVolume} />
          )}
        </Card>
      </section>

      <section className="mt-8">
        <SectionHeader title="Evolucion por ejercicio" />
        <Card>
          <Select value={selectedExercise} onChange={(e) => setSelectedExercise(e.target.value)} className="mb-4">
            <option value="">Elige un ejercicio</option>
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {exerciseName(ex, locale)}
              </option>
            ))}
          </Select>
          {history.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              {selectedExercise ? 'Aun no hay series registradas de este ejercicio.' : 'Selecciona un ejercicio.'}
            </p>
          ) : (
            <ProgressLine data={history} />
          )}
        </Card>
      </section>

      <section className="mt-8">
        <SectionHeader title="Distribucion por grupo muscular" />
        <Card>
          {muscleData.length === 0 ? (
            <EmptyState title="Sin volumen en los ultimos 90 dias" />
          ) : (
            <MuscleBars data={muscleData} />
          )}
        </Card>
      </section>

      <section className="mt-8">
        <SectionHeader title="Records personales" />
        {records.length === 0 ? (
          <EmptyState title="Todavia no hay records" />
        ) : (
          <ul className="space-y-2">
            {records.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-xl border border-ink-800 bg-ink-900 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{exerciseName(r.exercise, locale)}</p>
                  <p className="text-xs text-muted">
                    {r.kind === 'max_weight' ? 'Peso maximo' : r.kind === 'estimated_1rm' ? '1RM estimado' : 'Mejor serie'} ·{' '}
                    {r.achieved_at.slice(0, 10)}
                  </p>
                </div>
                <p className="font-num text-sm text-accent">{formatVolume(Number(r.value), units)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
