// Client helper: create a PDF request, poll status, then download the resulting blob.

export async function generateAndDownloadPdf(
  createUrl: string,
  body: unknown,
  filename: string,
  onProgress?: (msg: string) => void,
): Promise<void> {
  onProgress?.('Generando PDF...')
  const res = await fetch(createUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data?.request_id) {
    throw new Error(data?.error || 'No se pudo iniciar la generación del PDF.')
  }
  const requestId = data.request_id as string

  const started = Date.now()
  const maxMs = 5 * 60 * 1000
  while (Date.now() - started < maxMs) {
    await new Promise((r) => setTimeout(r, 2000))
    const sres = await fetch(`/api/generate-pdf/status?request_id=${encodeURIComponent(requestId)}`)
    const sdata = await sres.json().catch(() => ({}))
    if (!sres.ok) throw new Error(sdata?.error || 'Error al consultar el estado del PDF.')
    const status = String(sdata?.status ?? '').toUpperCase()
    if (status === 'COMPLETE' || status === 'COMPLETED' || sdata?.pdf_base64) {
      const b64 = sdata?.pdf_base64
      if (!b64) throw new Error('El PDF no contiene datos.')
      downloadBase64Pdf(b64, filename)
      onProgress?.('Listo')
      return
    }
    if (status === 'FAILED' || status === 'ERROR') {
      throw new Error('La generación del PDF falló.')
    }
    onProgress?.('Generando PDF...')
  }
  throw new Error('La generación del PDF tardó demasiado.')
}

function downloadBase64Pdf(b64: string, filename: string) {
  const byteChars = atob(b64)
  const bytes = new Uint8Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
