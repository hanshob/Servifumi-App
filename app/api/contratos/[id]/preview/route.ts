import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'
import { previewNextMonths } from '@/lib/generation'
import { diaSemanaFromDate } from '@/lib/helpers'

export const dynamic = 'force-dynamic'

// Preview the upcoming generated service dates for a contract (next 6 months).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  const { id } = await params
  try {
    const contrato = await prisma.contrato.findUnique({ where: { id: Number(id) } })
    if (!contrato) return NextResponse.json({ error: 'Contrato no encontrado.' }, { status: 404 })
    const monthsParam = parseInt(req.nextUrl.searchParams.get('months') ?? '6', 10) || 6
    const dates = previewNextMonths(
      {
        frecuencia: contrato.frecuencia,
        semanas_quincenal: contrato.semanas_quincenal,
        dia_preferido: contrato.dia_preferido,
        hora_por_defecto: contrato.hora_por_defecto,
        fecha_inicio: contrato.fecha_inicio,
      },
      monthsParam,
    )
    const fechas = dates.map((d) => ({ fecha_hora: d.toISOString(), dia_semana: diaSemanaFromDate(d) }))
    return NextResponse.json({ fechas })
  } catch {
    return NextResponse.json({ error: 'Error al generar la vista previa.' }, { status: 500 })
  }
}
