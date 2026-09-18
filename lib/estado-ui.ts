// Client-safe UI helpers for badges / colors.

export const ESTADO_PROG_CLASS: Record<string, string> = {
  Programado: 'bg-amber-100 text-amber-800 border border-amber-200',
  Confirmado: 'bg-primary/10 text-primary border border-primary/20',
  Completado: 'bg-blue-100 text-blue-800 border border-blue-200',
  Cancelado: 'bg-red-100 text-red-700 border border-red-200',
}

export const ESTADO_CONTRATO_CLASS: Record<string, string> = {
  Activo: 'bg-primary/10 text-primary border border-primary/20',
  Pausado: 'bg-amber-100 text-amber-800 border border-amber-200',
  Finalizado: 'bg-gray-200 text-gray-700 border border-gray-300',
}

export const ESTADO_GENERIC_CLASS: Record<string, string> = {
  Activo: 'bg-primary/10 text-primary border border-primary/20',
  Inactivo: 'bg-gray-200 text-gray-600 border border-gray-300',
  Disponible: 'bg-primary/10 text-primary border border-primary/20',
  Mantenimiento: 'bg-amber-100 text-amber-800 border border-amber-200',
}

export function estadoBadge(estado: string): string {
  return (
    ESTADO_PROG_CLASS[estado] ||
    ESTADO_CONTRATO_CLASS[estado] ||
    ESTADO_GENERIC_CLASS[estado] ||
    'bg-gray-100 text-gray-700 border border-gray-200'
  )
}
