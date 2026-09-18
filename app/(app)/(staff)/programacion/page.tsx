'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import { Plus, Search, Pencil, FileText, Loader2, Repeat, Download, X } from 'lucide-react'
import { fetcher, apiPatch } from '@/lib/fetcher'
import { PageTitle } from '@/components/page-title'
import { PaginationBar } from '@/components/pagination-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProgramacionFormModal, ProgramacionData } from '@/components/programacion-form-modal'
import { ConduceFormModal } from '@/components/conduce-form-modal'
import { estadoBadge } from '@/lib/estado-ui'
import { formatFecha, formatHora } from '@/lib/helpers'
import { ESTADOS_PROGRAMACION, TURNOS } from '@/lib/constants'
import { useSelectors } from '@/lib/use-selectors'
import { generateAndDownloadPdf } from '@/lib/pdf-download'
import { toast } from 'sonner'

interface Prog extends ProgramacionData {
  id: number
  cliente: { id: number; nombre: string; zona: string; direccion?: string; nombre_contacto_principal?: string } | null
  fecha_hora: string
  turno: string
  estado: string
  origen: string
  tipos_servicio: { id: number; nombre: string }[]
  tecnicos: { id: string; nombre_completo: string }[]
  vehiculo: { id: number; identificador: string } | null
  contrato: { id: number; frecuencia: string } | null
  conduces: { conduce_numero: number }[]
}
interface ListResp { data: Prog[]; total: number; page: number; pageSize: number }

function todayISO() { return new Date().toISOString().slice(0, 10) }

function ProgramacionContent() {
  const sp = useSearchParams()
  const focus = sp.get('focus')
  const { personal, vehiculos, tipos } = useSelectors()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [estado, setEstado] = useState('')
  const [turno, setTurno] = useState('')
  const [tecnicoId, setTecnicoId] = useState('')
  const [vehiculoId, setVehiculoId] = useState('')
  const [tipoId, setTipoId] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [sinConduce, setSinConduce] = useState(sp.get('sinConduce') === '1')
  const [showModal, setShowModal] = useState(false)
  const [editData, setEditData] = useState<ProgramacionData | null>(null)
  const [conduceFor, setConduceFor] = useState<number | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  const onSearch = (v: string) => {
    setSearch(v)
    const w = window as unknown as { __ctp?: ReturnType<typeof setTimeout> }
    if (w.__ctp) clearTimeout(w.__ctp)
    w.__ctp = setTimeout(() => { setDebounced(v); setPage(1) }, 300)
  }

  const qs = new URLSearchParams({ page: String(page), pageSize: '25' })
  if (debounced) qs.set('search', debounced)
  if (estado) qs.set('estado', estado)
  if (turno) qs.set('turno', turno)
  if (tecnicoId) qs.set('tecnicoId', tecnicoId)
  if (vehiculoId) qs.set('vehiculoId', vehiculoId)
  if (tipoId) qs.set('tipoId', tipoId)
  if (desde) qs.set('desde', desde)
  if (hasta) qs.set('hasta', hasta)
  if (sinConduce) qs.set('sinConduce', '1')

  const { data, isLoading, mutate } = useSWR<ListResp>(`/api/programacion?${qs.toString()}`, fetcher)

  // open edit modal when ?focus= present
  useEffect(() => {
    if (!focus) return
    (async () => {
      try { const r = await fetch(`/api/programacion/${focus}`); const d = await r.json(); if (d?.programacion) { setEditData(d.programacion); setShowModal(true) } } catch { /* ignore */ }
    })()
  }, [focus])

  const quickEstado = async (p: Prog, nuevo: string) => {
    try { await apiPatch(`/api/programacion/${p.id}`, { estado: nuevo }); toast.success('Estado actualizado.'); mutate() }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Error.') }
  }

  const downloadAgenda = async () => {
    setPdfLoading(true)
    try {
      await generateAndDownloadPdf('/api/agenda-pdf', { date: desde || todayISO() }, `agenda-${desde || todayISO()}.pdf`)
      toast.success('Agenda generada.')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error al generar el PDF.') }
    finally { setPdfLoading(false) }
  }

  const tecnicoOptions = personal.filter((p) => p.puesto === 'Técnico' || p.puesto === 'Supervisor')

  return (
    <div>
      <PageTitle
        title="Programación de servicios"
        subtitle="Todos los servicios programados. Filtra, edita estados y registra conduces."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={downloadAgenda} disabled={pdfLoading}>{pdfLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}Agenda {desde ? formatFecha(desde) : 'de hoy'} (PDF)</Button>
            <Button size="sm" onClick={() => { setEditData(null); setShowModal(true) }}><Plus className="mr-1.5 h-4 w-4" />Nuevo servicio</Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Buscar por cliente..." className="pl-9" />
        </div>
        <Select value={estado || 'all'} onValueChange={(v) => { setEstado(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Estado: todos</SelectItem>{ESTADOS_PROGRAMACION.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={turno || 'all'} onValueChange={(v) => { setTurno(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Turno" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Turno: todos</SelectItem>{TURNOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={tecnicoId || 'all'} onValueChange={(v) => { setTecnicoId(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Técnico" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Técnico: todos</SelectItem>{tecnicoOptions.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre_completo}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={tipoId || 'all'} onValueChange={(v) => { setTipoId(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Tipo: todos</SelectItem>{tipos.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.nombre}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={vehiculoId || 'all'} onValueChange={(v) => { setVehiculoId(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Vehículo" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Vehículo: todos</SelectItem>{vehiculos.map((v) => <SelectItem key={v.id} value={String(v.id)}>{v.identificador}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground">Desde</label>
          <Input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setPage(1) }} className="w-[150px]" />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground">Hasta</label>
          <Input type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); setPage(1) }} className="w-[150px]" />
        </div>
        <Button variant={sinConduce ? 'default' : 'outline'} size="sm" onClick={() => { setSinConduce((s) => !s); setPage(1) }}>Sin conduce</Button>
        {(estado || turno || tecnicoId || vehiculoId || tipoId || desde || hasta || sinConduce || debounced) && (
          <Button variant="ghost" size="sm" onClick={() => { setEstado(''); setTurno(''); setTecnicoId(''); setVehiculoId(''); setTipoId(''); setDesde(''); setHasta(''); setSinConduce(false); setSearch(''); setDebounced(''); setPage(1) }}><X className="mr-1 h-4 w-4" />Limpiar</Button>
        )}
      </div>

      <div className="rounded-lg bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha / Hora</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Técnicos</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Turno</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Conduce</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Cargando...</td></tr>}
              {!isLoading && (data?.data?.length ?? 0) === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No se encontraron servicios.</td></tr>}
              {data?.data?.map((p, i) => (
                <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-muted/30">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium flex items-center gap-1">{p.origen === 'Recurrente' && <Repeat className="h-3.5 w-3.5 text-primary" aria-label="Servicio recurrente" />}{formatFecha(p.fecha_hora)}</div>
                    <div className="text-xs text-muted-foreground">{formatHora(p.fecha_hora)}</div>
                  </td>
                  <td className="px-4 py-3">
                    {p.cliente ? <Link href={`/clientes/${p.cliente.id}`} className="font-medium hover:text-primary hover:underline">{p.cliente.nombre}</Link> : '—'}
                    <div className="text-xs text-muted-foreground">{(p.tipos_servicio ?? []).map((t) => t.nombre).join(', ')}</div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">{(p.tecnicos ?? []).map((t) => t.nombre_completo).join(', ') || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{p.turno}</td>
                  <td className="px-4 py-3">
                    <Select value={p.estado} onValueChange={(v) => quickEstado(p, v)}>
                      <SelectTrigger className="h-7 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{ESTADOS_PROGRAMACION.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {(p.conduces?.length ?? 0) > 0
                      ? <span className="text-xs text-primary">{p.conduces.map((c) => `#${c.conduce_numero}`).join(', ')}</span>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setConduceFor(p.id)} className="p-1.5 rounded hover:bg-muted text-primary" title="Agregar conduce"><FileText className="h-4 w-4" /></button>
                      <button onClick={() => { setEditData(p); setShowModal(true) }} className="p-1.5 rounded hover:bg-muted" title="Editar"><Pencil className="h-4 w-4" /></button>
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

      {showModal && <ProgramacionFormModal programacion={editData} onClose={() => setShowModal(false)} onSaved={() => mutate()} />}
      {conduceFor !== null && <ConduceFormModal programacionId={conduceFor} onClose={() => setConduceFor(null)} onSaved={() => mutate()} />}
    </div>
  )
}

export default function ProgramacionPage() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-muted-foreground">Cargando...</div>}>
      <ProgramacionContent />
    </Suspense>
  )
}
