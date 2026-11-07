const {
  autorizar,
  autorizarRoles,
} = require('../presentation/middleware/authorization');
const { PERMISOS } = require('../business/rules/permissions');

const crearRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe('middleware de autorización por permisos', () => {
  test('responde 401 cuando no hay sesión', () => {
    const res = crearRes();
    const next = jest.fn();

    autorizar(PERMISOS.CONSULTAR_CATALOGO)({}, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Debes iniciar sesión.' });
    expect(next).not.toHaveBeenCalled();
  });

  test('permite el acceso cuando el rol tiene el permiso', () => {
    const req = { sessionUser: { rol: 'Ventas' } };
    const res = crearRes();
    const next = jest.fn();

    autorizar(PERMISOS.PROCESAR_VENTAS)(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('permite el acceso cuando coincide al menos uno de los permisos', () => {
    const req = { sessionUser: { rol: 'Encargado de inventario' } };
    const next = jest.fn();

    autorizar(
      PERMISOS.ADMINISTRAR_USUARIOS,
      PERMISOS.GESTIONAR_CATALOGO
    )(req, crearRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  test('responde 403 cuando el rol no tiene ninguno de los permisos', () => {
    const req = { sessionUser: { rol: 'Ventas' } };
    const res = crearRes();
    const next = jest.fn();

    autorizar(PERMISOS.GESTIONAR_CATALOGO)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'No tienes permiso para realizar esta acción.',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('responde 403 para un rol desconocido', () => {
    const req = { sessionUser: { rol: 'Invitado' } };
    const res = crearRes();

    autorizar(PERMISOS.CONSULTAR_CATALOGO)(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('middleware de autorización por rol', () => {
  test('responde 401 cuando no hay sesión', () => {
    const res = crearRes();
    const next = jest.fn();

    autorizarRoles('Administrador')({}, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('permite el acceso cuando el rol está en la lista', () => {
    const req = { sessionUser: { rol: 'Administrador' } };
    const next = jest.fn();

    autorizarRoles('Administrador', 'Ventas')(req, crearRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  test('responde 403 cuando el rol no está en la lista', () => {
    const req = { sessionUser: { rol: 'Ventas' } };
    const res = crearRes();

    autorizarRoles('Administrador')(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'No tienes permiso para realizar esta acción.',
    });
  });
});
