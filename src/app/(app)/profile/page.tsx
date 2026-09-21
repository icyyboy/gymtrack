'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { useApp } from '@/providers/app-provider'
import { getRecords, getStats } from '@/lib/data/queries'
import { exerciseName } from '@/lib/i18n'
import { formatHours, formatVolume } from '@/lib/utils/format'
import { Avatar } from '@/components/ui/avatar'
import { Card, SectionHeader, StatTile } from '@/components/ui/card'
import { EmptyState, Skeleton } from '@/components/ui/states'
import { TopBar } from '@/components/layout/nav'
import type { PersonalRecord, UserStats } from '@/lib/types'

type RecordRow = PersonalRecord & { exercise: { id: string; name_es: string; name_en: string } }

export default function ProfilePage() {
  const { supabase, profile } = useApp()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [records, setRecords] = useState<RecordRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!profile) return
    const [s, r] = await Promise.all([getStats(supabase, profile.id), getRecords(supabase, 8)])
    setStats(s)
    setRecords(r as RecordRow[])
    setLoading(false)
  }, [supabase, profile])

  useEffect(() => {
    void load()
  }, [load])

  const units = profile?.units ?? 'kg'
  const locale = profile?.locale ?? 'es'

  return (
    <>
      <TopBar
        title="Perfil"
        action={
          <Link href="/settings" className="rounded-lg p-1.5 text-muted hover:bg-ink-800 hover:text-white">
            <Settings size={18} />
          </Link>
        }
      />

      <Card className="flex items-center gap-4">
        <Avatar url={profile?.avatar_url} name={profile?.username ?? 'GT'} size={56} />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{profile?.display_name || profile?.username}</p>
          <p className="truncate text-sm text-muted">@{profile?.username}</p>
          {profile?.created_at && (
            <p className="mt-1 text-xs text-muted">Desde {profile.created_at.slice(0, 10)}</p>
          )}
        </div>
      </Card>

      {loading ? (
        <Skeleton className="mt-4 h-24" />
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatTile label="Entrenamientos" value={`${stats?.total_sessions ?? 0}`} />
          <StatTile label="Racha actual" value={`${stats?.current_streak ?? 0}`} sub={`Mejor: ${stats?.best_streak ?? 0}`} />
          <StatTile label="Volumen" value={formatVolume(stats?.total_volume ?? 0, units)} />
          <StatTile label="Tiempo" value={formatHours(stats?.total_duration_seconds ?? 0)} />
        </div>
      )}

      <section className="mt-8">
        <SectionHeader title="Records" />
        {records.length === 0 ? (
          <EmptyState title="Sin records todavia" description="Se detectan solos al terminar un entrenamiento." />
        ) : (
          <ul className="space-y-2">
            {records.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-xl border border-ink-800 bg-ink-900 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{exerciseName(r.exercise, locale)}</p>
                  <p className="text-xs text-muted">{r.achieved_at.slice(0, 10)}</p>
                </div>
                <p className="font-num text-sm text-accent">{formatVolume(Number(r.value), units)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
