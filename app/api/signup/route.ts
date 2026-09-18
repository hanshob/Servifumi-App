import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// User creation is normally done by a Gerente General via Configuración > Usuarios.
// This endpoint is gated: Gerente General session required, OR development environment
// (for automated smoke testing). Returns 403 otherwise.
export async function POST(req: NextRequest) {
  const session = await auth()
  const isGerente = session?.user?.role === 'Gerente General'
  const isDev = process.env.NODE_ENV !== 'production'
  if (!isGerente && !isDev) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const rawUser = (body.username ?? body.email) as string | undefined
    const password = body.password as string | undefined
    const nombre = (body.nombre_completo ?? body.name ?? rawUser) as string
    if (!rawUser || !password) {
      return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 })
    }
    const username = rawUser.trim().toLowerCase()
    const existing = await prisma.usuario.findUnique({ where: { username } })
    if (existing) return NextResponse.json({ error: 'El usuario ya existe.' }, { status: 409 })
    const hash = await bcrypt.hash(String(password), 10)
    const user = await prisma.usuario.create({
      data: {
        nombre_completo: nombre, username, password_hash: hash,
        rol: isGerente ? (body.rol ?? 'Administración') : 'Administración',
        estado: 'Activo', must_change_password: isGerente ? true : false,
      },
    })
    return NextResponse.json({ ok: true, id: user.id })
  } catch {
    return NextResponse.json({ error: 'Error al crear usuario.' }, { status: 500 })
  }
}
