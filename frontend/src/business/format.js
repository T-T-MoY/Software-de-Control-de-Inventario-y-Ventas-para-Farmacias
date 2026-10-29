/**
 * Formato de datos para la interfaz (capa de negocio del frontend).
 * Funciones puras, sin acceso a red ni a localStorage.
 */

export function nombreCompleto(usuario) {
  return [
    usuario?.nombres,
    usuario?.apellido_paterno,
    usuario?.apellido_materno
  ].filter(Boolean).join(' ')
}

export function iniciales(usuario) {
  const partes = [usuario?.nombres, usuario?.apellido_paterno].filter(Boolean)
  return partes.map((parte) => parte[0]).join('').toUpperCase() || 'U'
}

export function inicialesDeNombre(nombre) {
  const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean)
  if (!partes.length) return 'U'
  return partes.slice(0, 2).map((parte) => parte[0]).join('').toUpperCase()
}

export function formatearFecha(valor, conHora = false) {
  if (!valor) return 'No registrada'

  const texto = String(valor)
  const fecha = new Date(/^\d{4}-\d{2}-\d{2}$/.test(texto) ? `${texto}T00:00:00` : texto)
  if (Number.isNaN(fecha.getTime())) return texto

  const opciones = { day: '2-digit', month: 'long', year: 'numeric' }
  if (conHora) {
    opciones.hour = '2-digit'
    opciones.minute = '2-digit'
  }

  return new Intl.DateTimeFormat('es-BO', opciones).format(fecha)
}
