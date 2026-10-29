/**
 * Reglas de validación compartidas por los formularios del sistema.
 * El backend replica estas mismas reglas en
 * backend/presentation/validators/fields.js.
 *
 * Cada validador devuelve un mensaje de error (string) o '' si el valor es válido.
 */

export const LONGITUD_MAXIMA_CORREO = 120
export const LONGITUD_MAXIMA_CONTRASENA = 72
export const FECHA_MINIMA = '1900-01-01'

export const REGEX_CORREO = /^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z]{2,63})+$/
export const REGEX_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/
export const REGEX_CI_NIT = /^[0-9A-Za-z-]{5,20}$/

const CARACTER_CONTRASENA = /[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?~`]/
const CARACTER_CORREO = /[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~@-]/
const CARACTER_NOMBRE = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]/
const CARACTER_CI_NIT = /[0-9A-Za-z-]/

/** Quita espacios y caracteres no válidos de un correo mientras se escribe. */
export function limpiarCorreo(valor) {
  return Array.from(String(valor ?? ''))
    .filter((caracter) => CARACTER_CORREO.test(caracter))
    .join('')
    .slice(0, LONGITUD_MAXIMA_CORREO)
}

/** Solo permite letras, espacios, apóstrofes, puntos y guiones en nombres. */
export function limpiarNombre(valor, max = 80) {
  return Array.from(String(valor ?? ''))
    .filter((caracter) => CARACTER_NOMBRE.test(caracter))
    .join('')
    .replace(/\s{2,}/g, ' ')
    .slice(0, max)
}

/** Solo permite números, letras y guion en el CI/NIT. */
export function limpiarCiNit(valor, max = 20) {
  return Array.from(String(valor ?? ''))
    .filter((caracter) => CARACTER_CI_NIT.test(caracter))
    .join('')
    .slice(0, max)
}

/** Elimina espacios, acentos, emojis y símbolos no permitidos de la contraseña. */
export function limpiarContrasena(valor, max = LONGITUD_MAXIMA_CONTRASENA) {
  const limpio = Array.from(String(valor ?? ''))
    .filter((caracter) => CARACTER_CONTRASENA.test(caracter))
    .join('')
  return max === Infinity ? limpio : limpio.slice(0, max)
}

export function fechaHoyISO() {
  const hoy = new Date()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return `${hoy.getFullYear()}-${mes}-${dia}`
}

export function validarCorreo(valor, { requerido = true } = {}) {
  const correo = String(valor ?? '').trim()
  if (!correo) return requerido ? 'El correo es obligatorio.' : ''
  if (correo.length > LONGITUD_MAXIMA_CORREO) {
    return `El correo no puede superar ${LONGITUD_MAXIMA_CORREO} caracteres.`
  }
  if (/\s/.test(correo)) return 'El correo no puede contener espacios.'
  if (!REGEX_CORREO.test(correo)) return 'Ingresa un correo válido (ejemplo: nombre@correo.com).'
  return ''
}

export function validarNombre(
  valor,
  { etiqueta = 'El nombre', requerido = true, max = 80 } = {}
) {
  const nombre = String(valor ?? '').trim()
  if (!nombre) return requerido ? `${etiqueta} es obligatorio.` : ''
  if (nombre.length > max) return `${etiqueta} no puede superar ${max} caracteres.`
  if (!REGEX_NOMBRE.test(nombre)) {
    return `${etiqueta} solo admite letras, espacios, apóstrofes, puntos y guiones.`
  }
  return ''
}

export function validarCiNit(valor, { requerido = true } = {}) {
  const ciNit = String(valor ?? '').trim()
  if (!ciNit) return requerido ? 'El CI/NIT es obligatorio.' : ''
  if (!REGEX_CI_NIT.test(ciNit)) {
    return 'El CI/NIT debe tener entre 5 y 20 caracteres: solo números, letras y guion.'
  }
  return ''
}

export function validarContrasena(
  valor,
  { requerido = true, min = 8, max = LONGITUD_MAXIMA_CONTRASENA, exigirFuerza = true } = {}
) {
  const contrasena = String(valor ?? '')
  if (!contrasena) return requerido ? 'La contraseña es obligatoria.' : ''
  if (contrasena.length < min) return `La contraseña debe tener al menos ${min} caracteres.`
  if (contrasena.length > max) return `La contraseña no puede superar ${max} caracteres.`
  if (/\s/.test(contrasena)) return 'La contraseña no puede contener espacios.'
  if (limpiarContrasena(contrasena, Infinity) !== contrasena) {
    return 'La contraseña solo admite letras, números y símbolos como ! @ # $ % & * (sin acentos ni emojis).'
  }
  if (exigirFuerza && !/[A-Za-z]/.test(contrasena)) {
    return 'La contraseña debe incluir al menos una letra.'
  }
  if (exigirFuerza && !/\d/.test(contrasena)) {
    return 'La contraseña debe incluir al menos un número.'
  }
  return ''
}

export function validarRol(valor) {
  if (valor === '' || valor === null || valor === undefined) return 'Selecciona un rol.'
  if (!Number.isInteger(Number(valor)) || Number(valor) < 1) return 'Selecciona un rol válido.'
  return ''
}

export function validarFechaNacimiento(valor, { requerido = true } = {}) {
  const fechaTexto = String(valor ?? '').trim()
  if (!fechaTexto) return requerido ? 'La fecha de nacimiento es obligatoria.' : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaTexto)) return 'Ingresa una fecha de nacimiento válida.'

  const [anio, mes, dia] = fechaTexto.split('-').map(Number)
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  if (
    fecha.getUTCFullYear() !== anio
    || fecha.getUTCMonth() !== mes - 1
    || fecha.getUTCDate() !== dia
  ) {
    return 'La fecha de nacimiento no existe en el calendario.'
  }

  const hoy = new Date()
  const hoyUTC = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  if (fecha.getTime() > hoyUTC) return 'La fecha de nacimiento no puede ser futura.'
  if (anio < Number(FECHA_MINIMA.slice(0, 4))) {
    return `La fecha de nacimiento debe ser posterior a ${FECHA_MINIMA}.`
  }
  return ''
}

export function validarConfirmacion(confirmacion, contrasena, { requerido = true } = {}) {
  if (!String(confirmacion ?? '') && !requerido) return ''
  if (!String(confirmacion ?? '')) return 'Confirma la contraseña.'
  if (String(confirmacion) !== String(contrasena ?? '')) return 'Las contraseñas no coinciden.'
  return ''
}
