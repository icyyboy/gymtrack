// Diccionarios es/en. Anadir un idioma = anadir una entrada aqui.
export const es = {
  common: {
    save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar', edit: 'Editar',
    duplicate: 'Duplicar', create: 'Crear', add: 'Anadir', back: 'Volver',
    loading: 'Cargando', search: 'Buscar', filters: 'Filtros', all: 'Todos',
    confirm: 'Confirmar', close: 'Cerrar', today: 'Hoy', rest: 'Descanso',
    none: 'Ninguno', optional: 'opcional', retry: 'Reintentar'
  },
  nav: {
    dashboard: 'Inicio', routines: 'Rutinas', exercises: 'Ejercicios',
    calendar: 'Calendario', stats: 'Progreso', leaderboard: 'Ranking',
    profile: 'Perfil', settings: 'Ajustes', logout: 'Cerrar sesion'
  },
  auth: {
    signIn: 'Entrar', signUp: 'Crear cuenta', email: 'Email',
    password: 'Contrasena', username: 'Nombre de usuario',
    forgot: 'He olvidado la contrasena', newPassword: 'Nueva contrasena',
    sendLink: 'Enviar enlace', noAccount: 'Aun no tienes cuenta?',
    hasAccount: 'Ya tienes cuenta?'
  },
  dashboard: {
    todayWorkout: 'Entrenamiento de hoy', nextWorkout: 'Proximo entrenamiento',
    start: 'Empezar entrenamiento', resume: 'Continuar entrenamiento',
    streak: 'Racha', sessions: 'Entrenamientos', volume: 'Volumen total',
    time: 'Tiempo entrenado', records: 'Records recientes',
    restToday: 'Hoy toca descansar', noPlan: 'Todavia no tienes ninguna rutina activa'
  },
  workout: {
    set: 'Serie', weight: 'Peso', reps: 'Reps', rest: 'Descanso',
    addSet: 'Anadir serie', finish: 'Terminar entrenamiento',
    previous: 'Anterior', repeat: 'Repetir anterior', warmup: 'Calentamiento',
    notes: 'Notas', discard: 'Descartar sesion', duration: 'Duracion'
  },
  streak: {
    current: 'Racha actual', best: 'Mejor racha', days: 'dias',
    broken: 'Rota el', atRisk: 'Entrena hoy para no perderla'
  }
} as const

export const en = {
  common: {
    save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit',
    duplicate: 'Duplicate', create: 'Create', add: 'Add', back: 'Back',
    loading: 'Loading', search: 'Search', filters: 'Filters', all: 'All',
    confirm: 'Confirm', close: 'Close', today: 'Today', rest: 'Rest',
    none: 'None', optional: 'optional', retry: 'Retry'
  },
  nav: {
    dashboard: 'Home', routines: 'Routines', exercises: 'Exercises',
    calendar: 'Calendar', stats: 'Progress', leaderboard: 'Leaderboard',
    profile: 'Profile', settings: 'Settings', logout: 'Log out'
  },
  auth: {
    signIn: 'Sign in', signUp: 'Create account', email: 'Email',
    password: 'Password', username: 'Username',
    forgot: 'Forgot your password?', newPassword: 'New password',
    sendLink: 'Send link', noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?'
  },
  dashboard: {
    todayWorkout: "Today's workout", nextWorkout: 'Next workout',
    start: 'Start workout', resume: 'Resume workout',
    streak: 'Streak', sessions: 'Workouts', volume: 'Total volume',
    time: 'Time trained', records: 'Recent records',
    restToday: 'Rest day', noPlan: 'You have no active routine yet'
  },
  workout: {
    set: 'Set', weight: 'Weight', reps: 'Reps', rest: 'Rest',
    addSet: 'Add set', finish: 'Finish workout',
    previous: 'Previous', repeat: 'Repeat previous', warmup: 'Warm-up',
    notes: 'Notes', discard: 'Discard session', duration: 'Duration'
  },
  streak: {
    current: 'Current streak', best: 'Best streak', days: 'days',
    broken: 'Broken on', atRisk: 'Train today to keep it'
  }
} as const

export type Dictionary = typeof es
export const dictionaries = { es, en } as const
