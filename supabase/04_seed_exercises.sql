-- =====================================================================
-- GymTrack · Datos iniciales: grupos musculares y catalogo de ejercicios
-- Idempotente: se puede volver a ejecutar sin duplicar nada.
-- =====================================================================

insert into public.muscle_groups (id, name_es, name_en, region, position) values
  ('chest',      'Pecho',         'Chest',        'upper', 1),
  ('back',       'Espalda',       'Back',         'upper', 2),
  ('shoulders',  'Hombros',       'Shoulders',    'upper', 3),
  ('biceps',     'Biceps',        'Biceps',       'upper', 4),
  ('triceps',    'Triceps',       'Triceps',      'upper', 5),
  ('forearms',   'Antebrazo',     'Forearms',     'upper', 6),
  ('traps',      'Trapecio',      'Traps',        'upper', 7),
  ('quads',      'Cuadriceps',    'Quadriceps',   'lower', 8),
  ('hamstrings', 'Isquiosurales', 'Hamstrings',   'lower', 9),
  ('glutes',     'Gluteos',       'Glutes',       'lower', 10),
  ('calves',     'Gemelos',       'Calves',       'lower', 11),
  ('abs',        'Abdominales',   'Abs',          'core',  12),
  ('lower_back', 'Lumbar',        'Lower back',   'core',  13)
on conflict (id) do update
  set name_es = excluded.name_es, name_en = excluded.name_en,
      region = excluded.region, position = excluded.position;

-- ---------------------------------------------------------------------
-- Ejercicios
-- ---------------------------------------------------------------------
create temporary table seed_ex (
  slug text, name_es text, name_en text, muscle text,
  equipment equipment_type, compound boolean, secondary text
) on commit drop;

insert into seed_ex (slug, name_es, name_en, muscle, equipment, compound, secondary) values
-- Pecho
('bench-press','Press de banca','Bench press','chest','barbell',true,'triceps,shoulders'),
('incline-bench-press','Press inclinado con barra','Incline bench press','chest','barbell',true,'shoulders,triceps'),
('dumbbell-bench-press','Press de banca con mancuernas','Dumbbell bench press','chest','dumbbell',true,'triceps,shoulders'),
('incline-dumbbell-press','Press inclinado con mancuernas','Incline dumbbell press','chest','dumbbell',true,'shoulders,triceps'),
('chest-press-machine','Press de pecho en maquina','Chest press machine','chest','weight_stack',true,'triceps,shoulders'),
('pec-deck','Contractor de pecho','Pec deck','chest','weight_stack',false,'shoulders'),
('cable-crossover','Cruce de poleas','Cable crossover','chest','cable',false,'shoulders'),
('dumbbell-fly','Aperturas con mancuernas','Dumbbell fly','chest','dumbbell',false,'shoulders'),
('push-up','Flexiones','Push-up','chest','bodyweight',true,'triceps,shoulders,abs'),
('dips-chest','Fondos en paralelas','Chest dips','chest','bodyweight',true,'triceps,shoulders'),
-- Espalda
('deadlift','Peso muerto','Deadlift','back','barbell',true,'glutes,hamstrings,lower_back,traps'),
('pull-up','Dominadas','Pull-up','back','bodyweight',true,'biceps,forearms'),
('chin-up','Dominadas supinas','Chin-up','back','bodyweight',true,'biceps'),
('lat-pulldown','Jalon al pecho','Lat pulldown','back','cable',true,'biceps'),
('seated-cable-row','Remo en polea sentado','Seated cable row','back','cable',true,'biceps,traps'),
('barbell-row','Remo con barra','Barbell row','back','barbell',true,'biceps,traps,lower_back'),
('dumbbell-row','Remo con mancuerna','Dumbbell row','back','dumbbell',true,'biceps,traps'),
('t-bar-row','Remo en T','T-bar row','back','plate_loaded',true,'biceps,traps'),
('machine-row','Remo en maquina','Machine row','back','weight_stack',true,'biceps,traps'),
('straight-arm-pulldown','Pullover en polea','Straight-arm pulldown','back','cable',false,'triceps'),
('hyperextension','Hiperextensiones','Back extension','lower_back','bodyweight',false,'glutes,hamstrings'),
-- Hombros
('overhead-press','Press militar','Overhead press','shoulders','barbell',true,'triceps,traps'),
('dumbbell-shoulder-press','Press de hombros con mancuernas','Dumbbell shoulder press','shoulders','dumbbell',true,'triceps'),
('shoulder-press-machine','Press de hombros en maquina','Shoulder press machine','shoulders','weight_stack',true,'triceps'),
('lateral-raise','Elevaciones laterales','Lateral raise','shoulders','dumbbell',false,'traps'),
('cable-lateral-raise','Elevacion lateral en polea','Cable lateral raise','shoulders','cable',false,'traps'),
('rear-delt-fly','Pajaros / deltoide posterior','Rear delt fly','shoulders','dumbbell',false,'traps,back'),
('face-pull','Face pull','Face pull','shoulders','cable',false,'traps,back'),
('front-raise','Elevaciones frontales','Front raise','shoulders','dumbbell',false,'chest'),
('upright-row','Remo al menton','Upright row','shoulders','barbell',true,'traps,biceps'),
-- Trapecio
('barbell-shrug','Encogimientos con barra','Barbell shrug','traps','barbell',false,'forearms'),
('dumbbell-shrug','Encogimientos con mancuernas','Dumbbell shrug','traps','dumbbell',false,'forearms'),
-- Biceps
('barbell-curl','Curl con barra','Barbell curl','biceps','barbell',false,'forearms'),
('dumbbell-curl','Curl con mancuernas','Dumbbell curl','biceps','dumbbell',false,'forearms'),
('hammer-curl','Curl martillo','Hammer curl','biceps','dumbbell',false,'forearms'),
('preacher-curl','Curl predicador','Preacher curl','biceps','plate_loaded',false,'forearms'),
('cable-curl','Curl en polea','Cable curl','biceps','cable',false,'forearms'),
('incline-dumbbell-curl','Curl inclinado','Incline dumbbell curl','biceps','dumbbell',false,'forearms'),
-- Triceps
('close-grip-bench','Press cerrado','Close-grip bench press','triceps','barbell',true,'chest,shoulders'),
('triceps-pushdown','Extension de triceps en polea','Triceps pushdown','triceps','cable',false,''),
('rope-pushdown','Extension con cuerda','Rope pushdown','triceps','cable',false,''),
('overhead-triceps-extension','Extension de triceps sobre la cabeza','Overhead triceps extension','triceps','dumbbell',false,''),
('skull-crusher','Press frances','Skull crusher','triceps','barbell',false,''),
('dips-triceps','Fondos en banco','Bench dips','triceps','bodyweight',true,'chest,shoulders'),
-- Antebrazo
('wrist-curl','Curl de muneca','Wrist curl','forearms','barbell',false,''),
('reverse-curl','Curl inverso','Reverse curl','forearms','barbell',false,'biceps'),
('farmers-walk','Paseo del granjero','Farmer''s walk','forearms','dumbbell',true,'traps,abs'),
-- Cuadriceps
('back-squat','Sentadilla trasera','Back squat','quads','barbell',true,'glutes,hamstrings,lower_back'),
('front-squat','Sentadilla frontal','Front squat','quads','barbell',true,'glutes,abs'),
('hack-squat','Hack squat','Hack squat','quads','plate_loaded',true,'glutes'),
('leg-press','Prensa de piernas','Leg press','quads','plate_loaded',true,'glutes,hamstrings'),
('leg-extension','Extension de cuadriceps','Leg extension','quads','weight_stack',false,''),
('bulgarian-split-squat','Sentadilla bulgara','Bulgarian split squat','quads','dumbbell',true,'glutes,hamstrings'),
('walking-lunge','Zancadas','Walking lunge','quads','dumbbell',true,'glutes,hamstrings'),
('goblet-squat','Sentadilla goblet','Goblet squat','quads','kettlebell',true,'glutes,abs'),
-- Isquiosurales
('romanian-deadlift','Peso muerto rumano','Romanian deadlift','hamstrings','barbell',true,'glutes,lower_back'),
('lying-leg-curl','Curl femoral tumbado','Lying leg curl','hamstrings','weight_stack',false,'calves'),
('seated-leg-curl','Curl femoral sentado','Seated leg curl','hamstrings','weight_stack',false,''),
('good-morning','Buenos dias','Good morning','hamstrings','barbell',true,'glutes,lower_back'),
('nordic-curl','Curl nordico','Nordic curl','hamstrings','bodyweight',true,'glutes'),
-- Gluteos
('hip-thrust','Hip thrust','Hip thrust','glutes','barbell',true,'hamstrings'),
('glute-bridge','Puente de gluteos','Glute bridge','glutes','bodyweight',false,'hamstrings'),
('cable-kickback','Patada de gluteo en polea','Cable kickback','glutes','cable',false,'hamstrings'),
('hip-abduction','Abduccion de cadera','Hip abduction','glutes','weight_stack',false,''),
-- Gemelos
('standing-calf-raise','Elevacion de gemelos de pie','Standing calf raise','calves','plate_loaded',false,''),
('seated-calf-raise','Elevacion de gemelos sentado','Seated calf raise','calves','plate_loaded',false,''),
('leg-press-calf-raise','Gemelos en prensa','Leg press calf raise','calves','plate_loaded',false,''),
-- Abdominales
('cable-crunch','Crunch en polea','Cable crunch','abs','cable',false,''),
('hanging-leg-raise','Elevacion de piernas colgado','Hanging leg raise','abs','bodyweight',false,'forearms'),
('plank','Plancha','Plank','abs','bodyweight',false,'lower_back,shoulders'),
('ab-wheel','Rueda abdominal','Ab wheel rollout','abs','other',false,'lower_back'),
('russian-twist','Giro ruso','Russian twist','abs','other',false,''),
('band-pallof-press','Pallof press con banda','Pallof press','abs','band',false,'shoulders'),
-- Kettlebell / otros
('kettlebell-swing','Swing con kettlebell','Kettlebell swing','glutes','kettlebell',true,'hamstrings,lower_back'),
('band-pull-apart','Aperturas con banda','Band pull-apart','shoulders','band',false,'traps,back')
on conflict do nothing;

insert into public.exercises (
  slug, name_es, name_en, primary_muscle_id, equipment, resistance,
  is_compound, description_es, description_en, instructions_es, instructions_en, is_active)
select
  s.slug, s.name_es, s.name_en, s.muscle, s.equipment,
  case s.equipment when 'cable' then 'constant'::resistance_type
                   when 'band' then 'elastic'::resistance_type
                   when 'bodyweight' then 'gravity'::resistance_type
                   else 'constant'::resistance_type end,
  s.compound,
  'Ejercicio de ' || (select name_es from public.muscle_groups where id = s.muscle) || '.',
  (select name_en from public.muscle_groups where id = s.muscle) || ' exercise.',
  'Controla la fase excentrica y manten una tecnica estable en todo el rango de movimiento.',
  'Control the eccentric phase and keep a stable technique through the full range of motion.',
  true
from seed_ex s
on conflict (slug) do update set
  name_es = excluded.name_es,
  name_en = excluded.name_en,
  primary_muscle_id = excluded.primary_muscle_id,
  equipment = excluded.equipment,
  is_compound = excluded.is_compound;

insert into public.exercise_secondary_muscles (exercise_id, muscle_group_id)
select e.id, trim(m)
from seed_ex s
join public.exercises e on e.slug = s.slug
cross join lateral unnest(string_to_array(s.secondary, ',')) as m
where trim(coalesce(m, '')) <> ''
on conflict do nothing;
