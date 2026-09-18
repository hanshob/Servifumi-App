'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import {
  ArrowLeft, MapPin, Phone, Mail, MessageCircle, ExternalLink, User, FileText, ClipboardList,
  ScrollText, Pencil, Loader2,
} from 'lucide-react'
import { fetcher } from '@/lib/fetcher'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ClienteFormModal } from '@/components/cliente-form-modal'
import { estadoBadge } from '@/lib/estado-ui'
import { buildWhatsappLink, formatFecha, formatHora } from '@/lib/helpers'

interface Detail {
  cliente: {
    id: number; nombre: string; tipo_cliente: string; zona: string; estado: string; direccion: string
    telefono: string; telefono_alterno: string; email: string; nombre_contacto_principal: string
    telefono_contacto_principal: string; google_maps_url: string; notas: string
    contratos: { id: number; frecuencia: string; estado: string; dia_preferido: string; tipo_servicio: { nombre: string } | null }[]
    programaciones: { id: number; fecha_hora: string; estado: string; tipos_servicio: { nombre: string }[]; conduces: { conduce_numero: number }[] }[]
  }
  conduces: { conduce_numero: number; fecha_registro: string; empresa: string; tipos_servicio: { nombre: string }[] }[]
}

export default function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading, mutate } = useSWR<Detail>(`/api/clientes/${id}`, fetcher)
  const [editing, setEditing] = useState(false)

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
  const c = data?.cliente
  if (!c) return <p className="text-center py-20 text-muted-foreground">Cliente no encontrado.</p>

  const wa = buildWhatsappLink(c.telefono)
  const waContacto = buildWhatsappLink(c.telefono_contacto_principal)

  return (
    <div>
      <Link href="/clientes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="h-4 w-4" />Volver a clientes</Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold tracking-tight">{c.nombre}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full ${estadoBadge(c.estado)}`}>{c.estado}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{c.tipo_cliente} · {c.zona}</p>
        </div>
        <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="mr-1.5 h-4 w-4" />Editar</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info card */}
        <div className="space-y-4">
          <section className="rounded-lg bg-card p-5 shadow-sm space-y-3">
            <h2 className="font-display font-semibold">Información de contacto</h2>
            {c.direccion && <div className="flex items-start gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" /><span>{c.direccion}</span></div>}
            {c.telefono && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span suppressHydrationWarning>{c.telefono}</span>
                {wa && <a href={wa} target="_blank" rel="noreferrer" className="text-emerald-600"><MessageCircle className="h-4 w-4" /></a>}
              </div>
            )}
            {c.telefono_alterno && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground shrink-0" /><span suppressHydrationWarning>{c.telefono_alterno}</span></div>}
            {c.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground shrink-0" /><span suppressHydrationWarning>{c.email}</span></div>}
            {c.google_maps_url && <a href={c.google_maps_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"><ExternalLink className="h-4 w-4" />Ver en Google Maps</a>}
          </section>

          {(c.nombre_contacto_principal || c.telefono_contacto_principal) && (
            <section className="rounded-lg bg-card p-5 shadow-sm space-y-3">
              <h2 className="font-display font-semibold">Contacto principal</h2>
              {c.nombre_contacto_principal && <div className="flex items-center gap-2 text-sm"><User className="h-4 w-4 text-muted-foreground shrink-0" />{c.nombre_contacto_principal}</div>}
              {c.telefono_contacto_principal && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" /><span suppressHydrationWarning>{c.telefono_contacto_principal}</span>
                  {waContacto && <a href={waContacto} target="_blank" rel="noreferrer" className="text-emerald-600"><MessageCircle className="h-4 w-4" /></a>}
                </div>
              )}
            </section>
          )}

          {c.notas && (
            <section className="rounded-lg bg-card p-5 shadow-sm">
              <h2 className="font-display font-semibold mb-2">Notas</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{c.notas}</p>
            </section>
          )}
        </div>

        {/* Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="contratos">
            <TabsList>
              <TabsTrigger value="contratos"><FileText className="mr-1.5 h-4 w-4" />Contratos ({c.contratos?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="servicios"><ClipboardList className="mr-1.5 h-4 w-4" />Servicios ({c.programaciones?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="conduces"><ScrollText className="mr-1.5 h-4 w-4" />Conduces ({data?.conduces?.length ?? 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="contratos" className="mt-4">
              <div className="rounded-lg bg-card shadow-sm divide-y">
                {(c.contratos?.length ?? 0) === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Sin contratos.</p>}
                {c.contratos?.map((ct) => (
                  <Link key={ct.id} href={`/contratos?focus=${ct.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/30">
                    <div>
                      <p className="font-medium text-sm">{ct.tipo_servicio?.nombre ?? 'Servicio'}</p>
                      <p className="text-xs text-muted-foreground">{ct.frecuencia} · {ct.dia_preferido}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${estadoBadge(ct.estado)}`}>{ct.estado}</span>
                  </Link>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="servicios" className="mt-4">
              <div className="rounded-lg bg-card shadow-sm divide-y max-h-[520px] overflow-y-auto">
                {(c.programaciones?.length ?? 0) === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Sin servicios.</p>}
                {c.programaciones?.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{formatFecha(s.fecha_hora)} · {formatHora(s.fecha_hora)}</p>
                      <p className="text-xs text-muted-foreground truncate">{(s.tipos_servicio ?? []).map((t) => t.nombre).join(', ')}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(s.conduces?.length ?? 0) > 0 ? <span className="text-xs text-emerald-600">Conduce #{s.conduces[0].conduce_numero}</span> : <span className="text-xs text-amber-600">Sin conduce</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${estadoBadge(s.estado)}`}>{s.estado}</span>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="conduces" className="mt-4">
              <div className="rounded-lg bg-card shadow-sm divide-y max-h-[520px] overflow-y-auto">
                {(data?.conduces?.length ?? 0) === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Sin conduces.</p>}
                {data?.conduces?.map((k) => (
                  <Link key={k.conduce_numero} href={`/conduces?focus=${k.conduce_numero}`} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/30">
                    <div>
                      <p className="font-medium text-sm font-mono">#{k.conduce_numero}</p>
                      <p className="text-xs text-muted-foreground">{(k.tipos_servicio ?? []).map((t) => t.nombre).join(', ')}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatFecha(k.fecha_registro)}</span>
                  </Link>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {editing && <ClienteFormModal cliente={c} onClose={() => setEditing(false)} onSaved={() => mutate()} />}
    </div>
  )
}
