import { apiRequest } from '../api'

/**
 * Catálogo de medicamentos (RF2).
 * Los filtros son opcionales; el backend los combina si se envían.
 */
export function listarMedicamentos({ buscar, categoria, estado } = {}) {
  const params = new URLSearchParams()
  if (buscar) params.set('buscar', buscar)
  if (categoria) params.set('categoria', categoria)
  if (estado) params.set('estado', estado)

  const query = params.toString()
  return apiRequest(`/api/medicamentos${query ? `?${query}` : ''}`)
}

export const listarCategorias = () => apiRequest('/api/medicamentos/categorias')

export const crearMedicamento = (datos) => apiRequest('/api/medicamentos', {
  method: 'POST',
  body: JSON.stringify(datos)
})

export const actualizarMedicamento = (idMedicamento, datos) => apiRequest(
  `/api/medicamentos/${idMedicamento}`,
  {
    method: 'PUT',
    body: JSON.stringify(datos)
  }
)

export const cambiarEstadoMedicamento = (idMedicamento, activo) => apiRequest(
  `/api/medicamentos/${idMedicamento}/estado`,
  {
    method: 'PATCH',
    body: JSON.stringify({ activo })
  }
)

export const eliminarMedicamentoLogico = (idMedicamento) => apiRequest(
  `/api/medicamentos/${idMedicamento}`,
  { method: 'DELETE' }
)

export const subirFotoMedicamento = (idMedicamento, archivo) => {
  const datos = new FormData()
  datos.append('foto', archivo)
  return apiRequest(`/api/medicamentos/${idMedicamento}/foto`, {
    method: 'POST',
    body: datos
  })
}

export const eliminarFotoMedicamento = (idMedicamento) => apiRequest(
  `/api/medicamentos/${idMedicamento}/foto`,
  { method: 'DELETE' }
)
