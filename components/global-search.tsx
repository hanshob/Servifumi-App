'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, ClipboardList, ScrollText, Loader2 } from 'lucide-react'
import { formatFecha } from '@/lib/helpers'

interface Results {
  clientes: { id: number; nombre: string; zona: string; telefono: string }[]
  servicios: { id: number; fecha_hora: string; estado: string; cliente: { nombre: string } }[]
  conduces: { conduce_numero: number; empresa: string; fecha_registro: string }[]
}

const EMPTY: Results = { clientes: [], servicios: [], conduces: [] }

export function GlobalSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [res, setRes] = useState<Results>(EMPTY)
  const boxRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (q.trim().length < 2) { setRes(EMPTY); return }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
        const data = await r.json()
        setRes({ clientes: data?.clientes ?? [], servicios: data?.servicios ?? [], conduces: data?.conduces ?? [] })
      } catch {
        setRes(EMPTY)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const go = (href: string) => {
    setOpen(false)
    setQ('')
    router.push(href)
  }

  const total = (res?.clientes?.length ?? 0) + (res?.servicios?.length ?? 0) + (res?.conduces?.length ?? 0)

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar clientes, servicios, conduces..."
          className="w-full rounded-md border bg-background pl-9 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 mt-1 max-h-[70vh] overflow-y-auto rounded-md border bg-card shadow-lg z-50 py-1">
          {total === 0 && !loading && (
            <p className="px-3 py-4 text-sm text-muted-foreground text-center">Sin resultados</p>
          )}
          {(res?.clientes?.length ?? 0) > 0 && (
            <div>
              <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase text-muted-foreground">Clientes</p>
              {res.clientes.map((c) => (
                <button key={`c${c.id}`} onClick={() => go(`/clientes/${c.id}`)} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left">
                  <Users className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate flex-1">{c.nombre}</span>
                  <span className="text-xs text-muted-foreground">{c.zona}</span>
                </button>
              ))}
            </div>
          )}
          {(res?.servicios?.length ?? 0) > 0 && (
            <div>
              <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase text-muted-foreground">Servicios</p>
              {res.servicios.map((s) => (
                <button key={`s${s.id}`} onClick={() => go(`/programacion?focus=${s.id}`)} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left">
                  <ClipboardList className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate flex-1">{s?.cliente?.nombre ?? 'Servicio'}</span>
                  <span className="text-xs text-muted-foreground">{formatFecha(s.fecha_hora)}</span>
                </button>
              ))}
            </div>
          )}
          {(res?.conduces?.length ?? 0) > 0 && (
            <div>
              <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase text-muted-foreground">Conduces</p>
              {res.conduces.map((c) => (
                <button key={`k${c.conduce_numero}`} onClick={() => go(`/conduces?focus=${c.conduce_numero}`)} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left">
                  <ScrollText className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-mono">#{c.conduce_numero}</span>
                  <span className="truncate flex-1 text-muted-foreground">{c.empresa}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
