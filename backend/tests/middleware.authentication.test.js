jest.mock('../business/security/session', () => ({
  verificarToken: jest.fn(),
}));

jest.mock('../business/services/auth.service', () => ({
  obtenerSesionActiva: jest.fn(),
}));

const { verificarToken } = require('../business/security/session');
const { obtenerSesionActiva } = require('../business/services/auth.service');
const {
  autenticarUsuario,
  autenticarAdministrador,
} = require('../presentation/middleware/authentication');

const crearReq = (authorization) => ({
  get: jest.fn(() => authorization),
});

const crearRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

const capturarError = async (middleware, req) => {
  const next = jest.fn();
  await middleware(req, crearRes(), next);
  expect(next).toHaveBeenCalledTimes(1);
  return next.mock.calls[0][0];
};

describe('middleware de autenticación', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('autenticarUsuario', () => {
    test('adjunta la sesión activa y continúa sin error', async () => {
      const req = crearReq('Bearer token-valido');
      const res = crearRes();
      const next = jest.fn();
      const sesion = { id_usuario: 5, rol: 'Administrador' };

      verificarToken.mockReturnValue({ sub: 5, rol: 'Administrador' });
      obtenerSesionActiva.mockResolvedValue(sesion);

      await autenticarUsuario(req, res, next);

      expect(verificarToken).toHaveBeenCalledWith('token-valido');
      expect(obtenerSesionActiva).toHaveBeenCalledWith(5);
      expect(req.sessionUser).toBe(sesion);
      expect(next).toHaveBeenCalledWith();
    });

    test.each([
      [undefined],
      [''],
      ['token-sin-esquema'],
      ['Basic token'],
      ['Bearer'],
    ])('rechaza la cabecera %p con 401', async (authorization) => {
      const error = await capturarError(
        autenticarUsuario,
        crearReq(authorization)
      );

      expect(error).toMatchObject({
        estado: 401,
        message: 'Debes iniciar sesión.',
      });
      expect(verificarToken).not.toHaveBeenCalled();
    });

    test('propaga el error de verificación del token', async () => {
      const errorOriginal = new Error('Token inválido');
      verificarToken.mockImplementation(() => {
        throw errorOriginal;
      });

      const error = await capturarError(
        autenticarUsuario,
        crearReq('Bearer token')
      );

      expect(error).toBe(errorOriginal);
      expect(obtenerSesionActiva).not.toHaveBeenCalled();
    });

    test('propaga el error al cargar la sesión activa', async () => {
      const errorOriginal = new Error('Sin sesión');
      verificarToken.mockReturnValue({ sub: 5 });
      obtenerSesionActiva.mockRejectedValue(errorOriginal);

      const error = await capturarError(
        autenticarUsuario,
        crearReq('Bearer token')
      );

      expect(error).toBe(errorOriginal);
    });
  });

  describe('autenticarAdministrador', () => {
    test('permite el acceso a una cuenta administradora', async () => {
      const req = crearReq('Bearer token');
      const next = jest.fn();
      const sesion = { id_usuario: 1, rol: 'Administrador' };

      verificarToken.mockReturnValue({ sub: 1 });
      obtenerSesionActiva.mockResolvedValue(sesion);

      await autenticarAdministrador(req, crearRes(), next);

      expect(req.sessionUser).toBe(sesion);
      expect(next).toHaveBeenCalledWith();
    });

    test('prohíbe el acceso a un rol distinto de Administrador', async () => {
      verificarToken.mockReturnValue({ sub: 2 });
      obtenerSesionActiva.mockResolvedValue({
        id_usuario: 2,
        rol: 'Ventas',
      });

      const error = await capturarError(
        autenticarAdministrador,
        crearReq('Bearer token')
      );

      expect(error).toMatchObject({
        estado: 403,
        message: 'Se requiere una cuenta administradora activa.',
      });
    });

    test('propaga el error de autenticación', async () => {
      const error = await capturarError(
        autenticarAdministrador,
        crearReq('')
      );

      expect(error).toMatchObject({ estado: 401 });
    });
  });
});
