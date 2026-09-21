// ---------------------------------------------------------------------
// Escrituras. Las operaciones con reglas de negocio (cerrar sesion,
// duplicar rutina, borrar cuenta) delegan en funciones de Postgres.
// ---------------------------------------------------------------------
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ScheduleMode, WorkoutSession } from '@/lib/types'

type DB = SupabaseClient

export async function createPlan(
  db: DB,
  userId: string,
  input: { name: string; description?: string; mode: ScheduleMode }
) {
  const { data, error } = await db
    .from('workout_plans')
    .insert({ user_id: userId, name: input.name, description: input.description ?? null, mode: input.mode })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

export async function activatePlan(db: DB, userId: string, planId: string) {
  // El indice unico parcial exige desactivar el anterior primero.
  const { error: offError } = await db
    .from('workout_plans')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true)
  if (offError) throw offError

  const { error } = await db
    .from('workout_plans')
    .update({ is_active: true, cycle_start_date: new Date().toISOString().slice(0, 10) })
    .eq('id', planId)
  if (error) throw error
}

export async function deletePlan(db: DB, planId: string) {
  const { error } = await db.from('workout_plans').delete().eq('id', planId)
  if (error) throw error
}

export async function duplicatePlan(db: DB, planId: string) {
  const { data, error } = await db.rpc('duplicate_plan', { p_plan_id: planId })
  if (error) throw error
  return data as string
}

export async function createWorkout(db: DB, userId: string, planId: string, name: string, position: number) {
  const { data, error } = await db
    .from('workouts')
    .insert({ user_id: userId, plan_id: planId, name, position })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

export async function addExerciseToWorkout(
  db: DB,
  userId: string,
  workoutId: string,
  exerciseId: string,
  position: number,
  restSeconds = 120
) {
  const { error } = await db.from('workout_exercises').insert({
    user_id: userId,
    workout_id: workoutId,
    exercise_id: exerciseId,
    position,
    rest_seconds: restSeconds
  })
  if (error) throw error
}

export async function reorderWorkoutExercises(db: DB, orderedIds: string[]) {
  // Una actualizacion por fila: el volumen es pequeno (ejercicios de un dia).
  await Promise.all(
    orderedIds.map((id, index) =>
      db.from('workout_exercises').update({ position: index }).eq('id', id)
    )
  )
}

export async function startSession(
  db: DB,
  userId: string,
  input: { workoutId: string | null; planId: string | null; name: string }
): Promise<WorkoutSession> {
  const { data, error } = await db
    .from('workout_sessions')
    .insert({
      user_id: userId,
      workout_id: input.workoutId,
      plan_id: input.planId,
      name: input.name,
      session_date: new Date().toISOString().slice(0, 10)
    })
    .select('*')
    .single()
  if (error) throw error
  return data as WorkoutSession
}

export interface SetPayload {
  id?: string
  session_id: string
  user_id: string
  exercise_id: string
  workout_exercise_id: string | null
  set_index: number
  weight: number
  reps: number
  rir: number | null
  is_warmup: boolean
  is_completed: boolean
}

/** Crea o actualiza una serie. Devuelve la fila con su id definitivo. */
export async function saveSet(db: DB, payload: SetPayload) {
  const { id, ...values } = payload
  const row = {
    ...values,
    completed_at: values.is_completed ? new Date().toISOString() : null
  }

  if (id) {
    const { data, error } = await db.from('session_sets').update(row).eq('id', id).select('*').single()
    if (error) throw error
    return data
  }

  const { data, error } = await db.from('session_sets').insert(row).select('*').single()
  if (error) throw error
  return data
}

export async function deleteSet(db: DB, setId: string) {
  const { error } = await db.from('session_sets').delete().eq('id', setId)
  if (error) throw error
}

export async function finishSession(db: DB, sessionId: string, durationSeconds: number, notes?: string) {
  const { data, error } = await db.rpc('finish_session', {
    p_session_id: sessionId,
    p_duration_seconds: Math.round(durationSeconds),
    p_notes: notes ?? null
  })
  if (error) throw error
  return data as WorkoutSession
}

export async function discardSession(db: DB, sessionId: string) {
  const { error } = await db.from('workout_sessions').update({ status: 'discarded' }).eq('id', sessionId)
  if (error) throw error
}

export async function deleteAccount(db: DB) {
  const { error } = await db.rpc('delete_own_account')
  if (error) throw error
}
