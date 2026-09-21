import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppProvider } from '@/providers/app-provider'
import { BottomNav, SideNav } from '@/components/layout/nav'
import type { Profile } from '@/lib/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  return (
    <AppProvider initialUser={user} initialProfile={(profile as Profile) ?? null}>
      <SideNav />
      <div className="lg:pl-60">
        <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-2 lg:pb-12">{children}</main>
      </div>
      <BottomNav />
    </AppProvider>
  )
}
