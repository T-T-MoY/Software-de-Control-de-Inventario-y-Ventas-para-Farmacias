import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import * as fields from '../src/presentation/validators/fields'

const {
  LONGITUD_MAXIMA_CORREO,
  LONGITUD_MAXIMA_CONTRASENA,
  FECHA_MINIMA,
  REGEX_CORREO,
  REGEX_NOMBRE,
  REGEX_CI,
  limpiarCorreo,
  limpiarNombre,
  limpiarCi,
  limpiarContrasena,
  fechaHoyISO,
  validarCorreo,
  validarNombre,
  validarCi,
  validarContrasena,
  validarRol,
  validarFechaNacimiento,
  validarConfirmacion,
} = fields

describe('validadores compartidos del frontend', () => {
  test('expone las constantes y expresiones del contrato', () => {
    expect(LONGITUD_MAXIMA_CORREO).toBe(120)
    expect(LONGITUD_MAXIMA_CONTRASENA).toBe(72)
    expect(FECHA_MINIMA).toBe('1900-01-01')
    expect(REGEX_CORREO.test('ana@farmacia.test')).toBe(true)
    expect(REGEX_NOMBRE.test('Ana Pérez')).toBe(true)
    expect(REGEX_CI.test('123456')).toBe(true)
  })

  describe('limpiadores', () => {
    test('limpiarCorreo quita espacios y recorta a 120', () => {
      expect(limpiarCorreo(' ana@test.com ')).toBe('ana@test.com')
      expect(limpiarCorreo(null)).toBe('')
      expect(limpiarCorreo(`${'a'.repeat(130)}@test.com`))
        .toHaveLength(LONGITUD_MAXIMA_CORREO)
    })

    test('limpiarNombre conserva letras y colapsa espacios', () => {
      expect(limpiarNombre('  María   José <x>  ')).toBe(' María José x ')
      expect(limpiarNombre(null)).toBe('')
      expect(limpiarNombre('a'.repeat(30), 10)).toHaveLength(10)
    })

    test('limpiarCi conserva solo letras, números y guion', () => {
      expect(limpiarCi(' 123-456 A ')).toBe('123-456A')
      expect(limpiarCi(null)).toBe('')
      expect(limpiarCi('1'.repeat(30), 20)).toHaveLength(20)
    })

    test('limpiarContrasena quita acentos, espacios y emojis', () => {
      expect(limpiarContrasena(' Clavé123! ')).toBe('Clav123!')
      expect(limpiarContrasena('Clave123!')).toBe('Clave123!')
      expect(limpiarContrasena('a'.repeat(80))).toHaveLength(72)
      expect(limpiarContrasena('a'.repeat(80), Infinity)).toHaveLength(80)
      expect(limpiarContrasena(null)).toBe('')
    })

    test('fechaHoyISO devuelve la fecha local en formato ISO', () => {
      expect(fechaHoyISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('validarCorreo', () => {
    test('exige el correo por defecto', () => {
      expect(validarCorreo('')).toBe('El correo es obligatorio.')
      expect(validarCorreo(undefined)).toBe('El correo es obligatorio.')
    })

    test('permite vacío cuando no es requerido', () => {
      expect(validarCorreo('', { requerido: false })).toBe('')
    })

    test('limita la longitud', () => {
      expect(validarCorreo(`${'a'.repeat(112)}@test.com`))
        .toBe('El correo no puede superar 120 caracteres.')
    })

    test('rechaza espacios y formatos inválidos', () => {
      expect(validarCorreo('ana perez@test.com'))
        .toBe('El correo no puede contener espacios.')
      expect(validarCorreo('ana@test'))
        .toBe('Ingresa un correo válido (ejemplo: nombre@correo.com).')
    })

    test('acepta un correo válido con espacios externos', () => {
      expect(validarCorreo('  ana@farmacia.test  ')).toBe('')
    })
  })

  describe('validarNombre', () => {
    test('usa la etiqueta y obligatoriedad configurables', () => {
      expect(validarNombre('', { etiqueta: 'El apellido' }))
        .toBe('El apellido es obligatorio.')
      expect(validarNombre('', { requerido: false })).toBe('')
    })

    test('limita la longitud máxima', () => {
      expect(validarNombre('a'.repeat(11), { max: 10 }))
        .toBe('El nombre no puede superar 10 caracteres.')
    })

    test('rechaza caracteres no permitidos', () => {
      expect(validarNombre('Ana <x>'))
        .toBe('El nombre solo admite letras, espacios, apóstrofes, puntos y guiones.')
    })

    test('acepta nombres válidos', () => {
      expect(validarNombre("María José O'Neil-Díaz")).toBe('')
    })
  })

  describe('validarCi', () => {
    test('exige el CI por defecto y permite vacío opcional', () => {
      expect(validarCi('')).toBe('El CI/NIT es obligatorio.')
      expect(validarCi('', { requerido: false })).toBe('')
    })

    test('rechaza formatos inválidos', () => {
      expect(validarCi('1234'))
        .toBe('El CI/NIT debe tener entre 5 y 20 caracteres: solo números, letras y guion.')
    })

    test('acepta un CI válido', () => {
      expect(validarCi(' 123456-7A ')).toBe('')
    })
  })

  describe('validarContrasena', () => {
    test('exige la contraseña por defecto y permite vacío opcional', () => {
      expect(validarContrasena('')).toBe('La contraseña es obligatoria.')
      expect(validarContrasena('', { requerido: false })).toBe('')
    })

    test('respeta el mínimo y el máximo', () => {
      expect(validarContrasena('Ab1', { min: 6 }))
        .toBe('La contraseña debe tener al menos 6 caracteres.')
      expect(validarContrasena('a'.repeat(73)))
        .toBe('La contraseña no puede superar 72 caracteres.')
    })

    test('rechaza espacios', () => {
      expect(validarContrasena('Clave 123'))
        .toBe('La contraseña no puede contener espacios.')
    })

    test('rechaza acentos y emojis', () => {
      expect(validarContrasena('Clavé123'))
        .toBe('La contraseña solo admite letras, números y símbolos como ! @ # $ % & * (sin acentos ni emojis).')
    })

    test('exige letra y número cuando se pide fuerza', () => {
      expect(validarContrasena('123456'))
        .toBe('La contraseña debe incluir al menos una letra.')
      expect(validarContrasena('abcdef'))
        .toBe('La contraseña debe incluir al menos un número.')
    })

    test('permite omitir la fuerza', () => {
      expect(validarContrasena('abcdef', { exigirFuerza: false })).toBe('')
      expect(validarContrasena('123456', { exigirFuerza: false })).toBe('')
    })

    test('acepta una contraseña válida', () => {
      expect(validarContrasena('Clave123!@#')).toBe('')
    })
  })

  describe('validarRol', () => {
    test.each(['', null, undefined])('exige un rol (%p)', (valor) => {
      expect(validarRol(valor)).toBe('Selecciona un rol.')
    })

    test.each([0, -1, 'abc', 1.5])('rechaza el rol %p', (valor) => {
      expect(validarRol(valor)).toBe('Selecciona un rol válido.')
    })

    test('acepta un identificador de rol válido', () => {
      expect(validarRol(2)).toBe('')
      expect(validarRol('2')).toBe('')
    })
  })

  describe('validarFechaNacimiento', () => {
    test('exige la fecha por defecto y permite vacío opcional', () => {
      expect(validarFechaNacimiento(''))
        .toBe('La fecha de nacimiento es obligatoria.')
      expect(validarFechaNacimiento('', { requerido: false })).toBe('')
    })

    test('rechaza formatos distintos de AAAA-MM-DD', () => {
      expect(validarFechaNacimiento('01/01/2000'))
        .toBe('Ingresa una fecha de nacimiento válida.')
    })

    test('rechaza fechas inexistentes', () => {
      expect(validarFechaNacimiento('2026-02-31'))
        .toBe('La fecha de nacimiento no existe en el calendario.')
    })

    test('rechaza fechas futuras', () => {
      expect(validarFechaNacimiento('2999-01-01'))
        .toBe('La fecha de nacimiento no puede ser futura.')
    })

    test('rechaza fechas anteriores a 1900', () => {
      expect(validarFechaNacimiento('1899-12-31'))
        .toBe('La fecha de nacimiento debe ser posterior a 1900-01-01.')
    })

    test('acepta una fecha real pasada', () => {
      expect(validarFechaNacimiento('2000-02-29')).toBe('')
    })
  })

  describe('validarConfirmacion', () => {
    test('permite vacío cuando no es requerida', () => {
      expect(validarConfirmacion('', 'Clave123', { requerido: false })).toBe('')
    })

    test('exige la confirmación', () => {
      expect(validarConfirmacion('', 'Clave123'))
        .toBe('Confirma la contraseña.')
      expect(validarConfirmacion(null, 'Clave123'))
        .toBe('Confirma la contraseña.')
    })

    test('rechaza contraseñas distintas', () => {
      expect(validarConfirmacion('Otra123', 'Clave123'))
        .toBe('Las contraseñas no coinciden.')
    })

    test('acepta contraseñas iguales', () => {
      expect(validarConfirmacion('Clave123', 'Clave123')).toBe('')
      expect(validarConfirmacion(123, '123')).toBe('')
    })
  })
})
