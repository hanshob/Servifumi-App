import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guard, ALL_ROLES } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

function startOfTodayUTC(): Date {
  const n = new Date()
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 0, 0, 0))
}

// Monday of the week containing the given date (or today).
function mondayOf(d: Date): Date {
  const dow = d.getUTCDay()
  const diffToMonday = dow === 0 ? -6 : 1 - dow
  const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0))
  m.setUTCDate(m.getUTCDate() + diffToMonday)
  return m
}

export async function GET(req: NextRequest) {
  const g = await guard(ALL_ROLES)
  if (g.error) return g.error
  try {
    const weekParam = req.nextUrl.searchParams.get('week') // ISO date of any day in the week
    const base = weekParam ? new Date(weekParam) : new Date()
    const start = mondayOf(base)
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 7)

    // Supervisors may only view the current and past weeks (no future).
    if (g.session.user.role === 'Supervisor') {
      const currentMonday = mondayOf(startOfTodayUTC())
      if (start.getTime() > currentMonday.getTime()) {
        return NextResponse.json({ error: 'No tiene permiso para ver semanas futuras.' }, { status: 403 })
      }
    }

    const data = await prisma.programacion.findMany({
      where: { fecha_hora: { gte: start, lt: end } },
      include: {
        cliente: { select: { id: true, nombre: true, telefono: true, direccion: true } },
        tipos_servicio: { select: { id: true, nombre: true } },
        tecnicos: { select: { id: true, nombre_completo: true } },
        vehiculo: { select: { id: true, identificador: true } },
      },
      orderBy: { fecha_hora: 'asc' },
    })
    return NextResponse.json({ weekStart: start.toISOString(), weekEnd: end.toISOString(), data })
  } catch {
    return NextResponse.json({ error: 'Error al cargar la agenda.' }, { status: 500 })
  }
}
