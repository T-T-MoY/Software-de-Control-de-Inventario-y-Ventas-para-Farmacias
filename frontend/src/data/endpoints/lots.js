
import { apiRequest } from '../api'

/**
 * Consultar y gestionar lotes.
 */

// Listar y buscar lotes.
export function listarLotes({ buscar } = {}) {
  const params = new URLSearchParams()

  if (buscar) {
    params.set('buscar', buscar)
  }

  const query = params.toString()

  return apiRequest(
    `/api/lotes${query ? `?${query}` : ''}`
  )
}

// Consultar un lote específico.
export const obtenerLote = (idLote) => (
  apiRequest(`/api/lotes/${idLote}`)
)

// Registrar recepción de medicamentos.
export const registrarRecepcion = (datos) => (
  apiRequest('/api/lotes/recepciones', {
    method: 'POST',
    body: JSON.stringify(datos)
  })
)

// Dar de baja un lote vencido.
export const darBajaLote = (idLote) => (
  apiRequest(`/api/lotes/${idLote}/baja`, {
    method: 'PATCH'
  })
)
