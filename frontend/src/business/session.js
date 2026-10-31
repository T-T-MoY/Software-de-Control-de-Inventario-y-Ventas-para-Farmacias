/**
 * Sesión del cliente (capa de negocio del frontend).
 *
 * Centraliza el acceso a localStorage para que las vistas no conozcan
 * las claves ni el formato de los datos guardados.
 */
const CLAVES = {
  token: 'tokenSession',
  id: 'idUsuario',
  nombre: 'nombreUsuario',
  nombrePila: 'nombrePila',
  rol: 'rolUsuario',
  correo: 'correoUsuario',
  ciNit: 'ciUsuario',
  apellidoPaterno: 'apellidoPaterno',
  apellidoMaterno: 'apellidoMaterno'
}

export function guardarSesion(token, usuario) {
  localStorage.setItem(CLAVES.token, token)
  localStorage.setItem(CLAVES.id, String(usuario.id_usuario))
  localStorage.setItem(CLAVES.nombre, usuario.nombre_completo || '')
  localStorage.setItem(CLAVES.nombrePila, usuario.nombres || '')
  localStorage.setItem(CLAVES.rol, usuario.rol || '')
  localStorage.setItem(CLAVES.correo, usuario.correo || '')
  localStorage.setItem(CLAVES.ciNit, usuario.ci || '')
  localStorage.setItem(CLAVES.apellidoPaterno, usuario.apellido_paterno || '')
  localStorage.setItem(CLAVES.apellidoMaterno, usuario.apellido_materno || '')
}

export function obtenerSesion() {
  const id = Number(localStorage.getItem(CLAVES.id))

  return {
    token: localStorage.getItem(CLAVES.token),
    idUsuario: Number.isInteger(id) && id > 0 ? id : null,
    nombre: localStorage.getItem(CLAVES.nombre) || '',
    nombrePila: localStorage.getItem(CLAVES.nombrePila) || '',
    rol: localStorage.getItem(CLAVES.rol) || '',
    correo: localStorage.getItem(CLAVES.correo) || '',
    ciNit: localStorage.getItem(CLAVES.ciNit) || '',
    apellidoPaterno: localStorage.getItem(CLAVES.apellidoPaterno) || '',
    apellidoMaterno: localStorage.getItem(CLAVES.apellidoMaterno) || ''
  }
}

export function estaAutenticado() {
  return Boolean(localStorage.getItem(CLAVES.token))
}

export function esAdministrador() {
  return localStorage.getItem(CLAVES.rol) === 'Administrador'
}

/**
 * Refleja el permiso `gestionar_catalogo` de la matriz de roles.
 * El backend vuelve a comprobarlo en cada ruta; esto solo oculta
 * acciones que el usuario no podría completar.
 */
export function puedeGestionarCatalogo() {
  return ['Administrador', 'Encargado de inventario']
    .includes(localStorage.getItem(CLAVES.rol))
}

/** Borra solo los datos de sesión; el tema visual se conserva. */
export function cerrarSesion() {
  Object.values(CLAVES).forEach((clave) => localStorage.removeItem(clave))
}
