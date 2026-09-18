import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'
import { getPagination, param, validateTecnicos } from '@/lib/api'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  try {
    const { skip, take, page, pageSize } = getPagination(req)
    const search = param(req, 'search')
    const estado = param(req, 'estado')
    const frecuencia = param(req, 'frecuencia')
    const clienteId = param(req, 'clienteId')

    const where: Prisma.ContratoWhereInput = {}
    if (estado) where.estado = estado
    if (frecuencia) where.frecuencia = frecuencia
    if (clienteId) where.cliente_id = Number(clienteId)
    if (search) {
      where.cliente = { nombre: { contains: search, mode: 'insensitive' } }
    }

    const [data, total] = await Promise.all([
      prisma.contrato.findMany({
        where,
        include: { cliente: true, tipo_servicio: true, tecnicos: true, vehiculo: true },
        orderBy: { created_at: 'desc' },
        skip,
        take,
      }),
      prisma.contrato.count({ where }),
    ])
    return NextResponse.json({ data, total, page, pageSize })
  } catch {
    return NextResponse.json({ error: 'Error al cargar contratos.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  try {
    const b = await req.json()
    if (!b.cliente_id) return NextResponse.json({ error: 'Debe seleccionar un cliente.' }, { status: 400 })
    if (!b.tipo_servicio_id) return NextResponse.json({ error: 'Debe seleccionar un tipo de servicio.' }, { status: 400 })
    if (!b.frecuencia) return NextResponse.json({ error: 'Debe seleccionar una frecuencia.' }, { status: 400 })
    if (!b.dia_preferido) return NextResponse.json({ error: 'Debe seleccionar un día preferido.' }, { status: 400 })
    const tecnicos: string[] = Array.isArray(b.tecnicos) ? b.tecnicos : []
    const tecErr = validateTecnicos(tecnicos)
    if (tecErr) return NextResponse.json({ error: tecErr }, { status: 400 })

    const contrato = await prisma.contrato.create({
      data: {
        cliente_id: Number(b.cliente_id),
        tipo_servicio_id: Number(b.tipo_servicio_id),
        frecuencia: b.frecuencia,
        semanas_quincenal: b.semanas_quincenal || '1_3',
        dia_preferido: b.dia_preferido,
        hora_por_defecto: b.hora_por_defecto || '08:00',
        turno_por_defecto: b.turno_por_defecto || 'Matutino',
        vehiculo_por_defecto_id: b.vehiculo_por_defecto_id ? Number(b.vehiculo_por_defecto_id) : null,
        estado: b.estado || 'Activo',
        fecha_inicio: b.fecha_inicio ? new Date(b.fecha_inicio) : new Date(),
        notas: b.notas || '',
        tecnicos: { connect: tecnicos.map((t) => ({ id: t })) },
      },
      include: { cliente: true, tipo_servicio: true, tecnicos: true, vehiculo: true },
    })
    return NextResponse.json({ ok: true, contrato })
  } catch {
    return NextResponse.json({ error: 'Error al crear contrato.' }, { status: 500 })
  }
}
