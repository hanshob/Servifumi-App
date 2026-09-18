import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

function startOfTodayUTC(): Date {
  const n = new Date()
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 0, 0, 0))
}

function weekRange(): { start: Date; end: Date } {
  const t = startOfTodayUTC()
  const dow = t.getUTCDay() // 0=Sun
  const diffToMonday = dow === 0 ? -6 : 1 - dow
  const start = new Date(t)
  start.setUTCDate(t.getUTCDate() + diffToMonday)
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 7)
  return { start, end }
}

function monthRange(): { start: Date; end: Date } {
  const n = new Date()
  const start = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1, 0, 0, 0))
  const end = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 1, 0, 0, 0))
  return { start, end }
}

export async function GET() {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  try {
    const todayStart = startOfTodayUTC()
    const todayEnd = new Date(todayStart)
    todayEnd.setUTCDate(todayStart.getUTCDate() + 1)
    const week = weekRange()
    const month = monthRange()
    const now = new Date()
    const in30 = new Date(now)
    in30.setUTCDate(now.getUTCDate() + 30)

    const includeLite = {
      cliente: { select: { id: true, nombre: true, telefono: true } },
      tipos_servicio: { select: { id: true, nombre: true } },
      tecnicos: { select: { id: true, nombre_completo: true } },
      vehiculo: { select: { id: true, identificador: true } },
    }

    const [
      serviciosHoy, countHoy, countSemana, countMes, conducesMes,
      porEstado, sinConduce, licencias, clientesActivos, contratosActivos, proximos, semanaServicios,
    ] = await Promise.all([
      prisma.programacion.findMany({
        where: { fecha_hora: { gte: todayStart, lt: todayEnd } },
        include: includeLite, orderBy: { fecha_hora: 'asc' },
      }),
      prisma.programacion.count({ where: { fecha_hora: { gte: todayStart, lt: todayEnd } } }),
      prisma.programacion.count({ where: { fecha_hora: { gte: week.start, lt: week.end } } }),
      prisma.programacion.count({ where: { fecha_hora: { gte: month.start, lt: month.end } } }),
      prisma.conduce.count({ where: { fecha_registro: { gte: month.start, lt: month.end } } }),
      prisma.programacion.groupBy({ by: ['estado'], where: { fecha_hora: { gte: month.start, lt: month.end } }, _count: { estado: true } }),
      prisma.programacion.count({ where: { conduces: { none: {} }, estado: { in: ['Programado', 'Confirmado', 'Completado'] }, fecha_hora: { lte: now } } }),
      prisma.personal.findMany({ where: { estado: 'Activo', fecha_expiracion_licencia: { not: null, lte: in30 } }, orderBy: { fecha_expiracion_licencia: 'asc' } }),
      prisma.cliente.count({ where: { estado: 'Activo' } }),
      prisma.contrato.count({ where: { estado: 'Activo' } }),
      prisma.programacion.findMany({
        where: { fecha_hora: { gte: todayEnd }, estado: { in: ['Programado', 'Confirmado'] } },
        include: includeLite, orderBy: { fecha_hora: 'asc' }, take: 10,
      }),
      prisma.programacion.findMany({
        where: { fecha_hora: { gte: week.start, lt: week.end }, estado: { not: 'Cancelado' } },
        select: { turno: true, tecnicos: { select: { id: true, nombre_completo: true } } },
      }),
    ])

    const estadoMap: Record<string, number> = { Programado: 0, Confirmado: 0, Completado: 0, Cancelado: 0 }
    for (const row of porEstado) estadoMap[row.estado] = row._count.estado

    // Turno breakdown for today
    const turnosHoy: Record<string, number> = { Matutino: 0, Nocturno: 0, Interior: 0 }
    for (const s of serviciosHoy) turnosHoy[s.turno] = (turnosHoy[s.turno] ?? 0) + 1

    // Per-tecnico distribution for the week
    const tecMap: Record<string, { nombre: string; count: number }> = {}
    for (const s of semanaServicios) {
      for (const t of s.tecnicos) {
        if (!tecMap[t.id]) tecMap[t.id] = { nombre: t.nombre_completo, count: 0 }
        tecMap[t.id].count += 1
      }
    }
    const distribucionTecnicos = Object.values(tecMap).sort((a, b) => b.count - a.count)

    const totalMes = estadoMap.Programado + estadoMap.Confirmado + estadoMap.Completado + estadoMap.Cancelado
    const tasaEjecucion = totalMes > 0 ? Math.round((estadoMap.Completado / totalMes) * 100) : 0

    return NextResponse.json({
      serviciosHoy, countHoy, countSemana, countMes, conducesMes,
      porEstado: estadoMap, turnosHoy, distribucionTecnicos, tasaEjecucion,
      sinConduce, licenciasPorVencer: licencias,
      clientesActivos, contratosActivos, proximos,
    })
  } catch {
    return NextResponse.json({ error: 'Error al cargar el panel.' }, { status: 500 })
  }
}
