'use client'

import { useEffect, useMemo, useState } from 'react'
import { Dumbbell, Search } from 'lucide-react'
import { useApp } from '@/providers/app-provider'
import { getExercises, getMuscleGroups } from '@/lib/data/queries'
import { equipmentLabels, exerciseName, muscleName } from '@/lib/i18n'
import { Input, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { EmptyState, Skeleton } from '@/components/ui/states'
import { TopBar } from '@/components/layout/nav'
import type { Equipment, ExerciseWithMuscle, MuscleGroup } from '@/lib/types'

export default function ExercisesPage() {
  const { supabase, profile } = useApp()
  const locale = profile?.locale ?? 'es'

  const [groups, setGroups] = useState<MuscleGroup[]>([])
  const [exercises, setExercises] = useState<ExerciseWithMuscle[]>([])
  const [search, setSearch] = useState('')
  const [muscle, setMuscle] = useState('')
  const [equipment, setEquipment] = useState('')
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<ExerciseWithMuscle | null>(null)

  useEffect(() => {
    void getMuscleGroups(supabase).then(setGroups)
  }, [supabase])

  useEffect(() => {
    setLoading(true)
    const id = setTimeout(() => {
      void getExercises(supabase, {
        search: search || undefined,
        muscle: muscle || undefined,
        equipment: equipment || undefined
      })
        .then(setExercises)
        .finally(() => setLoading(false))
    }, 220)
    return () => clearTimeout(id)
  }, [supabase, search, muscle, equipment])

  const grouped = useMemo(() => {
    const map = new Map<string, ExerciseWithMuscle[]>()
    for (const ex of exercises) {
      const key = ex.primary_muscle_id
      map.set(key, [...(map.get(key) ?? []), ex])
    }
    return map
  }, [exercises])

  return (
    <>
      <TopBar title="Ejercicios" />

      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ejercicio"
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
            {(Object.entries(equipmentLabels) as [Equipment, { es: string; en: string }][]).map(([key, label]) => (
              <option key={key} value={key}>
                {label[locale]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : exercises.length === 0 ? (
          <EmptyState icon={<Dumbbell size={26} />} title="Sin resultados" description="Cambia los filtros o busca otro nombre." />
        ) : (
          <div className="space-y-6">
            {groups
              .filter((g) => grouped.has(g.id))
              .map((g) => (
                <section key={g.id}>
                  <h2 className="mb-2 text-sm font-medium text-muted-strong">{muscleName(g, locale)}</h2>
                  <ul className="space-y-1.5">
                    {(grouped.get(g.id) ?? []).map((ex) => (
                      <li key={ex.id}>
                        <button
                          onClick={() => setDetail(ex)}
                          className="flex w-full items-center justify-between rounded-xl border border-ink-800 bg-ink-900 px-4 py-3 text-left hover:border-ink-600"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{exerciseName(ex, locale)}</p>
                            <p className="truncate text-xs text-muted">{equipmentLabels[ex.equipment][locale]}</p>
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
                </section>
              ))}
          </div>
        )}
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? exerciseName(detail, locale) : ''}>
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <Tag>{muscleName(detail.muscle_group, locale)}</Tag>
              <Tag>{equipmentLabels[detail.equipment][locale]}</Tag>
              <Tag>{detail.is_compound ? 'Compuesto' : 'Aislamiento'}</Tag>
            </div>
            <p className="text-muted-strong">
              {(locale === 'en' ? detail.description_en : detail.description_es) ?? 'Sin descripcion.'}
            </p>
            <div>
              <h3 className="mb-1 text-xs text-muted">Ejecucion</h3>
              <p className="leading-relaxed text-muted-strong">
                {(locale === 'en' ? detail.instructions_en : detail.instructions_es) ?? '—'}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-lg bg-ink-800 px-2.5 py-1 text-xs text-muted-strong">{children}</span>
}
