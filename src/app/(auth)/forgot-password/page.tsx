'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`
    })

    if (error) setError(error.message)
    else setSent(true)
    setLoading(false)
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Recuperar contrasena</h1>
      <p className="mt-1 text-sm text-muted">
        Te enviamos un enlace para elegir una contrasena nueva.
      </p>

      {sent ? (
        <div className="mt-8 rounded-2xl border border-ink-800 bg-ink-900 p-4 text-sm text-muted-strong">
          Revisa tu correo. Si esa direccion tiene cuenta, el enlace ya esta de camino.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" size="lg" fullWidth loading={loading}>
            Enviar enlace
          </Button>
        </form>
      )}

      <Link href="/login" className="mt-6 block text-sm text-muted hover:text-white">
        Volver a entrar
      </Link>
    </>
  )
}
