jest.mock('../data/connection', () => ({
  query: jest.fn(),
  conTransaccion: jest.fn(),
}));

const db = require('../data/connection');
const {
  listarHistorial,
  contarPorTipo,
  listarUsuariosConOperaciones,
} = require('../data/repositories/history.repository');

const filtros = {
  fechaInicio: '2026-01-01',
  fechaFin: '2026-01-31',
  tipo: 'VENTA',
  idUsuario: 8,
  pagina: 3,
  limite: 10,
};

describe('repositorio de historial', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listarHistorial', () => {
    test('envía filtros, zona horaria y paginación', async () => {
      const filas = [{ id_historial: 1 }];
      db.query.mockResolvedValue({ rows: filas });

      await expect(listarHistorial(filtros, 'America/La_Paz')).resolves.toBe(filas);

      expect(db.query.mock.calls[0][0]).toContain('LIMIT $6 OFFSET $7');
      expect(db.query.mock.calls[0][1]).toEqual([
        '2026-01-01',
        '2026-01-31',
        'VENTA',
        8,
        'America/La_Paz',
        10,
        20,
      ]);
    });

    test('calcula el desplazamiento de la primera página', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await listarHistorial({
        fechaInicio: null,
        fechaFin: null,
        tipo: null,
        idUsuario: null,
        pagina: 1,
        limite: 25,
      }, 'America/La_Paz');

      expect(db.query.mock.calls[0][1]).toEqual([
        null, null, null, null, 'America/La_Paz', 25, 0,
      ]);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(listarHistorial(filtros, 'America/La_Paz')).rejects.toBe(error);
    });
  });

  describe('contarPorTipo', () => {
    test('agrupa por tipo con los mismos filtros', async () => {
      const filas = [{ tipo_operacion: 'VENTA', cantidad: 4 }];
      db.query.mockResolvedValue({ rows: filas });

      await expect(contarPorTipo(filtros, 'America/La_Paz')).resolves.toBe(filas);

      expect(db.query.mock.calls[0][0]).toContain('GROUP BY h.tipo_operacion');
      expect(db.query.mock.calls[0][1]).toEqual([
        '2026-01-01',
        '2026-01-31',
        'VENTA',
        8,
        'America/La_Paz',
      ]);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(contarPorTipo(filtros, 'America/La_Paz')).rejects.toBe(error);
    });
  });

  describe('listarUsuariosConOperaciones', () => {
    test('devuelve los usuarios con historial', async () => {
      const filas = [{ id_usuario: 1, usuario: 'Ana Pérez' }];
      db.query.mockResolvedValue({ rows: filas });

      await expect(listarUsuariosConOperaciones()).resolves.toBe(filas);

      expect(db.query.mock.calls[0][0]).toContain('EXISTS');
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(listarUsuariosConOperaciones()).rejects.toBe(error);
    });
  });
});
