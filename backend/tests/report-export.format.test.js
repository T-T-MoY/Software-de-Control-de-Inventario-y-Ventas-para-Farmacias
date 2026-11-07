const { formatearNumero } = require('../business/services/report-export.service');

describe('formatearNumero (separador de miles)', () => {
  test.each([
    [0, 2, '0,00'],
    [999, 0, '999'],
    [1000, 0, '1.000'],
    [1234567.891, 2, '1.234.567,89'],
    [-1000, 0, '-1.000'],
    [100, 2, '100,00'],
  ])('PU-FMT: %p con %p decimales -> %p', (valor, decimales, esperado) => {
    expect(formatearNumero(valor, decimales)).toBe(esperado);
  });

  test('PU-FMT: valores no numéricos devuelven vacío', () => {
    expect(formatearNumero('abc', 2)).toBe('');
    expect(formatearNumero(Infinity, 2)).toBe('');
  });
});