'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import { Plus, Search, FileDown, Upload, Download, Loader2, X, Eye } from 'lucide-react'
import { fetcher } from '@/lib/fetcher'
import { PageTitle } from '@/components/page-title'
import { PaginationBar } from '@/components/pagination-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConduceFormModal } from '@/components/conduce-form-modal'
import { formatFecha, formatHora } from '@/lib/helpers'
import { useSelectors } from '@/lib/use-selectors'
import { downloadFile, uploadFile } from '@/lib/download'
import { toast } from 'sonner'

interface Conduce {
  id: number
  conduce_numero: number
  empresa: string
  fecha_registro: string
  importado: boolean
  detalles_observaciones: string
  tecnicos: { id: string; nombre_completo: string }[]
  tipos_servicio: { id: number; nombre: string }[]
  registrado_por: { id: number; nombre_completo: string } | null
  programacion: { id: number; fecha_hora: string; cliente: { id: number; nombre: string } | null } | null
}
interface ListResp { data: Conduce[]; total: number; page: number; pageSize: number }

function ConducesContent() {
  const sp = useSearchParams()
  const nuevo = sp.get('nuevo') === '1'
  const progParam = sp.get('programacion')
  const focus = sp.get('focus')
  const { personal, tipos } = useSelectors()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [tecnicoId, setTecnicoId] = useState('')
  const [tipoId, setTipoId] = useState('')
  const [importado, setImportado] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalProgId, setModalProgId] = useState<number | null>(null)
  const [detail, setDetail] = useState<Conduce | null>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const onSearch = (v: string) => {
    setSearch(v)
    const w = window as unknown as { __ctcd?: ReturnType<typeof setTimeout> }
    if (w.__ctcd) clearTimeout(w.__ctcd)
    w.__ctcd = setTimeout(() => { setDebounced(v); setPage(1) }, 300)
  }

  const qs = new URLSearchParams({ page: String(page), pageSize: '25' })
  if (debounced) qs.set('search', debounced)
  if (tecnicoId) qs.set('tecnicoId', tecnicoId)
  if (tipoId) qs.set('tipoId', tipoId)
  if (importado) qs.set('importado', importado)
  if (desde) qs.set('desde', desde)
  if (hasta) qs.set('hasta', hasta)

  const { data, isLoading, mutate } = useSWR<ListResp>(`/api/conduces?${qs.toString()}`, fetcher)

  // open create modal from query params
  useEffect(() => {
    if (nuevo) { setModalProgId(progParam ? Number(progParam) : null); setShowModal(true) }
  }, [nuevo, progParam])

  // open detail when ?focus= present
  useEffect(() => {
    if (!focus) return
    (async () => {
      try { const r = await fetch(`/api/conduces/${focus}`); const d = await r.json(); if (d?.conduce) setDetail(d.conduce) } catch { /* ignore */ }
    })()
  }, [focus])

  const doExport = async () => {
    setExporting(true)
    try { await downloadFile(`/api/conduces/export${debounced ? `?search=${encodeURIComponent(debounced)}` : ''}`, 'conduces.xlsx'); toast.success('Exportación lista.') }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Error.') }
    finally { setExporting(false) }
  }
  const doTemplate = async () => {
    try { await downloadFile('/api/conduces/template', 'plantilla-conduces.xlsx') }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Error.') }
  }
  const doImport = async (file: File) => {
    setImporting(true)
    try {
      const res = await uploadFile('/api/conduces/import', file) as { creados?: number; omitidos?: number; errores?: string[] }
      toast.success(`${res?.creados ?? 0} conduces importados. ${res?.omitidos ?? 0} omitidos. ${(res?.errores?.length ?? 0)} filas con errores.`)
      mutate()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error al importar.') }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const tecnicoOptions = personal.filter((p) => p.puesto === 'Técnico' || p.puesto === 'Supervisor')

  return (
    <div>
      <PageTitle
        title="Conduces"
        subtitle="Los conduces se registran a primera hora del día siguiente al servicio ejecutado."
        action={
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f) }} />
            <Button variant="outline" size="sm" onClick={doTemplate}><FileDown className="mr-1.5 h-4 w-4" />Plantilla</Button>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importing}>{importing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}Importar</Button>
            <Button variant="outline" size="sm" onClick={doExport} disabled={exporting}>{exporting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}Exportar</Button>
            <Button size="sm" onClick={() => { setModalProgId(null); setShowModal(true) }}><Plus className="mr-1.5 h-4 w-4" />Nuevo conduce</Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Buscar por número de conduce o empresa..." className="pl-9" />
        </div>
        <Select value={tecnicoId || 'all'} onValueChange={(v) => { setTecnicoId(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Técnico" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Técnico: todos</SelectItem>{tecnicoOptions.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre_completo}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={tipoId || 'all'} onValueChange={(v) => { setTipoId(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Tipo: todos</SelectItem>{tipos.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.nombre}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={importado || 'all'} onValueChange={(v) => { setImportado(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Origen" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Origen: todos</SelectItem><SelectItem value="0">Registrado en app</SelectItem><SelectItem value="1">Importado</SelectItem></SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground">Desde</label>
          <Input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setPage(1) }} className="w-[150px]" />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-muted-foreground">Hasta</label>
          <Input type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); setPage(1) }} className="w-[150px]" />
        </div>
        {(tecnicoId || tipoId || importado || desde || hasta || debounced) && (
          <Button variant="ghost" size="sm" onClick={() => { setTecnicoId(''); setTipoId(''); setImportado(''); setDesde(''); setHasta(''); setSearch(''); setDebounced(''); setPage(1) }}><X className="mr-1 h-4 w-4" />Limpiar</Button>
        )}
      </div>

      <div className="rounded-lg bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Conduce #</th>
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Fecha del servicio</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Técnicos</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Tipo</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Cargando...</td></tr>}
              {!isLoading && (data?.data?.length ?? 0) === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No se encontraron conduces.</td></tr>}
              {data?.data?.map((c, i) => (
                <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">#{c.conduce_numero}{c.importado && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">importado</span>}</td>
                  <td className="px-4 py-3">{c.programacion?.cliente?.nombre ?? c.empresa ?? '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{c.programacion ? formatFecha(c.programacion.fecha_hora) : formatFecha(c.fecha_registro)}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">{(c.tecnicos ?? []).map((t) => t.nombre_completo).join(', ') || '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">{(c.tipos_servicio ?? []).map((t) => t.nombre).join(', ') || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setDetail(c)} className="p-1.5 rounded hover:bg-muted" title="Ver detalle"><Eye className="h-4 w-4" /></button>
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

      {showModal && <ConduceFormModal programacionId={modalProgId} onClose={() => setShowModal(false)} onSaved={() => mutate()} />}

      {detail && (
        <Dialog open onOpenChange={(o) => { if (!o) setDetail(null) }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Conduce #{detail.conduce_numero}</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <Field label="Empresa" value={detail.programacion?.cliente?.nombre ?? detail.empresa ?? '—'} />
              {detail.programacion && (
                <>
                  <Field label="Servicio vinculado" value={`${formatFecha(detail.programacion.fecha_hora)} · ${formatHora(detail.programacion.fecha_hora)}`} />
                  <div><Link href={`/programacion?focus=${detail.programacion.id}`} className="text-primary text-xs hover:underline">Ver servicio programado</Link></div>
                </>
              )}
              <Field label="Técnicos" value={(detail.tecnicos ?? []).map((t) => t.nombre_completo).join(', ') || '—'} />
              <Field label="Tipos de servicio" value={(detail.tipos_servicio ?? []).map((t) => t.nombre).join(', ') || '—'} />
              <Field label="Detalles / Observaciones" value={detail.detalles_observaciones || '—'} />
              <Field label="Registrado por" value={detail.registrado_por?.nombre_completo ?? (detail.importado ? 'Importación' : '—')} />
              <Field label="Fecha de registro" value={formatFecha(detail.fecha_registro)} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  )
}

export default function ConducesPage() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-muted-foreground">Cargando...</div>}>
      <ConducesContent />
    </Suspense>
  )
}
