'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, CalendarDays, Download, Loader2, Users, Truck } from 'lucide-react'
import { fetcher } from '@/lib/fetcher'
import { PageTitle } from '@/components/page-title'
import { Button } from '@/components/ui/button'
import { estadoBadge } from '@/lib/estado-ui'
import { formatHora } from '@/lib/helpers'
import { DIAS_SEMANA } from '@/lib/constants'
import { generateAndDownloadPdf } from '@/lib/pdf-download'
import { toast } from 'sonner'

interface Servicio {
  id: number
  fecha_hora: string
  estado: string
  turno: string
  origen: string
  cliente: { id: number; nombre: string; telefono: string | null; direccion: string | null } | null
  tipos_servicio: { id: number; nombre: string }[]
  tecnicos: { id: string; nombre_completo: string }[]
  vehiculo: { id: number; identificador: string } | null
}
interface WeekResp { weekStart: string; weekEnd: string; data: Servicio[] }

function mondayOfToday(): Date {
  const n = new Date()
  const d = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()))
  const dow = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow))
  return d
}

export default function AgendaPage() {
  const { data: session } = useSession()
  const isSupervisor = session?.user?.role === 'Supervisor'
  const [weekMonday, setWeekMonday] = useState<Date>(mondayOfToday())
  const [downloading, setDownloading] = useState<string | null>(null)

  const weekIso = weekMonday.toISOString().slice(0, 10)
  const { data, isLoading, error } = useSWR<WeekResp>(`/api/agenda-semanal?week=${weekIso}`, fetcher)

  const todayMonday = mondayOfToday()
  const isCurrentWeek = weekMonday.getTime() === todayMonday.getTime()
  const disableNext = isSupervisor && isCurrentWeek

  const shift = (weeks: number) => {
    const d = new Date(weekMonday)
    d.setUTCDate(d.getUTCDate() + weeks * 7)
    if (isSupervisor && d.getTime() > todayMonday.getTime()) return
    setWeekMonday(d)
  }

  // Build 7 day columns Monday..Sunday
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekMonday)
    d.setUTCDate(weekMonday.getUTCDate() + i)
    return d
  })
  const servicesByDay = (d: Date) => (data?.data ?? []).filter((s) => (s?.fecha_hora ?? '').slice(0, 10) === d.toISOString().slice(0, 10))

  const rangeLabel = () => {
    const end = new Date(weekMonday); end.setUTCDate(weekMonday.getUTCDate() + 6)
    const fmt = (x: Date) => new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(x)
    return `${fmt(weekMonday)} – ${fmt(end)} ${weekMonday.getUTCFullYear()}`
  }

  const downloadDay = async (d: Date) => {
    const iso = d.toISOString().slice(0, 10)
    setDownloading(iso)
    try {
      await generateAndDownloadPdf('/api/agenda-pdf', { date: iso }, `agenda-${iso}.pdf`)
      toast.success('Agenda descargada.')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error al generar el PDF.') }
    finally { setDownloading(null) }
  }

  return (
    <div>
      <PageTitle title="Agenda semanal"
        subtitle={isSupervisor ? 'Vista de solo lectura de los servicios de la semana. No es posible ver semanas futuras.' : 'Vista semanal de los servicios programados, organizada por día.'} />

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setWeekMonday(mondayOfToday())}>Esta semana</Button>
          <Button variant="outline" size="sm" onClick={() => shift(1)} disabled={disableNext}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <CalendarDays className="h-4 w-4 text-primary" />{rangeLabel()}
        </div>
      </div>

      {error && <div className="rounded-lg bg-destructive/10 text-destructive p-4 text-sm">{error instanceof Error ? error.message : 'Error al cargar la agenda.'}</div>}
      {isLoading && <div className="py-20 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>}

      {!isLoading && !error && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {days.map((d, i) => {
            const list = servicesByDay(d)
            const iso = d.toISOString().slice(0, 10)
            return (
              <motion.div key={iso} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="rounded-lg bg-card shadow-sm overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 bg-muted/50">
                  <div>
                    <p className="font-semibold text-sm">{DIAS_SEMANA[i]}</p>
                    <p className="text-xs text-muted-foreground">{new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: 'long', timeZone: 'UTC' }).format(d)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-primary">{list.length}</span>
                    {list.length > 0 && (
                      <button onClick={() => downloadDay(d)} disabled={downloading === iso} className="p-1.5 rounded hover:bg-background" title="Descargar agenda del día">
                        {downloading === iso ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-3 space-y-2 flex-1">
                  {list.length === 0 && <p className="text-xs text-muted-foreground py-6 text-center">Sin servicios</p>}
                  {list.map((s) => (
                    <div key={s.id} className="rounded-md border-l-4 bg-muted/30 p-2.5 text-sm" style={{ borderLeftColor: '#1a5c2a' }}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{formatHora(s.fecha_hora)}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${estadoBadge(s.estado)}`}>{s.estado}</span>
                      </div>
                      <p className="font-medium mt-1">{s.cliente?.nombre ?? '—'}</p>
                      {(s.tipos_servicio?.length ?? 0) > 0 && <p className="text-xs text-muted-foreground">{s.tipos_servicio.map((t) => t.nombre).join(', ')}</p>}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                        {(s.tecnicos?.length ?? 0) > 0 && <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{s.tecnicos.map((t) => t.nombre_completo).join(', ')}</span>}
                        {s.vehiculo && <span className="inline-flex items-center gap-1"><Truck className="h-3 w-3" />{s.vehiculo.identificador}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
