jest.mock('../data/connection', () => ({
  query: jest.fn(),
  conTransaccion: jest.fn(),
}));

const db = require('../data/connection');
const {
  listar,
  guardar,
} = require('../data/repositories/parameters.repository');

describe('repositorio de parámetros', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listar', () => {
    test('devuelve las claves guardadas', async () => {
      const filas = [{ clave: 'margen_alerta_dias', valor: '30' }];
      db.query.mockResolvedValue({ rows: filas });

      await expect(listar()).resolves.toBe(filas);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM configuracion')
      );
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(listar()).rejects.toBe(error);
    });
  });

  describe('guardar', () => {
    test('hace upsert de cada clave dentro de una transacción', async () => {
      const cliente = { query: jest.fn().mockResolvedValue({ rows: [] }) };
      db.conTransaccion.mockImplementation(async (callback) => callback(cliente));

      await guardar({
        margen_alerta_dias: 30,
        farmacia_nombre: 'Farmacia Central',
        farmacia_nit: null,
      });

      expect(db.conTransaccion).toHaveBeenCalledTimes(1);
      expect(cliente.query).toHaveBeenCalledTimes(3);
      expect(cliente.query.mock.calls[0][1]).toEqual(['margen_alerta_dias', '30']);
      expect(cliente.query.mock.calls[1][1])
        .toEqual(['farmacia_nombre', 'Farmacia Central']);
      expect(cliente.query.mock.calls[2][1]).toEqual(['farmacia_nit', null]);
    });

    test('no ejecuta consultas cuando no hay valores', async () => {
      const cliente = { query: jest.fn() };
      db.conTransaccion.mockImplementation(async (callback) => callback(cliente));

      await guardar({});

      expect(cliente.query).not.toHaveBeenCalled();
    });

    test('propaga el error de la transacción', async () => {
      const error = new Error('Error de base de datos');
      db.conTransaccion.mockRejectedValue(error);

      await expect(guardar({ clave: 'valor' })).rejects.toBe(error);
    });

    test('propaga el error de una consulta interna', async () => {
      const error = new Error('Error de inserción');
      const cliente = { query: jest.fn().mockRejectedValue(error) };
      db.conTransaccion.mockImplementation(async (callback) => callback(cliente));

      await expect(guardar({ clave: 'valor' })).rejects.toBe(error);
    });
  });
});
