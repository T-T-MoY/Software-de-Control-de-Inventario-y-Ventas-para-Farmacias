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
} = require('../data/repositories/suppliers.repository');

const proveedor = {
  nombre_comercial: 'Distribuidora Andina',
  ruc_nit: '123456789',
  telefono: '70000000',
  correo_electronico: 'ventas@andina.test',
  direccion: 'Calle 1',
};

describe('repositorio de proveedores', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listar', () => {
    test('usa cadena vacía por defecto', async () => {
      const filas = [{ id_proveedor: 1 }];
      db.query.mockResolvedValue({ rows: filas });

      await expect(listar()).resolves.toBe(filas);

      expect(db.query.mock.calls[0][1]).toEqual(['', '%%']);
    });

    test('recorta el término de búsqueda', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await listar('  Andina  ');

      expect(db.query.mock.calls[0][1]).toEqual(['Andina', '%Andina%']);
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
    test('devuelve el proveedor encontrado', async () => {
      const fila = { id_proveedor: 3 };
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
    test('inserta el proveedor y devuelve la fila creada', async () => {
      const creado = { id_proveedor: 9, ...proveedor };
      db.query.mockResolvedValue({ rows: [creado] });

      await expect(crear(proveedor)).resolves.toBe(creado);

      expect(db.query.mock.calls[0][1]).toEqual([
        proveedor.nombre_comercial,
        proveedor.ruc_nit,
        proveedor.telefono,
        proveedor.correo_electronico,
        proveedor.direccion,
      ]);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(crear(proveedor)).rejects.toBe(error);
    });
  });

  describe('actualizar', () => {
    test('actualiza el proveedor y devuelve la fila', async () => {
      const actualizado = { id_proveedor: 9, ...proveedor };
      db.query.mockResolvedValue({ rows: [actualizado] });

      await expect(actualizar(9, proveedor)).resolves.toBe(actualizado);

      expect(db.query.mock.calls[0][1]).toEqual([
        proveedor.nombre_comercial,
        proveedor.ruc_nit,
        proveedor.telefono,
        proveedor.correo_electronico,
        proveedor.direccion,
        9,
      ]);
    });

    test('devuelve null cuando el proveedor no existe', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await expect(actualizar(99, proveedor)).resolves.toBeNull();
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(actualizar(9, proveedor)).rejects.toBe(error);
    });
  });
});
