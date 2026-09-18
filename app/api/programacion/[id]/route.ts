import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'
import { validateTecnicos } from '@/lib/api'
import { diaSemanaFromDate } from '@/lib/helpers'

export const dynamic = 'force-dynamic'

const includeAll = {
  cliente: true,
  tipos_servicio: true,
  tecnicos: true,
  vehiculo: true,
  contrato: { select: { id: true, frecuencia: true } },
  conduces: { select: { conduce_numero: true } },
} as const

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  const { id } = await params
  try {
    const prog = await prisma.programacion.findUnique({ where: { id: Number(id) }, include: includeAll })
    if (!prog) return NextResponse.json({ error: 'Servicio no encontrado.' }, { status: 404 })
    return NextResponse.json({ programacion: prog })
  } catch {
    return NextResponse.json({ error: 'Error al cargar el servicio.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  const { id } = await params
  const progId = Number(id)
  try {
    const b = await req.json()
    const existing = await prisma.programacion.findUnique({ where: { id: progId } })
    if (!existing) return NextResponse.json({ error: 'Servicio no encontrado.' }, { status: 404 })

    const data: Record<string, unknown> = {}
    let nonEstadoChanged = false

    if (b.fecha_hora !== undefined) {
      const fecha = new Date(b.fecha_hora)
      data.fecha_hora = fecha
      data.dia_semana = diaSemanaFromDate(fecha)
      nonEstadoChanged = true
    }
    if (b.turno !== undefined) { data.turno = b.turno; nonEstadoChanged = true }
    if (b.vehiculo_id !== undefined) { data.vehiculo_id = b.vehiculo_id ? Number(b.vehiculo_id) : null; nonEstadoChanged = true }
    if (b.requiere_cambio_estaciones !== undefined) { data.requiere_cambio_estaciones = Boolean(b.requiere_cambio_estaciones); nonEstadoChanged = true }
    if (b.observaciones !== undefined) { data.observaciones = b.observaciones; nonEstadoChanged = true }
    if (b.direccion !== undefined) { data.direccion = b.direccion; nonEstadoChanged = true }
    if (b.nombre_contacto_principal !== undefined) { data.nombre_contacto_principal = b.nombre_contacto_principal; nonEstadoChanged = true }
    if (b.estado !== undefined) data.estado = b.estado

    if (b.tecnicos !== undefined) {
      const tecErr = validateTecnicos(b.tecnicos)
      if (tecErr) return NextResponse.json({ error: tecErr }, { status: 400 })
      data.tecnicos = { set: (b.tecnicos as string[]).map((t) => ({ id: t })) }
      nonEstadoChanged = true
    }
    if (b.tipos_servicio !== undefined) {
      const tipos = (b.tipos_servicio as unknown[]).map((t) => Number(t))
      data.tipos_servicio = { set: tipos.map((id) => ({ id })) }
      nonEstadoChanged = true
    }

    // Mark recurring services as manually modified when substantive fields change.
    if (existing.origen === 'Recurrente' && nonEstadoChanged) {
      data.manually_modified = true
    }

    const prog = await prisma.programacion.update({ where: { id: progId }, data, include: includeAll })
    return NextResponse.json({ ok: true, programacion: prog })
  } catch {
    return NextResponse.json({ error: 'Error al actualizar el servicio.' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  const { id } = await params
  const progId = Number(id)
  try {
    const conduces = await prisma.conduce.count({ where: { programacion_id: progId } })
    if (conduces > 0) {
      return NextResponse.json({ error: 'No se puede eliminar: el servicio tiene conduces asociados. Cancele el servicio en su lugar.' }, { status: 400 })
    }
    await prisma.programacion.delete({ where: { id: progId } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar el servicio.' }, { status: 500 })
  }
}
