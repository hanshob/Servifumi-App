import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

export async function GET() {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  try {
    const [personal, vehiculos, tipos] = await Promise.all([
      prisma.personal.findMany({ where: { estado: 'Activo' }, orderBy: { nombre_completo: 'asc' }, select: { id: true, nombre_completo: true, puesto: true } }),
      prisma.vehiculo.findMany({ where: { estado: 'Disponible' }, orderBy: { identificador: 'asc' }, select: { id: true, identificador: true, apodo: true } }),
      prisma.tipoServicio.findMany({ where: { estado: 'Activo' }, orderBy: { nombre: 'asc' }, select: { id: true, nombre: true } }),
    ])
    return NextResponse.json({ personal, vehiculos, tipos })
  } catch {
    return NextResponse.json({ error: 'Error al cargar selectores.' }, { status: 500 })
  }
}
