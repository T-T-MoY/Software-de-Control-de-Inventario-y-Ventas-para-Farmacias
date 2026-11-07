import { describe, expect, test } from 'vitest'
import {
  CAMPOS_USUARIO,
  validarCampoUsuario,
  validarFormularioUsuario,
  limpiarCampoUsuario,
} from '../src/presentation/validators/user'

const usuarioValido = () => ({
  nombres: 'Ana',
  apellido_paterno: 'Pérez',
  apellido_materno: 'Gómez',
  fecha_nacimiento: '1990-01-01',
  correo: 'ana@farmacia.test',
  ci: '123456',
  id_rol: 2,
  contrasena: 'Clave123',
})

describe('validador de usuarios del frontend', () => {
  test('expone los campos del formulario', () => {
    expect(CAMPOS_USUARIO).toEqual([
      'nombres',
      'apellido_paterno',
      'apellido_materno',
      'fecha_nacimiento',
      'correo',
      'ci',
      'id_rol',
      'contrasena',
    ])
  })

  describe('validarCampoUsuario', () => {
    test('acepta un usuario válido', () => {
      expect(validarCampoUsuario('nombres', 'Ana')).toBe('')
      expect(validarCampoUsuario('apellido_paterno', 'Pérez')).toBe('')
      expect(validarCampoUsuario('apellido_materno', 'Gómez')).toBe('')
      expect(validarCampoUsuario('fecha_nacimiento', '1990-01-01')).toBe('')
      expect(validarCampoUsuario('correo', 'ana@farmacia.test')).toBe('')
      expect(validarCampoUsuario('ci', '123456')).toBe('')
      expect(validarCampoUsuario('id_rol', 2)).toBe('')
      expect(validarCampoUsuario('contrasena', 'Clave123')).toBe('')
    })

    test('valida nombres y apellidos con sus etiquetas y límites', () => {
      expect(validarCampoUsuario('nombres', ''))
        .toBe('El nombre es obligatorio.')
      expect(validarCampoUsuario('nombres', 'a'.repeat(81)))
        .toBe('El nombre no puede superar 80 caracteres.')
      expect(validarCampoUsuario('apellido_paterno', ''))
        .toBe('El apellido paterno es obligatorio.')
      expect(validarCampoUsuario('apellido_paterno', 'a'.repeat(61)))
        .toBe('El apellido paterno no puede superar 60 caracteres.')
      expect(validarCampoUsuario('apellido_materno', ''))
        .toBe('')
      expect(validarCampoUsuario('apellido_materno', 'a'.repeat(61)))
        .toBe('El apellido materno no puede superar 60 caracteres.')
    })

    test('delega en los validadores de fecha, correo, CI y rol', () => {
      expect(validarCampoUsuario('fecha_nacimiento', '2026-02-31'))
        .toBe('La fecha de nacimiento no existe en el calendario.')
      expect(validarCampoUsuario('correo', 'ana@test'))
        .toBe('Ingresa un correo válido (ejemplo: nombre@correo.com).')
      expect(validarCampoUsuario('ci', '12'))
        .toBe('El CI/NIT debe tener entre 5 y 20 caracteres: solo números, letras y guion.')
      expect(validarCampoUsuario('id_rol', 0))
        .toBe('Selecciona un rol válido.')
    })

    test('exige la contraseña al crear y la permite vacía al editar', () => {
      expect(validarCampoUsuario('contrasena', ''))
        .toBe('La contraseña es obligatoria.')
      expect(validarCampoUsuario('contrasena', '', { editando: true }))
        .toBe('')
    })

    test('valida la fuerza de la contraseña', () => {
      expect(validarCampoUsuario('contrasena', 'abcdef'))
        .toBe('La contraseña debe incluir al menos un número.')
      expect(validarCampoUsuario('contrasena', '123456'))
        .toBe('La contraseña debe incluir al menos una letra.')
    })

    test('un campo desconocido es válido', () => {
      expect(validarCampoUsuario('otro', 'x')).toBe('')
    })
  })

  test('validarFormularioUsuario devuelve el estado de cada campo', () => {
    expect(validarFormularioUsuario(usuarioValido())).toEqual({
      nombres: '',
      apellido_paterno: '',
      apellido_materno: '',
      fecha_nacimiento: '',
      correo: '',
      ci: '',
      id_rol: '',
      contrasena: '',
    })

    const errores = validarFormularioUsuario({}, { editando: true })

    expect(errores.nombres).toBe('El nombre es obligatorio.')
    expect(errores.contrasena).toBe('')
  })

  describe('limpiarCampoUsuario', () => {
    test.each([
      ['nombres', '  Ana <x>  ', ' Ana x '],
      ['apellido_paterno', '  Pérez <x> ', ' Pérez x '],
      ['apellido_materno', '  Gómez <x> ', ' Gómez x '],
      ['correo', ' ana @test.com ', 'ana@test.com'],
      ['ci', ' 123-456 A ', '123-456A'],
      ['contrasena', ' Clavé123! ', 'Clav123!'],
      ['otro', 'valor', 'valor'],
    ])('limpia %s', (campo, entrada, esperado) => {
      expect(limpiarCampoUsuario(campo, entrada)).toBe(esperado)
    })

    test('limita las longitudes de nombres y contraseña', () => {
      expect(limpiarCampoUsuario('nombres', 'a'.repeat(100)))
        .toHaveLength(80)
      expect(limpiarCampoUsuario('apellido_paterno', 'a'.repeat(100)))
        .toHaveLength(60)
      expect(limpiarCampoUsuario('apellido_materno', 'a'.repeat(100)))
        .toHaveLength(60)
      expect(limpiarCampoUsuario('contrasena', 'a'.repeat(100)))
        .toHaveLength(72)
    })

    test('trata null como cadena vacía', () => {
      expect(limpiarCampoUsuario('nombres', null)).toBe('')
      expect(limpiarCampoUsuario('correo', null)).toBe('')
      expect(limpiarCampoUsuario('ci', null)).toBe('')
      expect(limpiarCampoUsuario('contrasena', null)).toBe('')
    })
  })
})
