'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MultiSelect } from '@/components/multi-select'
import { ClienteAutocomplete } from '@/components/cliente-autocomplete'
import { TimeInput } from '@/components/time-input'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { apiPost, apiPatch } from '@/lib/fetcher'
import { useSelectors } from '@/lib/use-selectors'
import { TURNOS, ESTADOS_PROGRAMACION, MAX_TECNICOS } from '@/lib/constants'

export interface ProgramacionData {
  id?: number
  cliente?: { id: number; nombre: string; zona: string; direccion?: string; nombre_contacto_principal?: string } | null
  cliente_id?: number
  fecha_hora?: string
  turno?: string
  estado?: string
  vehiculo_id?: number | null
  requiere_cambio_estaciones?: boolean
  observaciones?: string
  direccion?: string
  nombre_contacto_principal?: string
  tipos_servicio?: { id: number }[]
  tecnicos?: { id: string }[]
}

function splitFechaHora(iso?: string): { fecha: string; hora: string } {
  if (!iso) return { fecha: new Date().toISOString().slice(0, 10), hora: '08:00' }
  const d = new Date(iso)
  const fecha = d.toISOString().slice(0, 10)
  const hora = d.toISOString().slice(11, 16)
  return { fecha, hora }
}

export function ProgramacionFormModal({ programacion, onClose, onSaved }: { programacion: ProgramacionData | null; onClose: () => void; onSaved: () => void }) {
  const editing = !!programacion?.id
  const { personal, vehiculos, tipos } = useSelectors()
  const init = splitFechaHora(programacion?.fecha_hora)
  const [cliente, setCliente] = useState(programacion?.cliente ?? null)
  const [fecha, setFecha] = useState(init.fecha)
  const [hora, setHora] = useState(init.hora)
  const [turno, setTurno] = useState(programacion?.turno ?? 'Matutino')
  const [estado, setEstado] = useState(programacion?.estado ?? 'Programado')
  const [vehiculo, setVehiculo] = useState(programacion?.vehiculo_id ? String(programacion.vehiculo_id) : '')
  const [cambioEstaciones, setCambioEstaciones] = useState(Boolean(programacion?.requiere_cambio_estaciones))
  const [observaciones, setObservaciones] = useState(programacion?.observaciones ?? '')
  const [direccion, setDireccion] = useState(programacion?.direccion ?? programacion?.cliente?.direccion ?? '')
  const [contacto, setContacto] = useState(programacion?.nombre_contacto_principal ?? programacion?.cliente?.nombre_contacto_principal ?? '')
  const [tiposSel, setTiposSel] = useState<string[]>((programacion?.tipos_servicio ?? []).map((t) => String(t.id)))
  const [tecnicos, setTecnicos] = useState<string[]>((programacion?.tecnicos ?? []).map((t) => t.id))
  const [loading, setLoading] = useState(false)

  const tecnicoOptions = personal.filter((p) => p.puesto === 'Técnico' || p.puesto === 'Supervisor').map((p) => ({ value: p.id, label: p.nombre_completo, hint: p.id }))
  const tipoOptions = tipos.map((t) => ({ value: String(t.id), label: t.nombre }))

  const onClienteSelect = (c: typeof cliente) => {
    setCliente(c)
    if (c) {
      setDireccion(c.direccion ?? '')
      setContacto(c.nombre_contacto_principal ?? '')
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cliente) { toast.error('Debe seleccionar un cliente.'); return }
    if (tiposSel.length < 1) { toast.error('Debe seleccionar al menos un tipo de servicio.'); return }
    if (tecnicos.length < 1) { toast.error('Debe asignar al menos 1 técnico.'); return }
    setLoading(true)
    const fecha_hora = `${fecha}T${hora.length === 5 ? hora : '08:00'}:00.000Z`
    const payload = {
      cliente_id: cliente.id, fecha_hora, turno, estado,
      vehiculo_id: vehiculo ? Number(vehiculo) : null,
      requiere_cambio_estaciones: cambioEstaciones, observaciones, direccion,
      nombre_contacto_principal: contacto,
      tipos_servicio: tiposSel.map(Number), tecnicos,
    }
    try {
      if (editing) {
        await apiPatch(`/api/programacion/${programacion!.id}`, payload)
        toast.success('Servicio actualizado.')
      } else {
        await apiPost('/api/programacion', payload)
        toast.success('Servicio creado.')
      }
      onSaved(); onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar.')
    } finally { setLoading(false) }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? 'Editar servicio' : 'Nuevo servicio'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Cliente *</Label>
            <ClienteAutocomplete value={cliente} onSelect={onClienteSelect} />
          </div>
          <div className="space-y-1.5">
            <Label>Dirección</Label>
            <Input value={direccion} readOnly className="bg-muted/40" />
          </div>
          <div className="space-y-1.5">
            <Label>Contacto principal</Label>
            <Input value={contacto} readOnly className="bg-muted/40" />
          </div>
          <div className="space-y-1.5">
            <Label>Fecha *</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Hora *</Label>
            <TimeInput value={hora} onChange={setHora} />
          </div>
          <div className="space-y-1.5">
            <Label>Turno</Label>
            <Select value={turno} onValueChange={setTurno}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TURNOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ESTADOS_PROGRAMACION.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Tipos de servicio *</Label>
            <MultiSelect options={tipoOptions} selected={tiposSel} onChange={setTiposSel} placeholder="Seleccionar tipos..." />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Técnicos * (máx. {MAX_TECNICOS})</Label>
            <MultiSelect options={tecnicoOptions} selected={tecnicos} onChange={setTecnicos} max={MAX_TECNICOS} maxMessage="Máximo 6 técnicos por servicio." placeholder="Seleccionar técnicos..." />
          </div>
          <div className="space-y-1.5">
            <Label>Vehículo</Label>
            <Select value={vehiculo || 'none'} onValueChange={(v) => setVehiculo(v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger>
              <SelectContent><SelectItem value="none">Ninguno</SelectItem>{vehiculos.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.identificador}{v.apodo ? ` — ${v.apodo}` : ''}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input id="cambio" type="checkbox" checked={cambioEstaciones} onChange={(e) => setCambioEstaciones(e.target.checked)} className="h-4 w-4" />
            <Label htmlFor="cambio" className="cursor-pointer">Requiere cambio de estaciones</Label>
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Observaciones</Label>
            <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} />
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
