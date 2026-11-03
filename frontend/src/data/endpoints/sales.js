import { apiRequest } from '../api'

export const listarCatalogoVenta = ({ buscar } = {}) => {
  const params = new URLSearchParams()
  if (buscar) params.set('buscar', buscar)
  const query = params.toString()
  return apiRequest(`/api/ventas/catalogo${query ? `?${query}` : ''}`)
}

export const crearVenta = (datos) => apiRequest('/api/ventas', {
  method: 'POST',
  body: JSON.stringify(datos)
})

export const listarClientes = ({ buscar } = {}) => {
  const params = new URLSearchParams()
  if (buscar) params.set('buscar', buscar)
  const query = params.toString()
  return apiRequest(`/api/clientes${query ? `?${query}` : ''}`)
}

export const crearCliente = (datos) => apiRequest('/api/clientes', {
  method: 'POST',
  body: JSON.stringify(datos)
})

export const actualizarCliente = (idCliente, datos) => apiRequest(
  `/api/clientes/${idCliente}`,
  {
    method: 'PUT',
    body: JSON.stringify(datos)
  }
)
