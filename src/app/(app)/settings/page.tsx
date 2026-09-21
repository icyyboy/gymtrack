'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useApp } from '@/providers/app-provider'
import { useToast } from '@/providers/toast-provider'
import { deleteAccount } from '@/lib/data/mutations'
import { pushSupported, subscribeToPush, unsubscribeFromPush } from '@/lib/push'
import { Button } from '@/components/ui/button'
import { Card, SectionHeader } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { TopBar } from '@/components/layout/nav'
import { Avatar } from '@/components/ui/avatar'
import type { Locale, Units } from '@/lib/types'

export default function SettingsPage() {
  const { supabase, profile, refreshProfile } = useApp()
  const router = useRouter()
  const toast = useToast()

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [username, setUsername] = useState(profile?.username ?? '')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function saveProfile() {
    if (!profile) return
    setSaving(true)
    try {
      const clean = username.trim().toLowerCase()
      if (clean !== profile.username) {
        const { data: available } = await supabase.rpc('username_available', { p_username: clean })
        if (available === false) {
          toast('Ese nombre de usuario ya esta cogido.', 'error')
          setSaving(false)
          return
        }
      }
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName || null, username: clean })
        .eq('id', profile.id)
      if (error) throw error
      await refreshProfile()
      toast('Perfil guardado', 'success')
    } catch {
      toast('No se ha podido guardar el perfil.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function updatePreference(patch: { locale?: Locale; units?: Units; show_in_leaderboard?: boolean }) {
    if (!profile) return
    const { error } = await supabase.from('profiles').update(patch).eq('id', profile.id)
    if (error) {
      toast('No se ha podido guardar el ajuste.', 'error')
      return
    }
    await refreshProfile()
  }

  async function onAvatar(file: File) {
    if (!profile) return
    setUploading(true)
    try {
      const path = `${profile.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile.id)
      await refreshProfile()
      toast('Avatar actualizado', 'success')
    } catch {
      toast('No se ha podido subir el avatar. Revisa el bucket "avatars".', 'error')
    } finally {
      setUploading(false)
    }
  }

  async function changePassword() {
    if (password.length < 8) {
      toast('La contrasena necesita al menos 8 caracteres.', 'error')
      return
    }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) toast('No se ha podido cambiar la contrasena.', 'error')
    else {
      setPassword('')
      toast('Contrasena actualizada', 'success')
    }
  }

  async function toggleNotifications(enabled: boolean) {
    if (!profile) return
    try {
      if (enabled) await subscribeToPush(supabase, profile.id)
      else await unsubscribeFromPush(supabase)
      await supabase.from('profiles').update({ notifications_enabled: enabled }).eq('id', profile.id)
      await refreshProfile()
    } catch (error) {
      const reason = (error as Error).message
      toast(
        reason === 'missing_vapid_key'
          ? 'Falta configurar la clave VAPID publica.'
          : reason === 'permission_denied'
            ? 'El navegador ha bloqueado las notificaciones.'
            : 'Las notificaciones no estan disponibles en este navegador.',
        'error'
      )
    }
  }

  async function onLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function onDeleteAccount() {
    try {
      await deleteAccount(supabase)
      await supabase.auth.signOut()
      router.push('/register')
    } catch {
      toast('No se ha podido eliminar la cuenta.', 'error')
    }
  }

  return (
    <>
      <TopBar title="Ajustes" />

      <SectionHeader title="Perfil" />
      <Card className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar url={profile?.avatar_url} name={profile?.username ?? 'GT'} size={56} />
          <label className="cursor-pointer text-sm text-accent hover:underline">
            {uploading ? 'Subiendo...' : 'Cambiar avatar'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onAvatar(e.target.files[0])}
            />
          </label>
        </div>
        <Input label="Nombre" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <Input label="Nombre de usuario" value={username} onChange={(e) => setUsername(e.target.value)} />
        <Button loading={saving} onClick={saveProfile}>
          Guardar perfil
        </Button>
      </Card>

      <SectionHeader title="Preferencias" />
      <Card className="space-y-4">
        <Select
          label="Idioma"
          value={profile?.locale ?? 'es'}
          onChange={(e) => updatePreference({ locale: e.target.value as Locale })}
        >
          <option value="es">Espanol</option>
          <option value="en">English</option>
        </Select>
        <Select
          label="Unidades"
          value={profile?.units ?? 'kg'}
          onChange={(e) => updatePreference({ units: e.target.value as Units })}
        >
          <option value="kg">Kilogramos (kg)</option>
          <option value="lb">Libras (lb)</option>
        </Select>
      </Card>

      <SectionHeader title="Notificaciones" />
      <Card>
        <Toggle
          label="Recordatorios de entrenamiento"
          description={
            pushSupported()
              ? 'Avisos cuando toca entrenar y cuando la racha esta en riesgo.'
              : 'Este navegador no admite notificaciones push.'
          }
          checked={profile?.notifications_enabled ?? false}
          disabled={!pushSupported()}
          onChange={toggleNotifications}
        />
      </Card>

      <SectionHeader title="Privacidad" />
      <Card>
        <Toggle
          label="Aparecer en el ranking"
          description="Si lo desactivas, nadie ve tu perfil ni tus metricas."
          checked={profile?.show_in_leaderboard ?? true}
          onChange={(value) => updatePreference({ show_in_leaderboard: value })}
        />
      </Card>

      <SectionHeader title="Seguridad" />
      <Card className="space-y-4">
        <Input
          label="Nueva contrasena"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button variant="secondary" onClick={changePassword}>
          Cambiar contrasena
        </Button>
      </Card>

      <div className="mt-8 space-y-3 pb-4">
        <Button variant="secondary" fullWidth onClick={onLogout}>
          <LogOut size={16} /> Cerrar sesion
        </Button>
        <Button variant="danger" fullWidth onClick={() => setConfirmDelete(true)}>
          Eliminar cuenta
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar cuenta"
        message="Se borran tu perfil, tus rutinas y todo tu historial. Esta accion no se puede deshacer."
        confirmLabel="Eliminar cuenta"
        onConfirm={onDeleteAccount}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}

function Toggle({
  label,
  description,
  checked,
  disabled,
  onChange
}: {
  label: string
  description?: string
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-start justify-between gap-4">
      <span>
        <span className="block text-sm">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 rounded border-ink-600 bg-ink-850 accent-accent disabled:opacity-40"
      />
    </label>
  )
}
