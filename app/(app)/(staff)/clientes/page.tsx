'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import { Plus, Search, Download, Upload, FileDown, Loader2, MapPin, MessageCircle, Pencil, Eye, Power } from 'lucide-react'
import { fetcher, apiPost } from '@/lib/fetcher'
import { PageTitle } from '@/components/page-title'
import { PaginationBar } from '@/components/pagination-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { ClienteFormModal, ClienteData } from '@/components/cliente-form-modal'
import { estadoBadge } from '@/lib/estado-ui'
import { buildWhatsappLink } from '@/lib/helpers'
import { ZONAS, TIPOS_CLIENTE, ESTADOS_CLIENTE } from '@/lib/constants'
import { downloadFile, uploadFile } from '@/lib/download'
import { toast } from 'sonner'

interface Cliente extends ClienteData { id: number; nombre: string; estado: string; zona: string; tipo_cliente: string; telefono: string }
interface ListResp { data: Cliente[]; total: number; page: number; pageSize: number }

export default function ClientesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [zona, setZona] = useState('')
  const [tipo, setTipo] = useState('')
  const [estado, setEstado] = useState('')
  const [modal, setModal] = useState<ClienteData | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [deactivate, setDeactivate] = useState<Cliente | null>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  // debounce search
  useState(() => { /* noop init */ })
  const onSearch = (v: string) => {
    setSearch(v)
    if ((window as unknown as { __ct?: ReturnType<typeof setTimeout> }).__ct) clearTimeout((window as unknown as { __ct?: ReturnType<typeof setTimeout> }).__ct)
    ;(window as unknown as { __ct?: ReturnType<typeof setTimeout> }).__ct = setTimeout(() => { setDebounced(v); setPage(1) }, 300)
  }

  const qs = new URLSearchParams({ page: String(page), pageSize: '25' })
  if (debounced) qs.set('search', debounced)
  if (zona) qs.set('zona', zona)
  if (tipo) qs.set('tipo', tipo)
  if (estado) qs.set('estado', estado)

  const { data, isLoading, mutate } = useSWR<ListResp>(`/api/clientes?${qs.toString()}`, fetcher)

  const doExport = async () => {
    setExporting(true)
    try { await downloadFile('/api/clientes/export', 'clientes.xlsx'); toast.success('Exportación lista.') }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Error.') }
    finally { setExporting(false) }
  }
  const doTemplate = async () => {
    try { await downloadFile('/api/clientes/template', 'plantilla-clientes.xlsx') }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Error.') }
  }
  const doImport = async (file: File) => {
    setImporting(true)
    try {
      const res = await uploadFile('/api/clientes/import', file)
      toast.success(`Importación completada. ${res?.creados ?? 0} nuevos, ${res?.actualizados ?? 0} actualizados.`)
      mutate()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error al importar.') }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const confirmDeactivate = async () => {
    if (!deactivate) return
    try {
      const res = await apiPost(`/api/clientes/${deactivate.id}/deactivate`)
      toast.success(`Cliente desactivado. ${res?.serviciosCancelados ?? 0} servicios futuros cancelados.`)
      setDeactivate(null)
      mutate()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error.') }
  }

  return (
    <div>
      <PageTitle
        title="Clientes"
        subtitle="Gestión de clientes y sucursales. Cada sucursal es un registro independiente."
        action={
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f) }} />
            <Button variant="outline" size="sm" onClick={doTemplate}><FileDown className="mr-1.5 h-4 w-4" />Plantilla</Button>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importing}>{importing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}Importar</Button>
            <Button variant="outline" size="sm" onClick={doExport} disabled={exporting}>{exporting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}Exportar</Button>
            <Button size="sm" onClick={() => { setModal(null); setShowModal(true) }}><Plus className="mr-1.5 h-4 w-4" />Nuevo cliente</Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Buscar por nombre o dirección..." className="pl-9" />
        </div>
        <Select value={zona || 'all'} onValueChange={(v) => { setZona(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Zona" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas las zonas</SelectItem>{ZONAS.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={tipo || 'all'} onValueChange={(v) => { setTipo(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos los tipos</SelectItem>{TIPOS_CLIENTE.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={estado || 'all'} onValueChange={(v) => { setEstado(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem>{ESTADOS_CLIENTE.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Tipo</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Zona</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Teléfono</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Cargando...</td></tr>}
              {!isLoading && (data?.data?.length ?? 0) === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No se encontraron clientes.</td></tr>}
              {data?.data?.map((c, i) => {
                const wa = buildWhatsappLink(c.telefono)
                return (
                  <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/clientes/${c.id}`} className="font-medium hover:text-primary hover:underline">{c.nombre}</Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{c.tipo_cliente}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground"><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{c.zona}</span></td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{c.telefono || '—'}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${estadoBadge(c.estado)}`}>{c.estado}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {wa && <a href={wa} target="_blank" rel="noreferrer" className="p-1.5 rounded hover:bg-muted text-emerald-600" title="WhatsApp"><MessageCircle className="h-4 w-4" /></a>}
                        <Link href={`/clientes/${c.id}`} className="p-1.5 rounded hover:bg-muted" title="Ver"><Eye className="h-4 w-4" /></Link>
                        <button onClick={() => { setModal(c); setShowModal(true) }} className="p-1.5 rounded hover:bg-muted" title="Editar"><Pencil className="h-4 w-4" /></button>
                        {c.estado === 'Activo' && <button onClick={() => setDeactivate(c)} className="p-1.5 rounded hover:bg-muted text-red-600" title="Desactivar"><Power className="h-4 w-4" /></button>}
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-4">
          <PaginationBar page={page} pageSize={data?.pageSize ?? 25} total={data?.total ?? 0} onPage={setPage} />
        </div>
      </div>

      {showModal && <ClienteFormModal cliente={modal} onClose={() => setShowModal(false)} onSaved={() => mutate()} />}

      {deactivate && (
        <Dialog open onOpenChange={(o) => { if (!o) setDeactivate(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Desactivar cliente</DialogTitle>
              <DialogDescription>
                Al desactivar a <strong>{deactivate.nombre}</strong> se pausarán sus contratos activos y se cancelarán todos sus servicios futuros programados. Esta acción se puede revertir reactivando el cliente.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeactivate(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={confirmDeactivate}>Desactivar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
