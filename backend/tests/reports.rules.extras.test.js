const assert = require('node:assert/strict');

const {
  REPORTES,
  obtenerDefinicion,
  normalizarFiltrosReporte,
  normalizarFiltrosHistorial,
  calcularTotales,
  describirOperacion,
} = require('../business/rules/reports.rules');

const estado = (fn) => {
  try {
    fn();
    return null;
  } catch (error) {
    return error.estado;
  }
};

describe('reglas de reportes: ramas adicionales', () => {
  test('obtenerDefinicion devuelve un reporte existente', () => {
    expect(obtenerDefinicion('ventas')).toBe(REPORTES.ventas);
    expect(obtenerDefinicion('inventario')).toBe(REPORTES.inventario);
  });

  test('rechaza fechas inicial y final inválidas en un reporte', () => {
    expect(estado(() => normalizarFiltrosReporte(REPORTES.ventas, {
      fechaInicio: '2026-02-31',
      fechaFin: '2026-03-01',
    }))).toBe(400);

    expect(estado(() => normalizarFiltrosReporte(REPORTES.ventas, {
      fechaInicio: '2026-03-01',
      fechaFin: '31/03/2026',
    }))).toBe(400);
  });

  test('rechaza un rango invertido en lotes cuando se envían ambas fechas', () => {
    expect(estado(() => normalizarFiltrosReporte(
      REPORTES['lotes-por-vencer'],
      { fechaInicio: '2026-05-01', fechaFin: '2026-04-01' }
    ))).toBe(400);
  });

  test('acepta solo una fecha en reportes sin rango obligatorio', () => {
    expect(normalizarFiltrosReporte(REPORTES['lotes-vencidos'], {
      fechaInicio: '2026-01-01',
    })).toEqual({ fechaInicio: '2026-01-01', fechaFin: null });
  });

  test('ignora fechas vacías o que no son texto', () => {
    expect(normalizarFiltrosReporte(REPORTES['lotes-vencidos'], {
      fechaInicio: '   ',
      fechaFin: 123,
    })).toEqual({ fechaInicio: null, fechaFin: null });
  });

  test('historial rechaza fechas inválidas y rangos invertidos', () => {
    expect(estado(() => normalizarFiltrosHistorial({
      fechaInicio: '2026-02-31',
    }))).toBe(400);

    expect(estado(() => normalizarFiltrosHistorial({
      fechaFin: 'mañana',
    }))).toBe(400);

    expect(estado(() => normalizarFiltrosHistorial({
      fechaInicio: '2026-12-31',
      fechaFin: '2026-01-01',
    }))).toBe(400);
  });

  test('historial acepta límites y página válidos', () => {
    const filtros = normalizarFiltrosHistorial({
      fechaInicio: '2026-01-01',
      fechaFin: '2026-01-31',
      tipo: 'VENTA',
      idUsuario: '3',
      pagina: '2',
      limite: '100',
    });

    expect(filtros).toEqual({
      fechaInicio: '2026-01-01',
      fechaFin: '2026-01-31',
      tipo: 'VENTA',
      idUsuario: 3,
      pagina: 2,
      limite: 100,
    });
  });

  test.each([
    [{ limite: '0' }],
    [{ limite: 'abc' }],
    [{ limite: '101' }],
  ])('historial rechaza el límite %p', (query) => {
    expect(estado(() => normalizarFiltrosHistorial(query))).toBe(400);
  });

  test.each([
    [{ idUsuario: '0' }],
    [{ idUsuario: '1.5' }],
    [{ pagina: 'abc' }],
    [{ pagina: '0' }],
  ])('historial rechaza la paginación %p', (query) => {
    expect(estado(() => normalizarFiltrosHistorial(query))).toBe(400);
  });

  test('calcularTotales suma enteros sin factor de moneda', () => {
    const totales = calcularTotales(REPORTES.inventario, [
      { stock_actual: '2', valor_stock_costo: '1.10', valor_stock_venta: '2.20' },
      { stock_actual: 3, valor_stock_costo: '0.90', valor_stock_venta: '1.80' },
    ]);

    expect(totales).toEqual({
      stock_actual: 5,
      valor_stock_costo: 2,
      valor_stock_venta: 4,
    });
  });

  test('calcularTotales trata los valores ausentes como cero', () => {
    expect(calcularTotales(REPORTES['lotes-vencidos'], [
      {},
      { cantidad_stock: null, valor_costo: undefined },
    ])).toEqual({
      cantidad_stock: 0,
      valor_costo: 0,
    });
  });

  test('describirOperacion cubre ventas sin referencia ni cliente', () => {
    expect(describirOperacion({
      tipo_operacion: 'VENTA',
      id_registro: 9,
    })).toBe('Venta #9');

    expect(describirOperacion({
      tipo_operacion: 'VENTA',
      id_registro: 9,
      referencia: 'F-9',
    })).toBe('Venta F-9');
  });

  test('describirOperacion cubre bajas y recepciones sin referencia', () => {
    expect(describirOperacion({
      tipo_operacion: 'RECEPCION',
      id_registro: 3,
      medicamento: 'Zinc',
    })).toBe('Recepción del lote #3 de Zinc');

    expect(describirOperacion({
      tipo_operacion: 'BAJA',
      id_registro: 4,
    })).toBe('Baja del lote #4');
  });
});
