import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { guard, GERENTE_ONLY } from '@/lib/rbac'
import { ROLES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export async function GET() {
  const g = await guard(GERENTE_ONLY)
  if (g.error) return g.error
  try {
    const data = await prisma.usuario.findMany({
      orderBy: { created_at: 'asc' },
      select: {
        id: true, nombre_completo: true, username: true, rol: true, estado: true,
        personal_vinculado_id: true, must_change_password: true, created_at: true,
        personal_vinculado: { select: { id: true, nombre_completo: true } },
      },
    })
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Error al cargar los usuarios.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const g = await guard(GERENTE_ONLY)
  if (g.error) return g.error
  try {
    const b = await req.json()
    const username = String(b.username ?? '').trim().toLowerCase()
    if (!username) return NextResponse.json({ error: 'El nombre de usuario es obligatorio.' }, { status: 400 })
    if (!b.nombre_completo || !String(b.nombre_completo).trim()) return NextResponse.json({ error: 'El nombre completo es obligatorio.' }, { status: 400 })
    if (!ROLES.includes(b.rol)) return NextResponse.json({ error: 'Rol inválido.' }, { status: 400 })

    const exists = await prisma.usuario.findUnique({ where: { username } })
    if (exists) return NextResponse.json({ error: 'Ese nombre de usuario ya existe.' }, { status: 400 })

    if (b.rol === 'Gerente General') {
      const activeGerente = await prisma.usuario.count({ where: { rol: 'Gerente General', estado: 'Activo' } })
      if (activeGerente >= 1) return NextResponse.json({ error: 'Solo puede existir un Gerente General activo.' }, { status: 400 })
    }

    const hash = await bcrypt.hash('12345', 10)
    const usuario = await prisma.usuario.create({
      data: {
        nombre_completo: String(b.nombre_completo).trim(),
        username,
        password_hash: hash,
        rol: b.rol,
        estado: b.estado || 'Activo',
        personal_vinculado_id: b.personal_vinculado_id || null,
        must_change_password: true,
      },
      select: { id: true, nombre_completo: true, username: true, rol: true, estado: true },
    })
    return NextResponse.json({ ok: true, usuario })
  } catch {
    return NextResponse.json({ error: 'Error al crear el usuario.' }, { status: 500 })
  }
}
