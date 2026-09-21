-- =====================================================================
-- GymTrack · Esquema de base de datos (Supabase / PostgreSQL)
-- Ejecutar en el SQL Editor de Supabase en este orden:
--   01_schema.sql -> 02_rls.sql -> 03_functions.sql -> 04_seed_exercises.sql
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
do $$ begin
  create type equipment_type as enum (
    'weight_stack', 'plate_loaded', 'cable', 'dumbbell', 'barbell',
    'bodyweight', 'kettlebell', 'band', 'machine_other', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type resistance_type as enum ('constant', 'variable', 'elastic', 'gravity', 'hydraulic', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type schedule_mode as enum ('weekly', 'sequential');
exception when duplicate_object then null; end $$;

do $$ begin
  create type slot_kind as enum ('workout', 'rest');
exception when duplicate_object then null; end $$;

do $$ begin
  create type session_status as enum ('in_progress', 'completed', 'discarded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type record_kind as enum ('max_weight', 'estimated_1rm', 'max_volume_set', 'max_reps');
exception when duplicate_object then null; end $$;

do $$ begin
  create type unit_system as enum ('kg', 'lb');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Perfiles
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  username          text not null unique
                      check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name      text check (char_length(display_name) <= 40),
  avatar_url        text,
  bio               text check (char_length(bio) <= 200),
  locale            text not null default 'es' check (locale in ('es', 'en')),
  units             unit_system not null default 'kg',
  default_rest_seconds int not null default 120 check (default_rest_seconds between 0 and 900),
  show_in_leaderboard  boolean not null default true,
  notifications_enabled boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Catalogo de ejercicios
-- ---------------------------------------------------------------------
create table if not exists public.muscle_groups (
  id        text primary key,               -- slug: 'chest', 'back', ...
  name_es   text not null,
  name_en   text not null,
  region    text not null default 'other',  -- upper / lower / core
  position  int  not null default 0
);

create table if not exists public.exercises (
  id                 uuid primary key default gen_random_uuid(),
  slug               text unique,
  name_es            text not null,
  name_en            text not null,
  primary_muscle_id  text not null references public.muscle_groups(id),
  equipment          equipment_type not null default 'other',
  resistance         resistance_type not null default 'constant',
  is_compound        boolean not null default false,
  is_unilateral      boolean not null default false,
  description_es     text,
  description_en     text,
  instructions_es    text,
  instructions_en    text,
  image_url          text,
  thumbnail_url      text,
  video_url          text,
  is_active          boolean not null default true,
  -- null = ejercicio global del catalogo; uuid = ejercicio propio del usuario
  owner_id           uuid references public.profiles(id) on delete cascade,
  created_at         timestamptz not null default now()
);

create table if not exists public.exercise_secondary_muscles (
  exercise_id      uuid not null references public.exercises(id) on delete cascade,
  muscle_group_id  text not null references public.muscle_groups(id) on delete cascade,
  primary key (exercise_id, muscle_group_id)
);

create index if not exists exercises_primary_muscle_idx on public.exercises(primary_muscle_id);
create index if not exists exercises_equipment_idx on public.exercises(equipment);
create index if not exists exercises_owner_idx on public.exercises(owner_id);

-- ---------------------------------------------------------------------
-- Rutinas (plan) -> entrenamientos (workout) -> ejercicios
-- ---------------------------------------------------------------------
create table if not exists public.workout_plans (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 60),
  description   text check (char_length(description) <= 300),
  mode          schedule_mode not null default 'sequential',
  is_active     boolean not null default false,
  -- ancla para el modo secuencial: fecha en la que empieza el slot 0
  cycle_start_date date not null default current_date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists workout_plans_user_idx on public.workout_plans(user_id);
-- solo un plan activo por usuario
create unique index if not exists one_active_plan_per_user
  on public.workout_plans(user_id) where is_active;

create table if not exists public.workouts (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.workout_plans(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  notes       text check (char_length(notes) <= 500),
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists workouts_plan_idx on public.workouts(plan_id, position);

create table if not exists public.workout_exercises (
  id                uuid primary key default gen_random_uuid(),
  workout_id        uuid not null references public.workouts(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  exercise_id       uuid not null references public.exercises(id),
  position          int  not null default 0,
  target_sets       int  not null default 3 check (target_sets between 1 and 20),
  target_reps_min   int  check (target_reps_min between 1 and 100),
  target_reps_max   int  check (target_reps_max between 1 and 100),
  target_weight     numeric(7,2) check (target_weight >= 0),
  target_rir        numeric(3,1) check (target_rir between 0 and 10),
  target_rpe        numeric(3,1) check (target_rpe between 1 and 10),
  rest_seconds      int  not null default 120 check (rest_seconds between 0 and 900),
  is_warmup         boolean not null default false,
  notes             text check (char_length(notes) <= 300),
  created_at        timestamptz not null default now()
);

create index if not exists workout_exercises_workout_idx on public.workout_exercises(workout_id, position);

-- ---------------------------------------------------------------------
-- Planificacion
-- Un slot es una posicion del ciclo (modo secuencial)
-- o un dia de la semana (modo weekly, weekday 0=domingo ... 6=sabado).
-- kind='rest' representa un dia de descanso planificado.
-- ---------------------------------------------------------------------
create table if not exists public.plan_slots (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.workout_plans(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        slot_kind not null default 'workout',
  workout_id  uuid references public.workouts(id) on delete cascade,
  position    int not null default 0,          -- modo secuencial
  weekday     int check (weekday between 0 and 6), -- modo weekly
  label       text,
  constraint slot_workout_required check (kind = 'rest' or workout_id is not null)
);

create index if not exists plan_slots_plan_idx on public.plan_slots(plan_id, position);

-- ---------------------------------------------------------------------
-- Sesiones y series
-- ---------------------------------------------------------------------
create table if not exists public.workout_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  workout_id       uuid references public.workouts(id) on delete set null,
  plan_id          uuid references public.workout_plans(id) on delete set null,
  name             text not null,
  session_date     date not null default current_date,
  started_at       timestamptz not null default now(),
  completed_at     timestamptz,
  duration_seconds int not null default 0,
  total_volume     numeric(12,2) not null default 0,
  total_sets       int not null default 0,
  total_reps       int not null default 0,
  pr_count         int not null default 0,
  status           session_status not null default 'in_progress',
  notes            text check (char_length(notes) <= 1000),
  created_at       timestamptz not null default now()
);

create index if not exists sessions_user_date_idx on public.workout_sessions(user_id, session_date desc);
create index if not exists sessions_user_status_idx on public.workout_sessions(user_id, status);

create table if not exists public.session_sets (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references public.workout_sessions(id) on delete cascade,
  user_id             uuid not null references public.profiles(id) on delete cascade,
  exercise_id         uuid not null references public.exercises(id),
  workout_exercise_id uuid references public.workout_exercises(id) on delete set null,
  set_index           int not null check (set_index >= 1),
  weight              numeric(7,2) not null default 0 check (weight >= 0),
  reps                int not null default 0 check (reps >= 0 and reps <= 1000),
  rir                 numeric(3,1) check (rir between 0 and 10),
  rpe                 numeric(3,1) check (rpe between 1 and 10),
  rest_seconds        int check (rest_seconds between 0 and 3600),
  is_warmup           boolean not null default false,
  is_completed        boolean not null default false,
  notes               text check (char_length(notes) <= 300),
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  unique (session_id, workout_exercise_id, set_index)
);

create index if not exists session_sets_session_idx on public.session_sets(session_id);
create index if not exists session_sets_user_exercise_idx on public.session_sets(user_id, exercise_id, completed_at desc);

-- ---------------------------------------------------------------------
-- Records personales
-- ---------------------------------------------------------------------
create table if not exists public.personal_records (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  exercise_id  uuid not null references public.exercises(id) on delete cascade,
  kind         record_kind not null,
  value        numeric(10,2) not null,
  weight       numeric(7,2),
  reps         int,
  session_id   uuid references public.workout_sessions(id) on delete set null,
  set_id       uuid references public.session_sets(id) on delete set null,
  achieved_at  timestamptz not null default now()
);

create index if not exists prs_user_exercise_idx on public.personal_records(user_id, exercise_id, kind, achieved_at desc);

-- ---------------------------------------------------------------------
-- Dias de descanso registrados manualmente (fuera del plan)
-- ---------------------------------------------------------------------
create table if not exists public.rest_days (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references public.profiles(id) on delete cascade,
  day      date not null,
  note     text check (char_length(note) <= 200),
  unique (user_id, day)
);

-- ---------------------------------------------------------------------
-- Estadisticas agregadas (alimentan dashboard y leaderboard)
-- ---------------------------------------------------------------------
create table if not exists public.user_stats (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  total_sessions     int not null default 0,
  total_volume       numeric(14,2) not null default 0,
  total_duration_seconds bigint not null default 0,
  total_sets         int not null default 0,
  total_reps         bigint not null default 0,
  pr_count           int not null default 0,
  current_streak     int not null default 0,
  best_streak        int not null default 0,
  streak_broken_on   date,
  last_session_date  date,
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Web Push (estructura preparada, sin envio todavia)
-- ---------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  workout_reminders  boolean not null default true,
  reminder_time      time not null default '18:00',
  streak_alerts      boolean not null default true,
  pr_alerts          boolean not null default true,
  timezone           text not null default 'Europe/Madrid'
);

create table if not exists public.notifications_outbox (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text,
  url         text,
  send_after  timestamptz not null default now(),
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- updated_at automatico
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists plans_touch on public.workout_plans;
create trigger plans_touch before update on public.workout_plans
  for each row execute function public.touch_updated_at();
