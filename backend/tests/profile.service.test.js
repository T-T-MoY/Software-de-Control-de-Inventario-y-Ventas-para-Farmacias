jest.mock('../data/repositories/users.repository', () => ({
  buscarPorId: jest.fn(),
  buscarHashPorId: jest.fn(),
  actualizarContrasena: jest.fn(),
}));

jest.mock('../data/mappers/user.mapper', () => ({
  aPerfil: jest.fn(),
}));

jest.mock('../business/rules/permissions', () => ({
  obtenerPermisos: jest.fn(),
}));

jest.mock('../business/security/passwords', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));

jest.mock('../business/errors/app-error', () => {
  class ErrorAplicacion extends Error {
    constructor(mensaje, { estado = 400, codigo = 'ERROR_APLICACION' } = {}) {
      super(mensaje);
      this.name = 'ErrorAplicacion';
      this.estado = estado;
      this.codigo = codigo;
    }
  }

  return {
    ErrorAplicacion,
    errorNoEncontrado: jest.fn((mensaje) => new ErrorAplicacion(mensaje, {
      estado: 404,
      codigo: 'NO_ENCONTRADO',
    })),
    errorValidacion: jest.fn((mensaje) => new ErrorAplicacion(mensaje, {
      estado: 400,
      codigo: 'VALIDACION',
    })),
  };
});

const usuariosRepositorio = require('../data/repositories/users.repository');
const { aPerfil } = require('../data/mappers/user.mapper');
const { obtenerPermisos } = require('../business/rules/permissions');
const { hashPassword, verifyPassword } = require('../business/security/passwords');
const {
  errorNoEncontrado,
  errorValidacion,
} = require('../business/errors/app-error');
const {
  obtenerPerfil,
  cambiarContrasena,
} = require('../business/services/profile.service');

describe('servicio de perfil', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('obtenerPerfil', () => {
    test('devuelve los datos del perfil con sus permisos', async () => {
      const fila = {
        id_usuario: 8,
        nombres: 'Ana',
        apellido_paterno: 'Pérez',
        apellido_materno: null,
        nombre_rol: 'Farmaceutico',
      };
      const perfil = {
        id_usuario: 8,
        nombres: 'Ana',
        nombre_completo: 'Ana Pérez',
      };
      const permisos = ['ventas.crear', 'inventario.ver'];
      usuariosRepositorio.buscarPorId.mockResolvedValue(fila);
      aPerfil.mockReturnValue(perfil);
      obtenerPermisos.mockReturnValue(permisos);

      await expect(obtenerPerfil(8)).resolves.toEqual({
        ...perfil,
        permisos,
      });

      expect(usuariosRepositorio.buscarPorId).toHaveBeenCalledWith(8);
      expect(aPerfil).toHaveBeenCalledWith(fila);
      expect(obtenerPermisos).toHaveBeenCalledWith('Farmaceutico');
    });

    test.each([null, undefined])('rechaza un usuario ausente (%p)', async (id) => {
      usuariosRepositorio.buscarPorId.mockResolvedValue(null);

      await expect(obtenerPerfil(id)).rejects.toMatchObject({
        name: 'ErrorAplicacion',
        estado: 404,
        codigo: 'NO_ENCONTRADO',
        message: 'Usuario no encontrado.',
      });

      expect(errorNoEncontrado).toHaveBeenCalledWith('Usuario no encontrado.');
      expect(aPerfil).not.toHaveBeenCalled();
      expect(obtenerPermisos).not.toHaveBeenCalled();
    });

    test('propaga el error del repositorio', async () => {
      const error = new Error('Error de base de datos');
      usuariosRepositorio.buscarPorId.mockRejectedValue(error);

      await expect(obtenerPerfil(8)).rejects.toBe(error);

      expect(aPerfil).not.toHaveBeenCalled();
    });
  });

  describe('cambiarContrasena', () => {
    const contrasenas = {
      contrasenaActual: 'actual',
      contrasenaNueva: 'nueva',
    };
    const filaHash = { id_usuario: 8, contrasena_hash: 'hash-actual' };

    test('verifica la contraseña actual, cifra la nueva y persiste el cambio', async () => {
      const actualizado = { id_usuario: 8, actualizado: true };
      usuariosRepositorio.buscarHashPorId.mockResolvedValue(filaHash);
      verifyPassword.mockResolvedValue(true);
      hashPassword.mockResolvedValue('hash-nueva');
      usuariosRepositorio.actualizarContrasena.mockResolvedValue(actualizado);

      await expect(cambiarContrasena(8, contrasenas)).resolves.toBe(actualizado);

      expect(usuariosRepositorio.buscarHashPorId).toHaveBeenCalledWith(8);
      expect(verifyPassword).toHaveBeenCalledWith('actual', 'hash-actual');
      expect(hashPassword).toHaveBeenCalledWith('nueva');
      expect(usuariosRepositorio.actualizarContrasena)
        .toHaveBeenCalledWith(8, 'hash-nueva');
    });

    test.each([null, undefined])('rechaza un usuario ausente (%p)', async (id) => {
      usuariosRepositorio.buscarHashPorId.mockResolvedValue(null);

      await expect(cambiarContrasena(id, contrasenas)).rejects.toMatchObject({
        estado: 404,
        codigo: 'NO_ENCONTRADO',
        message: 'Usuario no encontrado.',
      });

      expect(verifyPassword).not.toHaveBeenCalled();
      expect(hashPassword).not.toHaveBeenCalled();
      expect(usuariosRepositorio.actualizarContrasena).not.toHaveBeenCalled();
    });

    test('rechaza una contraseña actual incorrecta', async () => {
      usuariosRepositorio.buscarHashPorId.mockResolvedValue(filaHash);
      verifyPassword.mockResolvedValue(false);

      await expect(cambiarContrasena(8, contrasenas)).rejects.toMatchObject({
        estado: 400,
        codigo: 'VALIDACION',
        message: 'La contraseña actual no es correcta.',
      });

      expect(errorValidacion).toHaveBeenCalledWith(
        'La contraseña actual no es correcta.'
      );
      expect(hashPassword).not.toHaveBeenCalled();
      expect(usuariosRepositorio.actualizarContrasena).not.toHaveBeenCalled();
    });

    test('rechaza si el usuario desaparece al persistir el cambio', async () => {
      usuariosRepositorio.buscarHashPorId.mockResolvedValue(filaHash);
      verifyPassword.mockResolvedValue(true);
      hashPassword.mockResolvedValue('hash-nueva');
      usuariosRepositorio.actualizarContrasena.mockResolvedValue(null);

      await expect(cambiarContrasena(8, contrasenas)).rejects.toMatchObject({
        estado: 404,
        codigo: 'NO_ENCONTRADO',
        message: 'Usuario no encontrado.',
      });

      expect(errorNoEncontrado).toHaveBeenCalledWith('Usuario no encontrado.');
    });

    test('propaga el error al consultar el hash', async () => {
      const error = new Error('Error de base de datos');
      usuariosRepositorio.buscarHashPorId.mockRejectedValue(error);

      await expect(cambiarContrasena(8, contrasenas)).rejects.toBe(error);

      expect(verifyPassword).not.toHaveBeenCalled();
    });

    test('propaga el error al cifrar la nueva contraseña', async () => {
      const error = new Error('Error de cifrado');
      usuariosRepositorio.buscarHashPorId.mockResolvedValue(filaHash);
      verifyPassword.mockResolvedValue(true);
      hashPassword.mockRejectedValue(error);

      await expect(cambiarContrasena(8, contrasenas)).rejects.toBe(error);

      expect(usuariosRepositorio.actualizarContrasena).not.toHaveBeenCalled();
    });

    test('propaga el error al persistir la nueva contraseña', async () => {
      const error = new Error('Error de base de datos');
      usuariosRepositorio.buscarHashPorId.mockResolvedValue(filaHash);
      verifyPassword.mockResolvedValue(true);
      hashPassword.mockResolvedValue('hash-nueva');
      usuariosRepositorio.actualizarContrasena.mockRejectedValue(error);

      await expect(cambiarContrasena(8, contrasenas)).rejects.toBe(error);
    });
  });
});
