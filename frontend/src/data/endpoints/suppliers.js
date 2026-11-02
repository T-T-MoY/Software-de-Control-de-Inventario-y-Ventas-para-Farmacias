
import { apiRequest } from '../api'

/**
 * Gestión de proveedores.
 * Centraliza las peticiones HTTP hacia el backend.
 */

// Listar y buscar proveedores.
export function listarProveedores({ buscar } = {}) {
  const params = new URLSearchParams()

  if (buscar) {
    params.set('buscar', buscar)
  }

  const query = params.toString()

  return apiRequest(
    `/api/proveedores${query ? `?${query}` : ''}`
  )
}

// Obtener un proveedor por ID.
export const obtenerProveedor = (idProveedor) => (
  apiRequest(`/api/proveedores/${idProveedor}`)
)

// Registrar proveedor.
export const crearProveedor = (datos) => (
  apiRequest('/api/proveedores', {
    method: 'POST',
    body: JSON.stringify(datos)
  })
)

// Actualizar proveedor.
export const actualizarProveedor = (idProveedor, datos) => (
  apiRequest(`/api/proveedores/${idProveedor}`, {
    method: 'PUT',
    body: JSON.stringify(datos)
  })
)
