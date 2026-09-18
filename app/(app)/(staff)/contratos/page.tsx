'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import { Plus, Search, Eye, Pencil, CalendarPlus, Undo2, Loader2, X } from 'lucide-react'
import { fetcher, apiPost } from '@/lib/fetcher'
import { PageTitle } from '@/components/page-title'
import { PaginationBar } from '@/components/pagination-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { ContratoFormModal, ContratoData } from '@/components/contrato-form-modal'
import { estadoBadge } from '@/lib/estado-ui'
import { formatFecha, formatHora } from '@/lib/helpers'
import { FRECUENCIAS, ESTADOS_CONTRATO, MESES } from '@/lib/constants'
import { toast } from 'sonner'

interface Contrato extends ContratoData {
  id: number
  cliente: { id: number; nombre: string; zona: string } | null
  tipo_servicio: { id: number; nombre: string } | null
  frecuencia: string
  dia_preferido: string
  hora_por_defecto: string
  estado: string
  tecnicos: { id: string; nombre_completo?: string }[]
}
interface ListResp { data: Contrato[]; total: number; page: number; pageSize: number }
interface PreviewFecha { fecha_hora: string; dia_semana: string }

export default function ContratosPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [estado, setEstado] = useState('')
  const [frecuencia, setFrecuencia] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editData, setEditData] = useState<ContratoData | null>(null)
  const [preview, setPreview] = useState<{ contrato: Contrato; fechas: PreviewFecha[] } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [genModal, setGenModal] = useState(false)
  const [undoModal, setUndoModal] = useState(false)

  const onSearch = (v: string) => {
    setSearch(v)
    const w = window as unknown as { __ctc?: ReturnType<typeof setTimeout> }
    if (w.__ctc) clearTimeout(w.__ctc)
    w.__ctc = setTimeout(() => { setDebounced(v); setPage(1) }, 300)
  }

  const qs = new URLSearchParams({ page: String(page), pageSize: '25' })
  if (debounced) qs.set('search', debounced)
  if (estado) qs.set('estado', estado)
  if (frecuencia) qs.set('frecuencia', frecuencia)

  const { data, isLoading, mutate } = useSWR<ListResp>(`/api/contratos?${qs.toString()}`, fetcher)

  const openPreview = async (c: Contrato) => {
    setPreviewLoading(true)
    setPreview({ contrato: c, fechas: [] })
    try {
      const res = await fetcher(`/api/contratos/${c.id}/preview?months=3`)
      setPreview({ contrato: c, fechas: res?.fechas ?? [] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al cargar la vista previa.')
      setPreview(null)
    } finally { setPreviewLoading(false) }
  }

  return (
    <div>
      <PageTitle
        title="Contratos de servicio"
        subtitle="Contratos recurrentes que generan la programación de servicios cada mes."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setUndoModal(true)}><Undo2 className="mr-1.5 h-4 w-4" />Deshacer generación</Button>
            <Button variant="outline" size="sm" onClick={() => setGenModal(true)}><CalendarPlus className="mr-1.5 h-4 w-4" />Generar próximo mes</Button>
            <Button size="sm" onClick={() => { setEditData(null); setShowModal(true) }}><Plus className="mr-1.5 h-4 w-4" />Nuevo contrato</Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Buscar por cliente..." className="pl-9" />
        </div>
        <Select value={frecuencia || 'all'} onValueChange={(v) => { setFrecuencia(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Frecuencia" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas las frecuencias</SelectItem>{FRECUENCIAS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={estado || 'all'} onValueChange={(v) => { setEstado(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem>{ESTADOS_CONTRATO.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="rounded-lg bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Tipo de servicio</th>
                <th className="px-4 py-3 font-medium">Frecuencia</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Día / Hora</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Cargando...</td></tr>}
              {!isLoading && (data?.data?.length ?? 0) === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No se encontraron contratos.</td></tr>}
              {data?.data?.map((c, i) => (
                <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    {c.cliente ? <Link href={`/clientes/${c.cliente.id}`} className="font-medium hover:text-primary hover:underline">{c.cliente.nombre}</Link> : '—'}
                    <div className="text-xs text-muted-foreground">{c.cliente?.zona}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{c.tipo_servicio?.nombre ?? '—'}</td>
                  <td className="px-4 py-3">{c.frecuencia}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{c.dia_preferido} · {c.hora_por_defecto}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${estadoBadge(c.estado)}`}>{c.estado}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openPreview(c)} className="p-1.5 rounded hover:bg-muted" title="Ver preview de servicios"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => { setEditData(c); setShowModal(true) }} className="p-1.5 rounded hover:bg-muted" title="Editar"><Pencil className="h-4 w-4" /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-4">
          <PaginationBar page={page} pageSize={data?.pageSize ?? 25} total={data?.total ?? 0} onPage={setPage} />
        </div>
      </div>

      {showModal && <ContratoFormModal contrato={editData} onClose={() => setShowModal(false)} onSaved={() => mutate()} />}

      {/* Preview drawer */}
      {preview && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setPreview(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <motion.div initial={{ x: 400 }} animate={{ x: 0 }} className="relative w-full max-w-md bg-card shadow-xl h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b px-5 py-4 flex items-start justify-between">
              <div>
                <h3 className="font-semibold">Preview de servicios</h3>
                <p className="text-sm text-muted-foreground">{preview.contrato.cliente?.nombre} — {preview.contrato.tipo_servicio?.nombre}</p>
              </div>
              <button onClick={() => setPreview(null)} className="p-1 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5">
              {previewLoading && <div className="py-10 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>}
              {!previewLoading && preview.fechas.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">{preview.contrato.frecuencia === 'Única' ? 'Los contratos de frecuencia Única no se incluyen en la generación automática.' : 'No hay servicios proyectados en los próximos 3 meses.'}</p>
              )}
              {!previewLoading && preview.fechas.length > 0 && (
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground"><tr><th className="pb-2 font-medium">Fecha</th><th className="pb-2 font-medium">Día</th><th className="pb-2 font-medium">Hora</th></tr></thead>
                  <tbody className="divide-y">
                    {preview.fechas.map((f, i) => (
                      <tr key={i}><td className="py-2">{formatFecha(f.fecha_hora)}</td><td className="py-2">{f.dia_semana}</td><td className="py-2">{formatHora(f.fecha_hora)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="text-xs text-muted-foreground mt-4">Este es un preview calculado. Los servicios reales se generan con el botón &quot;Generar próximo mes&quot;.</p>
            </div>
          </motion.div>
        </div>
      )}

      {genModal && <GenerarModal onClose={() => setGenModal(false)} onDone={() => mutate()} />}
      {undoModal && <DeshacerModal onClose={() => setUndoModal(false)} onDone={() => mutate()} />}
    </div>
  )
}

function monthLabel(year: number, monthIndex: number) {
  return `${MESES[monthIndex] ?? ''} ${year}`
}

function GenerarModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { data, isLoading } = useSWR<{ year: number; monthIndex: number; totalServicios: number; contratosActivos: number; yaGenerados: number }>('/api/contratos/generar', fetcher)
  const [loading, setLoading] = useState(false)
  const [confirmReplace, setConfirmReplace] = useState(false)

  const run = async (force: boolean) => {
    if (!data) return
    setLoading(true)
    try {
      const res = await apiPost('/api/contratos/generar', { year: data.year, monthIndex: data.monthIndex, force })
      if (res?.requiresConfirmation) {
        setConfirmReplace(true)
        setLoading(false)
        return
      }
      toast.success(`${res?.creados ?? 0} servicios generados para ${monthLabel(data.year, data.monthIndex)}.`)
      onDone(); onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al generar.')
      setLoading(false)
    }
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
            {data.yaGenerados > 0 && <div className="rounded-md bg-amber-50 text-amber-700 p-2.5 text-xs">Ya existen {data.yaGenerados} servicios generados para {monthLabel(data.year, data.monthIndex)}. Al reemplazar solo se eliminarán servicios en estado Programado que no hayan sido modificados manualmente.</div>}
            <p className="text-xs text-muted-foreground">Los contratos de frecuencia Única no se incluyen en la generación automática.</p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          {confirmReplace || (data && data.yaGenerados > 0)
            ? <Button variant="destructive" disabled={loading} onClick={() => run(true)}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sí, reemplazar servicios Programados no modificados</Button>
            : <Button disabled={loading || !data} onClick={() => run(false)}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Generar servicios</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeshacerModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { data, isLoading } = useSWR<{ year: number; monthIndex: number; count: number }>('/api/contratos/deshacer', fetcher)
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const run = async () => {
    if (!data) return
    setLoading(true)
    try {
      const res = await apiPost('/api/contratos/deshacer', { year: data.year, monthIndex: data.monthIndex })
      toast.success(`${res?.eliminados ?? 0} servicios eliminados.`)
      onDone(); onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al deshacer.')
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deshacer generación</DialogTitle>
          <DialogDescription>{data ? `Mes a deshacer: ${monthLabel(data.year, data.monthIndex)}.` : 'Calculando...'}</DialogDescription>
        </DialogHeader>
        {isLoading && <div className="py-6 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>}
        {data && (
          <div className="space-y-3 text-sm">
            <p>Se eliminarán <strong>{data.count}</strong> servicios.</p>
            <p className="text-xs text-muted-foreground">Solo se eliminan servicios generados automáticamente en estado Programado, no modificados manualmente, sin conduces y con fecha futura. No afecta servicios pasados, confirmados, completados ni únicos.</p>
            <label className="flex items-start gap-2 text-xs">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
              <span>Entiendo que esta acción eliminará servicios Programados no modificados generados automáticamente.</span>
            </label>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" disabled={loading || !confirmed || !data || data.count === 0} onClick={run}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Eliminar servicios seleccionados</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
