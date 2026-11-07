jest.mock('../business/services/auth.service', () => ({
  iniciarSesion: jest.fn(),
}));

jest.mock('../presentation/validators/fields', () => ({
  validarCorreo: jest.fn(),
}));

const { iniciarSesion } = require('../business/services/auth.service');
const { validarCorreo } = require('../presentation/validators/fields');
const { login } = require('../presentation/controllers/auth.controller');

const crearRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('controlador de autenticación', () => {
  let res;
  let consoleError;

  beforeEach(() => {
    jest.clearAllMocks();
    res = crearRes();
    validarCorreo.mockReturnValue(null);
    iniciarSesion.mockResolvedValue({
      token: 'token-123',
      usuario: { id_usuario: 1 },
    });
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  test('normaliza el correo e inicia sesión correctamente', async () => {
    await login({
      body: { email: '  ANA@FARMACIA.TEST ', password: 'clave' },
    }, res);

    expect(validarCorreo).toHaveBeenCalledWith('ana@farmacia.test');
    expect(iniciarSesion).toHaveBeenCalledWith({
      correo: 'ana@farmacia.test',
      contrasena: 'clave',
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      token: 'token-123',
      usuario: { id_usuario: 1 },
    });
    expect(res.status).not.toHaveBeenCalled();
  });

  test.each([
    ['correo ausente', { password: 'clave' }],
    ['contraseña ausente', { email: 'ana@farmacia.test' }],
    ['correo no textual', { email: 123, password: 'clave' }],
    ['contraseña no textual', { email: 'ana@farmacia.test', password: 123 }],
    ['correo vacío', { email: '   ', password: 'clave' }],
    ['contraseña vacía', { email: 'ana@farmacia.test', password: '' }],
  ])('rechaza %s con un 400', async (_caso, body) => {
    await login({ body }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      mensaje: 'Ingresa correo y contraseña.',
    });
    expect(validarCorreo).not.toHaveBeenCalled();
    expect(iniciarSesion).not.toHaveBeenCalled();
  });

  test('rechaza un correo con formato inválido', async () => {
    validarCorreo.mockReturnValue('Ingresa un correo válido.');

    await login({
      body: { email: 'correo-invalido', password: 'clave' },
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      mensaje: 'Ingresa un correo válido.',
    });
    expect(iniciarSesion).not.toHaveBeenCalled();
  });

  test.each([400, 401, 403])(
    'conserva el contrato de error para el estado %s',
    async (estado) => {
      const error = new Error('Credenciales incorrectas');
      error.estado = estado;
      error.codigo = 'NO_AUTORIZADO';
      iniciarSesion.mockRejectedValue(error);

      await login({
        body: { email: 'ana@farmacia.test', password: 'mala' },
      }, res);

      expect(res.status).toHaveBeenCalledWith(estado);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        mensaje: 'Credenciales incorrectas',
        codigo: 'NO_AUTORIZADO',
      });
      expect(consoleError).not.toHaveBeenCalled();
    }
  );

  test('oculta los detalles de un error interno', async () => {
    const error = new Error('Fallo de infraestructura');
    error.estado = 500;
    iniciarSesion.mockRejectedValue(error);

    await login({
      body: { email: 'ana@farmacia.test', password: 'clave' },
    }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      mensaje: 'No se pudo iniciar sesión.',
    });
    expect(consoleError).toHaveBeenCalledWith('Error en el login:', error);
  });

  test('trata como interno un error sin estado', async () => {
    const error = new Error('Error inesperado');
    iniciarSesion.mockRejectedValue(error);

    await login({
      body: { email: 'ana@farmacia.test', password: 'clave' },
    }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      mensaje: 'No se pudo iniciar sesión.',
    });
    expect(consoleError).toHaveBeenCalledWith('Error en el login:', error);
  });
});
