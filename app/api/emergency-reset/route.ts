import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Protected endpoint: header X-Emergency-Token must match EMERGENCY_TOKEN.
// Resets the Gerente General password. Not exposed in the UI.
export async function POST(req: NextRequest) {
  const token = req.headers.get('x-emergency-token')
  const expected = process.env.EMERGENCY_TOKEN
  if (!expected || token !== expected) {
    return NextResponse.json({ error: 'Token inválido.' }, { status: 401 })
  }
  try {
    const { new_password } = await req.json()
    if (!new_password || String(new_password).length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 })
    }
    const gerente = await prisma.usuario.findFirst({
      where: { rol: 'Gerente General' }, orderBy: { id: 'asc' },
    })
    if (!gerente) return NextResponse.json({ error: 'No existe Gerente General.' }, { status: 404 })
    const hash = await bcrypt.hash(String(new_password), 10)
    await prisma.usuario.update({
      where: { id: gerente.id },
      data: { password_hash: hash, must_change_password: true, estado: 'Activo' },
    })
    await prisma.emergencyLog.create({
      data: { accion: 'emergency-reset', detalle: `Reset password for Gerente General id=${gerente.id} (${gerente.username})` },
    })
    return NextResponse.json({ ok: true, message: 'Contraseña del Gerente General restablecida.' })
  } catch {
    return NextResponse.json({ error: 'Error al restablecer.' }, { status: 500 })
  }
}
