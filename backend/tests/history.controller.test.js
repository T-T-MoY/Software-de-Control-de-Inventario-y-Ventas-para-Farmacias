jest.mock('../business/services/reports.service', () => ({
  consultarHistorial: jest.fn(),
  listarUsuariosHistorial: jest.fn(),
}));

const reportesServicio = require('../business/services/reports.service');
const {
  listarHistorial,
  listarUsuarios,
  rechazarModificacion,
} = require('../presentation/controllers/history.controller');

const crearRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  return res;
};

describe('controlador de historial', () => {
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = crearRes();
    next = jest.fn();
  });

  test('listarHistorial envía los filtros al servicio y devuelve la página', async () => {
    const query = { pagina: '2', limite: '25' };
    const historial = { total: 3, registros: [] };
    reportesServicio.consultarHistorial.mockResolvedValue(historial);

    await listarHistorial({ query }, res, next);

    expect(reportesServicio.consultarHistorial).toHaveBeenCalledWith(query);
    expect(res.json).toHaveBeenCalledWith(historial);
    expect(next).not.toHaveBeenCalled();
  });

  test('listarHistorial delega el error en next', async () => {
    const error = new Error('Filtros inválidos');
    reportesServicio.consultarHistorial.mockRejectedValue(error);

    await listarHistorial({ query: {} }, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });

  test('listarUsuarios devuelve los usuarios con operaciones', async () => {
    const usuarios = [{ id_usuario: 1 }];
    reportesServicio.listarUsuariosHistorial.mockResolvedValue(usuarios);

    await listarUsuarios({}, res, next);

    expect(reportesServicio.listarUsuariosHistorial).toHaveBeenCalledWith();
    expect(res.json).toHaveBeenCalledWith(usuarios);
  });

  test('listarUsuarios delega el error en next', async () => {
    const error = new Error('Error de base de datos');
    reportesServicio.listarUsuariosHistorial.mockRejectedValue(error);

    await listarUsuarios({}, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  test('rechazarModificacion responde 405 con Allow GET', () => {
    rechazarModificacion({}, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.set).toHaveBeenCalledWith('Allow', 'GET');
    expect(res.json).toHaveBeenCalledWith({
      error: 'El historial de operaciones es de solo lectura: no se puede modificar ni eliminar.',
    });
  });
});
