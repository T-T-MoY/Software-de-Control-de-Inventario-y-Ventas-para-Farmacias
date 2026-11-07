import { describe, expect, test } from 'vitest'
import {
  CAMPOS_PROVEEDOR,
  limpiarCampoProveedor,
  validarCampoProveedor,
  validarFormularioProveedor,
} from '../src/presentation/validators/supplier'

describe('validador de proveedores del frontend', () => {
  test('expone los campos del formulario', () => {
    expect(CAMPOS_PROVEEDOR).toEqual([
      'nombre_comercial',
      'ruc_nit',
      'telefono',
      'correo_electronico',
      'direccion',
    ])
  })

  describe('limpiarCampoProveedor', () => {
    test.each([
      ['nombre_comercial', '  Andina   S.A. <x>  ', ' Andina S.A. x '],
      ['ruc_nit', ' 123-456 A ', '123-456A'],
      ['telefono', ' +591 (2) 222-3333 abc ', ' +591 (2) 222-3333  '],
      ['correo_electronico', ' ana @test.com ', 'ana@test.com'],
      ['direccion', ' Calle 1 ', ' Calle 1 '],
    ])('limpia %s', (campo, entrada, esperado) => {
      expect(limpiarCampoProveedor(campo, entrada)).toBe(esperado)
    })

    test('limita las longitudes', () => {
      expect(limpiarCampoProveedor('nombre_comercial', 'a'.repeat(120)))
        .toHaveLength(100)
      expect(limpiarCampoProveedor('ruc_nit', '1'.repeat(30)))
        .toHaveLength(20)
      expect(limpiarCampoProveedor('telefono', '1'.repeat(30)))
        .toHaveLength(20)
      expect(limpiarCampoProveedor('direccion', 'a'.repeat(200)))
        .toHaveLength(150)
    })

    test('trata null y undefined como cadena vacía', () => {
      expect(limpiarCampoProveedor('nombre_comercial', null)).toBe('')
      expect(limpiarCampoProveedor('ruc_nit', undefined)).toBe('')
      expect(limpiarCampoProveedor('telefono', null)).toBe('')
      expect(limpiarCampoProveedor('correo_electronico', null)).toBe('')
      expect(limpiarCampoProveedor('direccion', null)).toBe('')
    })

    test('un campo desconocido se devuelve sin cambios', () => {
      expect(limpiarCampoProveedor('otro', 'valor')).toBe('valor')
    })
  })

  describe('validarCampoProveedor', () => {
    test('acepta un proveedor completo', () => {
      expect(validarFormularioProveedor({
        nombre_comercial: 'Distribuidora Andina S.A.',
        ruc_nit: '123456789',
        telefono: '70000000',
        correo_electronico: 'ventas@andina.test',
        direccion: 'Calle 1 #123',
      })).toEqual({
        nombre_comercial: '',
        ruc_nit: '',
        telefono: '',
        correo_electronico: '',
        direccion: '',
      })
    })

    test('acepta los campos opcionales vacíos', () => {
      expect(validarCampoProveedor('telefono', '')).toBe('')
      expect(validarCampoProveedor('correo_electronico', '')).toBe('')
      expect(validarCampoProveedor('direccion', '')).toBe('')
    })

    test('valida el nombre comercial', () => {
      expect(validarCampoProveedor('nombre_comercial', ''))
        .toBe('El nombre comercial es obligatorio.')
      expect(validarCampoProveedor('nombre_comercial', 'a'.repeat(101)))
        .toBe('El nombre comercial no puede superar 100 caracteres.')
      expect(validarCampoProveedor('nombre_comercial', 'Andina <S.A.>'))
        .toBe('El nombre comercial contiene caracteres no permitidos.')
    })

    test('valida el RUC/NIT', () => {
      expect(validarCampoProveedor('ruc_nit', ''))
        .toBe('El RUC/NIT es obligatorio.')
      expect(validarCampoProveedor('ruc_nit', '1234'))
        .toBe('El RUC/NIT debe tener entre 5 y 20 caracteres: solo números, letras y guion.')
      expect(validarCampoProveedor('ruc_nit', '123456789')).toBe('')
    })

    test('valida el teléfono', () => {
      expect(validarCampoProveedor('telefono', '1'.repeat(21)))
        .toBe('El teléfono no puede superar 20 caracteres.')
      expect(validarCampoProveedor('telefono', 'abc'))
        .toBe('Ingresa un teléfono válido.')
      expect(validarCampoProveedor('telefono', '+591 222-3333')).toBe('')
    })

    test('valida el correo', () => {
      expect(validarCampoProveedor('correo_electronico', `${'a'.repeat(112)}@test.com`))
        .toBe('El correo no puede superar 120 caracteres.')
      expect(validarCampoProveedor('correo_electronico', 'correo-invalido'))
        .toBe('Ingresa un correo electrónico válido.')
      expect(validarCampoProveedor('correo_electronico', 'ana@test.com')).toBe('')
    })

    test('valida la dirección', () => {
      expect(validarCampoProveedor('direccion', 'a'.repeat(151)))
        .toBe('La dirección no puede superar 150 caracteres.')
      expect(validarCampoProveedor('direccion', 'Calle 1')).toBe('')
    })

    test('un campo desconocido es válido', () => {
      expect(validarCampoProveedor('otro', 'x')).toBe('')
    })
  })
})
