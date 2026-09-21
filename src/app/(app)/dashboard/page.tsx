'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Dumbbell, Flame, Play, Timer, TrendingUp, Trophy } from 'lucide-react'
import { useApp } from '@/providers/app-provider'
import { useToast } from '@/providers/toast-provider'
import { getActivePlan, getActiveSession, getRecords, getStats } from '@/lib/data/queries'
import { startSession } from '@/lib/data/mutations'
import { nextTrainingDay, resolveDay } from '@/lib/scheduler'
import { formatHours, formatVolume } from '@/lib/utils/format'
import { todayISO } from '@/lib/utils/date'
import { exerciseName } from '@/lib/i18n'
import { Card, SectionHeader, StatTile } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState, Skeleton } from '@/components/ui/states'
import { TopBar } from '@/components/layout/nav'
import type { PersonalRecord, PlanFull, UserStats, WorkoutSession } from '@/lib/types'

type RecordRow = PersonalRecord & { exercise: { id: string; name_es: string; name_en: string } }

export default function DashboardPage() {
  const { supabase, profile, t } = useApp()
  const router = useRouter()
  const toast = useToast()

  const [plan, setPlan] = useState<PlanFull | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [active, setActive] = useState<WorkoutSession | null>(null)
  const [records, setRecords] = useState<RecordRow[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  const load = useCallback(async () => {
    if (!profile) return
    try {
      const [p, s, a, r] = await Promise.all([
        getActivePlan(supabase),
        getStats(supabase, profile.id),
        getActiveSession(supabase),
        getRecords(supabase, 4)
      ])
      setPlan(p)
      setStats(s)
      setActive(a)
      setRecords(r as RecordRow[])
    } catch {
      toast('No hemos podido cargar tus datos. Comprueba la conexion.', 'error')
    } finally {
      setLoading(false)
    }
  }, [supabase, profile, toast])

  useEffect(() => {
    void load()
  }, [load])

  const today = resolveDay(plan, todayISO())
  const next = nextTrainingDay(plan, todayISO())
  const units = profile?.units ?? 'kg'
  const locale = profile?.locale ?? 'es'

  async function onStart() {
    if (!profile || !today.workout) return
    setStarting(true)
    try {
      const session = await startSession(supabase, profile.id, {
        workoutId: today.workout.id,
        planId: plan?.id ?? null,
        name: today.workout.name
      })
      router.push(`/session/${session.id}`)
    } catch {
      toast('No se ha podido iniciar el entrenamiento.', 'error')
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <>
        <TopBar title="Inicio" />
        <div className="space-y-4">
          <Skeleton className="h-36 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar
        title={`Hola, ${profile?.display_name || profile?.username}`}
        action={
          <Link href="/settings" className="text-sm text-muted hover:text-white">
            {t.nav.settings}
          </Link>
        }
      />

      {active ? (
        <Card className="border-accent/40 bg-accent-soft">
          <p className="text-xs text-accent">Sesion en curso</p>
          <p className="mt-1 text-lg font-semibold">{active.name}</p>
          <Button className="mt-4" fullWidth size="lg" onClick={() => router.push(`/session/${active.id}`)}>
            <Play size={18} /> {t.dashboard.resume}
          </Button>
        </Card>
      ) : !plan ? (
        <EmptyState
          icon={<Dumbbell size={28} />}
          title={t.dashboard.noPlan}
          description="Crea una rutina, planifica los dias y empieza a registrar series."
          action={
            <Link href="/routines">
              <Button>Crear rutina</Button>
            </Link>
          }
        />
      ) : today.workout ? (
        <Card>
          <p className="text-xs text-muted">{t.dashboard.todayWorkout}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight">{today.workout.name}</p>
          <p className="mt-1 text-sm text-muted">
            {plan.workouts.find((w) => w.id === today.workout?.id)?.workout_exercises.length ?? 0} ejercicios
          </p>
          <Button className="mt-4" fullWidth size="lg" loading={starting} onClick={onStart}>
            <Play size={18} /> {t.dashboard.start}
          </Button>
        </Card>
      ) : (
        <Card>
          <p className="text-xs text-muted">{t.common.today}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight">{t.dashboard.restToday}</p>
          {next?.workout && (
            <p className="mt-2 text-sm text-muted">
              {t.dashboard.nextWorkout}: {next.workout.name} · {next.date}
            </p>
          )}
        </Card>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatTile
          label={t.dashboard.streak}
          value={`${stats?.current_streak ?? 0}`}
          sub={`${t.streak.best}: ${stats?.best_streak ?? 0}`}
          icon={<Flame size={14} className="text-accent" />}
        />
        <StatTile
          label={t.dashboard.sessions}
          value={`${stats?.total_sessions ?? 0}`}
          icon={<Dumbbell size={14} />}
        />
        <StatTile
          label={t.dashboard.volume}
          value={formatVolume(stats?.total_volume ?? 0, units)}
          icon={<TrendingUp size={14} />}
        />
        <StatTile
          label={t.dashboard.time}
          value={formatHours(stats?.total_duration_seconds ?? 0)}
          icon={<Timer size={14} />}
        />
      </div>

      <section className="mt-8">
        <SectionHeader
          title={t.dashboard.records}
          action={
            <Link href="/stats" className="text-xs text-muted hover:text-white">
              Ver progreso
            </Link>
          }
        />
        {records.length === 0 ? (
          <EmptyState
            icon={<Trophy size={24} />}
            title="Todavia no hay records"
            description="Completa un entrenamiento y aparecen aqui automaticamente."
          />
        ) : (
          <ul className="space-y-2">
            {records.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-ink-800 bg-ink-900 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{exerciseName(r.exercise, locale)}</p>
                  <p className="text-xs text-muted">
                    {r.kind === 'max_weight' ? 'Peso maximo' : r.kind === 'estimated_1rm' ? '1RM estimado' : 'Mejor serie'}
                  </p>
                </div>
                <p className="font-num text-sm text-accent">
                  {formatVolume(Number(r.value), units)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
