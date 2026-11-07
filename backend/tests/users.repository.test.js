jest.mock('../data/connection', () => ({
  query: jest.fn(),
  conTransaccion: jest.fn(),
}));

const db = require('../data/connection');
const {
  listar,
  buscarPorCorreo,
  buscarSesionActiva,
  buscarPorId,
  crear,
  actualizar,
  cambiarEstado,
  contarImpacto,
  eliminarLogicamente,
  buscarHashPorId,
  actualizarContrasena,
} = require('../data/repositories/users.repository');

const usuario = {
  nombres: 'Ana',
  apellido_paterno: 'Pérez',
  apellido_materno: null,
  fecha_nacimiento: '1990-01-01',
  correo: 'ana@farmacia.test',
  ci: '123456',
  contrasenaHash: 'hash',
  id_rol: 2,
};

describe('repositorio de usuarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listar', () => {
    test('excluye las cuentas eliminadas', async () => {
      const filas = [{ id_usuario: 1 }];
      db.query.mockResolvedValue({ rows: filas });

      await expect(listar()).resolves.toBe(filas);

      expect(db.query.mock.calls[0][0]).toContain("estado_cuenta <> 'Eliminado'");
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(listar()).rejects.toBe(error);
    });
  });

  describe('buscarPorCorreo', () => {
    test('devuelve el usuario encontrado', async () => {
      const fila = { id_usuario: 1, correo: 'ana@farmacia.test' };
      db.query.mockResolvedValue({ rows: [fila] });

      await expect(buscarPorCorreo('ana@farmacia.test')).resolves.toBe(fila);

      expect(db.query.mock.calls[0][1]).toEqual(['ana@farmacia.test']);
    });

    test('devuelve null cuando el correo no existe', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await expect(buscarPorCorreo('nadie@test')).resolves.toBeNull();
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(buscarPorCorreo('x')).rejects.toBe(error);
    });
  });

  describe('buscarSesionActiva', () => {
    test('devuelve la sesión activa', async () => {
      const fila = { id_usuario: 1, nombre_rol: 'Administrador' };
      db.query.mockResolvedValue({ rows: [fila] });

      await expect(buscarSesionActiva(1)).resolves.toBe(fila);

      expect(db.query.mock.calls[0][1]).toEqual([1]);
    });

    test('devuelve null cuando la cuenta no está activa', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await expect(buscarSesionActiva(1)).resolves.toBeNull();
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(buscarSesionActiva(1)).rejects.toBe(error);
    });
  });

  describe('buscarPorId', () => {
    test('devuelve el usuario encontrado', async () => {
      const fila = { id_usuario: 1 };
      db.query.mockResolvedValue({ rows: [fila] });

      await expect(buscarPorId(1)).resolves.toBe(fila);

      expect(db.query.mock.calls[0][1]).toEqual([1]);
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
    test('inserta el usuario y devuelve su id', async () => {
      db.query.mockResolvedValue({ rows: [{ id_usuario: 21 }] });

      await expect(crear(usuario)).resolves.toBe(21);

      expect(db.query.mock.calls[0][1]).toEqual([
        'Ana', 'Pérez', null, '1990-01-01', 'ana@farmacia.test', '123456', 'hash', 2,
      ]);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(crear(usuario)).rejects.toBe(error);
    });
  });

  describe('actualizar', () => {
    test('actualiza el usuario y devuelve el número de filas', async () => {
      db.query.mockResolvedValue({ rowCount: 1 });

      await expect(actualizar(5, usuario)).resolves.toBe(1);

      expect(db.query.mock.calls[0][1]).toEqual([
        'Ana', 'Pérez', null, '1990-01-01', 'ana@farmacia.test', '123456', 2, 'hash', 5,
      ]);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(actualizar(5, usuario)).rejects.toBe(error);
    });
  });

  describe('cambiarEstado', () => {
    test.each([
      [true, 'Activo'],
      [false, 'Inactivo'],
    ])('convierte %p en estado %s', async (activo, estado) => {
      db.query.mockResolvedValue({ rowCount: 1 });

      await expect(cambiarEstado(5, activo)).resolves.toBe(1);

      expect(db.query.mock.calls[0][1]).toEqual([estado, 5]);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(cambiarEstado(5, true)).rejects.toBe(error);
    });
  });

  describe('contarImpacto', () => {
    test('devuelve las ventas e historial del usuario', async () => {
      const fila = { ventas: 2, historial: 3 };
      db.query.mockResolvedValue({ rows: [fila] });

      await expect(contarImpacto(5)).resolves.toBe(fila);

      expect(db.query.mock.calls[0][1]).toEqual([5]);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(contarImpacto(5)).rejects.toBe(error);
    });
  });

  describe('eliminarLogicamente', () => {
    test('marca la cuenta como eliminada', async () => {
      db.query.mockResolvedValue({ rowCount: 1 });

      await expect(eliminarLogicamente(5)).resolves.toBe(1);

      expect(db.query.mock.calls[0][0]).toContain("estado_cuenta = 'Eliminado'");
      expect(db.query.mock.calls[0][1]).toEqual([5]);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(eliminarLogicamente(5)).rejects.toBe(error);
    });
  });

  describe('buscarHashPorId', () => {
    test('devuelve el hash de una cuenta activa', async () => {
      const fila = { contrasena_hash: 'hash' };
      db.query.mockResolvedValue({ rows: [fila] });

      await expect(buscarHashPorId(5)).resolves.toBe(fila);

      expect(db.query.mock.calls[0][0]).toContain("estado_cuenta = 'Activo'");
    });

    test('devuelve null cuando no hay cuenta activa', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await expect(buscarHashPorId(5)).resolves.toBeNull();
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(buscarHashPorId(5)).rejects.toBe(error);
    });
  });

  describe('actualizarContrasena', () => {
    test('actualiza el hash de la contraseña', async () => {
      db.query.mockResolvedValue({ rowCount: 1 });

      await expect(actualizarContrasena(5, 'nuevo-hash')).resolves.toBe(1);

      expect(db.query.mock.calls[0][1]).toEqual(['nuevo-hash', 5]);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(actualizarContrasena(5, 'nuevo-hash')).rejects.toBe(error);
    });
  });
});
