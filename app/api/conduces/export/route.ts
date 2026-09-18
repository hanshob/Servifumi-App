import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'
import { param } from '@/lib/api'
import { formatFecha } from '@/lib/helpers'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  try {
    const search = param(req, 'search')
    const where: Prisma.ConduceWhereInput = {}
    if (search) {
      const asNum = parseInt(search, 10)
      where.OR = [
        { empresa: { contains: search, mode: 'insensitive' } },
        ...(Number.isFinite(asNum) ? [{ conduce_numero: asNum }] : []),
      ]
    }
    const conduces = await prisma.conduce.findMany({
      where,
      include: { tecnicos: true, tipos_servicio: true, programacion: { include: { cliente: true } } },
      orderBy: { conduce_numero: 'desc' },
    })
    const rows = conduces.map((c) => ({
      ConduceNumero: c.conduce_numero,
      Empresa: c.empresa,
      Cliente: c.programacion?.cliente?.nombre ?? '',
      FechaRegistro: formatFecha(c.fecha_registro),
      Tecnicos: c.tecnicos.map((t) => t.nombre_completo).join(', '),
      TiposServicio: c.tipos_servicio.map((t) => t.nombre).join(', '),
      Detalles: c.detalles_observaciones,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Conduces')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="conduces.xlsx"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Error al exportar los conduces.' }, { status: 500 })
  }
}
