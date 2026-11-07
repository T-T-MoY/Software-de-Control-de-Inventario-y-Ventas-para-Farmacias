jest.mock('../business/services/profile.service', () => ({
  obtenerPerfil: jest.fn(),
  cambiarContrasena: jest.fn(),
}));

jest.mock('../presentation/validators/user.validator', () => ({
  validarCambioContrasena: jest.fn(),
}));

const perfilServicio = require('../business/services/profile.service');
const { validarCambioContrasena } = require('../presentation/validators/user.validator');
const {
  obtenerPerfil,
  cambiarContrasena,
} = require('../presentation/controllers/profile.controller');

const crearRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('controlador de perfil', () => {
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = crearRes();
    next = jest.fn();
    validarCambioContrasena.mockReturnValue(null);
  });

  describe('obtenerPerfil', () => {
    test('devuelve el perfil del usuario en sesión', async () => {
      const perfil = { id_usuario: 8, nombre_completo: 'Ana Pérez' };
      perfilServicio.obtenerPerfil.mockResolvedValue(perfil);

      await obtenerPerfil({ sessionUser: { id_usuario: 8 } }, res, next);

      expect(perfilServicio.obtenerPerfil).toHaveBeenCalledWith(8);
      expect(res.json).toHaveBeenCalledWith(perfil);
      expect(next).not.toHaveBeenCalled();
    });

    test('delega el error en next', async () => {
      const error = new Error('Usuario no encontrado.');
      perfilServicio.obtenerPerfil.mockRejectedValue(error);

      await obtenerPerfil({ sessionUser: { id_usuario: 8 } }, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('cambiarContrasena', () => {
    test('valida y cambia la contraseña del usuario en sesión', async () => {
      const body = {
        contrasena_actual: 'actual',
        contrasena_nueva: 'nueva',
      };
      perfilServicio.cambiarContrasena.mockResolvedValue({ id_usuario: 8 });

      await cambiarContrasena({ sessionUser: { id_usuario: 8 }, body }, res, next);

      expect(validarCambioContrasena).toHaveBeenCalledWith(body);
      expect(perfilServicio.cambiarContrasena).toHaveBeenCalledWith(8, {
        contrasenaActual: 'actual',
        contrasenaNueva: 'nueva',
      });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Contraseña actualizada correctamente.',
      });
    });

    test('rechaza datos inválidos sin llamar al servicio', async () => {
      validarCambioContrasena.mockReturnValue('La nueva contraseña es obligatoria.');

      await cambiarContrasena({
        sessionUser: { id_usuario: 8 },
        body: {},
      }, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'La nueva contraseña es obligatoria.',
      });
      expect(perfilServicio.cambiarContrasena).not.toHaveBeenCalled();
    });

    test('delega el error en next', async () => {
      const error = new Error('La contraseña actual no es correcta.');
      perfilServicio.cambiarContrasena.mockRejectedValue(error);

      await cambiarContrasena({
        sessionUser: { id_usuario: 8 },
        body: { contrasena_actual: 'mala', contrasena_nueva: 'nueva' },
      }, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
