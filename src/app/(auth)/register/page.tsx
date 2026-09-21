'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const USERNAME_RE = /^[a-z0-9_]{3,20}$/

export default function RegisterPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    const clean = username.trim().toLowerCase()
    if (!USERNAME_RE.test(clean)) {
      setError('El usuario admite 3-20 caracteres: letras minusculas, numeros y guion bajo.')
      return
    }
    if (password.length < 8) {
      setError('La contrasena necesita al menos 8 caracteres.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data: available } = await supabase.rpc('username_available', { p_username: clean })
    if (available === false) {
      setError('Ese nombre de usuario ya esta cogido.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: clean },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Con confirmacion de email activada no hay sesion todavia.
    if (!data.session) {
      setInfo('Te hemos enviado un email para confirmar la cuenta.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Crear cuenta</h1>
      <p className="mt-1 text-sm text-muted">Tu historial de entrenamientos empieza aqui.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Input
          label="Nombre de usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="marc_lifts"
          hint="Visible en el ranking. Solo minusculas, numeros y _"
          required
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
        />
        <Input
          label="Contrasena"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="Minimo 8 caracteres"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        {info && <p className="text-sm text-accent">{info}</p>}
        <Button type="submit" size="lg" fullWidth loading={loading}>
          Crear cuenta
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Ya tienes cuenta?{' '}
        <Link href="/login" className="text-accent hover:underline">
          Entrar
        </Link>
      </p>
    </>
  )
}
