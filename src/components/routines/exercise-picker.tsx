'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Input, Select } from '@/components/ui/input'
import { Skeleton, EmptyState } from '@/components/ui/states'
import { useApp } from '@/providers/app-provider'
import { getExercises, getMuscleGroups } from '@/lib/data/queries'
import { equipmentLabels, exerciseName, muscleName } from '@/lib/i18n'
import type { Equipment, ExerciseWithMuscle, MuscleGroup } from '@/lib/types'

export function ExercisePicker({
  open,
  onClose,
  onSelect
}: {
  open: boolean
  onClose: () => void
  onSelect: (exercise: ExerciseWithMuscle) => void
}) {
  const { supabase, profile } = useApp()
  const locale = profile?.locale ?? 'es'

  const [groups, setGroups] = useState<MuscleGroup[]>([])
  const [exercises, setExercises] = useState<ExerciseWithMuscle[]>([])
  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState('')
  const [equipment, setEquipment] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    void getMuscleGroups(supabase).then(setGroups)
  }, [open, supabase])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const id = setTimeout(() => {
      void getExercises(supabase, { search: search || undefined, muscle: muscle || undefined, equipment: equipment || undefined })
        .then(setExercises)
        .finally(() => setLoading(false))
    }, 220)
    return () => clearTimeout(id)
  }, [open, supabase, search, muscle, equipment])

  const equipmentOptions = useMemo(
    () => Object.entries(equipmentLabels) as [Equipment, { es: string; en: string }][],
    []
  )

  return (
    <Modal open={open} onClose={onClose} title="Anadir ejercicio" className="sm:max-w-xl">
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre"
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select value={muscle} onChange={(e) => setMuscle(e.target.value)}>
            <option value="">Todos los musculos</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {muscleName(g, locale)}
              </option>
            ))}
          </Select>
          <Select value={equipment} onChange={(e) => setEquipment(e.target.value)}>
            <option value="">Todo el material</option>
            {equipmentOptions.map(([key, label]) => (
              <option key={key} value={key}>
                {label[locale]}
              </option>
            ))}
          </Select>
        </div>

        {loading ? (
          <div className="space-y-2 pt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : exercises.length === 0 ? (
          <EmptyState title="Sin resultados" description="Prueba con otro nombre o quita algun filtro." />
        ) : (
          <ul className="space-y-1.5 pt-1">
            {exercises.map((ex) => (
              <li key={ex.id}>
                <button
                  onClick={() => {
                    onSelect(ex)
                    onClose()
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-ink-800 bg-ink-850 px-4 py-3 text-left transition-colors hover:border-accent/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{exerciseName(ex, locale)}</p>
                    <p className="truncate text-xs text-muted">
                      {muscleName(ex.muscle_group, locale)} · {equipmentLabels[ex.equipment][locale]}
                    </p>
                  </div>
                  {ex.is_compound && (
                    <span className="ml-3 shrink-0 rounded-md bg-ink-800 px-2 py-0.5 text-[10px] text-muted-strong">
                      compuesto
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
