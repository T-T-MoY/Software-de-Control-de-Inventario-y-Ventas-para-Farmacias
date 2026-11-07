const {
  noEncontrado,
  manejarErrores,
} = require('../presentation/middleware/errors');
const { ErrorAplicacion, errorValidacion } = require('../business/errors/app-error');

const crearRes = () => ({
  headersSent: false,
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe('middleware de errores', () => {
  let consoleError;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  test('noEncontrado responde 404', () => {
    const res = crearRes();

    noEncontrado({}, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Ruta no encontrada' });
  });

  test('manejarErrores delega si la respuesta ya fue enviada', () => {
    const res = crearRes();
    res.headersSent = true;
    const next = jest.fn();
    const error = new Error('tarde');

    manejarErrores(error, {}, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('manejarErrores usa el estado del error de negocio', () => {
    const res = crearRes();

    manejarErrores(errorValidacion('Datos inválidos'), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Datos inválidos' });
    expect(consoleError).not.toHaveBeenCalled();
  });

  test('manejarErrores respeta estados 4xx personalizados', () => {
    const res = crearRes();
    const error = new ErrorAplicacion('No encontrado', {
      estado: 404,
      codigo: 'NO_ENCONTRADO',
    });

    manejarErrores(error, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'No encontrado' });
  });

  test('manejarErrores oculta los detalles de un error 500', () => {
    const res = crearRes();
    const error = new ErrorAplicacion('Falla interna', { estado: 500 });

    manejarErrores(error, {}, res, jest.fn());

    expect(consoleError).toHaveBeenCalledWith('Error no controlado:', error);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Error interno del servidor',
    });
  });

  test('manejarErrores trata como 500 un error sin estado', () => {
    const res = crearRes();
    const error = new Error('sin estado');

    manejarErrores(error, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Error interno del servidor',
    });
  });
});
