import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'
import { param } from '@/lib/api'
import { PUESTO_PREFIX } from '@/lib/constants'

export const dynamic = 'force-dynamic'

async function nextPersonalId(puesto: string): Promise<string> {
  const prefix = PUESTO_PREFIX[puesto] ?? 'EMP'
  const rows = await prisma.personal.findMany({ where: { id: { startsWith: prefix } }, select: { id: true } })
  let max = 0
  for (const r of rows) {
    const n = parseInt(r.id.slice(prefix.length), 10)
    if (Number.isFinite(n) && n > max) max = n
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

export async function GET(req: NextRequest) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  try {
    const puesto = param(req, 'puesto')
    const estado = param(req, 'estado')
    const where: Record<string, unknown> = {}
    if (puesto) where.puesto = puesto
    if (estado) where.estado = estado
    const data = await prisma.personal.findMany({ where, orderBy: { id: 'asc' } })
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Error al cargar el personal.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  try {
    const b = await req.json()
    if (!b.nombre_completo || !String(b.nombre_completo).trim()) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 })
    if (!b.puesto || !PUESTO_PREFIX[b.puesto]) return NextResponse.json({ error: 'Puesto inválido.' }, { status: 400 })
    const id = await nextPersonalId(b.puesto)
    const persona = await prisma.personal.create({
      data: {
        id,
        nombre_completo: String(b.nombre_completo).trim(),
        puesto: b.puesto,
        telefono: b.telefono || '',
        cedula: b.cedula || '',
        fecha_expiracion_licencia: b.fecha_expiracion_licencia ? new Date(b.fecha_expiracion_licencia) : null,
        estado: b.estado || 'Activo',
      },
    })
    return NextResponse.json({ ok: true, persona })
  } catch {
    return NextResponse.json({ error: 'Error al crear el personal.' }, { status: 500 })
  }
}
