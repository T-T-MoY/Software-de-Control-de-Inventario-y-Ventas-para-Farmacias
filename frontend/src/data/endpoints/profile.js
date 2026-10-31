import { apiRequest } from '../api'

export const obtenerPerfil = () => apiRequest('/api/perfil')

export const cambiarContrasena = (datos) => apiRequest('/api/perfil/contrasena', {
  method: 'PATCH',
  body: JSON.stringify(datos)
})
