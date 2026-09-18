import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { auth } from '@/auth';

export type Guarded =
  | { session: Session; error?: never }
  | { session?: never; error: NextResponse };

/**
 * Guard an API route. Returns { session } if authorized, or { error } response.
 * @param allowed list of allowed roles; if omitted, any authenticated active user passes.
 */
export async function guard(allowed?: string[]): Promise<Guarded> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) };
  }
  if (session.user.estado !== 'Activo') {
    return { error: NextResponse.json({ error: 'Usuario inactivo' }, { status: 403 }) };
  }
  if (allowed && !allowed.includes(session.user.role)) {
    return { error: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }) };
  }
  return { session };
}

// Roles that can use operational modules (everything except Supervisor)
export const STAFF_ROLES = ['Gerente General', 'Administración'];
export const GERENTE_ONLY = ['Gerente General'];
export const ALL_ROLES = ['Gerente General', 'Administración', 'Supervisor'];
