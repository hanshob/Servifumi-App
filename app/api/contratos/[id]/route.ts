import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'
import { validateTecnicos } from '@/lib/api'
import { startOfToday } from '@/lib/generation'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  const { id } = await params
  try {
    const contrato = await prisma.contrato.findUnique({
      where: { id: Number(id) },
      include: {
        cliente: true,
        tipo_servicio: true,
        tecnicos: true,
        vehiculo: true,
        programaciones: {
          orderBy: { fecha_hora: 'desc' },
          take: 100,
          include: { tipos_servicio: true, tecnicos: true },
        },
      },
    })
    if (!contrato) return NextResponse.json({ error: 'Contrato no encontrado.' }, { status: 404 })
    return NextResponse.json({ contrato })
  } catch {
    return NextResponse.json({ error: 'Error al cargar contrato.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  const { id } = await params
  const contratoId = Number(id)
  try {
    const b = await req.json()
    const data: Record<string, unknown> = {}
    const scalarFields = ['frecuencia', 'semanas_quincenal', 'dia_preferido', 'hora_por_defecto', 'turno_por_defecto', 'estado', 'notas']
    for (const f of scalarFields) if (b[f] !== undefined) data[f] = b[f]
    if (b.tipo_servicio_id !== undefined) data.tipo_servicio_id = Number(b.tipo_servicio_id)
    if (b.vehiculo_por_defecto_id !== undefined) data.vehiculo_por_defecto_id = b.vehiculo_por_defecto_id ? Number(b.vehiculo_por_defecto_id) : null
    if (b.fecha_inicio !== undefined) data.fecha_inicio = new Date(b.fecha_inicio)

    if (b.tecnicos !== undefined) {
      const tecErr = validateTecnicos(b.tecnicos)
      if (tecErr) return NextResponse.json({ error: tecErr }, { status: 400 })
      data.tecnicos = { set: (b.tecnicos as string[]).map((t) => ({ id: t })) }
    }

    const willCancelFuture = b.estado === 'Pausado' || b.estado === 'Finalizado'

    const result = await prisma.$transaction(async (tx) => {
      const contrato = await tx.contrato.update({ where: { id: contratoId }, data, include: { cliente: true, tipo_servicio: true, tecnicos: true, vehiculo: true } })
      let cancelled = 0
      if (willCancelFuture) {
        const today = startOfToday()
        const r = await tx.programacion.updateMany({
          where: { contrato_id: contratoId, estado: 'Programado', fecha_hora: { gt: today } },
          data: { estado: 'Cancelado' },
        })
        cancelled = r.count
      }
      return { contrato, cancelled }
    })
    return NextResponse.json({ ok: true, contrato: result.contrato, serviciosCancelados: result.cancelled })
  } catch {
    return NextResponse.json({ error: 'Error al actualizar contrato.' }, { status: 500 })
  }
}
