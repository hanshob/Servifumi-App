import { NextRequest } from 'next/server'

export function getPagination(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1)
  const pageSize = Math.min(200, Math.max(1, parseInt(sp.get('pageSize') ?? '25', 10) || 25))
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }
}

export function param(req: NextRequest, key: string): string {
  return (req.nextUrl.searchParams.get(key) ?? '').trim()
}

export const MAX_TECNICOS = 6

// Validate a tecnicos id array (min 1, max 6). Returns error string or null.
export function validateTecnicos(ids: unknown): string | null {
  if (!Array.isArray(ids) || ids.length < 1) return 'Debe asignar al menos 1 técnico.'
  if (ids.length > MAX_TECNICOS) return 'Máximo 6 técnicos por servicio.'
  return null
}
