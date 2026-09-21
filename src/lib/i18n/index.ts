import type { Exercise, Locale, MuscleGroup, Equipment } from '@/lib/types'
export { dictionaries, type Dictionary } from './dictionaries'

export function exerciseName(exercise: Pick<Exercise, 'name_es' | 'name_en'>, locale: Locale) {
  return locale === 'en' ? exercise.name_en : exercise.name_es
}

export function muscleName(group: Pick<MuscleGroup, 'name_es' | 'name_en'> | null, locale: Locale) {
  if (!group) return ''
  return locale === 'en' ? group.name_en : group.name_es
}

export const equipmentLabels: Record<Equipment, { es: string; en: string }> = {
  weight_stack: { es: 'Maquina de placas', en: 'Weight stack' },
  plate_loaded: { es: 'Maquina de discos', en: 'Plate loaded' },
  cable: { es: 'Polea', en: 'Cable' },
  dumbbell: { es: 'Mancuernas', en: 'Dumbbell' },
  barbell: { es: 'Barra', en: 'Barbell' },
  bodyweight: { es: 'Peso corporal', en: 'Bodyweight' },
  kettlebell: { es: 'Kettlebell', en: 'Kettlebell' },
  band: { es: 'Banda', en: 'Band' },
  machine_other: { es: 'Otra maquina', en: 'Other machine' },
  other: { es: 'Otro', en: 'Other' }
}

export function equipmentLabel(equipment: Equipment, locale: Locale) {
  return equipmentLabels[equipment][locale]
}
