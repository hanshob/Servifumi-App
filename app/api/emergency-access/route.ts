import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Backing endpoint for the hidden /emergency-access page.
export async function POST(req: NextRequest) {
  try {
    const { token, new_password } = await req.json()
    const expected = process.env.EMERGENCY_TOKEN
    if (!expected || token !== expected) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 401 })
    }
    if (!new_password || String(new_password).length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 })
    }
    const gerente = await prisma.usuario.findFirst({
      where: { rol: 'Gerente General' }, orderBy: { id: 'asc' },
    })
    if (!gerente) return NextResponse.json({ error: 'Token inválido.' }, { status: 401 })
    const hash = await bcrypt.hash(String(new_password), 10)
    await prisma.usuario.update({
      where: { id: gerente.id },
      data: { password_hash: hash, must_change_password: true, estado: 'Activo' },
    })
    await prisma.emergencyLog.create({
      data: { accion: 'emergency-access', detalle: `Reset password (hidden page) for Gerente General id=${gerente.id}` },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Token inválido.' }, { status: 401 })
  }
}
