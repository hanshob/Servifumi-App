import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

// Note: the ID never changes even if the puesto changes (business rule).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  const { id } = await params
  try {
    const b = await req.json()
    const data: Record<string, unknown> = {}
    for (const f of ['nombre_completo', 'puesto', 'telefono', 'cedula', 'estado']) if (b[f] !== undefined) data[f] = b[f]
    if (b.fecha_expiracion_licencia !== undefined) data.fecha_expiracion_licencia = b.fecha_expiracion_licencia ? new Date(b.fecha_expiracion_licencia) : null
    const persona = await prisma.personal.update({ where: { id }, data })
    return NextResponse.json({ ok: true, persona })
  } catch {
    return NextResponse.json({ error: 'Error al actualizar el personal.' }, { status: 500 })
  }
}
