const { normalizarDatosLote } = require('../business/rules/lots.rules');
const { ErrorAplicacion } = require('../business/errors/app-error');

const loteValido = () => ({
  id_medicamento: '4',
  id_proveedor: 2,
  lote_numero: '  L-2026-10  ',
  fecha_vencimiento: ' 2026-12-31 ',
  costo_unitario: '12.50',
  cantidad_stock: '100',
});

const capturar = (datos) => {
  try {
    normalizarDatosLote(datos);
    return null;
  } catch (error) {
    return error;
  }
};

describe('reglas de lotes', () => {
  test('normaliza los datos de una recepción válida', () => {
    expect(normalizarDatosLote(loteValido())).toEqual({
      id_medicamento: 4,
      id_proveedor: 2,
      lote_numero: 'L-2026-10',
      fecha_vencimiento: '2026-12-31',
      costo_unitario: 12.5,
      cantidad_stock: 100,
    });
  });

  test('acepta costo cero y fechas reales de fin de mes', () => {
    expect(normalizarDatosLote({
      ...loteValido(),
      fecha_vencimiento: '2028-02-29',
      costo_unitario: 0,
      cantidad_stock: 1,
    })).toMatchObject({
      fecha_vencimiento: '2028-02-29',
      costo_unitario: 0,
      cantidad_stock: 1,
    });
  });

  test.each([null, undefined, 'texto', [], 5])(
    'rechaza un cuerpo inválido (%p)',
    (datos) => {
      expect(capturar(datos)).toMatchObject({
        message: 'Los datos de la recepción son obligatorios.',
        estado: 400,
      });
    }
  );

  test.each([0, -1, 'abc', 1.5, null])(
    'rechaza el medicamento %p',
    (id_medicamento) => {
      expect(capturar({ ...loteValido(), id_medicamento })).toMatchObject({
        message: 'Selecciona un medicamento válido.',
      });
    }
  );

  test.each([0, -1, 'abc', 1.5, null])(
    'rechaza el proveedor %p',
    (id_proveedor) => {
      expect(capturar({ ...loteValido(), id_proveedor })).toMatchObject({
        message: 'Selecciona un proveedor válido.',
      });
    }
  );

  test.each(['', '   ', null, undefined])(
    'exige el número de lote (%p)',
    (lote_numero) => {
      expect(capturar({ ...loteValido(), lote_numero })).toMatchObject({
        message: 'El número de lote es obligatorio.',
      });
    }
  );

  test('limita el número de lote a 40 caracteres', () => {
    expect(capturar({
      ...loteValido(),
      lote_numero: 'L'.repeat(41),
    })).toMatchObject({
      message: 'El número de lote no puede superar 40 caracteres.',
    });
  });

  test.each([
    '2026-02-31',
    '31/12/2026',
    '2026-13-01',
    '',
    null,
    undefined,
  ])('rechaza la fecha de vencimiento %p', (fecha_vencimiento) => {
    expect(capturar({
      ...loteValido(),
      fecha_vencimiento,
    })).toMatchObject({
      message: 'Ingresa una fecha de vencimiento válida.',
    });
  });

  test.each(['', 'abc', '1.234', '-1', '123456789.00', '12,50'])(
    'rechaza el costo unitario %p',
    (costo_unitario) => {
      expect(capturar({
        ...loteValido(),
        costo_unitario,
      })).toMatchObject({
        message: 'El costo unitario debe ser un número positivo con hasta dos decimales.',
      });
    }
  );

  test.each(['', '0', '-2', 'abc', '1.5', null, undefined])(
    'rechaza la cantidad %p',
    (cantidad_stock) => {
      expect(capturar({
        ...loteValido(),
        cantidad_stock,
      })).toMatchObject({
        message: 'La cantidad recibida debe ser un número entero mayor que cero.',
      });
    }
  );

  test('el error es una instancia de ErrorAplicacion', () => {
    const error = capturar({});
    expect(error).toBeInstanceOf(ErrorAplicacion);
    expect(error.codigo).toBe('VALIDACION');
  });
});
