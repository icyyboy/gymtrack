-- =====================================================================
-- GymTrack · Funciones, triggers y RPC
-- Toda la logica sensible (cierre de sesion, PRs, racha, estadisticas)
-- vive aqui para no depender de la validacion del frontend.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Alta de usuario: crea perfil, estadisticas y preferencias
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  desired text := lower(coalesce(new.raw_user_meta_data->>'username', ''));
  final_username text;
begin
  if desired !~ '^[a-z0-9_]{3,20}$' then
    desired := 'user_' || substr(replace(new.id::text, '-', ''), 1, 10);
  end if;

  final_username := desired;
  while exists (select 1 from public.profiles where username = final_username) loop
    final_username := substr(desired, 1, 14) || substr(md5(random()::text), 1, 5);
  end loop;

  insert into public.profiles (id, username, display_name, locale)
  values (
    new.id,
    final_username,
    nullif(new.raw_user_meta_data->>'display_name', ''),
    coalesce(nullif(new.raw_user_meta_data->>'locale', ''), 'es')
  );

  insert into public.user_stats (user_id) values (new.id);
  insert into public.notification_preferences (user_id) values (new.id);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2. Disponibilidad de username (para el registro)
-- ---------------------------------------------------------------------
create or replace function public.username_available(p_username text)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select lower(p_username) ~ '^[a-z0-9_]{3,20}$'
     and not exists (select 1 from public.profiles where username = lower(p_username));
$$;

grant execute on function public.username_available(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Racha
-- Regla: como maximo 2 dias de descanso consecutivos entre dos
-- entrenamientos (es decir, una diferencia maxima de 3 dias).
-- Cambiar STREAK_MAX_REST_DAYS es el unico ajuste necesario si la
-- regla evoluciona.
-- ---------------------------------------------------------------------
create or replace function public.compute_streak(p_user_id uuid)
returns table (current_streak int, best_streak int, broken_on date)
language plpgsql
security definer set search_path = public
stable
as $$
declare
  max_rest_days constant int := 2;              -- regla configurable
  max_gap       constant int := max_rest_days + 1;
  d             date;
  prev          date := null;
  run           int := 0;
  best          int := 0;
  cur           int := 0;
  last_break    date := null;
  is_first      boolean := true;
  last_day      date;
begin
  select max(session_date) into last_day
  from public.workout_sessions
  where user_id = p_user_id and status = 'completed';

  if last_day is null then
    return query select 0, 0, null::date;
    return;
  end if;

  -- recorrido cronologico de los dias con entrenamiento completado
  for d in
    select distinct session_date
    from public.workout_sessions
    where user_id = p_user_id and status = 'completed'
    order by session_date
  loop
    if is_first then
      run := 1;
      is_first := false;
    elsif (d - prev) <= max_gap then
      run := run + 1;
    else
      last_break := prev + max_gap;   -- dia en el que se perdio la racha
      run := 1;
    end if;

    if run > best then best := run; end if;
    prev := d;
  end loop;

  -- la racha sigue viva si todavia se puede entrenar sin superar el limite
  if (current_date - last_day) <= max_gap then
    cur := run;
  else
    cur := 0;
    last_break := last_day + max_gap;
  end if;

  return query select cur, best, last_break;
end $$;

-- ---------------------------------------------------------------------
-- 4. Recalculo de estadisticas agregadas
-- ---------------------------------------------------------------------
create or replace function public.recalc_user_stats(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  s record;
  st record;
begin
  select
    count(*)                                   as sessions,
    coalesce(sum(total_volume), 0)             as volume,
    coalesce(sum(duration_seconds), 0)         as duration,
    coalesce(sum(total_sets), 0)               as sets,
    coalesce(sum(total_reps), 0)               as reps,
    max(session_date)                          as last_date
  into s
  from public.workout_sessions
  where user_id = p_user_id and status = 'completed';

  select * into st from public.compute_streak(p_user_id);

  insert into public.user_stats as us (
    user_id, total_sessions, total_volume, total_duration_seconds,
    total_sets, total_reps, pr_count, current_streak, best_streak,
    streak_broken_on, last_session_date, updated_at
  )
  values (
    p_user_id, s.sessions, s.volume, s.duration, s.sets, s.reps,
    (select count(*) from public.personal_records where user_id = p_user_id),
    st.current_streak, st.best_streak, st.broken_on, s.last_date, now()
  )
  on conflict (user_id) do update set
    total_sessions         = excluded.total_sessions,
    total_volume           = excluded.total_volume,
    total_duration_seconds = excluded.total_duration_seconds,
    total_sets             = excluded.total_sets,
    total_reps             = excluded.total_reps,
    pr_count               = excluded.pr_count,
    current_streak         = excluded.current_streak,
    best_streak            = greatest(us.best_streak, excluded.best_streak),
    streak_broken_on       = excluded.streak_broken_on,
    last_session_date      = excluded.last_session_date,
    updated_at             = now();
end $$;

grant execute on function public.recalc_user_stats(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Cerrar una sesion de entrenamiento
--    Calcula volumen, duracion, detecta PRs y actualiza estadisticas.
-- ---------------------------------------------------------------------
create or replace function public.finish_session(
  p_session_id uuid,
  p_duration_seconds int default null,
  p_notes text default null
)
returns public.workout_sessions
language plpgsql
security definer set search_path = public
as $$
declare
  sess public.workout_sessions;
  agg record;
  r record;
  prev_best numeric;
  new_prs int := 0;
begin
  select * into sess from public.workout_sessions where id = p_session_id;
  if sess is null then
    raise exception 'session_not_found';
  end if;
  if sess.user_id <> auth.uid() then
    raise exception 'not_authorized';
  end if;
  if sess.status = 'completed' then
    return sess;
  end if;

  -- El volumen excluye las series de calentamiento
  select
    coalesce(sum(case when not is_warmup then weight * reps else 0 end), 0) as volume,
    count(*)                                                               as sets,
    coalesce(sum(reps), 0)                                                 as reps
  into agg
  from public.session_sets
  where session_id = p_session_id and is_completed;

  -- Deteccion de records por ejercicio (solo series efectivas)
  for r in
    select
      exercise_id,
      max(weight)                                      as max_weight,
      max(weight * (1 + reps::numeric / 30))           as best_1rm,
      max(weight * reps)                               as best_set_volume,
      max(reps)                                        as max_reps
    from public.session_sets
    where session_id = p_session_id and is_completed and not is_warmup and reps > 0
    group by exercise_id
  loop
    -- max_weight
    select coalesce(max(value), 0) into prev_best
    from public.personal_records
    where user_id = sess.user_id and exercise_id = r.exercise_id and kind = 'max_weight';
    if r.max_weight > prev_best then
      insert into public.personal_records (user_id, exercise_id, kind, value, weight, session_id)
      values (sess.user_id, r.exercise_id, 'max_weight', r.max_weight, r.max_weight, p_session_id);
      new_prs := new_prs + 1;
    end if;

    -- 1RM estimado (Epley)
    select coalesce(max(value), 0) into prev_best
    from public.personal_records
    where user_id = sess.user_id and exercise_id = r.exercise_id and kind = 'estimated_1rm';
    if r.best_1rm > prev_best then
      insert into public.personal_records (user_id, exercise_id, kind, value, session_id)
      values (sess.user_id, r.exercise_id, 'estimated_1rm', round(r.best_1rm, 2), p_session_id);
      new_prs := new_prs + 1;
    end if;

    -- volumen de una serie
    select coalesce(max(value), 0) into prev_best
    from public.personal_records
    where user_id = sess.user_id and exercise_id = r.exercise_id and kind = 'max_volume_set';
    if r.best_set_volume > prev_best then
      insert into public.personal_records (user_id, exercise_id, kind, value, session_id)
      values (sess.user_id, r.exercise_id, 'max_volume_set', r.best_set_volume, p_session_id);
      new_prs := new_prs + 1;
    end if;
  end loop;

  update public.workout_sessions
  set status           = 'completed',
      completed_at     = now(),
      duration_seconds = greatest(
                           coalesce(p_duration_seconds, extract(epoch from (now() - started_at))::int),
                           0),
      total_volume     = agg.volume,
      total_sets       = agg.sets,
      total_reps       = agg.reps,
      pr_count         = new_prs,
      notes            = coalesce(p_notes, notes),
      session_date     = coalesce(session_date, current_date)
  where id = p_session_id
  returning * into sess;

  perform public.recalc_user_stats(sess.user_id);
  return sess;
end $$;

grant execute on function public.finish_session(uuid, int, text) to authenticated;

-- ---------------------------------------------------------------------
-- 6. Rendimiento anterior de un ejercicio (para mostrarlo al entrenar)
-- ---------------------------------------------------------------------
create or replace function public.last_performance(p_exercise_id uuid)
returns table (
  session_id uuid,
  session_date date,
  set_index int,
  weight numeric,
  reps int,
  rir numeric
)
language sql
security invoker set search_path = public
stable
as $$
  with last_session as (
    select s.id, s.session_date
    from public.workout_sessions s
    join public.session_sets ss on ss.session_id = s.id
    where s.user_id = auth.uid()
      and s.status = 'completed'
      and ss.exercise_id = p_exercise_id
      and ss.is_completed
    order by s.session_date desc, s.completed_at desc
    limit 1
  )
  select ls.id, ls.session_date, ss.set_index, ss.weight, ss.reps, ss.rir
  from last_session ls
  join public.session_sets ss on ss.session_id = ls.id
  where ss.exercise_id = p_exercise_id and ss.is_completed
  order by ss.set_index;
$$;

grant execute on function public.last_performance(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 7. Duplicar una rutina completa
-- ---------------------------------------------------------------------
create or replace function public.duplicate_plan(p_plan_id uuid, p_name text default null)
returns uuid
language plpgsql
security invoker set search_path = public
as $$
declare
  new_plan_id uuid;
  w record;
  new_workout_id uuid;
  id_map jsonb := '{}'::jsonb;
begin
  insert into public.workout_plans (user_id, name, description, mode, cycle_start_date)
  select user_id,
         coalesce(p_name, name || ' (copia)'),
         description, mode, current_date
  from public.workout_plans where id = p_plan_id
  returning id into new_plan_id;

  for w in select * from public.workouts where plan_id = p_plan_id order by position loop
    insert into public.workouts (plan_id, user_id, name, notes, position)
    values (new_plan_id, w.user_id, w.name, w.notes, w.position)
    returning id into new_workout_id;

    id_map := id_map || jsonb_build_object(w.id::text, new_workout_id::text);

    insert into public.workout_exercises (
      workout_id, user_id, exercise_id, position, target_sets, target_reps_min,
      target_reps_max, target_weight, target_rir, target_rpe, rest_seconds, is_warmup, notes)
    select new_workout_id, user_id, exercise_id, position, target_sets, target_reps_min,
           target_reps_max, target_weight, target_rir, target_rpe, rest_seconds, is_warmup, notes
    from public.workout_exercises where workout_id = w.id;
  end loop;

  insert into public.plan_slots (plan_id, user_id, kind, workout_id, position, weekday, label)
  select new_plan_id, user_id, kind,
         case when workout_id is null then null
              else (id_map ->> workout_id::text)::uuid end,
         position, weekday, label
  from public.plan_slots where plan_id = p_plan_id;

  return new_plan_id;
end $$;

grant execute on function public.duplicate_plan(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 8. Eliminar la cuenta del usuario autenticado
-- ---------------------------------------------------------------------
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer set search_path = public, auth
as $$
begin
  delete from auth.users where id = auth.uid();
end $$;

grant execute on function public.delete_own_account() to authenticated;
