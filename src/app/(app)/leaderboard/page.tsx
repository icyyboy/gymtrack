'use client'

import { useCallback, useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { useApp } from '@/providers/app-provider'
import { useToast } from '@/providers/toast-provider'
import { getLeaderboard, type LeaderboardMetric } from '@/lib/data/queries'
import { formatVolume } from '@/lib/utils/format'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState, Skeleton } from '@/components/ui/states'
import { TopBar } from '@/components/layout/nav'
import { cn } from '@/lib/utils/cn'
import type { LeaderboardRow } from '@/lib/types'

const METRICS: { key: LeaderboardMetric; label: string }[] = [
  { key: 'total_sessions', label: 'Entrenos' },
  { key: 'total_volume', label: 'Volumen' },
  { key: 'current_streak', label: 'Racha' },
  { key: 'pr_count', label: 'Records' }
]

export default function LeaderboardPage() {
  const { supabase, profile } = useApp()
  const toast = useToast()
  const [metric, setMetric] = useState<LeaderboardMetric>('total_sessions')
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await getLeaderboard(supabase, metric))
    } catch {
      toast('No hemos podido cargar el ranking.', 'error')
    } finally {
      setLoading(false)
    }
  }, [supabase, metric, toast])

  useEffect(() => {
    void load()
  }, [load])

  const units = profile?.units ?? 'kg'

  function valueFor(row: LeaderboardRow) {
    switch (metric) {
      case 'total_volume':
        return formatVolume(Number(row.total_volume), units)
      case 'current_streak':
        return `${row.current_streak} d`
      case 'pr_count':
        return `${row.pr_count}`
      default:
        return `${row.total_sessions}`
    }
  }

  return (
    <>
      <TopBar title="Ranking" />

      <div className="mb-4 flex gap-1 rounded-xl bg-ink-900 p-1">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={cn(
              'flex-1 rounded-lg py-2 text-xs transition-colors',
              metric === m.key ? 'bg-ink-800 text-white' : 'text-muted hover:text-muted-strong'
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Trophy size={26} />}
          title="Ranking vacio"
          description="Cuando haya mas gente entrenando aparecera aqui. Puedes salir del ranking desde Ajustes."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((row, index) => {
            const isMe = row.user_id === profile?.id
            return (
              <li
                key={row.user_id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-4 py-3',
                  isMe ? 'border-accent/40 bg-accent-soft' : 'border-ink-800 bg-ink-900'
                )}
              >
                <span className="w-6 font-num text-sm text-muted">{index + 1}</span>
                <Avatar url={row.avatar_url} name={row.username} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.display_name || row.username}</p>
                  <p className="truncate text-xs text-muted">@{row.username}</p>
                </div>
                <span className="font-num text-sm text-accent">{valueFor(row)}</span>
              </li>
            )
          })}
        </ul>
      )}

      <p className="mt-6 text-xs leading-relaxed text-muted">
        El ranking solo muestra nombre de usuario, avatar y metricas agregadas. Nadie ve tus entrenamientos,
        tus notas ni tu email.
      </p>
    </>
  )
}
