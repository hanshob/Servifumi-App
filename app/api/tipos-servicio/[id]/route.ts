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
    if (b.nombre !== undefined) data.nombre = String(b.nombre).trim()
    if (b.estado !== undefined) data.estado = b.estado
    const tipo = await prisma.tipoServicio.update({ where: { id: Number(id) }, data })
    return NextResponse.json({ ok: true, tipo })
  } catch {
    return NextResponse.json({ error: 'Error al actualizar el tipo de servicio.' }, { status: 500 })
  }
}
