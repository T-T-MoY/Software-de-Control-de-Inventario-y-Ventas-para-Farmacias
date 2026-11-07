jest.mock('../business/services/users.service', () => ({
  listar: jest.fn(),
  listarRoles: jest.fn(),
  crear: jest.fn(),
  actualizar: jest.fn(),
  cambiarEstado: jest.fn(),
  obtenerImpacto: jest.fn(),
  eliminarLogicamente: jest.fn(),
}));

jest.mock('../presentation/validators/user.validator', () => ({
  validarDatosUsuario: jest.fn(),
  validarCambioEstado: jest.fn(),
}));

const usuariosServicio = require('../business/services/users.service');
const {
  validarDatosUsuario,
  validarCambioEstado,
} = require('../presentation/validators/user.validator');
const {
  obtenerUsuarios,
  obtenerRoles,
  crearUsuario,
  actualizarUsuario,
  cambiarEstado,
  obtenerImpacto,
  eliminarUsuario,
} = require('../presentation/controllers/users.controller');

const crearRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('controlador de usuarios', () => {
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = crearRes();
    next = jest.fn();
    validarDatosUsuario.mockReturnValue(null);
    validarCambioEstado.mockReturnValue(null);
  });

  describe('obtenerUsuarios y obtenerRoles', () => {
    test('devuelve los usuarios', async () => {
      const usuarios = [{ id_usuario: 1 }];
      usuariosServicio.listar.mockResolvedValue(usuarios);

      await obtenerUsuarios({}, res, next);

      expect(usuariosServicio.listar).toHaveBeenCalledWith();
      expect(res.json).toHaveBeenCalledWith(usuarios);
    });

    test('delega el error al listar usuarios', async () => {
      const error = new Error('Error de base de datos');
      usuariosServicio.listar.mockRejectedValue(error);

      await obtenerUsuarios({}, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    test('devuelve los roles', async () => {
      const roles = [{ id_rol: 1 }];
      usuariosServicio.listarRoles.mockResolvedValue(roles);

      await obtenerRoles({}, res, next);

      expect(usuariosServicio.listarRoles).toHaveBeenCalledWith();
      expect(res.json).toHaveBeenCalledWith(roles);
    });

    test('delega el error al listar roles', async () => {
      const error = new Error('Error de base de datos');
      usuariosServicio.listarRoles.mockRejectedValue(error);

      await obtenerRoles({}, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('crearUsuario', () => {
    test('valida con contraseña obligatoria y crea el usuario', async () => {
      const body = { correo: 'ana@farmacia.test', contrasena: 'secreta' };
      usuariosServicio.crear.mockResolvedValue(21);

      await crearUsuario({ body }, res, next);

      expect(validarDatosUsuario).toHaveBeenCalledWith(body, {
        requiereContrasena: true,
      });
      expect(usuariosServicio.crear).toHaveBeenCalledWith(body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id_usuario: 21 });
    });

    test('rechaza datos inválidos sin llamar al servicio', async () => {
      validarDatosUsuario.mockReturnValue('La contraseña es obligatoria.');

      await crearUsuario({ body: {} }, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'La contraseña es obligatoria.',
      });
      expect(usuariosServicio.crear).not.toHaveBeenCalled();
    });

    test('delega el error en next', async () => {
      const error = new Error('El correo ya está registrado.');
      usuariosServicio.crear.mockRejectedValue(error);

      await crearUsuario({
        body: { correo: 'ana@farmacia.test', contrasena: 'secreta' },
      }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('actualizarUsuario', () => {
    test('valida y actualiza el usuario indicado', async () => {
      const body = { nombres: 'Ana' };
      usuariosServicio.actualizar.mockResolvedValue({ id_usuario: 5 });

      await actualizarUsuario({
        params: { id: '5' },
        body,
        sessionUser: { id_usuario: 8 },
      }, res, next);

      expect(validarDatosUsuario).toHaveBeenCalledWith(body);
      expect(usuariosServicio.actualizar).toHaveBeenCalledWith('5', body, 8);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Usuario actualizado correctamente.',
      });
    });

    test('rechaza datos inválidos', async () => {
      validarDatosUsuario.mockReturnValue('Datos inválidos.');

      await actualizarUsuario({
        params: { id: '5' },
        body: {},
        sessionUser: { id_usuario: 8 },
      }, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(usuariosServicio.actualizar).not.toHaveBeenCalled();
    });

    test('delega el error en next', async () => {
      const error = new Error('Usuario no encontrado.');
      usuariosServicio.actualizar.mockRejectedValue(error);

      await actualizarUsuario({
        params: { id: '5' },
        body: { nombres: 'Ana' },
        sessionUser: { id_usuario: 8 },
      }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('cambiarEstado', () => {
    test('valida el cuerpo y cambia el estado', async () => {
      const body = { activo: false };
      usuariosServicio.cambiarEstado.mockResolvedValue({ id_usuario: 5 });

      await cambiarEstado({
        params: { id: '5' },
        body,
        sessionUser: { id_usuario: 8 },
      }, res, next);

      expect(validarCambioEstado).toHaveBeenCalledWith(body);
      expect(usuariosServicio.cambiarEstado).toHaveBeenCalledWith('5', false, 8);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Estado de usuario actualizado.',
      });
    });

    test('rechaza un cuerpo inválido', async () => {
      validarCambioEstado.mockReturnValue('El estado es obligatorio.');

      await cambiarEstado({
        params: { id: '5' },
        body: {},
        sessionUser: { id_usuario: 8 },
      }, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(usuariosServicio.cambiarEstado).not.toHaveBeenCalled();
    });

    test('delega el error en next', async () => {
      const error = new Error('No puedes desactivar tu propia cuenta.');
      usuariosServicio.cambiarEstado.mockRejectedValue(error);

      await cambiarEstado({
        params: { id: '5' },
        body: { activo: false },
        sessionUser: { id_usuario: 5 },
      }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('obtenerImpacto', () => {
    test('devuelve el impacto del usuario', async () => {
      const impacto = { ventas: 2, historial: 3, total: 5 };
      usuariosServicio.obtenerImpacto.mockResolvedValue(impacto);

      await obtenerImpacto({ params: { id: '5' } }, res, next);

      expect(usuariosServicio.obtenerImpacto).toHaveBeenCalledWith('5');
      expect(res.json).toHaveBeenCalledWith({ impacto });
    });

    test.each(['0', 'abc', '1.5', '', '-1'])(
      'rechaza el identificador inválido %p',
      async (id) => {
        await obtenerImpacto({ params: { id } }, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Identificador de usuario inválido.',
        });
        expect(usuariosServicio.obtenerImpacto).not.toHaveBeenCalled();
      }
    );

    test('delega el error en next', async () => {
      const error = new Error('Usuario no encontrado.');
      usuariosServicio.obtenerImpacto.mockRejectedValue(error);

      await obtenerImpacto({ params: { id: '5' } }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('eliminarUsuario', () => {
    test('elimina lógicamente el usuario indicado', async () => {
      usuariosServicio.eliminarLogicamente.mockResolvedValue({ id_usuario: 5 });

      await eliminarUsuario({
        params: { id: '5' },
        sessionUser: { id_usuario: 8 },
      }, res, next);

      expect(usuariosServicio.eliminarLogicamente).toHaveBeenCalledWith('5', 8);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Usuario eliminado correctamente.',
      });
    });

    test('rechaza un identificador inválido', async () => {
      await eliminarUsuario({
        params: { id: 'abc' },
        sessionUser: { id_usuario: 8 },
      }, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(usuariosServicio.eliminarLogicamente).not.toHaveBeenCalled();
    });

    test('delega el error en next', async () => {
      const error = new Error('Usuario no encontrado.');
      usuariosServicio.eliminarLogicamente.mockRejectedValue(error);

      await eliminarUsuario({
        params: { id: '5' },
        sessionUser: { id_usuario: 8 },
      }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
