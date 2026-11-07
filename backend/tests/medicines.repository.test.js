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
  cambiarEstado,
  eliminarLogicamente,
  obtenerFoto,
  actualizarFoto,
} = require('../data/repositories/medicines.repository');

const medicamento = {
  codigo_barras: '7501000000011',
  nombre_comercial: 'Paracetamol',
  dci: 'Acetaminofén',
  concentracion: '500 mg',
  forma_farmaceutica: 'Tableta',
  precio_unitario: 2.5,
  tipo_venta: 'Libre',
  stock_seguridad: 10,
  dias_reposicion: 5,
  id_categoria: 1,
};

describe('repositorio de medicamentos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listar', () => {
    test('sin filtros excluye los eliminados', async () => {
      const filas = [{ id_medicamento: 1 }];
      db.query.mockResolvedValue({ rows: filas });

      await expect(listar()).resolves.toBe(filas);

      expect(db.query.mock.calls[0][0]).toContain("m.estado_medicamento <> 'Eliminado'");
      expect(db.query.mock.calls[0][1]).toEqual([]);
    });

    test('acepta un objeto vacío de filtros', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await listar({});

      expect(db.query.mock.calls[0][1]).toEqual([]);
    });

    test('combina búsqueda, categoría y estado', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await listar({ buscar: 'para', idCategoria: 2, estado: 'Activo' });

      expect(db.query.mock.calls[0][1]).toEqual(['para', 2, 'Activo']);
      expect(db.query.mock.calls[0][0])
        .toContain('starts_with(lower(valor.palabra), lower(consulta.termino))');
      expect(db.query.mock.calls[0][0]).toContain('m.id_categoria = $2');
      expect(db.query.mock.calls[0][0]).toContain('m.estado_medicamento = $3');
    });

    test('usa solo la búsqueda cuando es el único filtro', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await listar({ buscar: 'ibu' });

      expect(db.query.mock.calls[0][1]).toEqual(['ibu']);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(listar({ buscar: 'x' })).rejects.toBe(error);
    });
  });

  describe('buscarPorId', () => {
    test('devuelve el medicamento encontrado', async () => {
      const fila = { id_medicamento: 1 };
      db.query.mockResolvedValue({ rows: [fila] });

      await expect(buscarPorId(1)).resolves.toBe(fila);

      expect(db.query.mock.calls[0][1]).toEqual([1]);
    });

    test('devuelve null cuando no existe o está eliminado', async () => {
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
    test('inserta el medicamento y devuelve su id', async () => {
      db.query.mockResolvedValue({ rows: [{ id_medicamento: 12 }] });

      await expect(crear(medicamento)).resolves.toBe(12);

      expect(db.query.mock.calls[0][1]).toEqual([
        '7501000000011',
        'Paracetamol',
        'Acetaminofén',
        '500 mg',
        'Tableta',
        2.5,
        'Libre',
        10,
        5,
        1,
      ]);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(crear(medicamento)).rejects.toBe(error);
    });
  });

  describe('actualizar', () => {
    test('actualiza y devuelve el número de filas afectadas', async () => {
      db.query.mockResolvedValue({ rowCount: 1 });

      await expect(actualizar(1, medicamento)).resolves.toBe(1);

      expect(db.query.mock.calls[0][1]).toEqual([
        '7501000000011',
        'Paracetamol',
        'Acetaminofén',
        '500 mg',
        'Tableta',
        2.5,
        'Libre',
        10,
        5,
        1,
        1,
      ]);
    });

    test('envía null para conservar stock y días cuando faltan', async () => {
      db.query.mockResolvedValue({ rowCount: 1 });

      await actualizar(1, {
        ...medicamento,
        stock_seguridad: undefined,
        dias_reposicion: null,
      });

      expect(db.query.mock.calls[0][1]).toEqual([
        '7501000000011',
        'Paracetamol',
        'Acetaminofén',
        '500 mg',
        'Tableta',
        2.5,
        'Libre',
        null,
        null,
        1,
        1,
      ]);
    });

    test('devuelve 0 cuando el medicamento no existe', async () => {
      db.query.mockResolvedValue({ rowCount: 0 });

      await expect(actualizar(99, medicamento)).resolves.toBe(0);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(actualizar(1, medicamento)).rejects.toBe(error);
    });
  });

  describe('cambiarEstado', () => {
    test.each([
      [true, 'Activo'],
      [false, 'Inactivo'],
    ])('convierte %p en estado %s', async (activo, estado) => {
      db.query.mockResolvedValue({ rowCount: 1 });

      await expect(cambiarEstado(1, activo)).resolves.toBe(1);

      expect(db.query.mock.calls[0][1]).toEqual([estado, 1]);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(cambiarEstado(1, true)).rejects.toBe(error);
    });
  });

  describe('eliminarLogicamente', () => {
    test('marca el medicamento como eliminado', async () => {
      db.query.mockResolvedValue({ rowCount: 1 });

      await expect(eliminarLogicamente(1)).resolves.toBe(1);

      expect(db.query.mock.calls[0][0]).toContain("estado_medicamento = 'Eliminado'");
      expect(db.query.mock.calls[0][1]).toEqual([1]);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(eliminarLogicamente(1)).rejects.toBe(error);
    });
  });

  describe('obtenerFoto', () => {
    test('devuelve la fila de la foto', async () => {
      const fila = { foto_url: '/uploads/medicamentos/foto.jpg' };
      db.query.mockResolvedValue({ rows: [fila] });

      await expect(obtenerFoto(1)).resolves.toBe(fila);

      expect(db.query.mock.calls[0][1]).toEqual([1]);
    });

    test('devuelve null cuando el medicamento no existe', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await expect(obtenerFoto(99)).resolves.toBeNull();
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(obtenerFoto(1)).rejects.toBe(error);
    });
  });

  describe('actualizarFoto', () => {
    test('actualiza la URL de la foto', async () => {
      db.query.mockResolvedValue({ rowCount: 1 });

      await expect(actualizarFoto(1, '/foto.jpg')).resolves.toBe(1);

      expect(db.query.mock.calls[0][1]).toEqual(['/foto.jpg', 1]);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(actualizarFoto(1, null)).rejects.toBe(error);
    });
  });
});
