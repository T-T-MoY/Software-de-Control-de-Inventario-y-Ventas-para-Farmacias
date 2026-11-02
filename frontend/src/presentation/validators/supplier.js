
/**
 * Validaciones del formulario de proveedores.
 * Replica las reglas del backend.
 */

import {
  REGEX_CI,
  REGEX_CORREO,
  limpiarCorreo
} from './fields'

export const CAMPOS_PROVEEDOR = [
  'nombre_comercial',
  'ruc_nit',
  'telefono',
  'correo_electronico',
  'direccion'
]

const REGEX_NOMBRE_COMERCIAL =
  /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9&' .(),/-]+$/

const REGEX_TELEFONO = /^[0-9+()\s-]{7,20}$/

/**
 * Limpia los valores mientras el usuario escribe.
 */
export function limpiarCampoProveedor(campo, valor) {
  const texto = String(valor ?? '')

  switch (campo) {
    case 'nombre_comercial':
      return texto
        .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9&' .(),/-]/g, '')
        .replace(/\s{2,}/g, ' ')
        .slice(0, 100)

    case 'ruc_nit':
      return texto
        .replace(/[^0-9A-Za-z-]/g, '')
        .slice(0, 20)

    case 'telefono':
      return texto
        .replace(/[^0-9+()\s-]/g, '')
        .slice(0, 20)

    case 'correo_electronico':
      return limpiarCorreo(texto)

    case 'direccion':
      return texto.slice(0, 150)

    default:
      return valor
  }
}

/**
 * Valida individualmente los campos.
 * Devuelve una cadena vacía cuando el campo es válido.
 */
export function validarCampoProveedor(campo, valor) {
  const texto = String(valor ?? '').trim()

  switch (campo) {
    case 'nombre_comercial':
      if (!texto) return 'El nombre comercial es obligatorio.'
      if (texto.length > 100) {
        return 'El nombre comercial no puede superar 100 caracteres.'
      }
      if (!REGEX_NOMBRE_COMERCIAL.test(texto)) {
        return 'El nombre comercial contiene caracteres no permitidos.'
      }
      return ''

    case 'ruc_nit':
      if (!texto) return 'El RUC/NIT es obligatorio.'
      if (!REGEX_CI.test(texto)) {
        return 'El RUC/NIT debe tener entre 5 y 20 caracteres: solo números, letras y guion.'
      }
      return ''

    case 'telefono':
      if (texto.length > 20) {
        return 'El teléfono no puede superar 20 caracteres.'
      }
      if (texto && !REGEX_TELEFONO.test(texto)) {
        return 'Ingresa un teléfono válido.'
      }
      return ''

    case 'correo_electronico':
      if (texto.length > 120) {
        return 'El correo no puede superar 120 caracteres.'
      }
      if (texto && !REGEX_CORREO.test(texto)) {
        return 'Ingresa un correo electrónico válido.'
      }
      return ''

    case 'direccion':
      if (texto.length > 150) {
        return 'La dirección no puede superar 150 caracteres.'
      }
      return ''

    default:
      return ''
  }
}

/**
 * Valida todos los campos del formulario.
 */
export function validarFormularioProveedor(form) {
  return CAMPOS_PROVEEDOR.reduce((errores, campo) => {
    errores[campo] = validarCampoProveedor(
      campo,
      form[campo]
    )

    return errores
  }, {})
}
