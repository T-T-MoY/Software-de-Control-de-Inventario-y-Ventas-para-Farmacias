const crypto = require('crypto');
const {
  crearToken,
  verificarToken,
} = require('../business/security/session');

const SECRETO = 'secreto-de-pruebas-con-mas-de-32-caracteres';
const usuario = { id_usuario: 5, rol: 'Administrador' };

const capturar = (fn) => {
  try {
    fn();
    return null;
  } catch (error) {
    return error;
  }
};

const firmarPayload = (payload, secreto = SECRETO) => crypto
  .createHmac('sha256', secreto)
  .update(payload)
  .digest('base64url');

const tokenConPayload = (objeto, secreto = SECRETO) => {
  const payload = Buffer.from(JSON.stringify(objeto)).toString('base64url');
  return `${payload}.${firmarPayload(payload, secreto)}`;
};

describe('sesión firmada', () => {
  const secretoOriginal = process.env.SESSION_SECRET;

  beforeEach(() => {
    process.env.SESSION_SECRET = SECRETO;
  });

  afterAll(() => {
    if (secretoOriginal === undefined) {
      delete process.env.SESSION_SECRET;
    } else {
      process.env.SESSION_SECRET = secretoOriginal;
    }
  });

  test('crea un token verificable con los datos del usuario', () => {
    const token = crearToken(usuario);
    const sesion = verificarToken(token);

    expect(token.split('.')).toHaveLength(2);
    expect(sesion).toMatchObject({
      sub: 5,
      rol: 'Administrador',
    });
    expect(sesion.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  test('rechaza un token vacío o sin firma', () => {
    expect(capturar(() => verificarToken(''))).toMatchObject({
      estado: 401,
      message: 'La sesión no es válida.',
    });
    expect(capturar(() => verificarToken('solo-payload'))).toMatchObject({
      estado: 401,
    });
    expect(capturar(() => verificarToken(undefined))).toMatchObject({
      estado: 401,
    });
  });

  test('rechaza una firma distinta o de otra longitud', () => {
    const token = crearToken(usuario);
    const [payload] = token.split('.');

    expect(capturar(() => verificarToken(`${payload}.firma-corta`)))
      .toMatchObject({ estado: 401 });
    expect(capturar(() => verificarToken(`${payload}.${'a'.repeat(43)}`)))
      .toMatchObject({ estado: 401 });
  });

  test('rechaza un token firmado con otro secreto', () => {
    const token = tokenConPayload(
      { sub: 5, rol: 'Ventas', exp: Math.floor(Date.now() / 1000) + 60 },
      'otro-secreto-con-mas-de-32-caracteres'
    );

    expect(capturar(() => verificarToken(token))).toMatchObject({
      estado: 401,
      message: 'La sesión no es válida.',
    });
  });

  test('rechaza un payload que no es JSON', () => {
    const payload = Buffer.from('esto no es json').toString('base64url');
    const token = `${payload}.${firmarPayload(payload)}`;

    expect(capturar(() => verificarToken(token))).toMatchObject({
      estado: 401,
      message: 'La sesión no es válida.',
    });
  });

  test('rechaza un payload sin identificador entero', () => {
    const sinSub = tokenConPayload({
      rol: 'Ventas',
      exp: Math.floor(Date.now() / 1000) + 60,
    });
    const subTexto = tokenConPayload({
      sub: '5',
      exp: Math.floor(Date.now() / 1000) + 60,
    });

    expect(capturar(() => verificarToken(sinSub))).toMatchObject({
      estado: 401,
    });
    expect(capturar(() => verificarToken(subTexto))).toMatchObject({
      estado: 401,
    });
  });

  test('rechaza un token vencido', () => {
    const vencido = tokenConPayload({
      sub: 5,
      rol: 'Ventas',
      exp: Math.floor(Date.now() / 1000) - 1,
    });

    expect(capturar(() => verificarToken(vencido))).toMatchObject({
      estado: 401,
      message: 'La sesión venció.',
    });
  });

  test('exige un secreto de al menos 32 caracteres', () => {
    process.env.SESSION_SECRET = 'corto';

    const error = capturar(() => crearToken(usuario));

    expect(error).toBeInstanceOf(Error);
    expect(error.message)
      .toBe('SESSION_SECRET debe tener al menos 32 caracteres.');
  });

  test('exige que el secreto exista', () => {
    delete process.env.SESSION_SECRET;

    expect(capturar(() => crearToken(usuario))).toMatchObject({
      message: 'SESSION_SECRET debe tener al menos 32 caracteres.',
    });
  });
});
