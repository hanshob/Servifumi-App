import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'
import { TIPOS_CLIENTE, ZONAS, ESTADOS_CLIENTE } from '@/lib/constants'

export const dynamic = 'force-dynamic'

function pick(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k]
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

export async function POST(req: NextRequest) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No se recibió ningún archivo.' }, { status: 400 })
    const buf = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buf, { type: 'buffer' })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

    let creados = 0
    const errores: string[] = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const nombre = pick(row, ['Nombre', 'nombre'])
      if (!nombre) { continue }
      const tipo = pick(row, ['TipoCliente', 'Tipo', 'tipo_cliente'])
      const zona = pick(row, ['Zona', 'zona'])
      const estado = pick(row, ['Estado', 'estado'])
      try {
        await prisma.cliente.create({
          data: {
            nombre,
            tipo_cliente: TIPOS_CLIENTE.includes(tipo as never) ? tipo : 'Comercial',
            zona: ZONAS.includes(zona as never) ? zona : (zona || ''),
            estado: ESTADOS_CLIENTE.includes(estado as never) ? estado : 'Activo',
            direccion: pick(row, ['Dirección', 'Direccion', 'direccion']),
            telefono: pick(row, ['Teléfono', 'Telefono', 'telefono']),
            telefono_alterno: pick(row, ['TeléfonoAlterno', 'TelefonoAlterno', 'telefono_alterno']),
            email: pick(row, ['Email', 'email']),
            nombre_contacto_principal: pick(row, ['NombreContactoPrincipal', 'nombre_contacto_principal']),
            telefono_contacto_principal: pick(row, ['TeléfonoContactoPrincipal', 'TelefonoContactoPrincipal', 'telefono_contacto_principal']),
            google_maps_url: pick(row, ['GoogleMapsURL', 'google_maps_url']),
            notas: pick(row, ['Notas', 'notas']),
          },
        })
        creados++
      } catch {
        errores.push(`Fila ${i + 2}: ${nombre}`)
      }
    }
    return NextResponse.json({ ok: true, creados, errores, total: rows.length })
  } catch {
    return NextResponse.json({ error: 'Error al importar el archivo. Verifique el formato.' }, { status: 500 })
  }
}
