'use client'

// Download a file from a GET endpoint (e.g. xlsx export).
export async function downloadFile(url: string, fallbackName: string) {
  const res = await fetch(url)
  if (!res.ok) {
    const t = await res.json().catch(() => ({}))
    throw new Error(t?.error || 'Error al descargar el archivo.')
  }
  const blob = await res.blob()
  const cd = res.headers.get('content-disposition') || ''
  const m = cd.match(/filename="?([^";]+)"?/)
  const name = m?.[1] || fallbackName
  const objUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objUrl
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(objUrl), 1000)
}

export async function uploadFile(url: string, file: File): Promise<Record<string, unknown>> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(url, { method: 'POST', body: fd })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Error al importar el archivo.')
  return data
}
