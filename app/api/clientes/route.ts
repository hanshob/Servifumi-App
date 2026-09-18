import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'
import { getPagination, param } from '@/lib/api'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  try {
    const { skip, take, page, pageSize } = getPagination(req)
    const search = param(req, 'search')
    const zona = param(req, 'zona')
    const tipo = param(req, 'tipo')
    const estado = param(req, 'estado')

    const where: Prisma.ClienteWhereInput = {}
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { direccion: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (zona) where.zona = zona
    if (tipo) where.tipo_cliente = tipo
    if (estado) where.estado = estado

    const [data, total] = await Promise.all([
      prisma.cliente.findMany({ where, orderBy: { nombre: 'asc' }, skip, take }),
      prisma.cliente.count({ where }),
    ])
    return NextResponse.json({ data, total, page, pageSize })
  } catch {
    return NextResponse.json({ error: 'Error al cargar clientes.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  try {
    const b = await req.json()
    if (!b.nombre || !String(b.nombre).trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 })
    }
    const cliente = await prisma.cliente.create({
      data: {
        nombre: String(b.nombre).trim(),
        tipo_cliente: b.tipo_cliente || 'Comercial',
        zona: b.zona || '',
        estado: b.estado || 'Activo',
        direccion: b.direccion || '',
        telefono: b.telefono || '',
        telefono_alterno: b.telefono_alterno || '',
        email: b.email || '',
        nombre_contacto_principal: b.nombre_contacto_principal || '',
        telefono_contacto_principal: b.telefono_contacto_principal || '',
        google_maps_url: b.google_maps_url || '',
        notas: b.notas || '',
      },
    })
    return NextResponse.json({ ok: true, cliente })
  } catch {
    return NextResponse.json({ error: 'Error al crear cliente.' }, { status: 500 })
  }
}
