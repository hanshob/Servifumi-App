import { formatFecha, formatHora } from './helpers'

interface ProgForPdf {
  fecha_hora: Date
  turno: string
  estado: string
  origen: string
  direccion: string
  observaciones: string
  requiere_cambio_estaciones: boolean
  cliente: { nombre: string } | null
  tecnicos: { nombre_completo: string }[]
  tipos_servicio: { nombre: string }[]
  vehiculo: { identificador: string; apodo: string } | null
}

const TURNOS_ORDER = ['Matutino', 'Nocturno', 'Interior']

function esc(s: string): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function buildAgendaHtml(fecha: Date, servicios: ProgForPdf[], logoDataUri: string): string {
  const fechaStr = formatFecha(fecha)
  const activos = servicios.filter((s) => s.estado !== 'Cancelado')

  const grupos = TURNOS_ORDER.map((t) => ({ turno: t, items: activos.filter((s) => s.turno === t) })).filter((g) => g.items.length > 0)

  let consecutivo = 0
  const seccionesHtml = grupos.map((g) => {
    const filas = g.items.map((s) => {
      consecutivo++
      const rec = s.origen === 'Recurrente' ? ' ↺' : ''
      return `<tr>
        <td class="c-num">${consecutivo}</td>
        <td class="c-hora">${formatHora(s.fecha_hora)}</td>
        <td>${esc(s.cliente?.nombre ?? '')}${rec}</td>
        <td>${esc(s.direccion)}</td>
        <td>${esc(s.tecnicos.map((t) => t.nombre_completo).join(', '))}</td>
        <td>${esc(s.tipos_servicio.map((t) => t.nombre).join(', '))}</td>
        <td>${esc(s.observaciones)}</td>
      </tr>`
    }).join('')

    const cambios = g.items.filter((s) => s.requiere_cambio_estaciones)
    const notaCambios = cambios.length
      ? `<div class="nota">${cambios.map((s) => `Cambio de estaciones de control requerido — ${esc(s.cliente?.nombre ?? '')}`).join('<br/>')}</div>`
      : ''

    return `<h2 class="turno">${g.turno.toUpperCase()}</h2>
      <table class="tbl">
        <thead><tr>
          <th class="c-num">No.</th><th class="c-hora">Horario</th><th>Cliente</th><th>Dirección</th>
          <th>Técnico(s)</th><th>Tipo de Servicio</th><th>Observaciones</th>
        </tr></thead>
        <tbody>${filas}</tbody>
      </table>${notaCambios}`
  }).join('')

  // Vehicles summary
  const vehMap = new Map<string, string>()
  for (const s of activos) {
    if (s.vehiculo) vehMap.set(s.vehiculo.identificador, s.vehiculo.apodo || '')
  }
  const camionetas = Array.from(vehMap.entries()).map(([id, apodo]) => apodo ? `${id} (${esc(apodo)})` : id).join(' · ')

  const cuerpo = grupos.length
    ? seccionesHtml
    : `<p class="vacio">No hay servicios programados para este día.</p>`

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 10px; margin: 0; }
    .head { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
    .head-left { display: flex; align-items: center; gap: 10px; }
    .head-left img { height: 46px; width: auto; }
    .brand { font-size: 15px; font-weight: bold; }
    .slogan { font-size: 9px; font-style: italic; }
    .head-right { text-align: right; font-size: 10px; }
    h2.turno { font-size: 12px; margin: 14px 0 4px; border-bottom: 1px solid #000; padding-bottom: 2px; }
    table.tbl { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    table.tbl th, table.tbl td { border: 1px solid #444; padding: 3px 4px; text-align: left; vertical-align: top; }
    table.tbl th { background: #eee; font-size: 9px; text-transform: uppercase; }
    .c-num { width: 26px; text-align: center; }
    .c-hora { width: 62px; }
    tr { page-break-inside: avoid; }
    .nota { font-size: 9px; font-style: italic; margin: 2px 0 8px; }
    .footer-doc { margin-top: 16px; border-top: 1px solid #000; padding-top: 6px; }
    .footer-doc .cam { font-weight: bold; }
    .leyenda { font-size: 9px; margin-top: 6px; color: #333; }
    .vacio { font-style: italic; margin-top: 20px; }
  </style></head><body>
    <div class="head">
      <div class="head-left">
        ${logoDataUri ? `<img src="${logoDataUri}" alt="Servifumi"/>` : ''}
        <div><div class="brand">Servifumi Pest Control</div><div class="slogan">Somos parte activa de la solución</div></div>
      </div>
      <div class="head-right"><div><strong>Agenda del día</strong></div><div>${fechaStr}</div><div>Santo Domingo D.N.</div></div>
    </div>
    ${cuerpo}
    <div class="footer-doc">
      <div class="cam">Camionetas a utilizar: <span style="font-weight:normal">${camionetas || 'N/D'}</span></div>
      <div class="leyenda">↺ Servicio recurrente</div>
    </div>
  </body></html>`
}
