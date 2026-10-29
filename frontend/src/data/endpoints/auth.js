import { apiRequest } from '../api'

/** Inicio de sesión: devuelve { success, token, usuario }. */
export function iniciarSesion({ email, password }) {
  return apiRequest('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
}
