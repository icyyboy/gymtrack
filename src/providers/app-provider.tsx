'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { dictionaries, type Dictionary } from '@/lib/i18n'
import type { Profile } from '@/lib/types'

interface AppContextValue {
  supabase: SupabaseClient
  user: User | null
  profile: Profile | null
  loading: boolean
  t: Dictionary
  refreshProfile: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({
  children,
  initialUser,
  initialProfile
}: {
  children: React.ReactNode
  initialUser: User | null
  initialProfile: Profile | null
}) {
  const [supabase] = useState(() => createClient())
  const [user, setUser] = useState<User | null>(initialUser)
  const [profile, setProfile] = useState<Profile | null>(initialProfile)
  const [loading, setLoading] = useState(!initialProfile)

  const refreshProfile = useCallback(async () => {
    const { data: { user: current } } = await supabase.auth.getUser()
    setUser(current)
    if (!current) {
      setProfile(null)
      setLoading(false)
      return
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', current.id).single()
    setProfile((data as Profile) ?? null)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    if (!initialProfile) void refreshProfile()
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) setProfile(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [supabase, refreshProfile, initialProfile])

  const value = useMemo<AppContextValue>(
    () => ({
      supabase,
      user,
      profile,
      loading,
      t: dictionaries[profile?.locale ?? 'es'] as Dictionary,
      refreshProfile
    }),
    [supabase, user, profile, loading, refreshProfile]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}

export function useSupabase() {
  return useApp().supabase
}

export function useLocale() {
  return useApp().profile?.locale ?? 'es'
}

export function useUnits() {
  return useApp().profile?.units ?? 'kg'
}
