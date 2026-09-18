import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'
import { computeServiceDatesForMonth, nextMonth } from '@/lib/generation'
import { diaSemanaFromDate } from '@/lib/helpers'

export const dynamic = 'force-dynamic'

function monthRange(year: number, monthIndex: number) {
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0))
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0))
  return { start, end }
}

// GET: preview counts for the target month (default next month)
export async function GET(req: NextRequest) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  try {
    const nm = nextMonth()
    const year = parseInt(req.nextUrl.searchParams.get('year') ?? String(nm.year), 10)
    const monthIndex = parseInt(req.nextUrl.searchParams.get('monthIndex') ?? String(nm.monthIndex), 10)
    const { start, end } = monthRange(year, monthIndex)

    const contratos = await prisma.contrato.findMany({ where: { estado: 'Activo', frecuencia: { not: 'Única' } } })
    let totalServicios = 0
    for (const c of contratos) {
      totalServicios += computeServiceDatesForMonth(
        { frecuencia: c.frecuencia, semanas_quincenal: c.semanas_quincenal, dia_preferido: c.dia_preferido, hora_por_defecto: c.hora_por_defecto, fecha_inicio: c.fecha_inicio },
        year, monthIndex,
      ).length
    }
    const yaGenerados = await prisma.programacion.count({ where: { origen: 'Recurrente', fecha_hora: { gte: start, lt: end } } })
    return NextResponse.json({ year, monthIndex, totalServicios, contratosActivos: contratos.length, yaGenerados })
  } catch {
    return NextResponse.json({ error: 'Error al calcular la generación.' }, { status: 500 })
  }
}

// POST: generate recurring services for the target month.
export async function POST(req: NextRequest) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  try {
    const b = await req.json().catch(() => ({}))
    const nm = nextMonth()
    const year = Number.isFinite(b.year) ? Number(b.year) : nm.year
    const monthIndex = Number.isFinite(b.monthIndex) ? Number(b.monthIndex) : nm.monthIndex
    const force = Boolean(b.force)
    const { start, end } = monthRange(year, monthIndex)

    const yaGenerados = await prisma.programacion.count({ where: { origen: 'Recurrente', fecha_hora: { gte: start, lt: end } } })
    if (yaGenerados > 0 && !force) {
      return NextResponse.json({ requiresConfirmation: true, yaGenerados, year, monthIndex })
    }

    const contratos = await prisma.contrato.findMany({
      where: { estado: 'Activo', frecuencia: { not: 'Única' } },
      include: { cliente: true, tecnicos: true },
    })

    // Existing Recurrente services in month, keyed by contrato_id|isoDate to dedupe
    const existing = await prisma.programacion.findMany({
      where: { origen: 'Recurrente', fecha_hora: { gte: start, lt: end } },
      select: { contrato_id: true, fecha_hora: true },
    })
    const existingKeys = new Set(existing.map((e) => `${e.contrato_id}|${e.fecha_hora.toISOString()}`))

    let creados = 0
    for (const c of contratos) {
      const dates = computeServiceDatesForMonth(
        { frecuencia: c.frecuencia, semanas_quincenal: c.semanas_quincenal, dia_preferido: c.dia_preferido, hora_por_defecto: c.hora_por_defecto, fecha_inicio: c.fecha_inicio },
        year, monthIndex,
      )
      for (const d of dates) {
        const key = `${c.id}|${d.toISOString()}`
        if (existingKeys.has(key)) continue
        existingKeys.add(key)
        await prisma.programacion.create({
          data: {
            origen: 'Recurrente',
            contrato_id: c.id,
            cliente_id: c.cliente_id,
            fecha_hora: d,
            dia_semana: diaSemanaFromDate(d),
            turno: c.turno_por_defecto,
            vehiculo_id: c.vehiculo_por_defecto_id,
            estado: 'Programado',
            direccion: c.cliente?.direccion ?? '',
            nombre_contacto_principal: c.cliente?.nombre_contacto_principal ?? '',
            tipos_servicio: { connect: [{ id: c.tipo_servicio_id }] },
            tecnicos: { connect: c.tecnicos.map((t) => ({ id: t.id })) },
          },
        })
        creados++
      }
    }
    return NextResponse.json({ ok: true, creados, year, monthIndex })
  } catch {
    return NextResponse.json({ error: 'Error al generar los servicios.' }, { status: 500 })
  }
}
