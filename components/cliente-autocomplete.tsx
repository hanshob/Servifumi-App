'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'

interface ClienteLite { id: number; nombre: string; zona: string; direccion?: string; nombre_contacto_principal?: string }

export function ClienteAutocomplete({
  value,
  onSelect,
  placeholder = 'Buscar cliente...',
}: {
  value: ClienteLite | null
  onSelect: (c: ClienteLite | null) => void
  placeholder?: string
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ClienteLite[]>([])
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/clientes?search=${encodeURIComponent(q.trim())}&pageSize=10&estado=Activo`)
        const data = await r.json()
        setResults(data?.data ?? [])
      } catch { setResults([]) } finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
        <div className="min-w-0">
          <p className="font-medium truncate">{value.nombre}</p>
          <p className="text-xs text-muted-foreground">{value.zona}</p>
        </div>
        <button type="button" onClick={() => onSelect(null)} className="text-muted-foreground hover:text-foreground shrink-0"><X className="h-4 w-4" /></button>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} placeholder={placeholder}
          className="w-full rounded-md border bg-background pl-9 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-md border bg-card shadow-lg z-50 py-1">
          {results.length === 0 && !loading && <p className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</p>}
          {results.map((c) => (
            <button key={c.id} type="button" onClick={() => { onSelect(c); setOpen(false); setQ('') }} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-muted text-left">
              <span className="truncate">{c.nombre}</span>
              <span className="text-xs text-muted-foreground shrink-0">{c.zona}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
