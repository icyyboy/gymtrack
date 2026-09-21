'use client'

import { createBrowserClient } from '@supabase/ssr'

// Cliente de navegador. Solo usa la anon key: toda la seguridad real
// la aplica Supabase con las politicas RLS.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
