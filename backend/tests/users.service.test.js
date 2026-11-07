jest.mock('../data/repositories/users.repository', () => ({
  listar: jest.fn(),
  buscarPorId: jest.fn(),
  contarImpacto: jest.fn(),
  crear: jest.fn(),
  actualizar: jest.fn(),
  cambiarEstado: jest.fn(),
  eliminarLogicamente: jest.fn(),
}));

jest.mock('../data/repositories/roles.repository', () => ({
  listar: jest.fn(),
  buscarPorId: jest.fn(),
}));

jest.mock('../business/security/passwords', () => ({
  hashPassword: jest.fn(),
}));

jest.mock('../business/rules/users.rules', () => ({
  validarCambioRolPropio: jest.fn(),
  validarDesactivacionPropia: jest.fn(),
  validarEliminacionPropia: jest.fn(),
  normalizarDatosUsuario: jest.fn(),
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
    errorConflicto: jest.fn((mensaje) => new ErrorAplicacion(mensaje, {
      estado: 409,
      codigo: 'CONFLICTO',
    })),
    errorValidacion: jest.fn((mensaje) => new ErrorAplicacion(mensaje, {
      estado: 400,
      codigo: 'VALIDACION',
    })),
    errorNoEncontrado: jest.fn((mensaje) => new ErrorAplicacion(mensaje, {
      estado: 404,
      codigo: 'NO_ENCONTRADO',
    })),
  };
});

const usuariosRepositorio = require('../data/repositories/users.repository');
const rolesRepositorio = require('../data/repositories/roles.repository');
const { hashPassword } = require('../business/security/passwords');
const {
  validarCambioRolPropio,
  validarDesactivacionPropia,
  validarEliminacionPropia,
  normalizarDatosUsuario,
} = require('../business/rules/users.rules');
const { errorNoEncontrado } = require('../business/errors/app-error');
const {
  listar,
  listarRoles,
  crear,
  actualizar,
  cambiarEstado,
  obtenerImpacto,
  eliminarLogicamente,
} = require('../business/services/users.service');

describe('servicio de usuarios', () => {
  const usuarioNormalizado = {
    nombres: 'Ana',
    apellido_paterno: 'Pérez',
    apellido_materno: null,
    fecha_nacimiento: '1990-01-01',
    correo: 'ana@farmacia.test',
    ci: '123456',
    id_rol: 2,
    contrasena: 'secreta',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    validarCambioRolPropio.mockReturnValue(undefined);
    validarDesactivacionPropia.mockReturnValue(undefined);
    validarEliminacionPropia.mockReturnValue(undefined);
  });

  describe('listar y listarRoles', () => {
    test('devuelve los usuarios', async () => {
      const usuarios = [{ id_usuario: 1 }];
      usuariosRepositorio.listar.mockResolvedValue(usuarios);

      await expect(listar()).resolves.toBe(usuarios);

      expect(usuariosRepositorio.listar).toHaveBeenCalledWith();
    });

    test('propaga el error al listar usuarios', async () => {
      const error = new Error('Error de base de datos');
      usuariosRepositorio.listar.mockRejectedValue(error);

      await expect(listar()).rejects.toBe(error);
    });

    test('devuelve los roles', async () => {
      const roles = [{ id_rol: 1, nombre_rol: 'Administrador' }];
      rolesRepositorio.listar.mockResolvedValue(roles);

      await expect(listarRoles()).resolves.toBe(roles);

      expect(rolesRepositorio.listar).toHaveBeenCalledWith();
    });

    test('propaga el error al listar roles', async () => {
      const error = new Error('Error de base de datos');
      rolesRepositorio.listar.mockRejectedValue(error);

      await expect(listarRoles()).rejects.toBe(error);
    });
  });

  describe('crear', () => {
    test('cifra la contraseña y crea el usuario', async () => {
      normalizarDatosUsuario.mockReturnValue(usuarioNormalizado);
      hashPassword.mockResolvedValue('hash-secreto');
      usuariosRepositorio.crear.mockResolvedValue(21);

      await expect(crear({ correo: 'ana@farmacia.test' })).resolves.toBe(21);

      expect(normalizarDatosUsuario).toHaveBeenCalledWith({ correo: 'ana@farmacia.test' });
      expect(hashPassword).toHaveBeenCalledWith('secreta');
      expect(usuariosRepositorio.crear).toHaveBeenCalledWith({
        ...usuarioNormalizado,
        contrasenaHash: 'hash-secreto',
      });
    });

    test.each([
      ['23505', 409, 'CONFLICTO', 'El correo o CI/NIT ya está registrado.'],
      ['23503', 400, 'VALIDACION', 'El rol seleccionado no existe.'],
    ])('traduce el código PostgreSQL %s al crear', async (code, estado, codigo, mensaje) => {
      normalizarDatosUsuario.mockReturnValue(usuarioNormalizado);
      hashPassword.mockResolvedValue('hash-secreto');
      usuariosRepositorio.crear.mockRejectedValue({ code });

      await expect(crear({})).rejects.toMatchObject({ estado, codigo, message: mensaje });
    });

    test('propaga errores no reconocidos al crear', async () => {
      const error = new Error('Error inesperado');
      normalizarDatosUsuario.mockReturnValue(usuarioNormalizado);
      hashPassword.mockResolvedValue('hash-secreto');
      usuariosRepositorio.crear.mockRejectedValue(error);

      await expect(crear({})).rejects.toBe(error);
    });

    test('propaga el error de normalización sin cifrar ni persistir', async () => {
      const error = new Error('Datos inválidos');
      normalizarDatosUsuario.mockImplementation(() => {
        throw error;
      });

      await expect(crear(null)).rejects.toBe(error);

      expect(hashPassword).not.toHaveBeenCalled();
      expect(usuariosRepositorio.crear).not.toHaveBeenCalled();
    });

    test('propaga el error al cifrar la contraseña', async () => {
      const error = new Error('Error de cifrado');
      normalizarDatosUsuario.mockReturnValue(usuarioNormalizado);
      hashPassword.mockRejectedValue(error);

      await expect(crear({})).rejects.toBe(error);

      expect(usuariosRepositorio.crear).not.toHaveBeenCalled();
    });
  });

  describe('actualizar', () => {
    test('actualiza otro usuario sin consultar su rol', async () => {
      const actualizado = { id_usuario: 5 };
      normalizarDatosUsuario.mockReturnValue(usuarioNormalizado);
      hashPassword.mockResolvedValue('hash-nueva');
      usuariosRepositorio.actualizar.mockResolvedValue(actualizado);

      await expect(actualizar(5, {}, 9)).resolves.toBe(actualizado);

      expect(rolesRepositorio.buscarPorId).not.toHaveBeenCalled();
      expect(validarCambioRolPropio).not.toHaveBeenCalled();
      expect(hashPassword).toHaveBeenCalledWith('secreta');
      expect(usuariosRepositorio.actualizar).toHaveBeenCalledWith(5, {
        ...usuarioNormalizado,
        contrasenaHash: 'hash-nueva',
      });
    });

    test('valida el cambio de rol cuando el usuario se edita a sí mismo', async () => {
      normalizarDatosUsuario.mockReturnValue(usuarioNormalizado);
      rolesRepositorio.buscarPorId.mockResolvedValue({
        id_rol: 2,
        nombre_rol: 'Farmaceutico',
      });
      hashPassword.mockResolvedValue('hash-nueva');
      usuariosRepositorio.actualizar.mockResolvedValue({ id_usuario: 5 });

      await actualizar('5', {}, 5);

      expect(rolesRepositorio.buscarPorId).toHaveBeenCalledWith(2);
      expect(validarCambioRolPropio).toHaveBeenCalledWith({
        idSesion: 5,
        idUsuario: '5',
        rolNuevo: 'Farmaceutico',
      });
    });

    test('usa undefined como rol nuevo cuando el rol no existe', async () => {
      normalizarDatosUsuario.mockReturnValue(usuarioNormalizado);
      rolesRepositorio.buscarPorId.mockResolvedValue(null);
      hashPassword.mockResolvedValue('hash-nueva');
      usuariosRepositorio.actualizar.mockResolvedValue({ id_usuario: 5 });

      await actualizar(5, {}, 5);

      expect(validarCambioRolPropio).toHaveBeenCalledWith({
        idSesion: 5,
        idUsuario: 5,
        rolNuevo: undefined,
      });
    });

    test('propaga el error de la validación de cambio de rol', async () => {
      const error = new Error('No puedes quitarte el rol de administrador.');
      normalizarDatosUsuario.mockReturnValue(usuarioNormalizado);
      rolesRepositorio.buscarPorId.mockResolvedValue({ nombre_rol: 'Farmaceutico' });
      validarCambioRolPropio.mockImplementation(() => {
        throw error;
      });

      await expect(actualizar(5, {}, 5)).rejects.toBe(error);

      expect(hashPassword).not.toHaveBeenCalled();
      expect(usuariosRepositorio.actualizar).not.toHaveBeenCalled();
    });

    test('no cifra una contraseña ausente', async () => {
      normalizarDatosUsuario.mockReturnValue({
        ...usuarioNormalizado,
        contrasena: undefined,
      });
      usuariosRepositorio.actualizar.mockResolvedValue({ id_usuario: 5 });

      await actualizar(5, {}, 9);

      expect(hashPassword).not.toHaveBeenCalled();
      expect(usuariosRepositorio.actualizar).toHaveBeenCalledWith(5, {
        ...usuarioNormalizado,
        contrasena: undefined,
        contrasenaHash: null,
      });
    });

    test('rechaza un usuario inexistente', async () => {
      normalizarDatosUsuario.mockReturnValue(usuarioNormalizado);
      hashPassword.mockResolvedValue('hash-nueva');
      usuariosRepositorio.actualizar.mockResolvedValue(null);

      await expect(actualizar(99, {}, 9)).rejects.toMatchObject({
        estado: 404,
        codigo: 'NO_ENCONTRADO',
        message: 'Usuario no encontrado.',
      });

      expect(errorNoEncontrado).toHaveBeenCalledWith('Usuario no encontrado.');
    });

    test.each([
      ['23505', 409, 'CONFLICTO', 'El correo o CI/NIT ya está registrado.'],
      ['23503', 400, 'VALIDACION', 'El rol seleccionado no existe.'],
    ])('traduce el código PostgreSQL %s al actualizar', async (code, estado, codigo, mensaje) => {
      normalizarDatosUsuario.mockReturnValue(usuarioNormalizado);
      hashPassword.mockResolvedValue('hash-nueva');
      usuariosRepositorio.actualizar.mockRejectedValue({ code });

      await expect(actualizar(5, {}, 9)).rejects.toMatchObject({
        estado,
        codigo,
        message: mensaje,
      });
    });

    test('propaga errores no reconocidos al actualizar', async () => {
      const error = new Error('Error inesperado');
      normalizarDatosUsuario.mockReturnValue(usuarioNormalizado);
      hashPassword.mockResolvedValue('hash-nueva');
      usuariosRepositorio.actualizar.mockRejectedValue(error);

      await expect(actualizar(5, {}, 9)).rejects.toBe(error);
    });
  });

  describe('cambiarEstado', () => {
    test('valida el cambio y devuelve el usuario actualizado', async () => {
      const actualizado = { id_usuario: 5, estado_cuenta: 'Inactivo' };
      usuariosRepositorio.cambiarEstado.mockResolvedValue(actualizado);

      await expect(cambiarEstado(5, false, 9)).resolves.toBe(actualizado);

      expect(validarDesactivacionPropia)
        .toHaveBeenCalledWith({ idSesion: 9, idUsuario: 5, activo: false });
      expect(usuariosRepositorio.cambiarEstado).toHaveBeenCalledWith(5, false);
    });

    test('rechaza un usuario inexistente', async () => {
      usuariosRepositorio.cambiarEstado.mockResolvedValue(null);

      await expect(cambiarEstado(99, true, 9)).rejects.toMatchObject({
        estado: 404,
        codigo: 'NO_ENCONTRADO',
        message: 'Usuario no encontrado.',
      });
    });

    test('no consulta el repositorio si la validación falla', async () => {
      const error = new Error('No puedes desactivar tu propia cuenta.');
      validarDesactivacionPropia.mockImplementation(() => {
        throw error;
      });

      await expect(cambiarEstado(5, false, 5)).rejects.toBe(error);

      expect(usuariosRepositorio.cambiarEstado).not.toHaveBeenCalled();
    });

    test('propaga el error del repositorio', async () => {
      const error = new Error('Error de base de datos');
      usuariosRepositorio.cambiarEstado.mockRejectedValue(error);

      await expect(cambiarEstado(5, true, 9)).rejects.toBe(error);
    });
  });

  describe('obtenerImpacto', () => {
    test('devuelve ventas, historial y total de registros dependientes', async () => {
      usuariosRepositorio.buscarPorId.mockResolvedValue({
        id_usuario: 5,
        estado_cuenta: 'Activo',
      });
      usuariosRepositorio.contarImpacto.mockResolvedValue({
        ventas: 2,
        historial: 3,
      });

      await expect(obtenerImpacto(5)).resolves.toEqual({
        ventas: 2,
        historial: 3,
        total: 5,
      });

      expect(usuariosRepositorio.buscarPorId).toHaveBeenCalledWith(5);
      expect(usuariosRepositorio.contarImpacto).toHaveBeenCalledWith(5);
    });

    test.each([null, undefined])('rechaza un usuario ausente (%p)', async (id) => {
      usuariosRepositorio.buscarPorId.mockResolvedValue(null);

      await expect(obtenerImpacto(id)).rejects.toMatchObject({
        estado: 404,
        codigo: 'NO_ENCONTRADO',
        message: 'Usuario no encontrado.',
      });

      expect(usuariosRepositorio.contarImpacto).not.toHaveBeenCalled();
    });

    test('rechaza un usuario eliminado', async () => {
      usuariosRepositorio.buscarPorId.mockResolvedValue({
        id_usuario: 5,
        estado_cuenta: 'Eliminado',
      });

      await expect(obtenerImpacto(5)).rejects.toMatchObject({
        estado: 404,
        codigo: 'NO_ENCONTRADO',
        message: 'Usuario no encontrado.',
      });

      expect(usuariosRepositorio.contarImpacto).not.toHaveBeenCalled();
    });

    test('propaga el error al contar el impacto', async () => {
      const error = new Error('Error de base de datos');
      usuariosRepositorio.buscarPorId.mockResolvedValue({ estado_cuenta: 'Activo' });
      usuariosRepositorio.contarImpacto.mockRejectedValue(error);

      await expect(obtenerImpacto(5)).rejects.toBe(error);
    });
  });

  describe('eliminarLogicamente', () => {
    test('valida la baja y devuelve el usuario eliminado', async () => {
      const eliminado = { id_usuario: 5, estado_cuenta: 'Eliminado' };
      usuariosRepositorio.eliminarLogicamente.mockResolvedValue(eliminado);

      await expect(eliminarLogicamente(5, 9)).resolves.toBe(eliminado);

      expect(validarEliminacionPropia)
        .toHaveBeenCalledWith({ idSesion: 9, idUsuario: 5 });
      expect(usuariosRepositorio.eliminarLogicamente).toHaveBeenCalledWith(5);
    });

    test('rechaza un usuario inexistente', async () => {
      usuariosRepositorio.eliminarLogicamente.mockResolvedValue(null);

      await expect(eliminarLogicamente(99, 9)).rejects.toMatchObject({
        estado: 404,
        codigo: 'NO_ENCONTRADO',
        message: 'Usuario no encontrado.',
      });
    });

    test('no consulta el repositorio si la validación falla', async () => {
      const error = new Error('No puedes eliminar tu propia cuenta.');
      validarEliminacionPropia.mockImplementation(() => {
        throw error;
      });

      await expect(eliminarLogicamente(5, 5)).rejects.toBe(error);

      expect(usuariosRepositorio.eliminarLogicamente).not.toHaveBeenCalled();
    });

    test('propaga el error del repositorio', async () => {
      const error = new Error('Error de base de datos');
      usuariosRepositorio.eliminarLogicamente.mockRejectedValue(error);

      await expect(eliminarLogicamente(5, 9)).rejects.toBe(error);
    });
  });
});
