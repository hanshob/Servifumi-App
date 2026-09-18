import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'
import { nextMonth } from '@/lib/generation'

export const dynamic = 'force-dynamic'

function monthRange(year: number, monthIndex: number) {
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0))
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0))
  return { start, end }
}

// GET: how many services can be undone for the target month.
export async function GET(req: NextRequest) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  const nm = nextMonth()
  const year = parseInt(req.nextUrl.searchParams.get('year') ?? String(nm.year), 10)
  const monthIndex = parseInt(req.nextUrl.searchParams.get('monthIndex') ?? String(nm.monthIndex), 10)
  const { start, end } = monthRange(year, monthIndex)
  try {
    const count = await prisma.programacion.count({
      where: {
        origen: 'Recurrente',
        estado: 'Programado',
        manually_modified: false,
        fecha_hora: { gte: start, lt: end },
        conduces: { none: {} },
      },
    })
    return NextResponse.json({ year, monthIndex, count })
  } catch {
    return NextResponse.json({ error: 'Error.' }, { status: 500 })
  }
}

// POST: undo generation for the target month. Only deletes untouched recurring
// services (Programado, not manually modified, without conduces).
export async function POST(req: NextRequest) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  try {
    const b = await req.json().catch(() => ({}))
    const nm = nextMonth()
    const year = Number.isFinite(b.year) ? Number(b.year) : nm.year
    const monthIndex = Number.isFinite(b.monthIndex) ? Number(b.monthIndex) : nm.monthIndex
    const { start, end } = monthRange(year, monthIndex)

    const toDelete = await prisma.programacion.findMany({
      where: {
        origen: 'Recurrente',
        estado: 'Programado',
        manually_modified: false,
        fecha_hora: { gte: start, lt: end },
        conduces: { none: {} },
      },
      select: { id: true },
    })
    const ids = toDelete.map((p) => p.id)
    if (ids.length > 0) {
      await prisma.programacion.deleteMany({ where: { id: { in: ids } } })
    }
    return NextResponse.json({ ok: true, eliminados: ids.length })
  } catch {
    return NextResponse.json({ error: 'Error al deshacer la generación.' }, { status: 500 })
  }
}
