import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  const { id } = await params
  try {
    const b = await req.json()
    const data: Record<string, unknown> = {}
    for (const f of ['apodo', 'placa', 'marca', 'estado', 'notas']) if (b[f] !== undefined) data[f] = b[f]
    if (b.identificador !== undefined) data.identificador = String(b.identificador).trim()
    const vehiculo = await prisma.vehiculo.update({ where: { id: Number(id) }, data })
    return NextResponse.json({ ok: true, vehiculo })
  } catch {
    return NextResponse.json({ error: 'Error al actualizar el vehículo.' }, { status: 500 })
  }
}
