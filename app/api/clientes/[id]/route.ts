import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  const { id } = await params
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id: Number(id) },
      include: {
        contratos: {
          include: { tipo_servicio: true, tecnicos: true, vehiculo: true },
          orderBy: { created_at: 'desc' },
        },
        programaciones: {
          include: { tipos_servicio: true, tecnicos: true, conduces: true },
          orderBy: { fecha_hora: 'desc' },
          take: 100,
        },
      },
    })
    if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 })
    const conduces = await prisma.conduce.findMany({
      where: { programacion: { cliente_id: Number(id) } },
      include: { tecnicos: true, tipos_servicio: true, programacion: true },
      orderBy: { fecha_registro: 'desc' },
    })
    return NextResponse.json({ cliente, conduces })
  } catch {
    return NextResponse.json({ error: 'Error al cargar cliente.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  const { id } = await params
  try {
    const b = await req.json()
    const data: Record<string, unknown> = {}
    const fields = ['nombre', 'tipo_cliente', 'zona', 'estado', 'direccion', 'telefono', 'telefono_alterno', 'email', 'nombre_contacto_principal', 'telefono_contacto_principal', 'google_maps_url', 'notas']
    for (const f of fields) if (b[f] !== undefined) data[f] = b[f]
    const cliente = await prisma.cliente.update({ where: { id: Number(id) }, data })
    return NextResponse.json({ ok: true, cliente })
  } catch {
    return NextResponse.json({ error: 'Error al actualizar cliente.' }, { status: 500 })
  }
}
