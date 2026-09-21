'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, Copy, ListChecks, MoreVertical, Plus, Trash2 } from 'lucide-react'
import { useApp } from '@/providers/app-provider'
import { useToast } from '@/providers/toast-provider'
import { getPlans } from '@/lib/data/queries'
import { activatePlan, createPlan, deletePlan, duplicatePlan } from '@/lib/data/mutations'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState, Skeleton } from '@/components/ui/states'
import { TopBar } from '@/components/layout/nav'
import type { ScheduleMode, WorkoutPlan } from '@/lib/types'

type PlanRow = WorkoutPlan & { workouts: { id: string; name: string; position: number }[] }

export default function RoutinesPage() {
  const { supabase, profile } = useApp()
  const toast = useToast()

  const [plans, setPlans] = useState<PlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [mode, setMode] = useState<ScheduleMode>('sequential')
  const [saving, setSaving] = useState(false)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<PlanRow | null>(null)

  const load = useCallback(async () => {
    try {
      setPlans((await getPlans(supabase)) as PlanRow[])
    } catch {
      toast('No hemos podido cargar las rutinas.', 'error')
    } finally {
      setLoading(false)
    }
  }, [supabase, toast])

  useEffect(() => {
    void load()
  }, [load])

  async function onCreate() {
    if (!profile || name.trim().length < 2) return
    setSaving(true)
    try {
      const id = await createPlan(supabase, profile.id, { name: name.trim(), mode })
      if (plans.length === 0) await activatePlan(supabase, profile.id, id)
      setCreating(false)
      setName('')
      await load()
      toast('Rutina creada', 'success')
    } catch {
      toast('No se ha podido crear la rutina.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function onActivate(plan: PlanRow) {
    if (!profile) return
    try {
      await activatePlan(supabase, profile.id, plan.id)
      await load()
      toast(`"${plan.name}" es ahora tu rutina activa`, 'success')
    } catch {
      toast('No se ha podido activar la rutina.', 'error')
    }
  }

  async function onDuplicate(plan: PlanRow) {
    try {
      await duplicatePlan(supabase, plan.id)
      setMenuFor(null)
      await load()
      toast('Rutina duplicada', 'success')
    } catch {
      toast('No se ha podido duplicar la rutina.', 'error')
    }
  }

  async function onDelete() {
    if (!toDelete) return
    try {
      await deletePlan(supabase, toDelete.id)
      setToDelete(null)
      setMenuFor(null)
      await load()
      toast('Rutina eliminada', 'success')
    } catch {
      toast('No se ha podido eliminar la rutina.', 'error')
    }
  }

  return (
    <>
      <TopBar
        title="Rutinas"
        action={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus size={16} /> Nueva
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          icon={<ListChecks size={28} />}
          title="Aun no tienes rutinas"
          description="Una rutina agrupa tus entrenamientos (push, pull, piernas...) y decide que toca cada dia."
          action={<Button onClick={() => setCreating(true)}>Crear la primera</Button>}
        />
      ) : (
        <ul className="space-y-3">
          {plans.map((plan) => (
            <li key={plan.id}>
              <Card className="relative">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/routines/${plan.id}`} className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold">{plan.name}</p>
                      {plan.is_active && (
                        <span className="rounded-md bg-accent-soft px-2 py-0.5 text-[10px] text-accent">activa</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {plan.workouts.length} entrenamientos ·{' '}
                      {plan.mode === 'weekly' ? 'dias fijos' : 'ciclo secuencial'}
                    </p>
                  </Link>

                  <button
                    onClick={() => setMenuFor(menuFor === plan.id ? null : plan.id)}
                    className="rounded-lg p-1.5 text-muted hover:bg-ink-800 hover:text-white"
                    aria-label="Acciones de la rutina"
                  >
                    <MoreVertical size={18} />
                  </button>
                </div>

                {menuFor === plan.id && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-ink-800 pt-3">
                    {!plan.is_active && (
                      <Button size="sm" variant="secondary" onClick={() => onActivate(plan)}>
                        <Check size={14} /> Activar
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => onDuplicate(plan)}>
                      <Copy size={14} /> Duplicar
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setToDelete(plan)}>
                      <Trash2 size={14} /> Eliminar
                    </Button>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Nueva rutina"
        footer={
          <Button fullWidth loading={saving} onClick={onCreate}>
            Crear rutina
          </Button>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Push Pull Legs"
            autoFocus
          />
          <Select label="Planificacion" value={mode} onChange={(e) => setMode(e.target.value as ScheduleMode)}>
            <option value="sequential">Ciclo secuencial (A, B, C, descanso...)</option>
            <option value="weekly">Dias fijos de la semana</option>
          </Select>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar rutina"
        message={`Se borrara "${toDelete?.name}" con sus entrenamientos y su planificacion. El historial de sesiones ya realizadas se conserva.`}
        onConfirm={onDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  )
}
