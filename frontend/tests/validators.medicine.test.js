import { describe, expect, test } from 'vitest'
import {
  FORMAS_FARMACEUTICAS,
  TIPOS_VENTA,
  CAMPOS_MEDICAMENTO,
  limpiarCampoMedicamento,
  validarCampoMedicamento,
  validarFormularioMedicamento,
} from '../src/presentation/validators/medicine'

const medicamentoValido = () => ({
  codigo_barras: '7501000000011',
  nombre_comercial: 'Paracetamol 500 mg',
  dci: 'Acetaminofén',
  concentracion: '500 mg',
  forma_farmaceutica: 'Tableta',
  precio_unitario: '2.50',
  tipo_venta: 'Libre',
  stock_seguridad: '10',
  dias_reposicion: '5',
  id_categoria: 1,
})

describe('validador de medicamentos del frontend', () => {
  test('expone las opciones y campos del formulario', () => {
    expect(FORMAS_FARMACEUTICAS).toHaveLength(8)
    expect(TIPOS_VENTA).toEqual(['Libre', 'Con receta'])
    expect(CAMPOS_MEDICAMENTO).toHaveLength(10)
  })

  describe('limpiarCampoMedicamento', () => {
    test.each([
      ['codigo_barras', '750-ABC xyz', '750-ABCxyz'],
      ['nombre_comercial', 'Para<ce>tamol 500%', 'Paracetamol 500%'],
      ['dci', 'Aceta<min>ofén', 'Acetaminofén'],
      ['concentracion', '500 mg <oral>+', '500 mg oral+'],
      ['precio_unitario', '12,345.67', '12.34'],
      ['stock_seguridad', '1a2b3', '123'],
      ['dias_reposicion', 'x5y6', '56'],
      ['desconocido', 'valor', 'valor'],
    ])('limpia %s', (campo, entrada, esperado) => {
      expect(limpiarCampoMedicamento(campo, entrada)).toBe(esperado)
    })

    test('limpiarPrecio acepta coma decimal y varios puntos', () => {
      expect(limpiarCampoMedicamento('precio_unitario', '10,5')).toBe('10.5')
      expect(limpiarCampoMedicamento('precio_unitario', '10.5.7'))
        .toBe('10.57')
      expect(limpiarCampoMedicamento('precio_unitario', 'abc'))
        .toBe('0')
      expect(limpiarCampoMedicamento('precio_unitario', ''))
        .toBe('0')
      expect(limpiarCampoMedicamento('precio_unitario', null))
        .toBe('0')
    })

    test('limita las longitudes de cada campo', () => {
      expect(limpiarCampoMedicamento('codigo_barras', '1'.repeat(30)))
        .toHaveLength(20)
      expect(limpiarCampoMedicamento('nombre_comercial', 'a'.repeat(120)))
        .toHaveLength(100)
      expect(limpiarCampoMedicamento('dci', 'a'.repeat(120)))
        .toHaveLength(100)
      expect(limpiarCampoMedicamento('concentracion', 'a'.repeat(50)))
        .toHaveLength(40)
      expect(limpiarCampoMedicamento('stock_seguridad', '1'.repeat(10)))
        .toHaveLength(6)
      expect(limpiarCampoMedicamento('precio_unitario', '1'.repeat(15)))
        .toHaveLength(11)
    })

    test('trata null y undefined como cadena vacía', () => {
      expect(limpiarCampoMedicamento('codigo_barras', null)).toBe('')
      expect(limpiarCampoMedicamento('nombre_comercial', undefined)).toBe('')
      expect(limpiarCampoMedicamento('dci', null)).toBe('')
      expect(limpiarCampoMedicamento('concentracion', null)).toBe('')
      expect(limpiarCampoMedicamento('stock_seguridad', null)).toBe('')
      expect(limpiarCampoMedicamento('dias_reposicion', null)).toBe('')
    })
  })

  describe('validarCampoMedicamento', () => {
    test('acepta un medicamento válido', () => {
      CAMPOS_MEDICAMENTO.forEach((campo) => {
        expect(validarCampoMedicamento(campo, medicamentoValido()[campo]))
          .toBe('')
      })
    })

    test.each([undefined, null, '', '   '])(
      'exige el código de barras (%p)',
      (valor) => {
        expect(validarCampoMedicamento('codigo_barras', valor))
          .toBe('El código de barras es obligatorio.')
      }
    )

    test('rechaza el código de barras con formato inválido', () => {
      expect(validarCampoMedicamento('codigo_barras', 'abc'))
        .toBe('El código de barras debe tener entre 4 y 20 caracteres: solo números, letras y guion.')
    })

    test('valida el nombre comercial', () => {
      expect(validarCampoMedicamento('nombre_comercial', ''))
        .toBe('El nombre comercial es obligatorio.')
      expect(validarCampoMedicamento('nombre_comercial', 'a'.repeat(101)))
        .toBe('El nombre comercial no puede superar 100 caracteres.')
      expect(validarCampoMedicamento('nombre_comercial', 'Paracetamol <500>'))
        .toBe('El nombre comercial solo admite letras, números, espacios y los signos . \' - % ( ) /.')
    })

    test('valida el principio activo', () => {
      expect(validarCampoMedicamento('dci', ''))
        .toBe('El principio activo (DCI) es obligatorio.')
      expect(validarCampoMedicamento('dci', 'a'.repeat(101)))
        .toBe('El principio activo (DCI) no puede superar 100 caracteres.')
      expect(validarCampoMedicamento('dci', 'Acetaminofén <500>'))
        .toBe('El principio activo (DCI) solo admite letras, números, espacios y los signos . \' , - ( ) /.')
    })

    test('valida la concentración', () => {
      expect(validarCampoMedicamento('concentracion', ''))
        .toBe('La concentración es obligatoria.')
      expect(validarCampoMedicamento('concentracion', 'a'.repeat(41)))
        .toBe('La concentración no puede superar 40 caracteres.')
      expect(validarCampoMedicamento('concentracion', '500 <mg>'))
        .toBe('La concentración solo admite letras, números, espacios y los signos . , % + - ( ) /.')
    })

    test('valida forma farmacéutica y tipo de venta', () => {
      expect(validarCampoMedicamento('forma_farmaceutica', 'Tableta')).toBe('')
      expect(validarCampoMedicamento('forma_farmaceutica', 'Supositorio'))
        .toBe('Selecciona una forma farmacéutica válida.')
      expect(validarCampoMedicamento('tipo_venta', 'Libre')).toBe('')
      expect(validarCampoMedicamento('tipo_venta', 'Controlado'))
        .toBe('Selecciona un tipo de venta válido.')
    })

    test('valida el precio', () => {
      expect(validarCampoMedicamento('precio_unitario', ''))
        .toBe('El precio es obligatorio.')
      expect(validarCampoMedicamento('precio_unitario', '-1'))
        .toBe('Ingresa un precio válido, mayor o igual a 0 y con hasta 2 decimales.')
      expect(validarCampoMedicamento('precio_unitario', '1.234'))
        .toBe('Ingresa un precio válido, mayor o igual a 0 y con hasta 2 decimales.')
      expect(validarCampoMedicamento('precio_unitario', '0')).toBe('')
      expect(validarCampoMedicamento('precio_unitario', '12.5')).toBe('')
    })

    test('valida el stock de seguridad', () => {
      expect(validarCampoMedicamento('stock_seguridad', ''))
        .toBe('El stock de seguridad es obligatorio.')
      expect(validarCampoMedicamento('stock_seguridad', '1.5'))
        .toBe('El stock de seguridad debe ser un número entero mayor o igual a 0.')
      expect(validarCampoMedicamento('stock_seguridad', '0')).toBe('')
    })

    test('valida los días de reposición', () => {
      expect(validarCampoMedicamento('dias_reposicion', ''))
        .toBe('Los días de reposición son obligatorios.')
      expect(validarCampoMedicamento('dias_reposicion', '0'))
        .toBe('Los días de reposición deben ser un número entero mayor o igual a 1.')
      expect(validarCampoMedicamento('dias_reposicion', 'abc'))
        .toBe('Los días de reposición deben ser un número entero mayor o igual a 1.')
      expect(validarCampoMedicamento('dias_reposicion', '5')).toBe('')
    })

    test('valida la categoría', () => {
      expect(validarCampoMedicamento('id_categoria', ''))
        .toBe('Selecciona una categoría.')
      expect(validarCampoMedicamento('id_categoria', '0'))
        .toBe('Selecciona una categoría válida.')
      expect(validarCampoMedicamento('id_categoria', 'abc'))
        .toBe('Selecciona una categoría válida.')
      expect(validarCampoMedicamento('id_categoria', 1)).toBe('')
    })

    test('un campo desconocido es válido', () => {
      expect(validarCampoMedicamento('desconocido', 'x')).toBe('')
    })
  })

  test('validarFormularioMedicamento devuelve un error por campo', () => {
    expect(validarFormularioMedicamento(medicamentoValido())).toEqual({
      codigo_barras: '',
      nombre_comercial: '',
      dci: '',
      concentracion: '',
      forma_farmaceutica: '',
      precio_unitario: '',
      tipo_venta: '',
      stock_seguridad: '',
      dias_reposicion: '',
      id_categoria: '',
    })

    const errores = validarFormularioMedicamento({})

    expect(errores.codigo_barras).toBe('El código de barras es obligatorio.')
    expect(errores.nombre_comercial).toBe('El nombre comercial es obligatorio.')
    expect(errores.dci).toBe('El principio activo (DCI) es obligatorio.')
    expect(errores.concentracion).toBe('La concentración es obligatoria.')
    expect(errores.forma_farmaceutica)
      .toBe('Selecciona una forma farmacéutica válida.')
    expect(errores.precio_unitario).toBe('El precio es obligatorio.')
    expect(errores.tipo_venta).toBe('Selecciona un tipo de venta válido.')
    expect(errores.stock_seguridad).toBe('El stock de seguridad es obligatorio.')
    expect(errores.dias_reposicion).toBe('Los días de reposición son obligatorios.')
    expect(errores.id_categoria).toBe('Selecciona una categoría.')
  })
})
