import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'
import { param } from '@/lib/api'

export const dynamic = 'force-dynamic'

// Global search across clientes, programaciones and conduces.
export async function GET(req: NextRequest) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  const q = param(req, 'q')
  if (!q || q.length < 2) return NextResponse.json({ clientes: [], servicios: [], conduces: [] })
  try {
    const asNum = parseInt(q, 10)
    const [clientes, servicios, conduces] = await Promise.all([
      prisma.cliente.findMany({
        where: { OR: [{ nombre: { contains: q, mode: 'insensitive' } }, { direccion: { contains: q, mode: 'insensitive' } }] },
        select: { id: true, nombre: true, zona: true, telefono: true }, take: 6, orderBy: { nombre: 'asc' },
      }),
      prisma.programacion.findMany({
        where: { cliente: { nombre: { contains: q, mode: 'insensitive' } } },
        select: { id: true, fecha_hora: true, estado: true, cliente: { select: { nombre: true } } },
        take: 6, orderBy: { fecha_hora: 'desc' },
      }),
      prisma.conduce.findMany({
        where: {
          OR: [
            { empresa: { contains: q, mode: 'insensitive' } },
            ...(Number.isFinite(asNum) ? [{ conduce_numero: asNum }] : []),
          ],
        },
        select: { conduce_numero: true, empresa: true, fecha_registro: true }, take: 6, orderBy: { conduce_numero: 'desc' },
      }),
    ])
    return NextResponse.json({ clientes, servicios, conduces })
  } catch {
    return NextResponse.json({ error: 'Error en la búsqueda.' }, { status: 500 })
  }
}
