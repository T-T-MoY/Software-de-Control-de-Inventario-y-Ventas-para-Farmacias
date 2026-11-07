jest.mock('../business/services/lots.service', () => ({
  listar: jest.fn(),
  obtener: jest.fn(),
  registrarRecepcion: jest.fn(),
  darBajaVencido: jest.fn(),
}));

jest.mock('../presentation/validators/lot.validator', () => ({
  validarDatosRecepcion: jest.fn(),
  esIdValido: jest.fn(),
}));

const lotesServicio = require('../business/services/lots.service');
const {
  validarDatosRecepcion,
  esIdValido,
} = require('../presentation/validators/lot.validator');
const {
  obtenerLotes,
  obtenerLote,
  registrarRecepcion,
  darBajaLote,
} = require('../presentation/controllers/lots.controller');

const crearRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('controlador de lotes', () => {
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = crearRes();
    next = jest.fn();
    esIdValido.mockReturnValue(true);
    validarDatosRecepcion.mockReturnValue(null);
  });

  describe('obtenerLotes', () => {
    test('envía el término de búsqueda recortado', async () => {
      const lotes = [{ id_lote: 1 }];
      lotesServicio.listar.mockResolvedValue(lotes);

      await obtenerLotes({ query: { buscar: ' L-2026 ' } }, res, next);

      expect(lotesServicio.listar).toHaveBeenCalledWith('L-2026');
      expect(res.json).toHaveBeenCalledWith(lotes);
    });

    test.each([
      ['sin query', {}],
      ['búsqueda no textual', { buscar: 123 }],
    ])('usa cadena vacía %s', async (_caso, query) => {
      lotesServicio.listar.mockResolvedValue([]);

      await obtenerLotes({ query }, res, next);

      expect(lotesServicio.listar).toHaveBeenCalledWith('');
      expect(res.json).toHaveBeenCalledWith([]);
    });

    test('delega el error en next', async () => {
      const error = new Error('Error de base de datos');
      lotesServicio.listar.mockRejectedValue(error);

      await obtenerLotes({ query: {} }, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('obtenerLote', () => {
    test('convierte el id y devuelve el lote', async () => {
      const lote = { id_lote: 4 };
      lotesServicio.obtener.mockResolvedValue(lote);

      await obtenerLote({ params: { id: '4' } }, res, next);

      expect(esIdValido).toHaveBeenCalledWith('4');
      expect(lotesServicio.obtener).toHaveBeenCalledWith(4);
      expect(res.json).toHaveBeenCalledWith(lote);
    });

    test('rechaza un identificador inválido', async () => {
      esIdValido.mockReturnValue(false);

      await obtenerLote({ params: { id: 'abc' } }, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Identificador de lote inválido.',
      });
      expect(lotesServicio.obtener).not.toHaveBeenCalled();
    });

    test('delega el error en next', async () => {
      const error = new Error('Lote no encontrado.');
      lotesServicio.obtener.mockRejectedValue(error);

      await obtenerLote({ params: { id: '4' } }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('registrarRecepcion', () => {
    test('valida y registra la recepción con el usuario de sesión', async () => {
      const lote = { id_lote: 10 };
      const body = { id_medicamento: 1 };
      lotesServicio.registrarRecepcion.mockResolvedValue(lote);

      await registrarRecepcion({
        body,
        sessionUser: { id_usuario: 3 },
      }, res, next);

      expect(validarDatosRecepcion).toHaveBeenCalledWith(body);
      expect(lotesServicio.registrarRecepcion).toHaveBeenCalledWith(body, 3);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Recepción registrada correctamente.',
        lote,
      });
    });

    test('rechaza datos inválidos sin llamar al servicio', async () => {
      validarDatosRecepcion.mockReturnValue('Selecciona un medicamento válido.');

      await registrarRecepcion({
        body: {},
        sessionUser: { id_usuario: 3 },
      }, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Selecciona un medicamento válido.',
      });
      expect(lotesServicio.registrarRecepcion).not.toHaveBeenCalled();
    });

    test('delega el error en next', async () => {
      const error = new Error('El medicamento no existe.');
      lotesServicio.registrarRecepcion.mockRejectedValue(error);

      await registrarRecepcion({
        body: { id_medicamento: 1 },
        sessionUser: { id_usuario: 3 },
      }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('darBajaLote', () => {
    test('da de baja el lote con el usuario de sesión', async () => {
      const lote = { id_lote: 4, fecha_baja: '2026-11-06' };
      lotesServicio.darBajaVencido.mockResolvedValue(lote);

      await darBajaLote({
        params: { id: '4' },
        sessionUser: { id_usuario: 3 },
      }, res, next);

      expect(esIdValido).toHaveBeenCalledWith('4');
      expect(lotesServicio.darBajaVencido).toHaveBeenCalledWith(4, 3);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Lote dado de baja correctamente.',
        lote,
      });
    });

    test('rechaza un identificador inválido', async () => {
      esIdValido.mockReturnValue(false);

      await darBajaLote({
        params: { id: '0' },
        sessionUser: { id_usuario: 3 },
      }, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(lotesServicio.darBajaVencido).not.toHaveBeenCalled();
    });

    test('delega el error en next', async () => {
      const error = new Error('Solamente se pueden dar de baja lotes vencidos.');
      lotesServicio.darBajaVencido.mockRejectedValue(error);

      await darBajaLote({
        params: { id: '4' },
        sessionUser: { id_usuario: 3 },
      }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
