jest.mock('../data/connection', () => ({
  query: jest.fn(),
  conTransaccion: jest.fn(),
}));

jest.mock('../config/parameters', () => ({
  margenAlertaDias: 30,
}));

const db = require('../data/connection');
const {
  listar,
  buscarPorId,
  registrarRecepcion,
  darBajaVencido,
} = require('../data/repositories/lots.repository');

const datosRecepcion = {
  id_medicamento: 4,
  id_proveedor: 2,
  lote_numero: 'L-2026-10',
  fecha_vencimiento: '2026-12-31',
  costo_unitario: 12.5,
  cantidad_stock: 100,
};

describe('repositorio de lotes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listar', () => {
    test('usa búsqueda vacía y el margen configurado por defecto', async () => {
      const filas = [{ id_lote: 1 }];
      db.query.mockResolvedValue({ rows: filas });

      await expect(listar()).resolves.toBe(filas);

      expect(db.query.mock.calls[0][1]).toEqual([30, '', '%%']);
    });

    test('recorta el término y arma el patrón ILIKE', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await listar('  L-2026  ');

      expect(db.query.mock.calls[0][1]).toEqual([30, 'L-2026', '%L-2026%']);
    });

    test('trata un valor nulo como búsqueda vacía', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await listar(null);

      expect(db.query.mock.calls[0][1]).toEqual([30, '', '%%']);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(listar()).rejects.toBe(error);
    });
  });

  describe('buscarPorId', () => {
    test('devuelve el lote encontrado', async () => {
      const fila = { id_lote: 4 };
      db.query.mockResolvedValue({ rows: [fila] });

      await expect(buscarPorId(4)).resolves.toBe(fila);

      expect(db.query.mock.calls[0][1]).toEqual([30, 4]);
    });

    test('devuelve null cuando no existe', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await expect(buscarPorId(99)).resolves.toBeNull();
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(buscarPorId(4)).rejects.toBe(error);
    });
  });

  describe('registrarRecepcion', () => {
    test('inserta el lote y su historial dentro de la transacción', async () => {
      const lote = { id_lote: 25, fecha_recepcion: '2026-11-06' };
      const cliente = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [lote] })
          .mockResolvedValueOnce({ rows: [] }),
      };
      db.conTransaccion.mockImplementation(async (callback) => callback(cliente));

      await expect(registrarRecepcion(datosRecepcion, 7)).resolves.toBe(lote);

      expect(db.conTransaccion).toHaveBeenCalledTimes(1);
      expect(cliente.query).toHaveBeenCalledTimes(2);
      expect(cliente.query.mock.calls[0][1]).toEqual([
        4, 2, 'L-2026-10', '2026-12-31', 12.5, 100,
      ]);
      expect(cliente.query.mock.calls[1][0]).toContain("'RECEPCION'");
      expect(cliente.query.mock.calls[1][1]).toEqual([7, 25]);
    });

    test('propaga el error de la transacción', async () => {
      const error = new Error('Error de inserción');
      db.conTransaccion.mockRejectedValue(error);

      await expect(registrarRecepcion(datosRecepcion, 7)).rejects.toBe(error);
    });

    test('propaga el error del historial', async () => {
      const error = new Error('Error de historial');
      const cliente = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ id_lote: 25 }] })
          .mockRejectedValueOnce(error),
      };
      db.conTransaccion.mockImplementation(async (callback) => callback(cliente));

      await expect(registrarRecepcion(datosRecepcion, 7)).rejects.toBe(error);
    });
  });

  describe('darBajaVencido', () => {
    test('actualiza el lote y registra la baja en el historial', async () => {
      const lote = { id_lote: 25 };
      const cliente = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [lote] })
          .mockResolvedValueOnce({ rows: [] }),
      };
      db.conTransaccion.mockImplementation(async (callback) => callback(cliente));

      await expect(darBajaVencido(25, 7)).resolves.toBe(lote);

      expect(cliente.query.mock.calls[0][1]).toEqual([25]);
      expect(cliente.query.mock.calls[0][0]).toContain('fecha_vencimiento < CURRENT_DATE');
      expect(cliente.query.mock.calls[1][0]).toContain("'BAJA'");
      expect(cliente.query.mock.calls[1][1]).toEqual([7, 25]);
    });

    test('devuelve null y no registra historial cuando el lote no aplica', async () => {
      const cliente = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
      };
      db.conTransaccion.mockImplementation(async (callback) => callback(cliente));

      await expect(darBajaVencido(25, 7)).resolves.toBeNull();

      expect(cliente.query).toHaveBeenCalledTimes(1);
      expect(cliente.query.mock.calls[0][1]).toEqual([25]);
    });

    test('propaga el error de la transacción', async () => {
      const error = new Error('Error de actualización');
      db.conTransaccion.mockRejectedValue(error);

      await expect(darBajaVencido(25, 7)).rejects.toBe(error);
    });
  });
});
