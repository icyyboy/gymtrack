// ---------------------------------------------------------------------
// Capa de acceso a datos. Todas las consultas viven aqui para que las
// pantallas no hablen directamente con Supabase.
// La seguridad la garantiza RLS: estas consultas no filtran por user_id
// salvo cuando hace falta desambiguar.
// ---------------------------------------------------------------------
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ExerciseWithMuscle,
  LeaderboardRow,
  MuscleGroup,
  PersonalRecord,
  PlanFull,
  SessionSet,
  UserStats,
  WorkoutSession
} from '@/lib/types'

type DB = SupabaseClient

const PLAN_SELECT = `
  *,
  workouts:workouts(
    *,
    workout_exercises:workout_exercises(
      *,
      exercise:exercises(*, muscle_group:muscle_groups!exercises_primary_muscle_id_fkey(*))
    )
  ),
  plan_slots:plan_slots(*)
`

function sortPlan(plan: PlanFull): PlanFull {
  plan.workouts.sort((a, b) => a.position - b.position)
  plan.workouts.forEach((w) => w.workout_exercises.sort((a, b) => a.position - b.position))
  plan.plan_slots.sort((a, b) => a.position - b.position)
  return plan
}

export async function getActivePlan(db: DB): Promise<PlanFull | null> {
  const { data, error } = await db
    .from('workout_plans')
    .select(PLAN_SELECT)
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw error
  return data ? sortPlan(data as unknown as PlanFull) : null
}

export async function getPlan(db: DB, planId: string): Promise<PlanFull | null> {
  const { data, error } = await db
    .from('workout_plans')
    .select(PLAN_SELECT)
    .eq('id', planId)
    .maybeSingle()
  if (error) throw error
  return data ? sortPlan(data as unknown as PlanFull) : null
}

export async function getPlans(db: DB) {
  const { data, error } = await db
    .from('workout_plans')
    .select('*, workouts:workouts(id, name, position)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getStats(db: DB, userId: string): Promise<UserStats | null> {
  const { data, error } = await db.from('user_stats').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return (data as UserStats) ?? null
}

export async function getMuscleGroups(db: DB): Promise<MuscleGroup[]> {
  const { data, error } = await db.from('muscle_groups').select('*').order('position')
  if (error) throw error
  return (data as MuscleGroup[]) ?? []
}

export async function getExercises(
  db: DB,
  filters: { muscle?: string; equipment?: string; search?: string; compoundOnly?: boolean } = {}
): Promise<ExerciseWithMuscle[]> {
  let query = db
    .from('exercises')
    .select('*, muscle_group:muscle_groups!exercises_primary_muscle_id_fkey(*)')
    .eq('is_active', true)
    .order('name_es')

  if (filters.muscle) query = query.eq('primary_muscle_id', filters.muscle)
  if (filters.equipment) query = query.eq('equipment', filters.equipment)
  if (filters.compoundOnly) query = query.eq('is_compound', true)
  if (filters.search) {
    const term = `%${filters.search}%`
    query = query.or(`name_es.ilike.${term},name_en.ilike.${term}`)
  }

  const { data, error } = await query.limit(300)
  if (error) throw error
  return (data as unknown as ExerciseWithMuscle[]) ?? []
}

export async function getActiveSession(db: DB): Promise<WorkoutSession | null> {
  const { data, error } = await db
    .from('workout_sessions')
    .select('*')
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as WorkoutSession) ?? null
}

export async function getSessions(db: DB, limit = 50): Promise<WorkoutSession[]> {
  const { data, error } = await db
    .from('workout_sessions')
    .select('*')
    .eq('status', 'completed')
    .order('session_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data as WorkoutSession[]) ?? []
}

export async function getSessionsBetween(db: DB, from: string, to: string): Promise<WorkoutSession[]> {
  const { data, error } = await db
    .from('workout_sessions')
    .select('*')
    .gte('session_date', from)
    .lte('session_date', to)
    .order('session_date')
  if (error) throw error
  return (data as WorkoutSession[]) ?? []
}

export async function getSessionSets(db: DB, sessionId: string): Promise<SessionSet[]> {
  const { data, error } = await db
    .from('session_sets')
    .select('*')
    .eq('session_id', sessionId)
    .order('set_index')
  if (error) throw error
  return (data as SessionSet[]) ?? []
}

export async function getRecords(db: DB, limit = 20) {
  const { data, error } = await db
    .from('personal_records')
    .select('*, exercise:exercises(id, name_es, name_en)')
    .order('achieved_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data as unknown as (PersonalRecord & { exercise: { id: string; name_es: string; name_en: string } })[]) ?? []
}

export type LeaderboardMetric = 'total_sessions' | 'total_volume' | 'current_streak' | 'pr_count'

export async function getLeaderboard(db: DB, metric: LeaderboardMetric): Promise<LeaderboardRow[]> {
  const { data, error } = await db
    .from('leaderboard')
    .select('*')
    .order(metric, { ascending: false })
    .limit(50)
  if (error) throw error
  return (data as LeaderboardRow[]) ?? []
}

/** Series de un ejercicio a lo largo del tiempo, para las graficas de progreso. */
export async function getExerciseHistory(db: DB, exerciseId: string) {
  const { data, error } = await db
    .from('session_sets')
    .select('weight, reps, completed_at, session:workout_sessions!inner(session_date, status)')
    .eq('exercise_id', exerciseId)
    .eq('is_completed', true)
    .eq('is_warmup', false)
    .order('completed_at')
    .limit(500)
  if (error) throw error
  return (data ?? []) as unknown as {
    weight: number
    reps: number
    completed_at: string | null
    session: { session_date: string; status: string }
  }[]
}

/** Volumen agrupado por grupo muscular en los ultimos `days` dias. */
export async function getMuscleDistribution(db: DB, days = 90) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await db
    .from('session_sets')
    .select('weight, reps, exercise:exercises!inner(primary_muscle_id)')
    .eq('is_completed', true)
    .eq('is_warmup', false)
    .gte('completed_at', since.toISOString())
    .limit(3000)
  if (error) throw error

  const totals = new Map<string, number>()
  for (const row of (data ?? []) as unknown as {
    weight: number
    reps: number
    exercise: { primary_muscle_id: string }
  }[]) {
    const key = row.exercise.primary_muscle_id
    totals.set(key, (totals.get(key) ?? 0) + row.weight * row.reps)
  }
  return totals
}
