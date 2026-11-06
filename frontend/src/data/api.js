const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const apiAssetUrl = (path) => new URL(path, apiBaseUrl).toString()

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {})
  const token = localStorage.getItem('tokenSession')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers })
  const data = await response.json()
  if (!response.ok) {
    const error = new Error(data.error || data.mensaje || 'La solicitud no pudo completarse.')
    error.status = response.status
    error.codigo = data.codigo
    throw error
  }
  return data
}

/** Descarga un archivo (PDF, Excel) enviando el token; devuelve un Blob. */
export async function apiDownload(path) {
  const headers = new Headers()
  const token = localStorage.getItem('tokenSession')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${apiBaseUrl}${path}`, { headers })
  if (!response.ok) {
    let data = {}
    try { data = await response.json() } catch { /* respuesta sin JSON */ }
    const error = new Error(data.error || 'No se pudo generar el archivo.')
    error.status = response.status
    throw error
  }
  return response.blob()
}
