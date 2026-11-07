jest.mock('../data/repositories/users.repository', () => ({
  buscarPorCorreo: jest.fn(),
  buscarSesionActiva: jest.fn(),
}));

jest.mock('../data/mappers/user.mapper', () => ({
  aSesion: jest.fn(),
}));

jest.mock('../business/security/passwords', () => ({
  verifyPassword: jest.fn(),
}));

jest.mock('../business/security/session', () => ({
  crearToken: jest.fn(),
}));

jest.mock('../business/rules/permissions', () => ({
  obtenerPermisos: jest.fn(),
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
    errorNoAutorizado: jest.fn((mensaje) => new ErrorAplicacion(mensaje, {
      estado: 401,
      codigo: 'NO_AUTORIZADO',
    })),
    errorProhibido: jest.fn((mensaje) => new ErrorAplicacion(mensaje, {
      estado: 403,
      codigo: 'PROHIBIDO',
    })),
  };
});

const usuariosRepositorio = require('../data/repositories/users.repository');
const { aSesion } = require('../data/mappers/user.mapper');
const { verifyPassword } = require('../business/security/passwords');
const { crearToken } = require('../business/security/session');
const { obtenerPermisos } = require('../business/rules/permissions');
const {
  errorNoAutorizado,
  errorProhibido,
} = require('../business/errors/app-error');
const { iniciarSesion, obtenerSesionActiva } = require('../business/services/auth.service');

describe('servicio de autenticación', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('iniciarSesion', () => {
    const filaUsuario = {
      id_usuario: 18,
      correo: 'ana@farmacia.test',
      contrasena_hash: 'hash-guardado',
      nombre_rol: 'Farmaceutico',
      estado_cuenta: 'Activo',
    };

    test('autentica una cuenta activa y devuelve token, usuario y permisos', async () => {
      const datosSesion = {
        id_usuario: 18,
        correo: 'ana@farmacia.test',
        rol: 'Farmaceutico',
      };
      const permisos = ['ventas.crear', 'inventario.ver'];
      usuariosRepositorio.buscarPorCorreo.mockResolvedValue(filaUsuario);
      verifyPassword.mockResolvedValue(true);
      aSesion.mockReturnValue(datosSesion);
      obtenerPermisos.mockReturnValue(permisos);
      crearToken.mockReturnValue('token-de-prueba');

      const resultado = await iniciarSesion({
        correo: 'ana@farmacia.test',
        contrasena: 'clave-correcta',
      });

      expect(resultado).toEqual({
        token: 'token-de-prueba',
        usuario: { ...datosSesion, permisos },
      });
      expect(usuariosRepositorio.buscarPorCorreo)
        .toHaveBeenCalledWith('ana@farmacia.test');
      expect(verifyPassword).toHaveBeenCalledWith('clave-correcta', 'hash-guardado');
      expect(aSesion).toHaveBeenCalledWith(filaUsuario);
      expect(obtenerPermisos).toHaveBeenCalledWith('Farmaceutico');
      expect(crearToken).toHaveBeenCalledWith({ ...datosSesion, permisos });
    });

    test.each([
      ['correo inexistente', null, 'ana@farmacia.test', 'clave'],
      ['credenciales vacías', null, '', ''],
    ])('rechaza %s sin verificar contraseña', async (_caso, fila, correo, contrasena) => {
      usuariosRepositorio.buscarPorCorreo.mockResolvedValue(fila);

      await expect(iniciarSesion({ correo, contrasena })).rejects.toMatchObject({
        name: 'ErrorAplicacion',
        estado: 401,
        codigo: 'NO_AUTORIZADO',
        message: 'Correo o contraseña incorrectos.',
      });

      expect(usuariosRepositorio.buscarPorCorreo).toHaveBeenCalledWith(correo);
      expect(verifyPassword).not.toHaveBeenCalled();
      expect(errorNoAutorizado).toHaveBeenCalledWith('Correo o contraseña incorrectos.');
      expect(aSesion).not.toHaveBeenCalled();
      expect(obtenerPermisos).not.toHaveBeenCalled();
      expect(crearToken).not.toHaveBeenCalled();
    });

    test('rechaza una contraseña incorrecta', async () => {
      usuariosRepositorio.buscarPorCorreo.mockResolvedValue(filaUsuario);
      verifyPassword.mockResolvedValue(false);

      await expect(iniciarSesion({
        correo: 'ana@farmacia.test',
        contrasena: 'incorrecta',
      })).rejects.toMatchObject({
        estado: 401,
        codigo: 'NO_AUTORIZADO',
      });

      expect(usuariosRepositorio.buscarPorCorreo)
        .toHaveBeenCalledWith('ana@farmacia.test');
      expect(verifyPassword).toHaveBeenCalledWith('incorrecta', 'hash-guardado');
      expect(errorNoAutorizado).toHaveBeenCalledWith('Correo o contraseña incorrectos.');
      expect(aSesion).not.toHaveBeenCalled();
    });

    test.each([
      ['Eliminado', 'Tu cuenta fue eliminada. Contacta al administrador.', 'CUENTA_ELIMINADA'],
      ['Inhabilitado', 'Tu cuenta está inhabilitada. Contacta al administrador.', 'CUENTA_INHABILITADA'],
    ])('rechaza una cuenta con estado %s', async (estado, mensaje, codigo) => {
      usuariosRepositorio.buscarPorCorreo.mockResolvedValue({
        ...filaUsuario,
        estado_cuenta: estado,
      });
      verifyPassword.mockResolvedValue(true);

      await expect(iniciarSesion({
        correo: 'ana@farmacia.test',
        contrasena: 'clave-correcta',
      })).rejects.toMatchObject({
        name: 'ErrorAplicacion',
        message: mensaje,
        estado: 403,
        codigo,
      });

      expect(usuariosRepositorio.buscarPorCorreo)
        .toHaveBeenCalledWith('ana@farmacia.test');
      expect(verifyPassword).toHaveBeenCalledWith('clave-correcta', 'hash-guardado');
      expect(aSesion).not.toHaveBeenCalled();
      expect(obtenerPermisos).not.toHaveBeenCalled();
      expect(crearToken).not.toHaveBeenCalled();
    });

    test('propaga errores del repositorio', async () => {
      const error = new Error('Error de base de datos');
      usuariosRepositorio.buscarPorCorreo.mockRejectedValue(error);

      await expect(iniciarSesion({
        correo: 'ana@farmacia.test',
        contrasena: 'clave-correcta',
      })).rejects.toBe(error);

      expect(usuariosRepositorio.buscarPorCorreo)
        .toHaveBeenCalledWith('ana@farmacia.test');
      expect(verifyPassword).not.toHaveBeenCalled();
    });
  });

  describe('obtenerSesionActiva', () => {
    test('devuelve los datos de sesión de la cuenta activa', async () => {
      usuariosRepositorio.buscarSesionActiva.mockResolvedValue({
        id_usuario: 18,
        nombre_rol: 'Farmaceutico',
        correo: 'ana@farmacia.test',
      });

      await expect(obtenerSesionActiva(18)).resolves.toEqual({
        id_usuario: 18,
        rol: 'Farmaceutico',
      });

      expect(usuariosRepositorio.buscarSesionActiva).toHaveBeenCalledWith(18);
      expect(errorProhibido).not.toHaveBeenCalled();
    });

    test.each([null, undefined])('rechaza una sesión vacía (%p)', async (idUsuario) => {
      usuariosRepositorio.buscarSesionActiva.mockResolvedValue(null);

      await expect(obtenerSesionActiva(idUsuario)).rejects.toMatchObject({
        name: 'ErrorAplicacion',
        estado: 403,
        codigo: 'PROHIBIDO',
        message: 'Se requiere una cuenta activa.',
      });

      expect(usuariosRepositorio.buscarSesionActiva).toHaveBeenCalledWith(idUsuario);
      expect(errorProhibido).toHaveBeenCalledWith('Se requiere una cuenta activa.');
    });

    test('propaga errores del repositorio', async () => {
      const error = new Error('Error de base de datos');
      usuariosRepositorio.buscarSesionActiva.mockRejectedValue(error);

      await expect(obtenerSesionActiva(18)).rejects.toBe(error);

      expect(usuariosRepositorio.buscarSesionActiva).toHaveBeenCalledWith(18);
    });
  });
});
