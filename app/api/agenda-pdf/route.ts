import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/db'
import { guard, STAFF_ROLES } from '@/lib/rbac'
import { buildAgendaHtml } from '@/lib/agenda-pdf'

export const dynamic = 'force-dynamic'

let cachedLogo: string | null = null
async function getLogoDataUri(): Promise<string> {
  if (cachedLogo !== null) return cachedLogo
  try {
    const p = path.join(process.cwd(), 'public', 'logo-servifumi.jpg')
    const buf = await fs.readFile(p)
    cachedLogo = `data:image/jpeg;base64,${buf.toString('base64')}`
  } catch {
    cachedLogo = ''
  }
  return cachedLogo
}

export async function POST(req: NextRequest) {
  const g = await guard(STAFF_ROLES)
  if (g.error) return g.error
  try {
    const b = await req.json().catch(() => ({}))
    const base = b.date ? new Date(b.date) : new Date()
    const start = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), 0, 0, 0))
    const end = new Date(start)
    end.setUTCDate(start.getUTCDate() + 1)

    const servicios = await prisma.programacion.findMany({
      where: { fecha_hora: { gte: start, lt: end } },
      include: {
        cliente: { select: { nombre: true } },
        tecnicos: { select: { nombre_completo: true } },
        tipos_servicio: { select: { nombre: true } },
        vehiculo: { select: { identificador: true, apodo: true } },
      },
      orderBy: { fecha_hora: 'asc' },
    })

    const logo = await getLogoDataUri()
    const html = buildAgendaHtml(start, servicios as never, logo)

    const createResponse = await fetch('https://apps.abacus.ai/api/createConvertHtmlToPdfRequest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}` },
      body: JSON.stringify({
        html_content: html,
        pdf_options: {
          format: 'Letter',
          print_background: true,
          margin: { top: '36px', bottom: '48px', left: '30px', right: '30px' },
          display_header_footer: true,
          footer_template: '<div style="width:100%;font-size:8px;text-align:center;color:#666;padding:0 20px;">Servifumi Pest Control &nbsp;—&nbsp; Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>',
          header_template: '<span></span>',
        },
      }),
    })
    if (!createResponse.ok) {
      return NextResponse.json({ error: 'No se pudo iniciar la generación del PDF.' }, { status: 500 })
    }
    const { request_id } = await createResponse.json()
    if (!request_id) return NextResponse.json({ error: 'No se recibió el identificador de la solicitud.' }, { status: 500 })
    return NextResponse.json({ ok: true, request_id, totalServicios: servicios.length })
  } catch {
    return NextResponse.json({ error: 'Error al generar el PDF de la agenda.' }, { status: 500 })
  }
}
