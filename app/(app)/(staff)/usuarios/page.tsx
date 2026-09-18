'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Plus, Pencil, KeyRound, Loader2, ShieldAlert } from 'lucide-react'
import { fetcher, apiPost, apiPatch } from '@/lib/fetcher'
import { PageTitle } from '@/components/page-title'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { estadoBadge } from '@/lib/estado-ui'
import { ROLES, ESTADOS_PERSONAL } from '@/lib/constants'
import { toast } from 'sonner'

interface Usuario {
  id: number
  nombre_completo: string
  username: string
  rol: string
  estado: string
  personal_vinculado_id: string | null
  must_change_password: boolean
  personal_vinculado: { id: string; nombre_completo: string } | null
}
interface PersonalLite { id: string; nombre_completo: string; puesto: string; estado: string }

export default function UsuariosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isGerente = session?.user?.role === 'Gerente General'

  useEffect(() => {
    if (status === 'authenticated' && !isGerente) router.replace('/configuracion')
  }, [status, isGerente, router])

  const { data, isLoading, mutate } = useSWR<{ data: Usuario[] }>(isGerente ? '/api/usuarios' : null, fetcher)
  const { data: personalData } = useSWR<{ data: PersonalLite[] }>(isGerente ? '/api/personal' : null, fetcher)
  const [modal, setModal] = useState<{ edit: Usuario | null } | null>(null)
  const [resetting, setResetting] = useState<number | null>(null)

  if (status === 'loading') return <div className="py-20 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
  if (!isGerente) return (
    <div className="py-20 text-center">
      <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
      <p className="text-muted-foreground">Solo el Gerente General puede administrar usuarios.</p>
    </div>
  )

  const resetPassword = async (u: Usuario) => {
    if (!confirm(`¿Restablecer la contraseña de ${u.username} a la contraseña por defecto? El usuario deberá cambiarla al iniciar sesión.`)) return
    setResetting(u.id)
    try {
      await apiPost(`/api/usuarios/${u.id}/reset-password`)
      toast.success('Contraseña restablecida a la contraseña por defecto (12345).')
      mutate()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error al restablecer.') }
    finally { setResetting(null) }
  }

  return (
    <div>
      <PageTitle title="Usuarios" subtitle="Cuentas de acceso al sistema. Solo el Gerente General puede crear, editar y desactivar cuentas."
        action={<Button size="sm" onClick={() => setModal({ edit: null })}><Plus className="mr-1.5 h-4 w-4" />Nuevo usuario</Button>} />

      <div className="rounded-lg bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Personal vinculado</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Cargando...</td></tr>}
              {!isLoading && (data?.data?.length ?? 0) === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No hay usuarios.</td></tr>}
              {data?.data?.map((u, i) => (
                <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <span className="font-medium">{u.username}</span>
                    {u.must_change_password && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">cambio pendiente</span>}
                  </td>
                  <td className="px-4 py-3">{u.nombre_completo}</td>
                  <td className="px-4 py-3">{u.rol}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{u.personal_vinculado?.nombre_completo ?? '—'}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${estadoBadge(u.estado)}`}>{u.estado}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => resetPassword(u)} disabled={resetting === u.id} className="p-1.5 rounded hover:bg-muted" title="Restablecer contraseña">
                        {resetting === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                      </button>
                      <button onClick={() => setModal({ edit: u })} className="p-1.5 rounded hover:bg-muted" title="Editar"><Pencil className="h-4 w-4" /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && <UsuarioModal edit={modal.edit} personal={personalData?.data ?? []} onClose={() => setModal(null)} onSaved={() => mutate()} />}
    </div>
  )
}

function UsuarioModal({ edit, personal, onClose, onSaved }: { edit: Usuario | null; personal: PersonalLite[]; onClose: () => void; onSaved: () => void }) {
  const [username, setUsername] = useState(edit?.username ?? '')
  const [nombre, setNombre] = useState(edit?.nombre_completo ?? '')
  const [rol, setRol] = useState(edit?.rol ?? 'Administración')
  const [estado, setEstado] = useState(edit?.estado ?? 'Activo')
  const [vinculado, setVinculado] = useState(edit?.personal_vinculado_id ?? 'none')
  const [saving, setSaving] = useState(false)

  const activos = personal.filter((p) => p?.estado === 'Activo')

  const save = async () => {
    if (!edit && !username.trim()) { toast.error('El nombre de usuario es obligatorio.'); return }
    if (!nombre.trim()) { toast.error('El nombre completo es obligatorio.'); return }
    setSaving(true)
    const personal_vinculado_id = vinculado === 'none' ? null : vinculado
    try {
      if (edit) {
        await apiPatch(`/api/usuarios/${edit.id}`, { nombre_completo: nombre.trim(), rol, estado, personal_vinculado_id })
        toast.success('Usuario actualizado.')
      } else {
        await apiPost('/api/usuarios', { username: username.trim(), nombre_completo: nombre.trim(), rol, estado, personal_vinculado_id })
        toast.success('Usuario creado. Contraseña inicial: 12345 (deberá cambiarla al iniciar sesión).')
      }
      onSaved(); onClose()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Error al guardar.'); setSaving(false) }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{edit ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
          {!edit && <DialogDescription>La contraseña inicial será <strong>12345</strong>. El usuario deberá cambiarla al iniciar sesión.</DialogDescription>}
        </DialogHeader>
        <div className="space-y-3">
          <div><label className="text-sm font-medium">Nombre de usuario *</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} disabled={!!edit} placeholder="ej: jperez" />
            {edit && <p className="text-xs text-muted-foreground mt-1">El nombre de usuario no se puede cambiar.</p>}
          </div>
          <div><label className="text-sm font-medium">Nombre completo *</label><Input value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium">Rol *</label>
              <Select value={rol} onValueChange={setRol}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium">Estado</label>
              <Select value={estado} onValueChange={setEstado}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ESTADOS_PERSONAL.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><label className="text-sm font-medium">Personal vinculado</label>
            <Select value={vinculado} onValueChange={setVinculado}>
              <SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ninguno</SelectItem>
                {activos.map((p) => <SelectItem key={p.id} value={p.id}>{p.id} — {p.nombre_completo}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Solo puede existir un Gerente General activo.</p>
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
