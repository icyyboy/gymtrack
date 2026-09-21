'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ArrowLeft, CalendarRange, Plus } from 'lucide-react'
import { useApp } from '@/providers/app-provider'
import { useToast } from '@/providers/toast-provider'
import { getPlan } from '@/lib/data/queries'
import { addExerciseToWorkout, createWorkout, reorderWorkoutExercises } from '@/lib/data/mutations'
import { Button } from '@/components/ui/button'
import { Card, SectionHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState, Skeleton } from '@/components/ui/states'
import { ExercisePicker } from '@/components/routines/exercise-picker'
import { SortableExercise } from '@/components/routines/sortable-exercise'
import { ScheduleEditor } from '@/components/routines/schedule-editor'
import { cn } from '@/lib/utils/cn'
import type { PlanFull, PlanSlot, ScheduleMode, WorkoutExerciseFull } from '@/lib/types'

export default function RoutineDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { supabase, profile } = useApp()
  const toast = useToast()

  const [plan, setPlan] = useState<PlanFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null)
  const [items, setItems] = useState<WorkoutExerciseFull[]>([])
  const [slots, setSlots] = useState<PlanSlot[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [picking, setPicking] = useState(false)
  const [newWorkout, setNewWorkout] = useState(false)
  const [workoutName, setWorkoutName] = useState('')
  const [removing, setRemoving] = useState<WorkoutExerciseFull | null>(null)
  const [tab, setTab] = useState<'workouts' | 'schedule'>('workouts')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const load = useCallback(async () => {
    try {
      const data = await getPlan(supabase, id)
      if (!data) {
        router.replace('/routines')
        return
      }
      setPlan(data)
      setSlots(data.plan_slots)
      setActiveWorkoutId((current) => current ?? data.workouts[0]?.id ?? null)
    } catch {
      toast('No hemos podido cargar la rutina.', 'error')
    } finally {
      setLoading(false)
    }
  }, [supabase, id, router, toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const workout = plan?.workouts.find((w) => w.id === activeWorkoutId)
    setItems(workout?.workout_exercises ?? [])
    setDirty(false)
  }, [plan, activeWorkoutId])

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    const next = arrayMove(items, oldIndex, newIndex)
    setItems(next)
    void reorderWorkoutExercises(supabase, next.map((i) => i.id)).catch(() =>
      toast('No se ha podido guardar el orden.', 'error')
    )
  }

  async function onAddWorkout() {
    if (!profile || !plan || workoutName.trim().length < 2) return
    try {
      const newId = await createWorkout(supabase, profile.id, plan.id, workoutName.trim(), plan.workouts.length)
      setWorkoutName('')
      setNewWorkout(false)
      await load()
      setActiveWorkoutId(newId)
    } catch {
      toast('No se ha podido crear el entrenamiento.', 'error')
    }
  }

  async function onPick(exerciseId: string) {
    if (!profile || !activeWorkoutId) return
    try {
      await addExerciseToWorkout(
        supabase,
        profile.id,
        activeWorkoutId,
        exerciseId,
        items.length,
        profile.default_rest_seconds
      )
      await load()
    } catch {
      toast('No se ha podido anadir el ejercicio.', 'error')
    }
  }

  async function onSaveTargets() {
    setSaving(true)
    try {
      await Promise.all(
        items.map((item) =>
          supabase
            .from('workout_exercises')
            .update({
              target_sets: item.target_sets,
              target_reps_min: item.target_reps_min,
              target_reps_max: item.target_reps_max ?? item.target_reps_min,
              target_rir: item.target_rir,
              rest_seconds: item.rest_seconds,
              is_warmup: item.is_warmup,
              notes: item.notes
            })
            .eq('id', item.id)
        )
      )
      setDirty(false)
      toast('Cambios guardados', 'success')
    } catch {
      toast('No se han podido guardar los cambios.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function onRemoveExercise() {
    if (!removing) return
    try {
      await supabase.from('workout_exercises').delete().eq('id', removing.id)
      setRemoving(null)
      await load()
    } catch {
      toast('No se ha podido quitar el ejercicio.', 'error')
    }
  }

  async function onSaveSchedule(nextMode?: ScheduleMode) {
    if (!plan || !profile) return
    setSaving(true)
    try {
      if (nextMode && nextMode !== plan.mode) {
        await supabase.from('workout_plans').update({ mode: nextMode }).eq('id', plan.id)
      }
      await supabase.from('plan_slots').delete().eq('plan_id', plan.id)
      if (slots.length > 0) {
        await supabase.from('plan_slots').insert(
          slots.map((slot, index) => ({
            plan_id: plan.id,
            user_id: profile.id,
            kind: slot.kind,
            workout_id: slot.kind === 'workout' ? slot.workout_id : null,
            position: index,
            weekday: (nextMode ?? plan.mode) === 'weekly' ? slot.weekday ?? index % 7 : null
          }))
        )
      }
      await load()
      toast('Planificacion guardada', 'success')
    } catch {
      toast('No se ha podido guardar la planificacion.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !plan) {
    return (
      <div className="space-y-3 pt-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    )
  }

  return (
    <>
      <div className="safe-top sticky top-0 z-30 -mx-4 mb-4 border-b border-ink-800/80 bg-ink-950/90 px-4 py-3 backdrop-blur">
        <button onClick={() => router.push('/routines')} className="mb-2 flex items-center gap-1 text-sm text-muted hover:text-white">
          <ArrowLeft size={16} /> Rutinas
        </button>
        <h1 className="text-lg font-semibold tracking-tight">{plan.name}</h1>

        <div className="mt-3 flex gap-1 rounded-xl bg-ink-900 p-1">
          {(['workouts', 'schedule'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex-1 rounded-lg py-2 text-sm transition-colors',
                tab === key ? 'bg-ink-800 text-white' : 'text-muted hover:text-muted-strong'
              )}
            >
              {key === 'workouts' ? 'Entrenamientos' : 'Planificacion'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'workouts' ? (
        <>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {plan.workouts.map((w) => (
              <button
                key={w.id}
                onClick={() => setActiveWorkoutId(w.id)}
                className={cn(
                  'shrink-0 rounded-xl border px-3.5 py-2 text-sm transition-colors',
                  activeWorkoutId === w.id
                    ? 'border-accent bg-accent-soft text-white'
                    : 'border-ink-700 bg-ink-900 text-muted hover:text-white'
                )}
              >
                {w.name}
              </button>
            ))}
            <Button size="sm" variant="secondary" className="shrink-0" onClick={() => setNewWorkout(true)}>
              <Plus size={14} /> Entreno
            </Button>
          </div>

          {plan.workouts.length === 0 ? (
            <EmptyState
              title="Esta rutina esta vacia"
              description="Crea entrenamientos como Push, Pull o Pierna y anade ejercicios a cada uno."
              action={<Button onClick={() => setNewWorkout(true)}>Crear entrenamiento</Button>}
            />
          ) : (
            <>
              <SectionHeader
                title={`${items.length} ejercicios`}
                action={
                  <Button size="sm" variant="secondary" onClick={() => setPicking(true)}>
                    <Plus size={14} /> Ejercicio
                  </Button>
                }
              />

              {items.length === 0 ? (
                <EmptyState
                  title="Sin ejercicios todavia"
                  description="Anade el primero y ajusta series, repeticiones y descanso."
                  action={<Button onClick={() => setPicking(true)}>Anadir ejercicio</Button>}
                />
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  modifiers={[restrictToVerticalAxis]}
                  onDragEnd={onDragEnd}
                >
                  <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                    <ul className="space-y-2">
                      {items.map((item) => (
                        <SortableExercise
                          key={item.id}
                          item={item}
                          locale={profile?.locale ?? 'es'}
                          onChange={(patch) => {
                            setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...patch } : i)))
                            setDirty(true)
                          }}
                          onRemove={() => setRemoving(item)}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              )}

              {dirty && (
                <div className="safe-bottom fixed inset-x-0 bottom-16 z-30 px-4 lg:static lg:mt-4 lg:px-0">
                  <Button fullWidth size="lg" loading={saving} onClick={onSaveTargets}>
                    Guardar cambios
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <Card>
          <div className="mb-4 flex items-center gap-2 text-sm text-muted">
            <CalendarRange size={16} />
            Define el orden de los dias. Puedes usar ciclos de cualquier longitud.
          </div>
          <ScheduleEditor
            plan={plan}
            slots={slots}
            onModeChange={(mode) => {
              setPlan({ ...plan, mode })
              void onSaveSchedule(mode)
            }}
            onSlotsChange={setSlots}
          />
          <Button className="mt-5" fullWidth loading={saving} onClick={() => onSaveSchedule()}>
            Guardar planificacion
          </Button>
        </Card>
      )}

      <ExercisePicker open={picking} onClose={() => setPicking(false)} onSelect={(ex) => onPick(ex.id)} />

      <Modal
        open={newWorkout}
        onClose={() => setNewWorkout(false)}
        title="Nuevo entrenamiento"
        footer={
          <Button fullWidth onClick={onAddWorkout}>
            Crear
          </Button>
        }
      >
        <Input
          label="Nombre"
          value={workoutName}
          onChange={(e) => setWorkoutName(e.target.value)}
          placeholder="Push A"
          autoFocus
        />
      </Modal>

      <ConfirmDialog
        open={!!removing}
        title="Quitar ejercicio"
        message="Se quitara de este entrenamiento. Las series ya registradas en sesiones anteriores no se tocan."
        confirmLabel="Quitar"
        onConfirm={onRemoveExercise}
        onCancel={() => setRemoving(null)}
      />
    </>
  )
}
