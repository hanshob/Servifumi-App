'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { apiPost, apiPatch } from '@/lib/fetcher'
import { TIPOS_CLIENTE, ZONAS, ESTADOS_CLIENTE } from '@/lib/constants'

export interface ClienteData {
  id?: number
  nombre?: string; tipo_cliente?: string; zona?: string; estado?: string; direccion?: string
  telefono?: string; telefono_alterno?: string; email?: string
  nombre_contacto_principal?: string; telefono_contacto_principal?: string
  google_maps_url?: string; notas?: string
}

export function ClienteFormModal({ cliente, onClose, onSaved }: { cliente: ClienteData | null; onClose: () => void; onSaved: () => void }) {
  const editing = !!cliente?.id
  const [f, setF] = useState<ClienteData>({
    nombre: cliente?.nombre ?? '', tipo_cliente: cliente?.tipo_cliente ?? 'Comercial',
    zona: cliente?.zona ?? 'Distrito Nacional', estado: cliente?.estado ?? 'Activo',
    direccion: cliente?.direccion ?? '', telefono: cliente?.telefono ?? '', telefono_alterno: cliente?.telefono_alterno ?? '',
    email: cliente?.email ?? '', nombre_contacto_principal: cliente?.nombre_contacto_principal ?? '',
    telefono_contacto_principal: cliente?.telefono_contacto_principal ?? '', google_maps_url: cliente?.google_maps_url ?? '',
    notas: cliente?.notas ?? '',
  })
  const [loading, setLoading] = useState(false)
  const set = (k: keyof ClienteData, v: string) => setF((p) => ({ ...p, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.nombre?.trim()) { toast.error('El nombre es obligatorio.'); return }
    setLoading(true)
    try {
      if (editing) await apiPatch(`/api/clientes/${cliente!.id}`, f)
      else await apiPost('/api/clientes', f)
      toast.success(editing ? 'Cliente actualizado.' : 'Cliente creado.')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Nombre *</Label>
            <Input value={f.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Nombre del cliente o sucursal" />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de cliente</Label>
            <Select value={f.tipo_cliente} onValueChange={(v) => set('tipo_cliente', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS_CLIENTE.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Zona</Label>
            <Select value={f.zona} onValueChange={(v) => set('zona', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ZONAS.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={f.estado} onValueChange={(v) => set('estado', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ESTADOS_CLIENTE.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Teléfono</Label>
            <Input value={f.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="809-000-0000" />
          </div>
          <div className="space-y-1.5">
            <Label>Teléfono alterno</Label>
            <Input value={f.telefono_alterno} onChange={(e) => set('telefono_alterno', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={f.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Dirección</Label>
            <Textarea value={f.direccion} onChange={(e) => set('direccion', e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Contacto principal</Label>
            <Input value={f.nombre_contacto_principal} onChange={(e) => set('nombre_contacto_principal', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Tel. contacto principal</Label>
            <Input value={f.telefono_contacto_principal} onChange={(e) => set('telefono_contacto_principal', e.target.value)} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Google Maps URL</Label>
            <Input value={f.google_maps_url} onChange={(e) => set('google_maps_url', e.target.value)} placeholder="https://maps.google.com/..." />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Notas</Label>
            <Textarea value={f.notas} onChange={(e) => set('notas', e.target.value)} rows={2} />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
