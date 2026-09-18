'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import {
  CalendarDays, Users, FileText, ScrollText, AlertTriangle, Download, Loader2,
  Sun, Moon, Home, TrendingUp, ArrowRight, Clock,
} from 'lucide-react'
import { fetcher } from '@/lib/fetcher'
import { CountUp } from '@/components/count-up'
import { PageTitle } from '@/components/page-title'
import { Button } from '@/components/ui/button'
import { estadoBadge } from '@/lib/estado-ui'
import { formatFecha, formatHora } from '@/lib/helpers'
import { generateAndDownloadPdf } from '@/lib/pdf-download'
import { toast } from 'sonner'

function todayISO() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

interface Dash {
  countHoy: number; countSemana: number; countMes: number; conducesMes: number
  turnosHoy: Record<string, number>
  distribucionTecnicos: { nombre: string; count: number }[]
  tasaEjecucion: number
  sinConduce: number
  licenciasPorVencer: { id: string; nombre_completo: string; fecha_expiracion_licencia: string | null }[]
  clientesActivos: number; contratosActivos: number
  serviciosHoy: { id: number; fecha_hora: string; estado: string; turno: string; cliente: { nombre: string } | null; tipos_servicio: { nombre: string }[] }[]
  proximos: { id: number; fecha_hora: string; estado: string; cliente: { nombre: string } | null; tipos_servicio: { nombre: string }[] }[]
}

export default function DashboardPage() {
  const { data, isLoading } = useSWR<Dash>('/api/dashboard', fetcher)
  const [pdfLoading, setPdfLoading] = useState(false)

  const descargarAgenda = async () => {
    setPdfLoading(true)
    try {
      await generateAndDownloadPdf('/api/agenda-pdf', { date: todayISO() }, `agenda-${todayISO()}.pdf`, (m) => toast.loading(m, { id: 'pdf' }))
      toast.success('Agenda descargada.', { id: 'pdf' })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al generar la agenda.', { id: 'pdf' })
    } finally {
      setPdfLoading(false)
    }
  }

  const d = data
  const licVencidas = (d?.licenciasPorVencer ?? []).filter((l) => l.fecha_expiracion_licencia && new Date(l.fecha_expiracion_licencia) < new Date())
  const licPorVencer = (d?.licenciasPorVencer ?? []).filter((l) => !(l.fecha_expiracion_licencia && new Date(l.fecha_expiracion_licencia) < new Date()))

  const daysUntil = (dateStr: string | null) => {
    if (!dateStr) return 0
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  }

  const stats = [
    { label: 'Servicios hoy', value: d?.countHoy ?? 0, icon: CalendarDays, href: '/calendario', color: 'text-primary bg-primary/10' },
    { label: 'Servicios esta semana', value: d?.countSemana ?? 0, icon: Clock, href: '/programacion', color: 'text-blue-600 bg-blue-100' },
    { label: 'Conduces este mes', value: d?.conducesMes ?? 0, icon: ScrollText, href: '/conduces', color: 'text-amber-600 bg-amber-100' },
    { label: 'Clientes activos', value: d?.clientesActivos ?? 0, icon: Users, href: '/clientes', color: 'text-emerald-600 bg-emerald-100' },
  ]

  return (
    <div>
      <PageTitle
        title="Dashboard"
        subtitle="Panel operativo de Servifumi Pest Control. Somos parte activa de la solución."
        action={
          <Button onClick={descargarAgenda} disabled={pdfLoading}>
            {pdfLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Descargar Agenda de Hoy
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Link href={s.href} className="block rounded-lg bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${s.color}`}><Icon className="h-5.5 w-5.5" /></span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-4 text-3xl font-display font-bold tracking-tight">
                  {isLoading ? '—' : <CountUp value={s.value} />}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </Link>
            </motion.div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hoy - turnos */}
          <section className="rounded-lg bg-card p-5 shadow-sm">
            <h2 className="font-display font-semibold mb-4">Hoy por turno</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { k: 'Matutino', icon: Sun, color: 'bg-amber-50 text-amber-700' },
                { k: 'Nocturno', icon: Moon, color: 'bg-indigo-50 text-indigo-700' },
                { k: 'Interior', icon: Home, color: 'bg-emerald-50 text-emerald-700' },
              ].map((t) => {
                const Icon = t.icon
                return (
                  <div key={t.k} className={`rounded-lg p-4 ${t.color}`}>
                    <Icon className="h-5 w-5 mb-2" />
                    <p className="text-2xl font-bold">{isLoading ? '—' : (d?.turnosHoy?.[t.k] ?? 0)}</p>
                    <p className="text-xs">{t.k}</p>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Servicios de hoy */}
          <section className="rounded-lg bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold">Servicios de hoy</h2>
              <Link href="/calendario" className="text-sm text-primary hover:underline">Ver calendario</Link>
            </div>
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Cargando...</p>
            ) : (d?.serviciosHoy?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No hay servicios programados para hoy.</p>
            ) : (
              <div className="divide-y">
                {d?.serviciosHoy?.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 py-2.5">
                    <span className="text-sm font-mono text-muted-foreground w-16 shrink-0">{formatHora(s.fecha_hora)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s?.cliente?.nombre ?? 'Cliente'}</p>
                      <p className="text-xs text-muted-foreground truncate">{(s?.tipos_servicio ?? []).map((t) => t.nombre).join(', ')}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${estadoBadge(s.estado)}`}>{s.estado}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Distribucion por tecnico */}
          <section className="rounded-lg bg-card p-5 shadow-sm">
            <h2 className="font-display font-semibold mb-4">Carga por técnico (esta semana)</h2>
            {(d?.distribucionTecnicos?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sin datos.</p>
            ) : (
              <div className="space-y-2.5">
                {(() => {
                  const maxC = Math.max(1, ...(d?.distribucionTecnicos ?? []).map((t) => t.count))
                  return (d?.distribucionTecnicos ?? []).map((t) => (
                    <div key={t.nombre} className="flex items-center gap-3">
                      <span className="text-sm w-40 truncate shrink-0">{t.nombre}</span>
                      <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(t.count / maxC) * 100}%` }} />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{t.count}</span>
                    </div>
                  ))
                })()}
              </div>
            )}
          </section>
        </div>

        {/* Right column - alertas */}
        <div className="space-y-6">
          {/* Tasa de ejecucion */}
          <section className="rounded-lg bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2"><TrendingUp className="h-4 w-4 text-primary" /><h2 className="font-display font-semibold">Tasa de ejecución (mes)</h2></div>
            <p className="text-4xl font-display font-bold text-primary">{isLoading ? '—' : <CountUp value={d?.tasaEjecucion ?? 0} suffix="%" />}</p>
            <p className="text-xs text-muted-foreground mt-1">Servicios completados vs. programados este mes.</p>
          </section>

          {/* Servicios sin conduce */}
          <section className="rounded-lg bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h2 className="font-display font-semibold">Servicios sin conduce</h2>
            </div>
            <p className="text-3xl font-display font-bold text-amber-600">{isLoading ? '—' : <CountUp value={d?.sinConduce ?? 0} />}</p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">Servicios pasados sin conduce registrado.</p>
            <Link href="/programacion?sinConduce=1"><Button variant="outline" size="sm" className="w-full">Revisar</Button></Link>
          </section>

          {/* Licencias */}
          <section className="rounded-lg bg-card p-5 shadow-sm">
            <h2 className="font-display font-semibold mb-3">Licencias de conducir</h2>
            {(d?.licenciasPorVencer?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Sin licencias por vencer en 30 días.</p>
            ) : (
              <div className="space-y-2">
                {licVencidas.map((l) => (
                  <div key={l.id} className="rounded-md bg-red-50 border border-red-200 p-2.5 text-sm text-red-700">
                    🔴 {l.nombre_completo} — Licencia VENCIDA desde {l.fecha_expiracion_licencia ? formatFecha(l.fecha_expiracion_licencia) : ''}
                  </div>
                ))}
                {licPorVencer.map((l) => (
                  <div key={l.id} className="rounded-md bg-amber-50 border border-amber-200 p-2.5 text-sm text-amber-800">
                    ⚠️ {l.nombre_completo} — Vence el {l.fecha_expiracion_licencia ? formatFecha(l.fecha_expiracion_licencia) : ''} ({daysUntil(l.fecha_expiracion_licencia)} días)
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Proximos */}
          <section className="rounded-lg bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3"><FileText className="h-4 w-4 text-primary" /><h2 className="font-display font-semibold">Próximos servicios</h2></div>
            {(d?.proximos?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Sin próximos servicios.</p>
            ) : (
              <div className="divide-y">
                {d?.proximos?.slice(0, 6).map((s) => (
                  <div key={s.id} className="py-2">
                    <p className="text-sm font-medium truncate">{s?.cliente?.nombre ?? 'Cliente'}</p>
                    <p className="text-xs text-muted-foreground">{formatFecha(s.fecha_hora)} · {formatHora(s.fecha_hora)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
