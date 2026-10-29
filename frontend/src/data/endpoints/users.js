import { apiRequest } from '../api'

export const listarUsuarios = () => apiRequest('/api/usuarios')

export const listarRoles = () => apiRequest('/api/usuarios/roles')

export const crearUsuario = (datos) => apiRequest('/api/usuarios', {
  method: 'POST',
  body: JSON.stringify(datos)
})

export const actualizarUsuario = (idUsuario, datos) => apiRequest(`/api/usuarios/${idUsuario}`, {
  method: 'PUT',
  body: JSON.stringify(datos)
})

export const cambiarEstadoUsuario = (idUsuario, activo) => apiRequest(
  `/api/usuarios/${idUsuario}/estado`,
  {
    method: 'PATCH',
    body: JSON.stringify({ activo })
  }
)

export const obtenerImpactoUsuario = (idUsuario) => apiRequest(
  `/api/usuarios/${idUsuario}/impacto`
)

export const eliminarUsuarioLogico = (idUsuario) => apiRequest(
  `/api/usuarios/${idUsuario}`,
  { method: 'DELETE' }
)
