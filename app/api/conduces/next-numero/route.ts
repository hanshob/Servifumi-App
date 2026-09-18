import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

export async function GET() {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  try {
    const max = await prisma.conduce.aggregate({ _max: { conduce_numero: true } })
    const next = (max._max.conduce_numero ?? 0) + 1
    return NextResponse.json({ next })
  } catch {
    return NextResponse.json({ error: 'Error.' }, { status: 500 })
  }
}
