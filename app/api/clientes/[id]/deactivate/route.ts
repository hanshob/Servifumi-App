import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'
import { startOfToday } from '@/lib/generation'

export const dynamic = 'force-dynamic'

// Deactivate a client: pause active contracts + cancel future Programado services.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  const { id } = await params
  const clienteId = Number(id)
  try {
    const today = startOfToday()
    const result = await prisma.$transaction(async (tx) => {
      await tx.contrato.updateMany({ where: { cliente_id: clienteId, estado: 'Activo' }, data: { estado: 'Pausado' } })
      const cancelled = await tx.programacion.updateMany({
        where: { cliente_id: clienteId, estado: 'Programado', fecha_hora: { gt: today } },
        data: { estado: 'Cancelado' },
      })
      await tx.cliente.update({ where: { id: clienteId }, data: { estado: 'Inactivo' } })
      return cancelled.count
    })
    return NextResponse.json({ ok: true, serviciosCancelados: result })
  } catch {
    return NextResponse.json({ error: 'Error al desactivar cliente.' }, { status: 500 })
  }
}

// Return counts of active contracts and future services (for the warning modal).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  const { id } = await params
  const clienteId = Number(id)
  try {
    const today = startOfToday()
    const [contratos, servicios] = await Promise.all([
      prisma.contrato.count({ where: { cliente_id: clienteId, estado: 'Activo' } }),
      prisma.programacion.count({ where: { cliente_id: clienteId, estado: 'Programado', fecha_hora: { gt: today } } }),
    ])
    return NextResponse.json({ contratosActivos: contratos, serviciosFuturos: servicios })
  } catch {
    return NextResponse.json({ error: 'Error.' }, { status: 500 })
  }
}
