'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Users, Truck, Bug, CalendarClock, UserCog, ArrowLeft, Plus, Pencil, Loader2, ChevronRight } from 'lucide-react'
import { fetcher, apiPost, apiPatch } from '@/lib/fetcher'
import { PageTitle } from '@/components/page-title'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { estadoBadge } from '@/lib/estado-ui'
import { formatFecha } from '@/lib/helpers'
import { PUESTOS, ESTADOS_PERSONAL, ESTADOS_VEHICULO, FRECUENCIAS } from '@/lib/constants'
import { toast } from 'sonner'

interface Personal {
  id: string
  nombre_completo: string
  puesto: string
  telefono: string
  cedula: string
  fecha_expiracion_licencia: string | null
  estado: string
}
interface Vehiculo {
  id: number
  identificador: string
  apodo: string
  placa: string
  marca: string
  estado: string
  notas: string
}
interface Tipo {
  id: number
  nombre: string
  estado: string
}

type Section = 'personal' | 'vehiculos' | 'tipos' | 'frecuencias'

export default function ConfiguracionPage() {
  const { data: session } = useSession()
  const role = session?.user?.role
  const isGerente = role === 'Gerente General'
  const [section, setSection] = useState<Section | null>(null)

  const { data: personal } = useSWR<{ data: Personal[] }>('/api/personal', fetcher)
  const { data: vehiculos } = useSWR<{ data: Vehiculo[] }>('/api/vehiculos', fetcher)
  const { data: tipos } = useSWR<{ data: Tipo[] }>('/api/tipos-servicio', fetcher)

  const personalActivos = (personal?.data ?? []).filter((p) => p?.estado === 'Activo').length
  const vehiculosActivos = (vehiculos?.data ?? []).filter((v) => v?.estado === 'Disponible').length
  const tiposActivos = (tipos?.data ?? []).filter((t) => t?.estado === 'Activo').length

  if (section === 'personal') return <PersonalSection onBack={() => setSection(null)} />
  if (section === 'vehiculos') return <VehiculosSection onBack={() => setSection(null)} />
  if (section === 'tipos') return <TiposSection onBack={() => setSection(null)} />
  if (section === 'frecuencias') return <FrecuenciasSection onBack={() => setSection(null)} />

  const cards = [
    { key: 'personal' as Section, icon: Users, title: 'Personal', desc: 'Gestiona el equipo de trabajo — técnicos, supervisores y administrativos.', count: personalActivos, countLabel: 'activos', color: 'bg-primary/10 text-primary' },
    { key: 'vehiculos' as Section, icon: Truck, title: 'Vehículos', desc: 'Administra la flota de vehículos disponibles para los servicios.', count: vehiculosActivos, countLabel: 'disponibles', color: 'bg-blue-100 text-blue-700' },
    { key: 'tipos' as Section, icon: Bug, title: 'Tipos de Servicio', desc: 'Define los tipos de servicio que ofrece la empresa.', count: tiposActivos, countLabel: 'activos', color: 'bg-amber-100 text-amber-700' },
    { key: 'frecuencias' as Section, icon: CalendarClock, title: 'Frecuencias', desc: 'Frecuencias disponibles para los contratos (solo lectura).', count: FRECUENCIAS.length, countLabel: 'definidas', color: 'bg-purple-100 text-purple-700' },
  ]

  return (
    <div>
      <PageTitle title="Configuración" subtitle="Administra los datos maestros del sistema: personal, vehículos, tipos de servicio y más." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => (
          <motion.button
            key={c.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setSection(c.key)}
            className="text-left rounded-lg bg-card shadow-sm p-5 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-start justify-between">
              <div className={`rounded-lg p-2.5 ${c.color}`}><c.icon className="h-6 w-6" /></div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="mt-3 font-semibold">{c.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
            <p className="mt-3 text-sm font-medium text-primary">{c.count} {c.countLabel}</p>
          </motion.button>
        ))}

        {isGerente && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Link href="/usuarios" className="block text-left rounded-lg bg-card shadow-sm p-5 hover:shadow-md transition-shadow group h-full">
              <div className="flex items-start justify-between">
                <div className="rounded-lg p-2.5 bg-rose-100 text-rose-700"><UserCog className="h-6 w-6" /></div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="mt-3 font-semibold">Usuarios</h3>
              <p className="mt-1 text-sm text-muted-foreground">Crea y administra las cuentas de acceso al sistema y sus roles.</p>
              <p className="mt-3 text-sm font-medium text-primary">Solo Gerente General</p>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  )
}

function BackHeader({ onBack, title, subtitle, action }: { onBack: () => void; title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="h-4 w-4" /> Volver a Configuración
      </button>
      <PageTitle title={title} subtitle={subtitle} action={action} />
    </div>
  )
}

/* ============ PERSONAL ============ */
function PersonalSection({ onBack }: { onBack: () => void }) {
  const { data, isLoading, mutate } = useSWR<{ data: Personal[] }>('/api/personal', fetcher)
  const [modal, setModal] = useState<{ edit: Personal | null } | null>(null)

  return (
    <div>
      <BackHeader onBack={onBack} title="Personal" subtitle="Técnicos, supervisores y administrativos. El ID se genera automáticamente según el puesto."
        action={<Button size="sm" onClick={() => setModal({ edit: null })}><Plus className="mr-1.5 h-4 w-4" />Nuevo personal</Button>} />
      <div className="rounded-lg bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Puesto</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Teléfono</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Lic. vence</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Cargando...</td></tr>}
              {!isLoading && (data?.data?.length ?? 0) === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No hay personal registrado.</td></tr>}
              {data?.data?.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{p.id}</td>
                  <td className="px-4 py-3 font-medium">{p.nombre_completo}</td>
                  <td className="px-4 py-3">{p.puesto}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{p.telefono || '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{p.fecha_expiracion_licencia ? formatFecha(p.fecha_expiracion_licencia) : '—'}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${estadoBadge(p.estado)}`}>{p.estado}</span></td>
                  <td className="px-4 py-3 text-right"><button onClick={() => setModal({ edit: p })} className="p-1.5 rounded hover:bg-muted" title="Editar"><Pencil className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal && <PersonalModal edit={modal.edit} onClose={() => setModal(null)} onSaved={() => mutate()} />}
    </div>
  )
}

function PersonalModal({ edit, onClose, onSaved }: { edit: Personal | null; onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState(edit?.nombre_completo ?? '')
  const [puesto, setPuesto] = useState(edit?.puesto ?? 'Técnico')
  const [telefono, setTelefono] = useState(edit?.telefono ?? '')
  const [cedula, setCedula] = useState(edit?.cedula ?? '')
  const [licencia, setLicencia] = useState(edit?.fecha_expiracion_licencia ? edit.fecha_expiracion_licencia.slice(0, 10) : '')
  const [estado, setEstado] = useState(edit?.estado ?? 'Activo')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!nombre.trim()) { toast.error('El nombre es obligatorio.'); return }
    setSaving(true)
    const body = { nombre_completo: nombre.trim(), puesto, telefono, cedula, fecha_expiracion_licencia: licencia || null, estado }
    try {
      if (edit) await apiPatch(`/api/personal/${edit.id}`, body)
      else await apiPost('/api/personal', body)
      toast.success(edit ? 'Personal actualizado.' : 'Personal creado.')
      onSaved(); onClose()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error al guardar.'); setSaving(false) }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{edit ? `Editar ${edit.id}` : 'Nuevo personal'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><label className="text-sm font-medium">Nombre completo *</label><Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellido" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium">Puesto *</label>
              <Select value={puesto} onValueChange={setPuesto}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PUESTOS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
              {edit && <p className="text-xs text-muted-foreground mt-1">El ID no cambia aunque cambie el puesto.</p>}
            </div>
            <div><label className="text-sm font-medium">Estado</label>
              <Select value={estado} onValueChange={setEstado}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ESTADOS_PERSONAL.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium">Teléfono</label><Input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="809-000-0000" /></div>
            <div><label className="text-sm font-medium">Cédula</label><Input value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="000-0000000-0" /></div>
          </div>
          <div><label className="text-sm font-medium">Expiración licencia de conducir</label><Input type="date" value={licencia} onChange={(e) => setLicencia(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={saving} onClick={save}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ============ VEHICULOS ============ */
function VehiculosSection({ onBack }: { onBack: () => void }) {
  const { data, isLoading, mutate } = useSWR<{ data: Vehiculo[] }>('/api/vehiculos', fetcher)
  const [modal, setModal] = useState<{ edit: Vehiculo | null } | null>(null)

  return (
    <div>
      <BackHeader onBack={onBack} title="Vehículos" subtitle="Flota de vehículos. Los vehículos en Mantenimiento o Inactivo no aparecen en los selectores."
        action={<Button size="sm" onClick={() => setModal({ edit: null })}><Plus className="mr-1.5 h-4 w-4" />Nuevo vehículo</Button>} />
      <div className="rounded-lg bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Identificador</th>
                <th className="px-4 py-3 font-medium">Apodo</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Placa</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Marca</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Cargando...</td></tr>}
              {!isLoading && (data?.data?.length ?? 0) === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No hay vehículos registrados.</td></tr>}
              {data?.data?.map((v) => (
                <tr key={v.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{v.identificador}</td>
                  <td className="px-4 py-3">{v.apodo || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{v.placa || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{v.marca || '—'}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${estadoBadge(v.estado)}`}>{v.estado}</span></td>
                  <td className="px-4 py-3 text-right"><button onClick={() => setModal({ edit: v })} className="p-1.5 rounded hover:bg-muted" title="Editar"><Pencil className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal && <VehiculoModal edit={modal.edit} onClose={() => setModal(null)} onSaved={() => mutate()} />}
    </div>
  )
}

function VehiculoModal({ edit, onClose, onSaved }: { edit: Vehiculo | null; onClose: () => void; onSaved: () => void }) {
  const [identificador, setIdentificador] = useState(edit?.identificador ?? '')
  const [apodo, setApodo] = useState(edit?.apodo ?? '')
  const [placa, setPlaca] = useState(edit?.placa ?? '')
  const [marca, setMarca] = useState(edit?.marca ?? '')
  const [estado, setEstado] = useState(edit?.estado ?? 'Disponible')
  const [notas, setNotas] = useState(edit?.notas ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!identificador.trim()) { toast.error('El identificador es obligatorio.'); return }
    setSaving(true)
    const body = { identificador: identificador.trim(), apodo, placa, marca, estado, notas }
    try {
      if (edit) await apiPatch(`/api/vehiculos/${edit.id}`, body)
      else await apiPost('/api/vehiculos', body)
      toast.success(edit ? 'Vehículo actualizado.' : 'Vehículo creado.')
      onSaved(); onClose()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error al guardar.'); setSaving(false) }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{edit ? `Editar ${edit.identificador}` : 'Nuevo vehículo'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium">Identificador *</label><Input value={identificador} onChange={(e) => setIdentificador(e.target.value)} placeholder="F-1" /></div>
            <div><label className="text-sm font-medium">Apodo</label><Input value={apodo} onChange={(e) => setApodo(e.target.value)} placeholder="La blanca" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium">Placa</label><Input value={placa} onChange={(e) => setPlaca(e.target.value)} /></div>
            <div><label className="text-sm font-medium">Marca</label><Input value={marca} onChange={(e) => setMarca(e.target.value)} /></div>
          </div>
          <div><label className="text-sm font-medium">Estado</label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ESTADOS_VEHICULO.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><label className="text-sm font-medium">Notas</label><Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={saving} onClick={save}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ============ TIPOS ============ */
function TiposSection({ onBack }: { onBack: () => void }) {
  const { data, isLoading, mutate } = useSWR<{ data: Tipo[] }>('/api/tipos-servicio', fetcher)
  const [modal, setModal] = useState<{ edit: Tipo | null } | null>(null)

  return (
    <div>
      <BackHeader onBack={onBack} title="Tipos de Servicio" subtitle="Tipos de servicio que ofrece la empresa. Los inactivos no aparecen en los selectores."
        action={<Button size="sm" onClick={() => setModal({ edit: null })}><Plus className="mr-1.5 h-4 w-4" />Nuevo tipo</Button>} />
      <div className="rounded-lg bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <tr><td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">Cargando...</td></tr>}
            {!isLoading && (data?.data?.length ?? 0) === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">No hay tipos de servicio.</td></tr>}
            {data?.data?.map((t) => (
              <tr key={t.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{t.nombre}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${estadoBadge(t.estado)}`}>{t.estado}</span></td>
                <td className="px-4 py-3 text-right"><button onClick={() => setModal({ edit: t })} className="p-1.5 rounded hover:bg-muted" title="Editar"><Pencil className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && <TipoModal edit={modal.edit} onClose={() => setModal(null)} onSaved={() => mutate()} />}
    </div>
  )
}

function TipoModal({ edit, onClose, onSaved }: { edit: Tipo | null; onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState(edit?.nombre ?? '')
  const [estado, setEstado] = useState(edit?.estado ?? 'Activo')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!nombre.trim()) { toast.error('El nombre es obligatorio.'); return }
    setSaving(true)
    try {
      if (edit) await apiPatch(`/api/tipos-servicio/${edit.id}`, { nombre: nombre.trim(), estado })
      else await apiPost('/api/tipos-servicio', { nombre: nombre.trim(), estado })
      toast.success(edit ? 'Tipo actualizado.' : 'Tipo creado.')
      onSaved(); onClose()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error al guardar.'); setSaving(false) }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{edit ? 'Editar tipo de servicio' : 'Nuevo tipo de servicio'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><label className="text-sm font-medium">Nombre *</label><Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Fumigación general" /></div>
          <div><label className="text-sm font-medium">Estado</label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ESTADOS_PERSONAL.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={saving} onClick={save}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ============ FRECUENCIAS (read-only) ============ */
function FrecuenciasSection({ onBack }: { onBack: () => void }) {
  return (
    <div>
      <BackHeader onBack={onBack} title="Frecuencias" subtitle="Lista de frecuencias disponibles para los contratos. Esta lista es fija y no editable." />
      <div className="rounded-lg bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr><th className="px-4 py-3 font-medium">Frecuencia</th></tr></thead>
          <tbody className="divide-y">
            {FRECUENCIAS.map((f) => (
              <tr key={f} className="hover:bg-muted/30"><td className="px-4 py-3">{f}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
