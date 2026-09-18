import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'
import { getPagination, param, validateTecnicos } from '@/lib/api'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

const includeAll = {
  tecnicos: true,
  tipos_servicio: true,
  registrado_por: { select: { id: true, nombre_completo: true } },
  programacion: { include: { cliente: { select: { id: true, nombre: true } } } },
} as const

export async function GET(req: NextRequest) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  try {
    const { skip, take, page, pageSize } = getPagination(req)
    const search = param(req, 'search')
    const desde = param(req, 'desde')
    const hasta = param(req, 'hasta')
    const tecnicoId = param(req, 'tecnicoId')
    const tipoId = param(req, 'tipoId')
    const importado = param(req, 'importado')

    const where: Prisma.ConduceWhereInput = {}
    if (search) {
      const asNum = parseInt(search, 10)
      where.OR = [
        { empresa: { contains: search, mode: 'insensitive' } },
        { programacion: { cliente: { nombre: { contains: search, mode: 'insensitive' } } } },
        ...(Number.isFinite(asNum) ? [{ conduce_numero: asNum }] : []),
      ]
    }
    if (tecnicoId) where.tecnicos = { some: { id: tecnicoId } }
    if (tipoId) where.tipos_servicio = { some: { id: Number(tipoId) } }
    if (importado === '1') where.importado = true
    if (importado === '0') where.importado = false
    if (desde || hasta) {
      where.fecha_registro = {}
      if (desde) (where.fecha_registro as Prisma.DateTimeFilter).gte = new Date(desde)
      if (hasta) (where.fecha_registro as Prisma.DateTimeFilter).lte = new Date(hasta)
    }

    const [data, total] = await Promise.all([
      prisma.conduce.findMany({ where, include: includeAll, orderBy: { conduce_numero: 'desc' }, skip, take }),
      prisma.conduce.count({ where }),
    ])
    return NextResponse.json({ data, total, page, pageSize })
  } catch {
    return NextResponse.json({ error: 'Error al cargar los conduces.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  try {
    const b = await req.json()
    const numero = parseInt(b.conduce_numero, 10)
    if (!Number.isFinite(numero) || numero <= 0) return NextResponse.json({ error: 'Número de conduce inválido.' }, { status: 400 })
    const exists = await prisma.conduce.findUnique({ where: { conduce_numero: numero } })
    if (exists) return NextResponse.json({ error: `El conduce #${numero} ya existe.` }, { status: 400 })
    const tecnicos: string[] = Array.isArray(b.tecnicos) ? b.tecnicos : []
    const tecErr = validateTecnicos(tecnicos)
    if (tecErr) return NextResponse.json({ error: tecErr }, { status: 400 })
    const tipos: number[] = Array.isArray(b.tipos_servicio) ? b.tipos_servicio.map((t: unknown) => Number(t)) : []

    const registradoPorId = g.session.user.id ? Number(g.session.user.id) : null

    const conduce = await prisma.conduce.create({
      data: {
        conduce_numero: numero,
        programacion_id: b.programacion_id ? Number(b.programacion_id) : null,
        empresa: b.empresa || '',
        detalles_observaciones: b.detalles_observaciones || '',
        registrado_por_id: Number.isFinite(registradoPorId as number) ? registradoPorId : null,
        fecha_registro: b.fecha_registro ? new Date(b.fecha_registro) : new Date(),
        importado: false,
        tecnicos: { connect: tecnicos.map((id) => ({ id })) },
        tipos_servicio: { connect: tipos.map((id) => ({ id })) },
      },
      include: includeAll,
    })
    return NextResponse.json({ ok: true, conduce })
  } catch {
    return NextResponse.json({ error: 'Error al crear el conduce.' }, { status: 500 })
  }
}
