jest.mock('../business/services/parameters.service', () => ({
  obtener: jest.fn(),
  actualizar: jest.fn(),
}));

jest.mock('../presentation/validators/parameters.validator', () => ({
  validarDatosParametros: jest.fn(),
  normalizarDatosParametros: jest.fn(),
}));

const parametrosServicio = require('../business/services/parameters.service');
const {
  validarDatosParametros,
  normalizarDatosParametros,
} = require('../presentation/validators/parameters.validator');
const {
  obtenerParametros,
  actualizarParametros,
} = require('../presentation/controllers/parameters.controller');

const crearRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('controlador de parámetros', () => {
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = crearRes();
    next = jest.fn();
    validarDatosParametros.mockReturnValue(null);
    normalizarDatosParametros.mockImplementation((datos) => ({ ...datos }));
  });

  test('obtenerParametros devuelve la configuración vigente', () => {
    const parametros = { margenAlertaDias: 30 };
    parametrosServicio.obtener.mockReturnValue(parametros);

    obtenerParametros({}, res);

    expect(parametrosServicio.obtener).toHaveBeenCalledWith();
    expect(res.json).toHaveBeenCalledWith(parametros);
  });

  test('actualizarParametros valida, normaliza y guarda los cambios', async () => {
    const body = { margenAlertaDias: '20' };
    const normalizado = { margenAlertaDias: 20 };
    const guardado = { margenAlertaDias: 20 };
    normalizarDatosParametros.mockReturnValue(normalizado);
    parametrosServicio.actualizar.mockResolvedValue(guardado);

    await actualizarParametros({ body }, res, next);

    expect(validarDatosParametros).toHaveBeenCalledWith(body);
    expect(normalizarDatosParametros).toHaveBeenCalledWith(body);
    expect(parametrosServicio.actualizar).toHaveBeenCalledWith(normalizado);
    expect(res.json).toHaveBeenCalledWith(guardado);
    expect(next).not.toHaveBeenCalled();
  });

  test('rechaza datos inválidos sin normalizar ni guardar', async () => {
    validarDatosParametros.mockReturnValue('El margen debe ser un entero.');

    await actualizarParametros({ body: {} }, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'El margen debe ser un entero.',
    });
    expect(normalizarDatosParametros).not.toHaveBeenCalled();
    expect(parametrosServicio.actualizar).not.toHaveBeenCalled();
  });

  test('delega el error del servicio en next', async () => {
    const error = new Error('Error de base de datos');
    parametrosServicio.actualizar.mockRejectedValue(error);

    await actualizarParametros({ body: { margenAlertaDias: 20 } }, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });

  test('delega el error de normalización en next', async () => {
    const error = new Error('Datos inválidos');
    normalizarDatosParametros.mockImplementation(() => {
      throw error;
    });

    await actualizarParametros({ body: {} }, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(parametrosServicio.actualizar).not.toHaveBeenCalled();
  });
});
