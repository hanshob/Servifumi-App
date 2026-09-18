import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const { currentPassword, newPassword } = await req.json()
    if (!newPassword || String(newPassword).length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 })
    }
    const user = await prisma.usuario.findUnique({ where: { id: Number(session.user.id) } })
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })

    // If NOT a forced change, verify current password
    if (!user.must_change_password) {
      const ok = await bcrypt.compare(String(currentPassword ?? ''), user.password_hash)
      if (!ok) return NextResponse.json({ error: 'La contraseña actual es incorrecta.' }, { status: 400 })
    }
    const hash = await bcrypt.hash(String(newPassword), 10)
    await prisma.usuario.update({
      where: { id: user.id },
      data: { password_hash: hash, must_change_password: false },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error al cambiar la contraseña.' }, { status: 500 })
  }
}
