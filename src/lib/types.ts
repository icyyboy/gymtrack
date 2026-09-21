// ---------------------------------------------------------------------
// Tipos de dominio. Reflejan el esquema de supabase/01_schema.sql.
// ---------------------------------------------------------------------

export type Equipment =
  | 'weight_stack'
  | 'plate_loaded'
  | 'cable'
  | 'dumbbell'
  | 'barbell'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'machine_other'
  | 'other'

export type ResistanceType = 'constant' | 'variable' | 'elastic' | 'gravity' | 'hydraulic' | 'other'
export type ScheduleMode = 'weekly' | 'sequential'
export type SlotKind = 'workout' | 'rest'
export type SessionStatus = 'in_progress' | 'completed' | 'discarded'
export type RecordKind = 'max_weight' | 'estimated_1rm' | 'max_volume_set' | 'max_reps'
export type Units = 'kg' | 'lb'
export type Locale = 'es' | 'en'

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  locale: Locale
  units: Units
  default_rest_seconds: number
  show_in_leaderboard: boolean
  notifications_enabled: boolean
  created_at: string
  updated_at: string
}

export interface MuscleGroup {
  id: string
  name_es: string
  name_en: string
  region: string
  position: number
}

export interface Exercise {
  id: string
  slug: string | null
  name_es: string
  name_en: string
  primary_muscle_id: string
  equipment: Equipment
  resistance: ResistanceType
  is_compound: boolean
  is_unilateral: boolean
  description_es: string | null
  description_en: string | null
  instructions_es: string | null
  instructions_en: string | null
  image_url: string | null
  thumbnail_url: string | null
  video_url: string | null
  is_active: boolean
  owner_id: string | null
  created_at: string
}

export interface WorkoutPlan {
  id: string
  user_id: string
  name: string
  description: string | null
  mode: ScheduleMode
  is_active: boolean
  cycle_start_date: string
  created_at: string
  updated_at: string
}

export interface Workout {
  id: string
  plan_id: string
  user_id: string
  name: string
  notes: string | null
  position: number
  created_at: string
}

export interface WorkoutExercise {
  id: string
  workout_id: string
  user_id: string
  exercise_id: string
  position: number
  target_sets: number
  target_reps_min: number | null
  target_reps_max: number | null
  target_weight: number | null
  target_rir: number | null
  target_rpe: number | null
  rest_seconds: number
  is_warmup: boolean
  notes: string | null
  created_at: string
}

export interface PlanSlot {
  id: string
  plan_id: string
  user_id: string
  kind: SlotKind
  workout_id: string | null
  position: number
  weekday: number | null
  label: string | null
}

export interface WorkoutSession {
  id: string
  user_id: string
  workout_id: string | null
  plan_id: string | null
  name: string
  session_date: string
  started_at: string
  completed_at: string | null
  duration_seconds: number
  total_volume: number
  total_sets: number
  total_reps: number
  pr_count: number
  status: SessionStatus
  notes: string | null
  created_at: string
}

export interface SessionSet {
  id: string
  session_id: string
  user_id: string
  exercise_id: string
  workout_exercise_id: string | null
  set_index: number
  weight: number
  reps: number
  rir: number | null
  rpe: number | null
  rest_seconds: number | null
  is_warmup: boolean
  is_completed: boolean
  notes: string | null
  completed_at: string | null
  created_at: string
}

export interface PersonalRecord {
  id: string
  user_id: string
  exercise_id: string
  kind: RecordKind
  value: number
  weight: number | null
  reps: number | null
  session_id: string | null
  achieved_at: string
}

export interface UserStats {
  user_id: string
  total_sessions: number
  total_volume: number
  total_duration_seconds: number
  total_sets: number
  total_reps: number
  pr_count: number
  current_streak: number
  best_streak: number
  streak_broken_on: string | null
  last_session_date: string | null
  updated_at: string
}

export interface LeaderboardRow {
  user_id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  total_sessions: number
  total_volume: number
  current_streak: number
  best_streak: number
  pr_count: number
  last_session_date: string | null
}

export interface RestDay {
  id: string
  user_id: string
  day: string
  note: string | null
}

// Tipos compuestos usados en la UI
export type ExerciseWithMuscle = Exercise & { muscle_group: MuscleGroup | null }
export type WorkoutExerciseFull = WorkoutExercise & { exercise: ExerciseWithMuscle }
export type WorkoutFull = Workout & { workout_exercises: WorkoutExerciseFull[] }
export type PlanFull = WorkoutPlan & { workouts: WorkoutFull[]; plan_slots: PlanSlot[] }
