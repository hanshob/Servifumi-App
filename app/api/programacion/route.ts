import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'
import { getPagination, param, validateTecnicos } from '@/lib/api'
import { diaSemanaFromDate } from '@/lib/helpers'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

function buildWhere(req: NextRequest): Prisma.ProgramacionWhereInput {
  const where: Prisma.ProgramacionWhereInput = {}
  const search = param(req, 'search')
  const estado = param(req, 'estado')
  const turno = param(req, 'turno')
  const origen = param(req, 'origen')
  const tecnicoId = param(req, 'tecnicoId')
  const vehiculoId = param(req, 'vehiculoId')
  const tipoId = param(req, 'tipoId')
  const clienteId = param(req, 'clienteId')
  const desde = param(req, 'desde')
  const hasta = param(req, 'hasta')

  if (estado) where.estado = estado
  if (turno) where.turno = turno
  if (origen) where.origen = origen
  if (clienteId) where.cliente_id = Number(clienteId)
  if (tecnicoId) where.tecnicos = { some: { id: tecnicoId } }
  if (vehiculoId) where.vehiculo_id = Number(vehiculoId)
  if (tipoId) where.tipos_servicio = { some: { id: Number(tipoId) } }
  if (search) where.cliente = { nombre: { contains: search, mode: 'insensitive' } }
  if (param(req, 'sinConduce') === '1') {
    where.conduces = { none: {} }
    where.fecha_hora = { lt: new Date() }
    where.estado = { not: 'Cancelado' }
  }
  if (desde || hasta) {
    where.fecha_hora = {}
    if (desde) (where.fecha_hora as Prisma.DateTimeFilter).gte = new Date(desde)
    if (hasta) (where.fecha_hora as Prisma.DateTimeFilter).lte = new Date(hasta)
  }
  return where
}

const includeAll = {
  cliente: true,
  tipos_servicio: true,
  tecnicos: true,
  vehiculo: true,
  contrato: { select: { id: true, frecuencia: true } },
  conduces: { select: { conduce_numero: true } },
} as const

export async function GET(req: NextRequest) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  try {
    const where = buildWhere(req)
    const all = param(req, 'all') === '1'
    if (all) {
      const data = await prisma.programacion.findMany({ where, include: includeAll, orderBy: { fecha_hora: 'asc' }, take: 3000 })
      return NextResponse.json({ data, total: data.length })
    }
    const { skip, take, page, pageSize } = getPagination(req)
    const [data, total] = await Promise.all([
      prisma.programacion.findMany({ where, include: includeAll, orderBy: { fecha_hora: 'desc' }, skip, take }),
      prisma.programacion.count({ where }),
    ])
    return NextResponse.json({ data, total, page, pageSize })
  } catch {
    return NextResponse.json({ error: 'Error al cargar la programación.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  try {
    const b = await req.json()
    if (!b.cliente_id) return NextResponse.json({ error: 'Debe seleccionar un cliente.' }, { status: 400 })
    if (!b.fecha_hora) return NextResponse.json({ error: 'Debe indicar fecha y hora.' }, { status: 400 })
    const tecnicos: string[] = Array.isArray(b.tecnicos) ? b.tecnicos : []
    const tecErr = validateTecnicos(tecnicos)
    if (tecErr) return NextResponse.json({ error: tecErr }, { status: 400 })
    const tipos: number[] = Array.isArray(b.tipos_servicio) ? b.tipos_servicio.map((t: unknown) => Number(t)) : []
    if (tipos.length < 1) return NextResponse.json({ error: 'Debe seleccionar al menos un tipo de servicio.' }, { status: 400 })

    const fecha = new Date(b.fecha_hora)
    const cliente = await prisma.cliente.findUnique({ where: { id: Number(b.cliente_id) } })
    const prog = await prisma.programacion.create({
      data: {
        origen: 'Único',
        cliente_id: Number(b.cliente_id),
        contrato_id: b.contrato_id ? Number(b.contrato_id) : null,
        fecha_hora: fecha,
        dia_semana: diaSemanaFromDate(fecha),
        turno: b.turno || 'Matutino',
        vehiculo_id: b.vehiculo_id ? Number(b.vehiculo_id) : null,
        estado: b.estado || 'Programado',
        requiere_cambio_estaciones: Boolean(b.requiere_cambio_estaciones),
        observaciones: b.observaciones || '',
        direccion: b.direccion || cliente?.direccion || '',
        nombre_contacto_principal: b.nombre_contacto_principal || cliente?.nombre_contacto_principal || '',
        tipos_servicio: { connect: tipos.map((id) => ({ id })) },
        tecnicos: { connect: tecnicos.map((id) => ({ id })) },
      },
      include: includeAll,
    })
    return NextResponse.json({ ok: true, programacion: prog })
  } catch {
    return NextResponse.json({ error: 'Error al crear el servicio.' }, { status: 500 })
  }
}
