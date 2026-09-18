import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

export async function GET() {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  try {
    const data = await prisma.tipoServicio.findMany({ orderBy: { nombre: 'asc' } })
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Error al cargar los tipos de servicio.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  try {
    const b = await req.json()
    if (!b.nombre || !String(b.nombre).trim()) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 })
    const nombre = String(b.nombre).trim()
    const exists = await prisma.tipoServicio.findUnique({ where: { nombre } })
    if (exists) return NextResponse.json({ error: 'Ese tipo de servicio ya existe.' }, { status: 400 })
    const tipo = await prisma.tipoServicio.create({ data: { nombre, estado: b.estado || 'Activo' } })
    return NextResponse.json({ ok: true, tipo })
  } catch {
    return NextResponse.json({ error: 'Error al crear el tipo de servicio.' }, { status: 500 })
  }
}
