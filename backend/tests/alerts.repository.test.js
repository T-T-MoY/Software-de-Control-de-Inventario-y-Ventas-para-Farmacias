jest.mock('../data/connection', () => ({
  query: jest.fn(),
  conTransaccion: jest.fn(),
}));

jest.mock('../config/parameters', () => ({
  margenAlertaDias: 30,
  ventanaDemandaDias: 60,
  diasReposicion: 5,
}));

const db = require('../data/connection');
const {
  listarLotesPorVencer,
  contarLotesPorVencer,
  listarLotesVencidos,
  contarLotesVencidos,
  listarDatosReorden,
} = require('../data/repositories/alerts.repository');

describe('repositorio de alertas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listarLotesPorVencer', () => {
    test('consulta los lotes con el margen configurado y devuelve las filas', async () => {
      const filas = [{ id_lote: 1 }];
      db.query.mockResolvedValue({ rows: filas });

      await expect(listarLotesPorVencer()).resolves.toBe(filas);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(db.query.mock.calls[0][0]).toContain('FROM lote l');
      expect(db.query.mock.calls[0][0]).toContain('dias_para_vencer');
      expect(db.query.mock.calls[0][1]).toEqual([30]);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(listarLotesPorVencer()).rejects.toBe(error);
    });
  });

  describe('contarLotesPorVencer', () => {
    test('devuelve el total de la primera fila', async () => {
      db.query.mockResolvedValue({ rows: [{ total: 7 }] });

      await expect(contarLotesPorVencer()).resolves.toBe(7);

      expect(db.query.mock.calls[0][0]).toContain('COUNT(*)::integer AS total');
      expect(db.query.mock.calls[0][1]).toEqual([30]);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(contarLotesPorVencer()).rejects.toBe(error);
    });
  });

  describe('listarLotesVencidos', () => {
    test('consulta los lotes vencidos pendientes de baja', async () => {
      const filas = [{ id_lote: 2 }];
      db.query.mockResolvedValue({ rows: filas });

      await expect(listarLotesVencidos()).resolves.toBe(filas);

      expect(db.query.mock.calls[0][0]).toContain('dias_vencido');
      expect(db.query.mock.calls[0][1]).toEqual([]);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(listarLotesVencidos()).rejects.toBe(error);
    });
  });

  describe('contarLotesVencidos', () => {
    test('devuelve el total de lotes vencidos', async () => {
      db.query.mockResolvedValue({ rows: [{ total: 3 }] });

      await expect(contarLotesVencidos()).resolves.toBe(3);

      expect(db.query.mock.calls[0][0]).toContain('fecha_vencimiento < CURRENT_DATE');
      expect(db.query.mock.calls[0][1]).toEqual([]);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(contarLotesVencidos()).rejects.toBe(error);
    });
  });

  describe('listarDatosReorden', () => {
    test('usa la ventana de demanda y los días de reposición configurados', async () => {
      const filas = [{ id_medicamento: 1, demanda_diaria: 1.5 }];
      db.query.mockResolvedValue({ rows: filas });

      await expect(listarDatosReorden()).resolves.toBe(filas);

      expect(db.query.mock.calls[0][0]).toContain('demanda_ventana');
      expect(db.query.mock.calls[0][1]).toEqual([60, 5]);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(listarDatosReorden()).rejects.toBe(error);
    });
  });
});
