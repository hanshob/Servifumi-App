import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'
import { validateTecnicos } from '@/lib/api'

export const dynamic = 'force-dynamic'

const includeAll = {
  tecnicos: true,
  tipos_servicio: true,
  registrado_por: { select: { id: true, nombre_completo: true } },
  programacion: { include: { cliente: { select: { id: true, nombre: true } } } },
} as const

export async function GET(_req: NextRequest, { params }: { params: Promise<{ numero: string }> }) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  const { numero } = await params
  try {
    const conduce = await prisma.conduce.findUnique({ where: { conduce_numero: Number(numero) }, include: includeAll })
    if (!conduce) return NextResponse.json({ error: 'Conduce no encontrado.' }, { status: 404 })
    return NextResponse.json({ conduce })
  } catch {
    return NextResponse.json({ error: 'Error al cargar el conduce.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ numero: string }> }) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  const { numero } = await params
  try {
    const b = await req.json()
    const data: Record<string, unknown> = {}
    if (b.programacion_id !== undefined) data.programacion_id = b.programacion_id ? Number(b.programacion_id) : null
    if (b.empresa !== undefined) data.empresa = b.empresa
    if (b.detalles_observaciones !== undefined) data.detalles_observaciones = b.detalles_observaciones
    if (b.fecha_registro !== undefined) data.fecha_registro = new Date(b.fecha_registro)
    if (b.tecnicos !== undefined) {
      const tecErr = validateTecnicos(b.tecnicos)
      if (tecErr) return NextResponse.json({ error: tecErr }, { status: 400 })
      data.tecnicos = { set: (b.tecnicos as string[]).map((t) => ({ id: t })) }
    }
    if (b.tipos_servicio !== undefined) {
      const tipos = (b.tipos_servicio as unknown[]).map((t) => Number(t))
      data.tipos_servicio = { set: tipos.map((id) => ({ id })) }
    }
    const conduce = await prisma.conduce.update({ where: { conduce_numero: Number(numero) }, data, include: includeAll })
    return NextResponse.json({ ok: true, conduce })
  } catch {
    return NextResponse.json({ error: 'Error al actualizar el conduce.' }, { status: 500 })
  }
}
