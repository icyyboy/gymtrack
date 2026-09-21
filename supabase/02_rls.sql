-- =====================================================================
-- GymTrack · Row Level Security
-- Regla general: cada usuario solo lee y escribe sus propias filas.
-- Excepciones: catalogo de ejercicios (lectura publica) y leaderboard.
-- =====================================================================

alter table public.profiles                   enable row level security;
alter table public.muscle_groups              enable row level security;
alter table public.exercises                  enable row level security;
alter table public.exercise_secondary_muscles enable row level security;
alter table public.workout_plans              enable row level security;
alter table public.workouts                   enable row level security;
alter table public.workout_exercises          enable row level security;
alter table public.plan_slots                 enable row level security;
alter table public.workout_sessions           enable row level security;
alter table public.session_sets               enable row level security;
alter table public.personal_records           enable row level security;
alter table public.rest_days                  enable row level security;
alter table public.user_stats                 enable row level security;
alter table public.push_subscriptions         enable row level security;
alter table public.notification_preferences   enable row level security;
alter table public.notifications_outbox       enable row level security;

-- ---------------------------------------------------------------------
-- profiles
-- Lectura: el propio perfil siempre; el de otros solo si participa
-- en el leaderboard (y desde la app solo se leen campos publicos).
-- ---------------------------------------------------------------------
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles
  for select to authenticated
  using (id = auth.uid() or show_in_leaderboard);

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles delete own" on public.profiles;
create policy "profiles delete own" on public.profiles
  for delete to authenticated using (id = auth.uid());

-- ---------------------------------------------------------------------
-- Catalogo: lectura para cualquier usuario autenticado.
-- Los ejercicios propios (owner_id) los gestiona su dueno.
-- ---------------------------------------------------------------------
drop policy if exists "muscle groups read" on public.muscle_groups;
create policy "muscle groups read" on public.muscle_groups
  for select to authenticated using (true);

drop policy if exists "exercises read" on public.exercises;
create policy "exercises read" on public.exercises
  for select to authenticated
  using (owner_id is null or owner_id = auth.uid());

drop policy if exists "exercises write own" on public.exercises;
create policy "exercises write own" on public.exercises
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "secondary muscles read" on public.exercise_secondary_muscles;
create policy "secondary muscles read" on public.exercise_secondary_muscles
  for select to authenticated using (true);

-- ---------------------------------------------------------------------
-- Datos del usuario: un unico patron repetido por tabla
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'workout_plans', 'workouts', 'workout_exercises', 'plan_slots',
    'workout_sessions', 'session_sets', 'personal_records', 'rest_days',
    'push_subscriptions', 'notification_preferences', 'notifications_outbox'
  ] loop
    execute format('drop policy if exists "owner all" on public.%I', t);
    execute format(
      'create policy "owner all" on public.%I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- user_stats
-- Lectura propia + lectura de usuarios que participan en el leaderboard.
-- La escritura solo ocurre dentro de funciones security definer.
-- ---------------------------------------------------------------------
drop policy if exists "stats read" on public.user_stats;
create policy "stats read" on public.user_stats
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = user_stats.user_id and p.show_in_leaderboard
    )
  );

-- ---------------------------------------------------------------------
-- Vista publica del leaderboard: solo campos no sensibles.
-- security_invoker fuerza que se apliquen las policies de quien consulta.
-- ---------------------------------------------------------------------
drop view if exists public.leaderboard;
create view public.leaderboard
with (security_invoker = on) as
select
  p.id            as user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  s.total_sessions,
  s.total_volume,
  s.current_streak,
  s.best_streak,
  s.pr_count,
  s.last_session_date
from public.profiles p
join public.user_stats s on s.user_id = p.id
where p.show_in_leaderboard;

grant select on public.leaderboard to authenticated;
