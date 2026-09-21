'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, CalendarDays, Dumbbell, Home, ListChecks, Trophy, User } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useApp } from '@/providers/app-provider'
import { Avatar } from '@/components/ui/avatar'

const items = [
  { href: '/dashboard', icon: Home, key: 'dashboard' as const },
  { href: '/routines', icon: ListChecks, key: 'routines' as const },
  { href: '/calendar', icon: CalendarDays, key: 'calendar' as const },
  { href: '/stats', icon: BarChart3, key: 'stats' as const },
  { href: '/leaderboard', icon: Trophy, key: 'leaderboard' as const }
]

export function BottomNav() {
  const pathname = usePathname()
  const { t } = useApp()

  // Durante una sesion de entrenamiento la barra estorba.
  if (pathname.startsWith('/session/')) return null

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-ink-800 bg-ink-950/95 backdrop-blur lg:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2 pt-1.5">
        {items.map(({ href, icon: Icon, key }) => {
          const active = pathname.startsWith(href)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] transition-colors',
                  active ? 'text-accent' : 'text-muted hover:text-muted-strong'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                {t.nav[key]}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function SideNav() {
  const pathname = usePathname()
  const { t, profile } = useApp()

  const links = [
    ...items,
    { href: '/exercises', icon: Dumbbell, key: 'exercises' as const },
    { href: '/profile', icon: User, key: 'profile' as const }
  ]

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-ink-800 bg-ink-950 px-4 py-6 lg:flex">
      <Link href="/dashboard" className="mb-8 flex items-center gap-2 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-num text-base font-bold text-ink-950">
          G
        </span>
        <span className="font-semibold tracking-tight">GymTrack</span>
      </Link>

      <ul className="flex-1 space-y-1">
        {links.map(({ href, icon: Icon, key }) => {
          const active = pathname.startsWith(href)
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                  active ? 'bg-ink-850 text-white' : 'text-muted hover:bg-ink-900 hover:text-muted-strong'
                )}
              >
                <Icon size={18} className={active ? 'text-accent' : ''} />
                {t.nav[key]}
              </Link>
            </li>
          )
        })}
      </ul>

      <Link
        href="/settings"
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-ink-900 hover:text-white"
      >
        <Avatar url={profile?.avatar_url} name={profile?.username ?? 'GT'} size={28} />
        <span className="truncate">{profile?.username ?? '...'}</span>
      </Link>
    </aside>
  )
}

export function TopBar({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <header className="safe-top sticky top-0 z-30 -mx-4 mb-4 border-b border-ink-800/80 bg-ink-950/90 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {action}
      </div>
    </header>
  )
}
