import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'
import { param } from '@/lib/api'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  try {
    const search = param(req, 'search')
    const zona = param(req, 'zona')
    const tipo = param(req, 'tipo')
    const estado = param(req, 'estado')
    const where: Prisma.ClienteWhereInput = {}
    if (search) where.OR = [{ nombre: { contains: search, mode: 'insensitive' } }, { direccion: { contains: search, mode: 'insensitive' } }]
    if (zona) where.zona = zona
    if (tipo) where.tipo_cliente = tipo
    if (estado) where.estado = estado

    const clientes = await prisma.cliente.findMany({ where, orderBy: { nombre: 'asc' } })
    const rows = clientes.map((c) => ({
      Nombre: c.nombre,
      TipoCliente: c.tipo_cliente,
      Zona: c.zona,
      Estado: c.estado,
      'Dirección': c.direccion,
      'Teléfono': c.telefono,
      'TeléfonoAlterno': c.telefono_alterno,
      Email: c.email,
      NombreContactoPrincipal: c.nombre_contacto_principal,
      'TeléfonoContactoPrincipal': c.telefono_contacto_principal,
      GoogleMapsURL: c.google_maps_url,
      Notas: c.notas,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="clientes.xlsx"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Error al exportar los clientes.' }, { status: 500 })
  }
}
