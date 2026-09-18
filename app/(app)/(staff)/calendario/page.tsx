'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import { CalendarPlus, Loader2, Filter, X, Pencil, FileText, Repeat } from 'lucide-react'
import { fetcher, apiPatch, apiPost } from '@/lib/fetcher'
import { PageTitle } from '@/components/page-title'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { ProgramacionFormModal, ProgramacionData } from '@/components/programacion-form-modal'
import { ConduceFormModal } from '@/components/conduce-form-modal'
import { useSelectors } from '@/lib/use-selectors'
import { estadoBadge } from '@/lib/estado-ui'
import { formatFecha, formatHora } from '@/lib/helpers'
import { ESTADO_COLORS, ESTADOS_PROGRAMACION, TURNOS, ZONAS, MESES } from '@/lib/constants'
import type { CalEvent } from '@/components/calendar-view'
import { toast } from 'sonner'

const CalendarView = dynamic(() => import('@/components/calendar-view'), {
  ssr: false,
  loading: () => <div className="rounded-lg bg-card shadow-sm py-32 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>,
})

interface Servicio {
  id: number
  fecha_hora: string
  estado: string
  turno: string
  origen: string
  vehiculo_id: number | null
  requiere_cambio_estaciones: boolean
  observaciones: string | null
  direccion: string | null
  nombre_contacto_principal: string | null
  cliente: { id: number; nombre: string; zona: string; direccion?: string; nombre_contacto_principal?: string } | null
  tipos_servicio: { id: number; nombre: string }[]
  tecnicos: { id: string; nombre_completo: string }[]
  vehiculo: { id: number; identificador: string } | null
  conduces: { conduce_numero: string }[]
}

export default function CalendarioPage() {
  const { personal, vehiculos, tipos } = useSelectors()
  const [range, setRange] = useState<{ desde: string; hasta: string } | null>(null)
  const [tecnicoId, setTecnicoId] = useState('all')
  const [vehiculoId, setVehiculoId] = useState('all')
  const [tipoId, setTipoId] = useState('all')
  const [zona, setZona] = useState('all')
  const [estado, setEstado] = useState('all')
  const [turno, setTurno] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  const [formModal, setFormModal] = useState<{ data: ProgramacionData | null } | null>(null)
  const [conduceFor, setConduceFor] = useState<number | null>(null)
  const [detail, setDetail] = useState<Servicio | null>(null)
  const [genModal, setGenModal] = useState(false)

  const qs = new URLSearchParams({ all: '1' })
  if (range) { qs.set('desde', range.desde); qs.set('hasta', range.hasta) }
  if (tecnicoId !== 'all') qs.set('tecnicoId', tecnicoId)
  if (vehiculoId !== 'all') qs.set('vehiculoId', vehiculoId)
  if (tipoId !== 'all') qs.set('tipoId', tipoId)
  if (estado !== 'all') qs.set('estado', estado)
  if (turno !== 'all') qs.set('turno', turno)

  const { data, isLoading, mutate } = useSWR<{ data: Servicio[] }>(`/api/programacion?${qs.toString()}`, fetcher)

  const servicios = useMemo(() => {
    let list = data?.data ?? []
    if (zona !== 'all') list = list.filter((s) => s?.cliente?.zona === zona)
    return list
  }, [data, zona])

  const events: CalEvent[] = useMemo(() => servicios.map((s) => ({
    id: String(s.id),
    title: s.cliente?.nombre ?? 'Servicio',
    start: s.fecha_hora,
    color: ESTADO_COLORS[s.estado] ?? '#6b7280',
    recurrente: s.origen === 'Recurrente',
    hora: formatHora(s.fecha_hora),
    tecnicos: (s.tecnicos ?? []).map((t) => t.nombre_completo).join(', '),
    tipos: (s.tipos_servicio ?? []).map((t) => t.nombre).join(', '),
  })), [servicios])

  const tecnicoOptions = personal.filter((p) => p.puesto === 'Técnico' || p.puesto === 'Supervisor')

  const openEvent = (id: string) => {
    const s = servicios.find((x) => String(x.id) === id)
    if (s) setDetail(s)
  }
  const openCreate = (iso: string) => setFormModal({ data: { fecha_hora: iso } })

  const moveEvent = async (id: string, iso: string) => {
    try {
      await apiPatch(`/api/programacion/${id}`, { fecha_hora: iso })
      toast.success('Servicio reprogramado.')
      mutate()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error al mover el servicio.'); mutate() }
  }

  const toFormData = (s: Servicio): ProgramacionData => ({
    id: s.id, cliente: s.cliente, fecha_hora: s.fecha_hora, turno: s.turno, estado: s.estado,
    vehiculo_id: s.vehiculo_id, requiere_cambio_estaciones: s.requiere_cambio_estaciones,
    observaciones: s.observaciones ?? '', direccion: s.direccion ?? '', nombre_contacto_principal: s.nombre_contacto_principal ?? '',
    tipos_servicio: s.tipos_servicio, tecnicos: s.tecnicos,
  })

  const activeFilters = [tecnicoId, vehiculoId, tipoId, zona, estado, turno].filter((v) => v !== 'all').length

  return (
    <div>
      <PageTitle title="Calendario" subtitle="Vista interactiva de los servicios. Arrastra para reprogramar, haz clic para ver y editar."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)}>
              <Filter className="mr-1.5 h-4 w-4" />Filtros{activeFilters > 0 ? ` (${activeFilters})` : ''}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setGenModal(true)}><CalendarPlus className="mr-1.5 h-4 w-4" />Generar próximo mes</Button>
            <Button size="sm" onClick={() => setFormModal({ data: null })}><CalendarPlus className="mr-1.5 h-4 w-4" />Nuevo servicio</Button>
          </div>
        } />

      {showFilters && (
        <div className="rounded-lg bg-card shadow-sm p-4 mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <FilterSelect label="Técnico" value={tecnicoId} onChange={setTecnicoId} options={tecnicoOptions.map((p) => ({ value: p.id, label: p.nombre_completo }))} />
          <FilterSelect label="Vehículo" value={vehiculoId} onChange={setVehiculoId} options={vehiculos.map((v) => ({ value: String(v.id), label: v.identificador }))} />
          <FilterSelect label="Tipo de servicio" value={tipoId} onChange={setTipoId} options={tipos.map((t) => ({ value: String(t.id), label: t.nombre }))} />
          <FilterSelect label="Zona" value={zona} onChange={setZona} options={ZONAS.map((z) => ({ value: z, label: z }))} />
          <FilterSelect label="Estado" value={estado} onChange={setEstado} options={ESTADOS_PROGRAMACION.map((e) => ({ value: e, label: e }))} />
          <FilterSelect label="Turno" value={turno} onChange={setTurno} options={TURNOS.map((t) => ({ value: t, label: t }))} />
          {activeFilters > 0 && (
            <div className="flex items-end">
              <Button variant="ghost" size="sm" onClick={() => { setTecnicoId('all'); setVehiculoId('all'); setTipoId('all'); setZona('all'); setEstado('all'); setTurno('all') }}>
                <X className="mr-1.5 h-4 w-4" />Limpiar filtros
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="relative">
        {isLoading && <div className="absolute right-4 top-4 z-10"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}
        <CalendarView events={events} onEventClick={openEvent} onSelect={openCreate} onEventDrop={moveEvent} onRange={(desde, hasta) => setRange({ desde, hasta })} />
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        {ESTADOS_PROGRAMACION.map((e) => (
          <span key={e} className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ backgroundColor: ESTADO_COLORS[e] }} />{e}</span>
        ))}
        <span className="inline-flex items-center gap-1.5"><Repeat className="h-3.5 w-3.5" />↺ Servicio recurrente generado desde contrato</span>
      </div>

      {formModal && <ProgramacionFormModal programacion={formModal.data} onClose={() => setFormModal(null)} onSaved={() => mutate()} />}
      {conduceFor !== null && <ConduceFormModal programacionId={conduceFor} onClose={() => setConduceFor(null)} onSaved={() => { mutate(); toast.success('Conduce registrado.') }} />}
      {genModal && <GenerarModal onClose={() => setGenModal(false)} onDone={() => mutate()} />}

      {/* Event detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null) }}>
        <DialogContent>
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {detail.origen === 'Recurrente' && <Repeat className="h-4 w-4 text-primary" />}
                  {detail.cliente?.nombre ?? 'Servicio'}
                </DialogTitle>
                <DialogDescription>{formatFecha(detail.fecha_hora)} · {formatHora(detail.fecha_hora)} · {detail.turno}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><span className="text-muted-foreground">Estado:</span><span className={`text-xs px-2 py-0.5 rounded-full ${estadoBadge(detail.estado)}`}>{detail.estado}</span></div>
                {(detail.tipos_servicio?.length ?? 0) > 0 && <p><span className="text-muted-foreground">Tipos:</span> {detail.tipos_servicio.map((t) => t.nombre).join(', ')}</p>}
                {(detail.tecnicos?.length ?? 0) > 0 && <p><span className="text-muted-foreground">Técnicos:</span> {detail.tecnicos.map((t) => t.nombre_completo).join(', ')}</p>}
                {detail.vehiculo && <p><span className="text-muted-foreground">Vehículo:</span> {detail.vehiculo.identificador}</p>}
                {detail.direccion && <p><span className="text-muted-foreground">Dirección:</span> {detail.direccion}</p>}
                {(detail.conduces?.length ?? 0) > 0 && <p><span className="text-muted-foreground">Conduces:</span> {detail.conduces.map((c) => c.conduce_numero).join(', ')}</p>}
                {detail.observaciones && <p className="text-muted-foreground">{detail.observaciones}</p>}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { const s = detail; setDetail(null); if (s) setConduceFor(s.id) }}><FileText className="mr-1.5 h-4 w-4" />Agregar conduce</Button>
                <Button onClick={() => { const s = detail; setDetail(null); if (s) setFormModal({ data: toFormData(s) }) }}><Pencil className="mr-1.5 h-4 w-4" />Editar servicio</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

function monthLabel(year: number, monthIndex: number) { return `${MESES[monthIndex] ?? ''} ${year}` }

function GenerarModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { data, isLoading } = useSWR<{ year: number; monthIndex: number; totalServicios: number; contratosActivos: number; yaGenerados: number }>('/api/contratos/generar', fetcher)
  const [loading, setLoading] = useState(false)

  const run = async (force: boolean) => {
    if (!data) return
    setLoading(true)
    try {
      const res = await apiPost('/api/contratos/generar', { year: data.year, monthIndex: data.monthIndex, force })
      if (res?.requiresConfirmation) { setLoading(false); return }
      toast.success(`${res?.creados ?? 0} servicios generados para ${monthLabel(data.year, data.monthIndex)}.`)
      onDone(); onClose()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error al generar.'); setLoading(false) }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generar próximo mes</DialogTitle>
          <DialogDescription>{data ? `Se generarán los servicios recurrentes para ${monthLabel(data.year, data.monthIndex)}.` : 'Calculando...'}</DialogDescription>
        </DialogHeader>
        {isLoading && <div className="py-6 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>}
        {data && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Contratos activos</span><span className="font-medium">{data.contratosActivos}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Servicios a generar</span><span className="font-medium">{data.totalServicios}</span></div>
            {data.yaGenerados > 0 && <div className="rounded-md bg-amber-50 text-amber-700 p-2.5 text-xs">Ya existen {data.yaGenerados} servicios generados para {monthLabel(data.year, data.monthIndex)}. Al reemplazar solo se eliminarán servicios en estado Programado no modificados manualmente.</div>}
            <p className="text-xs text-muted-foreground">Los contratos de frecuencia Única no se incluyen en la generación automática.</p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          {data && data.yaGenerados > 0
            ? <Button variant="destructive" disabled={loading} onClick={() => run(true)}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Reemplazar servicios Programados</Button>
            : <Button disabled={loading || !data} onClick={() => run(false)}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Generar servicios</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
