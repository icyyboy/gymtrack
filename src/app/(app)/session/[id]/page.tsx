'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Flag, Plus, X } from 'lucide-react'
import { useApp } from '@/providers/app-provider'
import { useToast } from '@/providers/toast-provider'
import { getSessionSets } from '@/lib/data/queries'
import { deleteSet, discardSession, finishSession, saveSet } from '@/lib/data/mutations'
import { useElapsed } from '@/hooks/use-elapsed'
import { useRestTimer } from '@/hooks/use-rest-timer'
import { exerciseName } from '@/lib/i18n'
import { formatDuration, formatVolume, toDisplayWeight, toKg } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Skeleton, EmptyState } from '@/components/ui/states'
import { RestTimer } from '@/components/session/rest-timer'
import { SetRow, type SetDraft } from '@/components/session/set-row'
import type { SessionSet, WorkoutExerciseFull, WorkoutSession } from '@/lib/types'

interface PreviousSet {
  weight: number
  reps: number
}

export default function SessionPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { supabase, profile } = useApp()
  const toast = useToast()
  const timer = useRestTimer()

  const [session, setSession] = useState<WorkoutSession | null>(null)
  const [exercises, setExercises] = useState<WorkoutExerciseFull[]>([])
  const [drafts, setDrafts] = useState<Record<string, SetDraft[]>>({})
  const [previous, setPrevious] = useState<Record<string, PreviousSet[]>>({})
  const [loading, setLoading] = useState(true)
  const [finishing, setFinishing] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [notes, setNotes] = useState('')

  const elapsed = useElapsed(session?.started_at ?? null)
  const units = profile?.units ?? 'kg'
  const locale = profile?.locale ?? 'es'

  const load = useCallback(async () => {
    try {
      const { data: sessionRow, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (error || !sessionRow) {
        router.replace('/dashboard')
        return
      }
      const current = sessionRow as WorkoutSession
      setSession(current)
      setNotes(current.notes ?? '')

      if (current.status !== 'in_progress') {
        router.replace('/dashboard')
        return
      }

      const [{ data: weRows }, sets] = await Promise.all([
        current.workout_id
          ? supabase
              .from('workout_exercises')
              .select('*, exercise:exercises(*, muscle_group:muscle_groups!exercises_primary_muscle_id_fkey(*))')
              .eq('workout_id', current.workout_id)
              .order('position')
          : Promise.resolve({ data: [] as unknown[] }),
        getSessionSets(supabase, id)
      ])

      const list = (weRows ?? []) as unknown as WorkoutExerciseFull[]
      setExercises(list)

      // Rendimiento anterior de cada ejercicio
      const history = await Promise.all(
        list.map((we) => supabase.rpc('last_performance', { p_exercise_id: we.exercise_id }))
      )
      const prevMap: Record<string, PreviousSet[]> = {}
      list.forEach((we, i) => {
        const rows = (history[i]?.data ?? []) as { weight: number; reps: number }[]
        prevMap[we.id] = rows.map((r) => ({ weight: Number(r.weight), reps: r.reps }))
      })
      setPrevious(prevMap)

      setDrafts(buildDrafts(list, sets as SessionSet[], prevMap, units))
    } catch {
      toast('No hemos podido cargar la sesion.', 'error')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, id, router, toast])

  useEffect(() => {
    void load()
  }, [load])

  // Aviso al salir con la sesion abierta
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  const volume = useMemo(() => {
    let total = 0
    for (const list of Object.values(drafts)) {
      for (const d of list) {
        if (d.completed && !d.isWarmup) total += toKg(Number(d.weight) || 0, units) * (Number(d.reps) || 0)
      }
    }
    return total
  }, [drafts, units])

  const completedSets = useMemo(
    () => Object.values(drafts).flat().filter((d) => d.completed).length,
    [drafts]
  )

  function patchDraft(weId: string, key: string, patch: Partial<SetDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [weId]: (prev[weId] ?? []).map((d) => (d.key === key ? { ...d, ...patch } : d))
    }))
  }

  async function toggleSet(we: WorkoutExerciseFull, draft: SetDraft) {
    if (!profile || !session) return
    const nextCompleted = !draft.completed

    if (nextCompleted && (!draft.weight || !draft.reps)) {
      toast('Completa peso y repeticiones antes de marcar la serie.', 'error')
      return
    }

    patchDraft(we.id, draft.key, { completed: nextCompleted, saving: true })

    try {
      const saved = await saveSet(supabase, {
        id: draft.id,
        session_id: session.id,
        user_id: profile.id,
        exercise_id: we.exercise_id,
        workout_exercise_id: we.id,
        set_index: draft.setIndex,
        weight: toKg(Number(draft.weight) || 0, units),
        reps: Number(draft.reps) || 0,
        rir: draft.rir === '' ? null : Number(draft.rir),
        is_warmup: draft.isWarmup,
        is_completed: nextCompleted
      })
      patchDraft(we.id, draft.key, { id: (saved as SessionSet).id, saving: false })

      if (nextCompleted && we.rest_seconds > 0) timer.start(we.rest_seconds)
    } catch {
      patchDraft(we.id, draft.key, { completed: !nextCompleted, saving: false })
      toast('No se ha podido guardar la serie.', 'error')
    }
  }

  function addSet(we: WorkoutExerciseFull) {
    setDrafts((prev) => {
      const list = prev[we.id] ?? []
      const nextIndex = list.filter((d) => !d.isWarmup).length + 1
      const last = list[list.length - 1]
      return {
        ...prev,
        [we.id]: [
          ...list,
          {
            key: crypto.randomUUID(),
            setIndex: nextIndex,
            weight: last?.weight ?? '',
            reps: last?.reps ?? '',
            rir: last?.rir ?? '',
            isWarmup: false,
            completed: false
          }
        ]
      }
    })
  }

  async function removeSet(we: WorkoutExerciseFull, draft: SetDraft) {
    if (draft.id) {
      try {
        await deleteSet(supabase, draft.id)
      } catch {
        toast('No se ha podido eliminar la serie.', 'error')
        return
      }
    }
    setDrafts((prev) => ({
      ...prev,
      [we.id]: (prev[we.id] ?? [])
        .filter((d) => d.key !== draft.key)
        .map((d, i) => ({ ...d, setIndex: d.isWarmup ? d.setIndex : i + 1 }))
    }))
  }

  async function onFinish() {
    if (!session) return
    setFinishing(true)
    try {
      const result = await finishSession(supabase, session.id, elapsed, notes || undefined)
      toast(
        result.pr_count > 0
          ? `Entrenamiento guardado · ${result.pr_count} records nuevos`
          : 'Entrenamiento guardado',
        'success'
      )
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast('No se ha podido cerrar el entrenamiento.', 'error')
      setFinishing(false)
    }
  }

  async function onDiscard() {
    if (!session) return
    try {
      await discardSession(supabase, session.id)
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast('No se ha podido descartar la sesion.', 'error')
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 pt-6">
        <Skeleton className="h-16" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  return (
    <>
      <header className="safe-top sticky top-0 z-30 -mx-4 mb-4 border-b border-ink-800 bg-ink-950/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setConfirmDiscard(true)}
            className="rounded-lg p-1.5 text-muted hover:bg-ink-800 hover:text-white"
            aria-label="Descartar sesion"
          >
            <X size={20} />
          </button>
          <div className="text-center">
            <p className="text-sm font-medium">{session?.name}</p>
            <p className="font-num text-xs tabular-nums text-accent">{formatDuration(elapsed)}</p>
          </div>
          <Button size="sm" onClick={() => setConfirmFinish(true)}>
            <Flag size={14} /> Terminar
          </Button>
        </div>

        <div className="mt-2 flex justify-center gap-4 text-xs text-muted">
          <span>{completedSets} series</span>
          <span>{formatVolume(volume, units)}</span>
          <button onClick={() => setNotesOpen(true)} className="hover:text-white">
            Notas
          </button>
        </div>
      </header>

      {exercises.length === 0 ? (
        <EmptyState
          title="Este entrenamiento no tiene ejercicios"
          description="Anade ejercicios a la rutina y vuelve a empezar la sesion."
          action={<Button onClick={onDiscard}>Volver al inicio</Button>}
        />
      ) : (
        <div className="space-y-4 pb-32">
          {exercises.map((we) => {
            const list = drafts[we.id] ?? []
            const prev = previous[we.id] ?? []
            return (
              <Card key={we.id} className="p-3">
                <div className="mb-3 flex items-baseline justify-between px-1">
                  <h2 className="text-[15px] font-semibold">{exerciseName(we.exercise, locale)}</h2>
                  <span className="text-xs text-muted">
                    {we.target_sets}×{we.target_reps_min ?? '-'} · {we.rest_seconds}s
                  </span>
                </div>

                <div className="mb-1 grid grid-cols-[30px_52px_1fr_1fr_44px_38px_26px] gap-1.5 px-2 text-[10px] text-muted">
                  <span>#</span>
                  <span>Antes</span>
                  <span className="text-center">{units}</span>
                  <span className="text-center">reps</span>
                  <span className="text-center">RIR</span>
                  <span />
                  <span />
                </div>

                <div className="space-y-1.5">
                  {list.map((draft, i) => (
                    <SetRow
                      key={draft.key}
                      draft={draft}
                      previous={prev[i]}
                      units={units}
                      onChange={(patch) => patchDraft(we.id, draft.key, patch)}
                      onToggle={() => toggleSet(we, draft)}
                      onRepeatPrevious={() => {
                        const p = prev[i]
                        if (!p) return
                        patchDraft(we.id, draft.key, {
                          weight: String(toDisplayWeight(p.weight, units)),
                          reps: String(p.reps)
                        })
                      }}
                      onDelete={() => removeSet(we, draft)}
                    />
                  ))}
                </div>

                <button
                  onClick={() => addSet(we)}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-ink-700 py-2.5 text-xs text-muted hover:border-accent/40 hover:text-white"
                >
                  <Plus size={14} /> Anadir serie
                </button>
              </Card>
            )
          })}
        </div>
      )}

      {timer.running && (
        <RestTimer
          secondsLeft={timer.secondsLeft}
          total={timer.total}
          onAdd={timer.add}
          onSkip={timer.stop}
        />
      )}

      <Modal
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        title="Notas de la sesion"
        footer={
          <Button fullWidth onClick={() => setNotesOpen(false)}>
            Guardar
          </Button>
        }
      >
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Sensaciones, molestias, cambios de material..."
        />
      </Modal>

      <ConfirmDialog
        open={confirmFinish}
        title="Terminar entrenamiento"
        message={`${completedSets} series completadas · ${formatVolume(volume, units)} · ${formatDuration(elapsed)}. Se guardaran los records y se actualizara tu racha.`}
        confirmLabel="Terminar"
        destructive={false}
        loading={finishing}
        onConfirm={onFinish}
        onCancel={() => setConfirmFinish(false)}
      />

      <ConfirmDialog
        open={confirmDiscard}
        title="Descartar sesion"
        message="Se descartara este entrenamiento. Las series registradas no contaran para tus estadisticas ni para la racha."
        confirmLabel="Descartar"
        onConfirm={onDiscard}
        onCancel={() => setConfirmDiscard(false)}
      />
    </>
  )
}

// ---------------------------------------------------------------------
// Construye las filas de la sesion: primero lo ya registrado, y si no
// hay nada, tantas series como marque la rutina prellenadas con el
// ultimo rendimiento.
// ---------------------------------------------------------------------
function buildDrafts(
  exercises: WorkoutExerciseFull[],
  sets: SessionSet[],
  previous: Record<string, PreviousSet[]>,
  units: 'kg' | 'lb'
): Record<string, SetDraft[]> {
  const out: Record<string, SetDraft[]> = {}

  for (const we of exercises) {
    const existing = sets
      .filter((s) => s.workout_exercise_id === we.id)
      .sort((a, b) => a.set_index - b.set_index)

    if (existing.length > 0) {
      out[we.id] = existing.map((s) => ({
        id: s.id,
        key: s.id,
        setIndex: s.set_index,
        weight: String(toDisplayWeight(Number(s.weight), units) || ''),
        reps: s.reps ? String(s.reps) : '',
        rir: s.rir === null ? '' : String(s.rir),
        isWarmup: s.is_warmup,
        completed: s.is_completed
      }))
      continue
    }

    const prev = previous[we.id] ?? []
    out[we.id] = Array.from({ length: we.target_sets }, (_, i) => {
      const reference = prev[i] ?? prev[prev.length - 1]
      return {
        key: crypto.randomUUID(),
        setIndex: i + 1,
        weight: reference ? String(toDisplayWeight(reference.weight, units)) : '',
        reps: reference ? String(reference.reps) : we.target_reps_min ? String(we.target_reps_min) : '',
        rir: we.target_rir === null ? '' : String(we.target_rir),
        isWarmup: we.is_warmup,
        completed: false
      }
    })
  }

  return out
}
