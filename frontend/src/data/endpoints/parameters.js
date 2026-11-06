
import { apiRequest } from '../api'

// Parámetros generales del sistema (cualquier rol con consultar_catalogo).
export const obtenerParametros = () => apiRequest('/api/parametros')

// Edición de parámetros (solo Administrador).
export const actualizarParametros = (datos) => (
  apiRequest('/api/parametros', {
    method: 'PUT',
    body: JSON.stringify(datos)
  })
)
