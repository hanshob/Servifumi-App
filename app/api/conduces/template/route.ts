import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { guard, STAFF_ROLES } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

export async function GET() {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  const rows = [
    {
      ConduceNumero: 80807,
      Empresa: 'Nombre de la empresa (cliente)',
      FechaRegistro: '2025-01-15',
      Tecnicos: 'Nombre Técnico 1, Nombre Técnico 2',
      TiposServicio: 'Fumigación, Desratización',
      Detalles: 'Observaciones del conduce',
    },
  ]
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="plantilla-conduces.xlsx"`,
    },
  })
}
