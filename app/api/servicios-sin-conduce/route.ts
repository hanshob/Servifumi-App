import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

// 10 most recent services (past/confirmed/completed) that still have no conduce.
export async function GET() {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  try {
    const now = new Date()
    const data = await prisma.programacion.findMany({
      where: {
        conduces: { none: {} },
        estado: { in: ['Programado', 'Confirmado', 'Completado'] },
        fecha_hora: { lte: now },
      },
      include: { cliente: { select: { id: true, nombre: true } }, tecnicos: true, tipos_servicio: true },
      orderBy: { fecha_hora: 'desc' },
      take: 10,
    })
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Error.' }, { status: 500 })
  }
}
