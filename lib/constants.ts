// ===== Spanish domain constants =====

export const ROLES = ['Gerente General', 'Administración', 'Supervisor'] as const;

export const ZONAS = [
  'Distrito Nacional',
  'Santo Domingo Este',
  'Santo Domingo Oeste',
  'Santo Domingo Norte',
  'Interior',
] as const;

export const TIPOS_CLIENTE = ['Residencial', 'Comercial', 'Industrial', 'Gobierno'] as const;

export const ESTADOS_CLIENTE = ['Activo', 'Inactivo'] as const;

export const FRECUENCIAS = [
  'Única',
  'Semanal',
  'Quincenal',
  'Mensual',
  'Bimestral',
  'Trimestral',
  'Semestral',
  'Anual',
] as const;

export const ESTADOS_CONTRATO = ['Activo', 'Pausado', 'Finalizado'] as const;

export const ESTADOS_PROGRAMACION = ['Programado', 'Confirmado', 'Completado', 'Cancelado'] as const;

export const TURNOS = ['Matutino', 'Nocturno', 'Interior'] as const;

export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;

// Lunes=1 ... Domingo=0 (JS getDay convention)
export const DIA_TO_JS: Record<string, number> = {
  Domingo: 0,
  Lunes: 1,
  Martes: 2,
  'Miércoles': 3,
  Jueves: 4,
  Viernes: 5,
  'Sábado': 6,
};

export const JS_TO_DIA: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

export const PUESTOS = ['Administración', 'Técnico', 'Supervisor'] as const;

export const PUESTO_PREFIX: Record<string, string> = {
  'Administración': 'ADM',
  'Técnico': 'TEC',
  'Supervisor': 'SUP',
};

export const ESTADOS_VEHICULO = ['Disponible', 'Mantenimiento', 'Inactivo'] as const;

export const ESTADOS_PERSONAL = ['Activo', 'Inactivo'] as const;

export const ESTADO_COLORS: Record<string, string> = {
  Programado: '#eab308',
  Confirmado: '#1a5c2a',
  Completado: '#2563eb',
  Cancelado: '#dc2626',
};

export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export const MAX_TECNICOS = 6;
