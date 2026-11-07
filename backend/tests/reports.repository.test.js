jest.mock('../data/connection', () => ({
  query: jest.fn(),
  conTransaccion: jest.fn(),
}));

const db = require('../data/connection');
const {
  listarVentas,
  listarInventario,
  listarLotesPorVencer,
  listarLotesVencidos,
} = require('../data/repositories/reports.repository');

describe('repositorio de reportes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listarVentas', () => {
    test('consulta el rango en la zona horaria indicada', async () => {
      const filas = [{ id_venta: 1 }];
      db.query.mockResolvedValue({ rows: filas });

      await expect(
        listarVentas('2026-01-01', '2026-01-31', 'America/La_Paz')
      ).resolves.toBe(filas);

      expect(db.query.mock.calls[0][0]).toContain('BETWEEN $1::date AND $2::date');
      expect(db.query.mock.calls[0][1])
        .toEqual(['2026-01-01', '2026-01-31', 'America/La_Paz']);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(
        listarVentas('2026-01-01', '2026-01-31', 'America/La_Paz')
      ).rejects.toBe(error);
    });
  });

  describe('listarInventario', () => {
    test('devuelve el inventario actual', async () => {
      const filas = [{ id_medicamento: 1, stock_actual: 10 }];
      db.query.mockResolvedValue({ rows: filas });

      await expect(listarInventario()).resolves.toBe(filas);

      expect(db.query.mock.calls[0][0]).toContain("m.estado_medicamento = 'Activo'");
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(listarInventario()).rejects.toBe(error);
    });
  });

  describe('listarLotesPorVencer', () => {
    test('envía fechas y margen de alerta', async () => {
      const filas = [{ id_lote: 1 }];
      db.query.mockResolvedValue({ rows: filas });

      await expect(
        listarLotesPorVencer('2026-01-01', '2026-01-31', 30)
      ).resolves.toBe(filas);

      expect(db.query.mock.calls[0][1])
        .toEqual(['2026-01-01', '2026-01-31', 30]);
    });

    test('acepta fechas nulas para usar los valores por defecto del SQL', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await listarLotesPorVencer(null, null, 30);

      expect(db.query.mock.calls[0][1]).toEqual([null, null, 30]);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(listarLotesPorVencer(null, null, 30)).rejects.toBe(error);
    });
  });

  describe('listarLotesVencidos', () => {
    test('consulta los lotes vencidos con el rango indicado', async () => {
      const filas = [{ id_lote: 2 }];
      db.query.mockResolvedValue({ rows: filas });

      await expect(
        listarLotesVencidos('2025-01-01', '2025-12-31')
      ).resolves.toBe(filas);

      expect(db.query.mock.calls[0][1]).toEqual(['2025-01-01', '2025-12-31']);
    });

    test('acepta fechas nulas', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await listarLotesVencidos(null, null);

      expect(db.query.mock.calls[0][1]).toEqual([null, null]);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(listarLotesVencidos(null, null)).rejects.toBe(error);
    });
  });
});
