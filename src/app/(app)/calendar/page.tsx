'use client'

import { useCallback, useEffect, useState } from 'react'
import { Flame } from 'lucide-react'
import { useApp } from '@/providers/app-provider'
import { useToast } from '@/providers/toast-provider'
import { getActivePlan, getSessionsBetween, getStats } from '@/lib/data/queries'
import { resolveDay } from '@/lib/scheduler'
import { computeStreak } from '@/lib/streak'
import { formatVolume } from '@/lib/utils/format'
import { addDays, toISO, todayISO } from '@/lib/utils/date'
import { Card, StatTile } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/states'
import { Heatmap, type DayKind } from '@/components/calendar/heatmap'
import { TopBar } from '@/components/layout/nav'
import type { PlanFull, UserStats, WorkoutSession } from '@/lib/types'

const WEEKS = 20

export default function CalendarPage() {
  const { supabase, profile } = useApp()
  const toast = useToast()

  const [days, setDays] = useState<Map<string, { kind: DayKind; volume?: number }>>(new Map())
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [plan, setPlan] = useState<PlanFull | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!profile) return
    try {
      const from = toISO(addDays(new Date(), -(WEEKS * 7)))
      const to = toISO(addDays(new Date(), 14))
      const [rows, activePlan, s] = await Promise.all([
        getSessionsBetween(supabase, from, to),
        getActivePlan(supabase),
        getStats(supabase, profile.id)
      ])

      setSessions(rows)
      setPlan(activePlan)
      setStats(s)

      const map = new Map<string, { kind: DayKind; volume?: number }>()
      const completed = rows.filter((r) => r.status === 'completed')

      // Dias planificados (pasado y futuro) segun la rutina activa
      for (let i = -(WEEKS * 7); i <= 14; i++) {
        const iso = toISO(addDays(new Date(), i))
        const scheduled = resolveDay(activePlan, iso)
        if (scheduled.isRest) map.set(iso, { kind: 'rest' })
        else if (scheduled.workout) map.set(iso, { kind: iso > todayISO() ? 'planned' : 'missed' })
      }

      // Lo realmente entrenado manda sobre lo planificado
      for (const session of completed) {
        map.set(session.session_date, { kind: 'trained', volume: Number(session.total_volume) })
      }

      setDays(map)
    } catch {
      toast('No hemos podido cargar el calendario.', 'error')
    } finally {
      setLoading(false)
    }
  }, [supabase, profile, toast])

  useEffect(() => {
    void load()
  }, [load])

  const streak = computeStreak(sessions.filter((s) => s.status === 'completed').map((s) => s.session_date))
  const units = profile?.units ?? 'kg'
  const selectedSession = selected ? sessions.find((s) => s.session_date === selected && s.status === 'completed') : null

  if (loading) {
    return (
      <>
        <TopBar title="Calendario" />
        <Skeleton className="h-40" />
      </>
    )
  }

  return (
    <>
      <TopBar title="Calendario" />

      <Card>
        <Heatmap days={days} weeks={WEEKS} onSelect={setSelected} />
      </Card>

      {selected && (
        <Card className="mt-3">
          <p className="text-xs text-muted">{selected}</p>
          {selectedSession ? (
            <>
              <p className="mt-1 font-semibold">{selectedSession.name}</p>
              <p className="mt-1 text-sm text-muted">
                {selectedSession.total_sets} series · {formatVolume(Number(selectedSession.total_volume), units)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">
              {days.get(selected)?.kind === 'rest'
                ? 'Descanso planificado'
                : days.get(selected)?.kind === 'planned'
                  ? `Planificado: ${resolveDay(plan, selected).workout?.name ?? ''}`
                  : 'Sin actividad'}
            </p>
          )}
        </Card>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatTile
          label="Racha actual"
          value={`${stats?.current_streak ?? streak.current}`}
          sub={streak.atRisk ? 'Entrena hoy para no perderla' : `Quedan ${streak.daysLeft} dias de margen`}
          icon={<Flame size={14} className="text-accent" />}
        />
        <StatTile
          label="Mejor racha"
          value={`${stats?.best_streak ?? streak.best}`}
          sub={stats?.streak_broken_on ? `Ultima rota el ${stats.streak_broken_on}` : undefined}
        />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-muted-strong">Ultimos entrenamientos</h2>
        <ul className="space-y-2">
          {sessions
            .filter((s) => s.status === 'completed')
            .slice(-12)
            .reverse()
            .map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-ink-800 bg-ink-900 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted">{s.session_date}</p>
                </div>
                <p className="font-num text-xs text-muted-strong">
                  {formatVolume(Number(s.total_volume), units)}
                </p>
              </li>
            ))}
        </ul>
      </section>
    </>
  )
}
