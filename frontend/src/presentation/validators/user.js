/**
 * Validación del formulario de usuarios (capa de presentación).
 * Mantiene la vista enfocada en la interacción y no en las reglas.
 */
import {
  limpiarCiNit,
  limpiarContrasena,
  limpiarCorreo,
  limpiarNombre,
  validarCiNit,
  validarContrasena,
  validarCorreo,
  validarFechaNacimiento,
  validarNombre,
  validarRol
} from './fields'

export const CAMPOS_USUARIO = [
  'nombres',
  'apellido_paterno',
  'apellido_materno',
  'fecha_nacimiento',
  'correo',
  'ci_nit',
  'id_rol',
  'contrasena'
]

export function validarCampoUsuario(campo, valor, { editando = false } = {}) {
  switch (campo) {
    case 'nombres':
      return validarNombre(valor, { etiqueta: 'El nombre', max: 80 })
    case 'apellido_paterno':
      return validarNombre(valor, { etiqueta: 'El apellido paterno', max: 60 })
    case 'apellido_materno':
      return validarNombre(valor, {
        etiqueta: 'El apellido materno',
        requerido: false,
        max: 60
      })
    case 'fecha_nacimiento':
      return validarFechaNacimiento(valor)
    case 'correo':
      return validarCorreo(valor)
    case 'ci_nit':
      return validarCiNit(valor)
    case 'id_rol':
      return validarRol(valor)
    case 'contrasena':
      return validarContrasena(valor, {
        requerido: !editando,
        min: 8,
        exigirFuerza: true
      })
    default:
      return ''
  }
}

export function validarFormularioUsuario(form, opciones = {}) {
  return Object.fromEntries(
    CAMPOS_USUARIO.map((campo) => [
      campo,
      validarCampoUsuario(campo, form[campo], opciones)
    ])
  )
}

export function limpiarCampoUsuario(campo, valor) {
  switch (campo) {
    case 'nombres':
      return limpiarNombre(valor, 80)
    case 'apellido_paterno':
      return limpiarNombre(valor, 60)
    case 'apellido_materno':
      return limpiarNombre(valor, 60)
    case 'correo':
      return limpiarCorreo(valor)
    case 'ci_nit':
      return limpiarCiNit(valor)
    case 'contrasena':
      return limpiarContrasena(valor, 72)
    default:
      return valor
  }
}
