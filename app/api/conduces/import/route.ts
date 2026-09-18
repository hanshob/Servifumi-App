import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'
import { normalize } from '@/lib/helpers'

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

    const [personal, tipos] = await Promise.all([
      prisma.personal.findMany({ select: { id: true, nombre_completo: true } }),
      prisma.tipoServicio.findMany({ select: { id: true, nombre: true } }),
    ])
    const personalMap = new Map(personal.map((p) => [normalize(p.nombre_completo), p.id]))
    const tiposMap = new Map(tipos.map((t) => [normalize(t.nombre), t.id]))

    let creados = 0
    let omitidos = 0
    const errores: string[] = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const numero = parseInt(pick(row, ['ConduceNumero', 'conduce_numero', 'Numero', 'Número']), 10)
      if (!Number.isFinite(numero) || numero <= 0) { continue }
      const exists = await prisma.conduce.findUnique({ where: { conduce_numero: numero } })
      if (exists) { omitidos++; continue }
      const tecNames = pick(row, ['Tecnicos', 'Técnicos']).split(',').map((s) => normalize(s)).filter(Boolean)
      const tipoNames = pick(row, ['TiposServicio', 'Tipos']).split(',').map((s) => normalize(s)).filter(Boolean)
      const tecIds = tecNames.map((n) => personalMap.get(n)).filter((x): x is string => Boolean(x))
      const tipoIds = tipoNames.map((n) => tiposMap.get(n)).filter((x): x is number => Boolean(x))
      const fechaStr = pick(row, ['FechaRegistro', 'fecha_registro', 'Fecha'])
      const fecha = fechaStr ? new Date(fechaStr) : new Date()
      try {
        await prisma.conduce.create({
          data: {
            conduce_numero: numero,
            empresa: pick(row, ['Empresa', 'empresa']),
            detalles_observaciones: pick(row, ['Detalles', 'detalles_observaciones', 'Observaciones']),
            fecha_registro: isNaN(fecha.getTime()) ? new Date() : fecha,
            importado: true,
            tecnicos: { connect: tecIds.map((id) => ({ id })) },
            tipos_servicio: { connect: tipoIds.map((id) => ({ id })) },
          },
        })
        creados++
      } catch {
        errores.push(`Fila ${i + 2}: conduce #${numero}`)
      }
    }
    return NextResponse.json({ ok: true, creados, omitidos, errores, total: rows.length })
  } catch {
    return NextResponse.json({ error: 'Error al importar el archivo. Verifique el formato.' }, { status: 500 })
  }
}
