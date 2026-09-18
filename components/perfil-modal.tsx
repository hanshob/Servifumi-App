'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { apiPost } from '@/lib/fetcher'

export function PerfilModal({ onClose }: { onClose: () => void }) {
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
      await apiPost('/api/perfil/password', { currentPassword: current, newPassword: nueva })
      toast.success('Contraseña actualizada correctamente.')
      await update({ mustChangePassword: false })
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>Actualiza tu contraseña de acceso (mínimo 6 caracteres).</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="p-current">Contraseña actual</Label>
            <Input id="p-current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-nueva">Nueva contraseña</Label>
            <Input id="p-nueva" type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-confirm">Confirmar nueva contraseña</Label>
            <Input id="p-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
