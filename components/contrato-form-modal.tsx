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
import { FRECUENCIAS, DIAS_SEMANA, TURNOS, ESTADOS_CONTRATO, MAX_TECNICOS } from '@/lib/constants'

export interface ContratoData {
  id?: number
  cliente?: { id: number; nombre: string; zona: string } | null
  cliente_id?: number
  tipo_servicio_id?: number
  frecuencia?: string; semanas_quincenal?: string; dia_preferido?: string
  hora_por_defecto?: string; turno_por_defecto?: string
  vehiculo_por_defecto_id?: number | null
  estado?: string; fecha_inicio?: string; notas?: string
  tecnicos?: { id: string }[]
}

function toDateInput(s?: string): string {
  if (!s) return new Date().toISOString().slice(0, 10)
  return new Date(s).toISOString().slice(0, 10)
}

export function ContratoFormModal({ contrato, onClose, onSaved }: { contrato: ContratoData | null; onClose: () => void; onSaved: () => void }) {
  const editing = !!contrato?.id
  const { personal, vehiculos, tipos } = useSelectors()
  const [cliente, setCliente] = useState(contrato?.cliente ?? null)
  const [tipoServicio, setTipoServicio] = useState(contrato?.tipo_servicio_id ? String(contrato.tipo_servicio_id) : '')
  const [frecuencia, setFrecuencia] = useState(contrato?.frecuencia ?? 'Mensual')
  const [semanas, setSemanas] = useState(contrato?.semanas_quincenal ?? '1_3')
  const [dia, setDia] = useState(contrato?.dia_preferido ?? 'Lunes')
  const [hora, setHora] = useState(contrato?.hora_por_defecto ?? '08:00')
  const [turno, setTurno] = useState(contrato?.turno_por_defecto ?? 'Matutino')
  const [vehiculo, setVehiculo] = useState(contrato?.vehiculo_por_defecto_id ? String(contrato.vehiculo_por_defecto_id) : '')
  const [estado, setEstado] = useState(contrato?.estado ?? 'Activo')
  const [fechaInicio, setFechaInicio] = useState(toDateInput(contrato?.fecha_inicio))
  const [notas, setNotas] = useState(contrato?.notas ?? '')
  const [tecnicos, setTecnicos] = useState<string[]>((contrato?.tecnicos ?? []).map((t) => t.id))
  const [loading, setLoading] = useState(false)

  const tecnicoOptions = personal.filter((p) => p.puesto === 'Técnico' || p.puesto === 'Supervisor').map((p) => ({ value: p.id, label: p.nombre_completo, hint: p.id }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cliente) { toast.error('Debe seleccionar un cliente.'); return }
    if (!tipoServicio) { toast.error('Debe seleccionar un tipo de servicio.'); return }
    if (tecnicos.length < 1) { toast.error('Debe asignar al menos 1 técnico.'); return }
    setLoading(true)
    const payload = {
      cliente_id: cliente.id, tipo_servicio_id: Number(tipoServicio), frecuencia,
      semanas_quincenal: semanas, dia_preferido: dia, hora_por_defecto: hora, turno_por_defecto: turno,
      vehiculo_por_defecto_id: vehiculo ? Number(vehiculo) : null, estado, fecha_inicio: fechaInicio, notas, tecnicos,
    }
    try {
      if (editing) {
        const res = await apiPatch(`/api/contratos/${contrato!.id}`, payload)
        toast.success(`Contrato actualizado.${res?.serviciosCancelados ? ` ${res.serviciosCancelados} servicios futuros cancelados.` : ''}`)
      } else {
        await apiPost('/api/contratos', payload)
        toast.success('Contrato creado.')
      }
      onSaved(); onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar.')
    } finally { setLoading(false) }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? 'Editar contrato' : 'Nuevo contrato'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Cliente *</Label>
            <ClienteAutocomplete value={cliente} onSelect={setCliente} />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de servicio *</Label>
            <Select value={tipoServicio} onValueChange={setTipoServicio}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>{tipos.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.nombre}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Frecuencia *</Label>
            <Select value={frecuencia} onValueChange={setFrecuencia}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FRECUENCIAS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {frecuencia === 'Quincenal' && (
            <div className="space-y-1.5">
              <Label>Semanas (Quincenal)</Label>
              <Select value={semanas} onValueChange={setSemanas}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1_3">Semanas 1 y 3</SelectItem>
                  <SelectItem value="2_4">Semanas 2 y 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Día preferido *</Label>
            <Select value={dia} onValueChange={setDia}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DIAS_SEMANA.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Hora por defecto</Label>
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
            <Label>Vehículo por defecto</Label>
            <Select value={vehiculo || 'none'} onValueChange={(v) => setVehiculo(v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger>
              <SelectContent><SelectItem value="none">Ninguno</SelectItem>{vehiculos.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.identificador} {v.apodo ? `— ${v.apodo}` : ''}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Técnicos * (máx. {MAX_TECNICOS})</Label>
            <MultiSelect options={tecnicoOptions} selected={tecnicos} onChange={setTecnicos} max={MAX_TECNICOS} maxMessage="Máximo 6 técnicos por servicio." placeholder="Seleccionar técnicos..." />
          </div>
          <div className="space-y-1.5">
            <Label>Fecha de inicio</Label>
            <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ESTADOS_CONTRATO.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Notas</Label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />
          </div>
          {(estado === 'Pausado' || estado === 'Finalizado') && editing && (
            <p className="sm:col-span-2 text-xs text-amber-600 bg-amber-50 rounded-md p-2.5">
              Al guardar con estado {estado}, se cancelarán todos los servicios futuros aún no realizados de este contrato.
            </p>
          )}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
