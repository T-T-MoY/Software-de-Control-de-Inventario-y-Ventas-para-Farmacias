jest.mock('../data/connection', () => ({
  query: jest.fn(),
  conTransaccion: jest.fn(),
}));

const db = require('../data/connection');
const { listar, buscarPorId } = require('../data/repositories/roles.repository');

describe('repositorio de roles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('lista los roles', async () => {
    const filas = [{ id_rol: 1, nombre_rol: 'Administrador' }];
    db.query.mockResolvedValue({ rows: filas });

    await expect(listar()).resolves.toBe(filas);

    expect(db.query).toHaveBeenCalledWith(
      'SELECT id_rol, nombre_rol FROM rol ORDER BY id_rol'
    );
  });

  test('busca un rol existente', async () => {
    const rol = { id_rol: 2, nombre_rol: 'Farmaceutico' };
    db.query.mockResolvedValue({ rows: [rol] });

    await expect(buscarPorId(2)).resolves.toBe(rol);

    expect(db.query).toHaveBeenCalledWith(
      'SELECT id_rol, nombre_rol FROM rol WHERE id_rol = $1',
      [2]
    );
  });

  test('devuelve null cuando el rol no existe', async () => {
    db.query.mockResolvedValue({ rows: [] });

    await expect(buscarPorId(99)).resolves.toBeNull();
  });

  test('propaga el error al listar', async () => {
    const error = new Error('Error de base de datos');
    db.query.mockRejectedValue(error);

    await expect(listar()).rejects.toBe(error);
  });

  test('propaga el error al buscar', async () => {
    const error = new Error('Error de base de datos');
    db.query.mockRejectedValue(error);

    await expect(buscarPorId(1)).rejects.toBe(error);
  });
});
