'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, ShieldAlert } from 'lucide-react'

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter()
  const { update } = useSession()
  const [current, setCurrent] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (nueva.length < 6) { toast.error('La nueva contraseña debe tener al menos 6 caracteres.'); return }
    if (nueva !== confirm) { toast.error('Las contraseñas no coinciden.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/perfil/password', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: nueva }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error al cambiar la contraseña.'); setLoading(false); return }
      toast.success('Contraseña actualizada correctamente.')
      await update({ mustChangePassword: false })
      router.replace('/')
      router.refresh()
    } catch {
      toast.error('Error al cambiar la contraseña.'); setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md bg-card rounded-lg shadow-lg p-8" style={{ boxShadow: 'var(--shadow-lg)' }}>
        {forced && (
          <div className="flex items-start gap-3 rounded-md bg-primary/10 p-3 mb-5">
            <ShieldAlert className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-foreground">Por seguridad, debes cambiar tu contraseña antes de continuar.</p>
          </div>
        )}
        <h1 className="text-xl font-display font-bold mb-1 tracking-tight">Cambiar contraseña</h1>
        <p className="text-sm text-muted-foreground mb-6">Establece una nueva contraseña (mínimo 6 caracteres).</p>
        <form onSubmit={submit} className="space-y-4">
          {!forced && (
            <div className="space-y-1.5">
              <Label htmlFor="current">Contraseña actual</Label>
              <Input id="current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="nueva">Nueva contraseña</Label>
            <Input id="nueva" type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirmar nueva contraseña</Label>
            <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </form>
      </div>
    </div>
  )
}
