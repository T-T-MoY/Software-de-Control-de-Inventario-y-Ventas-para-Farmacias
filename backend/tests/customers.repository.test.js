jest.mock('../data/connection', () => ({
  query: jest.fn(),
  conTransaccion: jest.fn(),
}));

const db = require('../data/connection');
const {
  listar,
  buscarPorId,
  crear,
  actualizar,
} = require('../data/repositories/customers.repository');

const cliente = {
  nombres: 'Ana',
  apellido_paterno: 'Pérez',
  apellido_materno: 'Gómez',
  ci_nit: '123456',
};

describe('repositorio de clientes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listar', () => {
    test('usa cadena vacía por defecto', async () => {
      const filas = [{ id_cliente: 1 }];
      db.query.mockResolvedValue({ rows: filas });

      await expect(listar()).resolves.toBe(filas);

      expect(db.query.mock.calls[0][1]).toEqual(['', '%%']);
    });

    test('recorta el término y arma el patrón ILIKE', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await listar('  Ana  ');

      expect(db.query.mock.calls[0][1]).toEqual(['Ana', '%Ana%']);
    });

    test('trata un valor nulo como búsqueda vacía', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await listar(null);

      expect(db.query.mock.calls[0][1]).toEqual(['', '%%']);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(listar('x')).rejects.toBe(error);
    });
  });

  describe('buscarPorId', () => {
    test('devuelve el cliente encontrado', async () => {
      const fila = { id_cliente: 3 };
      db.query.mockResolvedValue({ rows: [fila] });

      await expect(buscarPorId(3)).resolves.toBe(fila);

      expect(db.query.mock.calls[0][1]).toEqual([3]);
    });

    test('devuelve null cuando no existe', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await expect(buscarPorId(99)).resolves.toBeNull();
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(buscarPorId(1)).rejects.toBe(error);
    });
  });

  describe('crear', () => {
    test('inserta el cliente y devuelve la fila creada', async () => {
      const creado = { id_cliente: 9, ...cliente };
      db.query.mockResolvedValue({ rows: [creado] });

      await expect(crear(cliente)).resolves.toBe(creado);

      expect(db.query.mock.calls[0][1]).toEqual([
        'Ana',
        'Pérez',
        'Gómez',
        '123456',
      ]);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(crear(cliente)).rejects.toBe(error);
    });
  });

  describe('actualizar', () => {
    test('actualiza el cliente y devuelve la fila', async () => {
      const actualizado = { id_cliente: 9, ...cliente };
      db.query.mockResolvedValue({ rows: [actualizado] });

      await expect(actualizar(9, cliente)).resolves.toBe(actualizado);

      expect(db.query.mock.calls[0][1]).toEqual([
        'Ana',
        'Pérez',
        'Gómez',
        '123456',
        9,
      ]);
    });

    test('devuelve null cuando el cliente no existe', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await expect(actualizar(99, cliente)).resolves.toBeNull();
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(actualizar(9, cliente)).rejects.toBe(error);
    });
  });
});
