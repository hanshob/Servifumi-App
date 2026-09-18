import { JS_TO_DIA, MESES } from './constants';

// All fecha_hora values represent wall-clock time stored as UTC. Always format with timeZone UTC.

export function buildDateTime(year: number, monthIndex: number, day: number, hh: number, mm: number): Date {
  return new Date(Date.UTC(year, monthIndex, day, hh, mm, 0, 0));
}

export function parseHora(hora: string): { hh: number; mm: number } {
  const [h, m] = (hora ?? '08:00').split(':');
  return { hh: parseInt(h, 10) || 0, mm: parseInt(m, 10) || 0 };
}

export function diaSemanaFromDate(d: Date): string {
  return JS_TO_DIA[d.getUTCDay()] ?? '';
}

export function formatFecha(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatHora(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('es-DO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(date);
}

export function formatFechaHora(d: Date | string): string {
  return `${formatFecha(d)} ${formatHora(d)}`;
}

export function nombreMes(monthIndex: number): string {
  return MESES[monthIndex] ?? '';
}

// Normalize (lowercase, strip accents) for matching
export function normalize(s: string): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Build wa.me link for Dominican Republic numbers
export function buildWhatsappLink(phone: string): string | null {
  if (!phone) return null;
  let digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  // DR area codes 809/829/849 -> prepend country code 1
  if (digits.length === 10 && /^(809|829|849)/.test(digits)) {
    digits = '1' + digits;
  }
  return `https://wa.me/${digits}`;
}

export function todayUTCRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
  return { start, end };
}
