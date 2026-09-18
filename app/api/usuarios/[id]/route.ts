import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guard, GERENTE_ONLY } from '@/lib/rbac'
import { ROLES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(GERENTE_ONLY)
  if (g.error) return g.error
  const { id } = await params
  const userId = Number(id)
  try {
    const b = await req.json()
    const target = await prisma.usuario.findUnique({ where: { id: userId } })
    if (!target) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })

    const newRol = b.rol !== undefined ? b.rol : target.rol
    const newEstado = b.estado !== undefined ? b.estado : target.estado
    if (b.rol !== undefined && !ROLES.includes(b.rol)) return NextResponse.json({ error: 'Rol inválido.' }, { status: 400 })

    // Protect the single active Gerente General.
    const isCurrentlyActiveGerente = target.rol === 'Gerente General' && target.estado === 'Activo'
    const stopsBeingActiveGerente = newRol !== 'Gerente General' || newEstado !== 'Activo'
    if (isCurrentlyActiveGerente && stopsBeingActiveGerente) {
      const otherActiveGerentes = await prisma.usuario.count({ where: { rol: 'Gerente General', estado: 'Activo', id: { not: userId } } })
      if (otherActiveGerentes === 0) {
        return NextResponse.json({ error: 'No se puede desactivar ni cambiar el rol del único Gerente General activo.' }, { status: 400 })
      }
    }
    // Prevent creating a second active Gerente General.
    if (newRol === 'Gerente General' && newEstado === 'Activo' && !isCurrentlyActiveGerente) {
      const activeGerente = await prisma.usuario.count({ where: { rol: 'Gerente General', estado: 'Activo', id: { not: userId } } })
      if (activeGerente >= 1) return NextResponse.json({ error: 'Solo puede existir un Gerente General activo.' }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (b.nombre_completo !== undefined) data.nombre_completo = String(b.nombre_completo).trim()
    if (b.rol !== undefined) data.rol = b.rol
    if (b.estado !== undefined) data.estado = b.estado
    if (b.personal_vinculado_id !== undefined) data.personal_vinculado_id = b.personal_vinculado_id || null

    const usuario = await prisma.usuario.update({
      where: { id: userId }, data,
      select: { id: true, nombre_completo: true, username: true, rol: true, estado: true },
    })
    return NextResponse.json({ ok: true, usuario })
  } catch {
    return NextResponse.json({ error: 'Error al actualizar el usuario.' }, { status: 500 })
  }
}
