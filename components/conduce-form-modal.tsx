'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MultiSelect } from '@/components/multi-select'
import { toast } from 'sonner'
import { Loader2, Search, X } from 'lucide-react'
import { apiPost } from '@/lib/fetcher'
import { useSelectors } from '@/lib/use-selectors'
import { formatFecha, formatHora } from '@/lib/helpers'
import { MAX_TECNICOS } from '@/lib/constants'

interface ProgLite {
  id: number
  fecha_hora: string
  cliente?: { id: number; nombre: string } | null
  tecnicos?: { id: string }[]
  tipos_servicio?: { id: number }[]
}

export function ConduceFormModal({ programacionId, onClose, onSaved }: { programacionId?: number | null; onClose: () => void; onSaved: () => void }) {
  const { personal, tipos } = useSelectors()
  const [prog, setProg] = useState<ProgLite | null>(null)
  const [empresa, setEmpresa] = useState('')
  const [numero, setNumero] = useState('')
  const [detalles, setDetalles] = useState('')
  const [tecnicos, setTecnicos] = useState<string[]>([])
  const [tiposSel, setTiposSel] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // autocomplete state
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<ProgLite[]>([])
  const acRef = useRef<HTMLDivElement | null>(null)

  const tecnicoOptions = personal.filter((p) => p.puesto === 'Técnico' || p.puesto === 'Supervisor').map((p) => ({ value: p.id, label: p.nombre_completo, hint: p.id }))
  const tipoOptions = tipos.map((t) => ({ value: String(t.id), label: t.nombre }))

  // next numero autosuggest
  useEffect(() => {
    (async () => {
      try { const r = await fetch('/api/conduces/next-numero'); const d = await r.json(); if (d?.next) setNumero(String(d.next)) } catch { /* ignore */ }
    })()
  }, [])

  // preselect programacion by id
  useEffect(() => {
    if (!programacionId) return
    (async () => {
      try {
        const r = await fetch(`/api/programacion/${programacionId}`)
        const d = await r.json()
        if (d?.programacion) applyProg(d.programacion)
      } catch { /* ignore */ }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programacionId])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (acRef.current && !acRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/programacion?search=${encodeURIComponent(q.trim())}&pageSize=10`)
        const d = await r.json()
        setResults(d?.data ?? [])
      } catch { setResults([]) } finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  function applyProg(p: ProgLite) {
    setProg(p)
    setEmpresa(p.cliente?.nombre ?? '')
    setTecnicos((p.tecnicos ?? []).map((t) => t.id))
    setTiposSel((p.tipos_servicio ?? []).map((t) => String(t.id)))
    setOpen(false); setQ('')
  }

  const clearProg = () => { setProg(null); setEmpresa('') }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = parseInt(numero, 10)
    if (!Number.isFinite(n) || n <= 0) { toast.error('Número de conduce inválido.'); return }
    if (tecnicos.length < 1) { toast.error('Debe asignar al menos 1 técnico.'); return }
    setLoading(true)
    try {
      await apiPost('/api/conduces', {
        conduce_numero: n,
        programacion_id: prog?.id ?? null,
        empresa,
        detalles_observaciones: detalles,
        tecnicos,
        tipos_servicio: tiposSel.map(Number),
      })
      toast.success(`Conduce #${n} registrado.`)
      onSaved(); onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar el conduce.')
    } finally { setLoading(false) }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nuevo conduce</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Servicio programado vinculado</Label>
            {prog ? (
              <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{prog.cliente?.nombre ?? 'Sin cliente'}</p>
                  <p className="text-xs text-muted-foreground">{formatFecha(prog.fecha_hora)} · {formatHora(prog.fecha_hora)}</p>
                </div>
                <button type="button" onClick={clearProg} className="text-muted-foreground hover:text-foreground shrink-0"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <div ref={acRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} placeholder="Buscar por cliente..." className="w-full rounded-md border bg-background pl-9 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
                  {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                {open && q.trim().length >= 2 && (
                  <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-md border bg-card shadow-lg z-50 py-1">
                    {results.length === 0 && !searching && <p className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</p>}
                    {results.map((p) => (
                      <button key={p.id} type="button" onClick={() => applyProg(p)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-muted text-left">
                        <span className="truncate">{p.cliente?.nombre ?? 'Sin cliente'}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{formatFecha(p.fecha_hora)}</span>
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">Opcional. Puede registrar conduces históricos sin vincular un servicio.</p>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Empresa (cliente)</Label>
            <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} readOnly={!!prog} className={prog ? 'bg-muted/40' : ''} placeholder="Nombre de la empresa" />
          </div>
          <div className="space-y-1.5">
            <Label>Número de conduce *</Label>
            <Input type="number" value={numero} onChange={(e) => setNumero(e.target.value)} />
            <p className="text-xs text-muted-foreground">Sugerencia automática del siguiente número disponible.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Tipos de servicio</Label>
            <MultiSelect options={tipoOptions} selected={tiposSel} onChange={setTiposSel} placeholder="Seleccionar tipos..." />
          </div>
          <div className="space-y-1.5">
            <Label>Técnicos * (máx. {MAX_TECNICOS})</Label>
            <MultiSelect options={tecnicoOptions} selected={tecnicos} onChange={setTecnicos} max={MAX_TECNICOS} maxMessage="Máximo 6 técnicos por servicio." placeholder="Seleccionar técnicos..." />
          </div>
          <div className="space-y-1.5">
            <Label>Detalles / Observaciones</Label>
            <Textarea value={detalles} onChange={(e) => setDetalles(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Registrar conduce</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
