import { DIA_TO_JS } from './constants';
import { buildDateTime, parseHora } from './helpers';

export interface ContratoForGen {
  frecuencia: string;
  semanas_quincenal: string;
  dia_preferido: string;
  hora_por_defecto: string;
  fecha_inicio: Date | string;
}

// Return all day-of-month numbers in (year, monthIndex) that fall on target JS weekday.
function occurrencesOfWeekday(year: number, monthIndex: number, jsWeekday: number): number[] {
  const result: number[] = [];
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(Date.UTC(year, monthIndex, day));
    if (d.getUTCDay() === jsWeekday) result.push(day);
  }
  return result;
}

/**
 * Compute the wall-clock Date(s) a contract would generate for a given target month.
 * targetYear / targetMonthIndex (0-based).
 */
export function computeServiceDatesForMonth(
  contrato: ContratoForGen,
  targetYear: number,
  targetMonthIndex: number,
): Date[] {
  const jsWeekday = DIA_TO_JS[contrato.dia_preferido];
  if (jsWeekday === undefined) return [];
  const { hh, mm } = parseHora(contrato.hora_por_defecto);
  const occ = occurrencesOfWeekday(targetYear, targetMonthIndex, jsWeekday);
  if (occ.length === 0 && contrato.frecuencia !== 'Única') return [];

  const inicio = typeof contrato.fecha_inicio === 'string' ? new Date(contrato.fecha_inicio) : contrato.fecha_inicio;
  const yearInicio = inicio.getUTCFullYear();
  const monthInicio = inicio.getUTCMonth();
  const monthDiff = (targetYear - yearInicio) * 12 + (targetMonthIndex - monthInicio);

  const mkDates = (days: number[]) => days.map((d) => buildDateTime(targetYear, targetMonthIndex, d, hh, mm));

  switch (contrato.frecuencia) {
    case 'Única':
      return []; // never auto-generated
    case 'Semanal':
      return mkDates(occ);
    case 'Quincenal': {
      if (contrato.semanas_quincenal === '2_4') {
        return mkDates([occ[1], occ[3]].filter((x) => x !== undefined) as number[]);
      }
      return mkDates([occ[0], occ[2]].filter((x) => x !== undefined) as number[]);
    }
    case 'Mensual':
      return mkDates([occ[0]]);
    case 'Bimestral':
      return monthDiff >= 0 && monthDiff % 2 === 0 ? mkDates([occ[0]]) : [];
    case 'Trimestral':
      return monthDiff >= 0 && monthDiff % 3 === 0 ? mkDates([occ[0]]) : [];
    case 'Semestral':
      return monthDiff >= 0 && monthDiff % 6 === 0 ? mkDates([occ[0]]) : [];
    case 'Anual':
      return monthDiff >= 0 && monthDiff % 12 === 0 ? mkDates([occ[0]]) : [];
    default:
      return [];
  }
}

// Preview the next N months of dates starting from the first day of next month.
export function previewNextMonths(contrato: ContratoForGen, months: number, from?: Date): Date[] {
  const base = from ?? new Date();
  let year = base.getUTCFullYear();
  let month = base.getUTCMonth();
  const all: Date[] = [];
  for (let i = 0; i < months; i++) {
    all.push(...computeServiceDatesForMonth(contrato, year, month));
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }
  return all.filter((d) => d >= startOfToday()).sort((a, b) => a.getTime() - b.getTime());
}

export function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
}

// Returns {year, monthIndex} for the next calendar month relative to now.
export function nextMonth(from?: Date): { year: number; monthIndex: number } {
  const base = from ?? new Date();
  let year = base.getUTCFullYear();
  let month = base.getUTCMonth() + 1;
  if (month > 11) {
    month = 0;
    year++;
  }
  return { year, monthIndex: month };
}
