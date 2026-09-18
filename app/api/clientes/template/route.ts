import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { guard, STAFF_ROLES } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

export async function GET() {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  const headers = [
    'Nombre', 'TipoCliente', 'Zona', 'Estado', 'Dirección', 'Teléfono', 'TeléfonoAlterno',
    'Email', 'NombreContactoPrincipal', 'TeléfonoContactoPrincipal', 'GoogleMapsURL', 'Notas',
  ]
  const example = [{
    Nombre: 'Ejemplo S.R.L.', TipoCliente: 'Comercial', Zona: 'Distrito Nacional', Estado: 'Activo',
    'Dirección': 'Av. Principal #1', 'Teléfono': '809-000-0000', 'TeléfonoAlterno': '',
    Email: 'correo@ejemplo.com', NombreContactoPrincipal: 'Juan Pérez', 'TeléfonoContactoPrincipal': '829-000-0000',
    GoogleMapsURL: '', Notas: '',
  }]
  const ws = XLSX.utils.json_to_sheet(example, { header: headers })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="plantilla_clientes.xlsx"`,
    },
  })
}
