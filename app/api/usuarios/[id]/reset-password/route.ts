import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { guard, GERENTE_ONLY } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

// Reset a user's password to the default (12345) and force a change on next login.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(GERENTE_ONLY)
  if (g.error) return g.error
  const { id } = await params
  try {
    const hash = await bcrypt.hash('12345', 10)
    await prisma.usuario.update({ where: { id: Number(id) }, data: { password_hash: hash, must_change_password: true } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error al restablecer la contraseña.' }, { status: 500 })
  }
}
