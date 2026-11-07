jest.mock('../data/connection', () => ({
  query: jest.fn(),
  conTransaccion: jest.fn(),
}));

const db = require('../data/connection');
const { listar } = require('../data/repositories/categories.repository');

describe('repositorio de categorías', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('devuelve las categorías ordenadas', async () => {
    const filas = [{ id_categoria: 1, nombre_categoria: 'Analgésicos' }];
    db.query.mockResolvedValue({ rows: filas });

    await expect(listar()).resolves.toBe(filas);

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('FROM categoria'));
  });

  test('devuelve una lista vacía cuando no hay categorías', async () => {
    db.query.mockResolvedValue({ rows: [] });

    await expect(listar()).resolves.toEqual([]);
  });

  test('propaga el error de la base de datos', async () => {
    const error = new Error('Error de base de datos');
    db.query.mockRejectedValue(error);

    await expect(listar()).rejects.toBe(error);
  });
});
