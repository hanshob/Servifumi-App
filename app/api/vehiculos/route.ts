import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

export async function GET() {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  try {
    const data = await prisma.vehiculo.findMany({ orderBy: { identificador: 'asc' } })
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Error al cargar los vehículos.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  try {
    const b = await req.json()
    if (!b.identificador || !String(b.identificador).trim()) return NextResponse.json({ error: 'El identificador es obligatorio.' }, { status: 400 })
    const ident = String(b.identificador).trim()
    const exists = await prisma.vehiculo.findUnique({ where: { identificador: ident } })
    if (exists) return NextResponse.json({ error: `El vehículo ${ident} ya existe.` }, { status: 400 })
    const vehiculo = await prisma.vehiculo.create({
      data: {
        identificador: ident,
        apodo: b.apodo || '',
        placa: b.placa || '',
        marca: b.marca || '',
        estado: b.estado || 'Disponible',
        notas: b.notas || '',
      },
    })
    return NextResponse.json({ ok: true, vehiculo })
  } catch {
    return NextResponse.json({ error: 'Error al crear el vehículo.' }, { status: 500 })
  }
}
