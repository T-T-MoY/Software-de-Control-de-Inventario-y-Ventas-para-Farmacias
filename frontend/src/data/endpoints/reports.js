import { apiRequest, apiDownload } from '../api'

const armarQuery = (filtros = {}) => {
  const params = new URLSearchParams()
  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor !== null && valor !== undefined && valor !== '') params.set(clave, valor)
  })
  const query = params.toString()
  return query ? `?${query}` : ''
}

/** tipo: ventas | inventario | lotes-por-vencer | lotes-vencidos */
export const obtenerReporte = (tipo, filtros) => apiRequest(
  `/api/reportes/${tipo}${armarQuery(filtros)}`
)

/** formato: pdf | excel. Devuelve un Blob. */
export const descargarReporte = (tipo, formato, filtros) => apiDownload(
  `/api/reportes/${tipo}/exportar${armarQuery({ ...filtros, formato })}`
)

export const listarHistorial = (filtros) => apiRequest(
  `/api/historial${armarQuery(filtros)}`
)

export const listarUsuariosHistorial = () => apiRequest('/api/historial/usuarios')
