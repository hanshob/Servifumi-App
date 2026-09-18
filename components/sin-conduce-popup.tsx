'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollText, AlertTriangle } from 'lucide-react'
import { formatFecha } from '@/lib/helpers'

interface Servicio {
  id: number
  fecha_hora: string
  cliente: { id: number; nombre: string } | null
  tipos_servicio: { id: number; nombre: string }[]
}

export function SinConducePopup() {
  const router = useRouter()
  const [items, setItems] = useState<Servicio[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem('sinConduceShown') === '1') return
    ;(async () => {
      try {
        const r = await fetch('/api/servicios-sin-conduce')
        if (!r.ok) return
        const data = await r.json()
        const list: Servicio[] = data?.data ?? []
        if (list.length > 0) {
          setItems(list)
          setOpen(true)
        }
        sessionStorage.setItem('sinConduceShown', '1')
      } catch {
        /* ignore */
      }
    })()
  }, [])

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Servicios sin conduce
          </DialogTitle>
          <DialogDescription>
            Hay servicios realizados que aún no tienen un conduce registrado. Revísalos y agrégalos.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto divide-y rounded-md border">
          {items.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <ScrollText className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{s?.cliente?.nombre ?? 'Cliente'}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {formatFecha(s.fecha_hora)} · {(s?.tipos_servicio ?? []).map((t) => t.nombre).join(', ')}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setOpen(false); router.push(`/conduces?nuevo=1&programacion=${s.id}`) }}>
                Agregar
              </Button>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cerrar</Button>
          <Button onClick={() => { setOpen(false); router.push('/programacion?sinConduce=1') }}>Ver todos</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
