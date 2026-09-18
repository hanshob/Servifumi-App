import { NextResponse } from 'next/server'
import { guard, ALL_ROLES } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const g = await guard(ALL_ROLES)
  if (g.error) return g.error
  try {
    const { request_id } = await request.json()
    const statusResponse = await fetch('https://apps.abacus.ai/api/getConvertHtmlToPdfStatus', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({ request_id }),
    })
    const statusResult = await statusResponse.json()
    const status = statusResult?.status || 'FAILED'
    const result = statusResult?.result || null
    if (status === 'SUCCESS') {
      if (result && result.result) return NextResponse.json({ status, pdf_base64: result.result })
      return NextResponse.json({ status: 'FAILED', error: 'No se generó el PDF.' })
    }
    if (status === 'FAILED') return NextResponse.json({ status, error: result?.error || 'Falló la generación del PDF.' })
    return NextResponse.json({ status })
  } catch {
    return NextResponse.json({ status: 'FAILED', error: 'Error al verificar el estado del PDF.' }, { status: 500 })
  }
}
