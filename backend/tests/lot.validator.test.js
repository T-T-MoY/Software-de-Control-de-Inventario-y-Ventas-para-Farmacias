const {
  esIdValido,
  validarDatosRecepcion,
} = require('../presentation/validators/lot.validator');

const recepcionValida = () => ({
  id_medicamento: 4,
  id_proveedor: 2,
  lote_numero: 'L-2026-10',
  fecha_vencimiento: '2026-12-31',
  costo_unitario: '12.50',
  cantidad_stock: '100',
});

describe('validador de lotes', () => {
  describe('esIdValido', () => {
    test.each([1, '1', ' 25 ', 2147483647])('acepta %p', (valor) => {
      expect(esIdValido(valor)).toBe(true);
    });

    test.each([0, -1, '0', '-1', 1.5, '1.5', 'abc', '', null, undefined, 2147483648])(
      'rechaza %p',
      (valor) => {
        expect(esIdValido(valor)).toBe(false);
      }
    );
  });

  describe('validarDatosRecepcion', () => {
    test.each([null, undefined, 'texto', []])(
      'rechaza un cuerpo inválido (%p)',
      (body) => {
        expect(validarDatosRecepcion(body))
          .toBe('Los datos de la recepción son obligatorios.');
      }
    );

    test('rechaza un medicamento inválido', () => {
      expect(validarDatosRecepcion({
        ...recepcionValida(),
        id_medicamento: 0,
      })).toBe('Selecciona un medicamento válido.');
    });

    test('rechaza un proveedor inválido', () => {
      expect(validarDatosRecepcion({
        ...recepcionValida(),
        id_proveedor: 'abc',
      })).toBe('Selecciona un proveedor válido.');
    });

    test('exige el número de lote', () => {
      expect(validarDatosRecepcion({
        ...recepcionValida(),
        lote_numero: '   ',
      })).toBe('El número de lote es obligatorio.');
    });

    test('limita el número de lote a 40 caracteres', () => {
      expect(validarDatosRecepcion({
        ...recepcionValida(),
        lote_numero: 'L'.repeat(41),
      })).toBe('El número de lote no puede superar 40 caracteres.');
    });

    test.each(['2026-02-31', '31/12/2026', '', undefined])(
      'rechaza la fecha inválida %p',
      (fecha_vencimiento) => {
        expect(validarDatosRecepcion({
          ...recepcionValida(),
          fecha_vencimiento,
        })).toBe('Ingresa una fecha de vencimiento válida.');
      }
    );

    test.each(['', 'abc', '1.234', '-1', '123456789.00'])(
      'rechaza el costo %p',
      (costo_unitario) => {
        expect(validarDatosRecepcion({
          ...recepcionValida(),
          costo_unitario,
        })).toBe('El costo unitario debe ser un número válido con hasta dos decimales.');
      }
    );

    test.each(['', 'abc', '1.5', '-2'])(
      'rechaza la cantidad %p por formato',
      (cantidad_stock) => {
        expect(validarDatosRecepcion({
          ...recepcionValida(),
          cantidad_stock,
        })).toBe('La cantidad debe ser un número entero positivo.');
      }
    );

    test.each(['0', '2147483648', '9007199254740993'])(
      'rechaza la cantidad %p por rango',
      (cantidad_stock) => {
        expect(validarDatosRecepcion({
          ...recepcionValida(),
          cantidad_stock,
        })).toBe('La cantidad recibida está fuera del rango permitido.');
      }
    );

    test('acepta una recepción válida', () => {
      expect(validarDatosRecepcion(recepcionValida())).toBeNull();
      expect(validarDatosRecepcion({
        ...recepcionValida(),
        costo_unitario: 12,
        cantidad_stock: 1,
      })).toBeNull();
    });
  });
});
