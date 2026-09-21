# GymTrack

App web de gimnasio: rutinas, registro de series en tiempo real, racha, calendario,
estadisticas y ranking. Next.js + TypeScript + Tailwind + Supabase. Instalable como PWA.

---

## 1. Puesta en marcha

```bash
npm install
cp .env.example .env.local   # rellena las variables
npm run dev                  # http://localhost:3000
```

### Variables de entorno

| Variable | Donde se usa | Obligatoria |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente y servidor | si |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente y servidor | si |
| `NEXT_PUBLIC_SITE_URL` | enlaces de recuperacion de contrasena | recomendada |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | suscripcion a Web Push | solo para notificaciones |
| `SUPABASE_SERVICE_ROLE_KEY` | envio de push desde el servidor | solo backend, nunca `NEXT_PUBLIC_` |
| `VAPID_PRIVATE_KEY` | firma de las notificaciones | solo backend |

---

## 2. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecuta los archivos de `supabase/` **en este orden**:
   - `01_schema.sql` — tablas, tipos, indices
   - `02_rls.sql` — Row Level Security y vista del ranking
   - `03_functions.sql` — triggers, racha, cierre de sesion, PRs
   - `04_seed_exercises.sql` — 13 grupos musculares y ~75 ejercicios ES/EN
   - `05_storage.sql` — bucket `avatars` y sus politicas
3. **Authentication → Providers**: deja activo *Email*.
4. **Authentication → URL Configuration**: añade `http://localhost:3000/auth/callback`
   y `https://TU-DOMINIO.vercel.app/auth/callback` a las *Redirect URLs*.
5. Si quieres probar sin confirmar el correo, desactiva *Confirm email* mientras desarrollas.

Copia la URL y la `anon key` desde **Project Settings → API** a tu `.env.local`.

---

## 3. Arquitectura

```
src/
  app/
    (auth)/            login, registro, recuperacion de contrasena
    (app)/             zona privada: dashboard, rutinas, sesion, calendario,
                       progreso, ranking, perfil, ajustes
    auth/callback/     intercambio del code de Supabase por sesion
  components/
    ui/                botones, inputs, modal, toasts, estados vacios
    layout/            navegacion inferior (movil) y lateral (escritorio)
    routines/          selector de ejercicios, lista ordenable, planificador
    session/           fila de serie y temporizador de descanso
    calendar/ stats/   heatmap y graficas
  lib/
    supabase/          clientes de navegador, servidor y middleware
    data/              queries.ts (lecturas) y mutations.ts (escrituras)
    i18n/              diccionarios es/en y nombres de ejercicios
    scheduler.ts       que toca entrenar cada dia
    streak.ts          reglas de racha en cliente
  providers/           sesion + perfil, y sistema de avisos
supabase/              SQL: esquema, RLS, funciones, seed, storage
```

**Principio**: las pantallas nunca hablan con Supabase directamente, siempre a traves
de `lib/data`. La logica con reglas (cerrar sesion, detectar PRs, calcular racha,
duplicar rutina, borrar cuenta) vive en funciones de Postgres, no en el navegador.

### Modelo de datos

```
profiles ──< workout_plans ──< workouts ──< workout_exercises >── exercises >── muscle_groups
   │               │                                                  │
   │               └──< plan_slots (dia del ciclo o de la semana)      │
   │                                                                   │
   ├──< workout_sessions ──< session_sets >───────────────────────────┘
   ├──< personal_records
   ├──< rest_days
   ├──  user_stats (1:1, agregados para dashboard y ranking)
   └──< push_subscriptions / notification_preferences / notifications_outbox
```

### Seguridad

- RLS activo en todas las tablas; el patron por defecto es `user_id = auth.uid()`.
- El catalogo de ejercicios es de lectura; los ejercicios propios (`owner_id`) solo los toca su dueño.
- El ranking se sirve de la vista `leaderboard` con `security_invoker`, que expone
  unicamente username, avatar y metricas agregadas de quien tiene el ranking activado.
- `finish_session`, `recalc_user_stats` y `delete_own_account` son `security definer`
  y comprueban `auth.uid()`: el frontend no puede inflar volumen ni records.
- El middleware protege las rutas en el borde; el layout privado vuelve a comprobar la sesion.

### Planificacion

Dos modos por rutina:

- **Ciclo secuencial**: los dias se recorren en bucle desde `cycle_start_date`
  (Push → Pull → Legs → descanso → Push...), con la longitud que quieras.
- **Dias fijos**: cada slot se ancla a un dia de la semana.

### Racha

Regla actual: hasta **2 dias de descanso consecutivos** sin romper la racha.
Se cambia en un solo sitio (`max_rest_days` en `compute_streak`, y la constante
equivalente en `lib/streak.ts` para la previsualizacion del cliente).

---

## 4. Estado del proyecto

Implementado y conectado a Supabase:

- Registro, login, logout, recuperacion y cambio de contrasena, username unico, avatar.
- Dashboard con entreno de hoy, proximo, racha, volumen, tiempo y records.
- Rutinas: crear, editar, duplicar, eliminar, activar; entrenamientos dentro de la rutina;
  añadir/quitar ejercicios, reordenar con drag & drop, series, reps, RIR, descanso, calentamiento.
- Planificacion secuencial o por dias de la semana, con dias de descanso.
- Catalogo de ~75 ejercicios ES/EN filtrable por musculo, material y nombre.
- Sesion de entrenamiento: registro rapido por serie, rendimiento anterior, repetir serie,
  editar y borrar series, temporizador de descanso, notas, cierre con volumen, duracion y PRs.
- Calendario heatmap con entrenado / descanso / planificado / perdido.
- Estadisticas: volumen semanal, evolucion por ejercicio, distribucion muscular, frecuencia, PRs.
- Ranking por entrenos, volumen, racha y records, con opcion de no aparecer.
- Ajustes: perfil, avatar, idioma, unidades kg/lb, privacidad, notificaciones, eliminar cuenta.
- PWA instalable con service worker y listener `push` ya preparado.

Siguientes pasos naturales:

- Envio real de Web Push (Edge Function que lea `notifications_outbox` con las claves VAPID).
- Rankings semanales, mensuales y entre amigos (la vista ya aisla los campos publicos).
- Supersets, ejercicios propios desde la UI, historial por ejercicio dentro de la sesion.
- Tests de la logica de racha y scheduler.

---

## 5. Deploy en Vercel

1. Sube el repositorio a GitHub e importalo en Vercel.
2. Añade las variables de entorno del apartado 1 (las `NEXT_PUBLIC_*` y, si usas push,
   tambien las privadas).
3. Añade la URL de produccion a las *Redirect URLs* de Supabase.
4. Deploy. El service worker solo se registra en produccion.
