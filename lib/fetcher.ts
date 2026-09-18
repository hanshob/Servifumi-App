export const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error || 'Error al cargar los datos.')
  }
  return res.json()
}

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'Ocurrió un error.')
  return data
}

export const apiPost = (url: string, body?: unknown) => send(url, 'POST', body)
export const apiPatch = (url: string, body?: unknown) => send(url, 'PATCH', body)
export const apiDelete = (url: string) => send(url, 'DELETE')
