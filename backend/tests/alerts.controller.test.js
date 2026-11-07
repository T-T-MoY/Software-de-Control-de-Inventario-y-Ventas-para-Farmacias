jest.mock('../business/services/inventory.service', () => ({
  obtenerResumenAlertas: jest.fn(),
  obtenerContadoresAlertas: jest.fn(),
  listarLotesPorVencer: jest.fn(),
  listarLotesVencidos: jest.fn(),
  listarMedicamentosPorReponer: jest.fn(),
}));

const inventarioServicio = require('../business/services/inventory.service');
const {
  obtenerResumen,
  obtenerContadores,
  obtenerLotesPorVencer,
  obtenerLotesVencidos,
  obtenerMedicamentosPorReponer,
} = require('../presentation/controllers/alerts.controller');

const crearRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe('controlador de alertas', () => {
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = crearRes();
    next = jest.fn();
  });

  test('obtenerResumen devuelve el resumen del servicio', async () => {
    const resumen = { total: 3 };
    inventarioServicio.obtenerResumenAlertas.mockResolvedValue(resumen);

    await obtenerResumen({}, res, next);

    expect(inventarioServicio.obtenerResumenAlertas).toHaveBeenCalledWith();
    expect(res.json).toHaveBeenCalledWith(resumen);
    expect(next).not.toHaveBeenCalled();
  });

  test('obtenerResumen delega los errores en next', async () => {
    const error = new Error('Error de base de datos');
    inventarioServicio.obtenerResumenAlertas.mockRejectedValue(error);

    await obtenerResumen({}, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });

  test('obtenerContadores devuelve los contadores del servicio', async () => {
    const contadores = { total: 5 };
    inventarioServicio.obtenerContadoresAlertas.mockResolvedValue(contadores);

    await obtenerContadores({}, res, next);

    expect(inventarioServicio.obtenerContadoresAlertas).toHaveBeenCalledWith();
    expect(res.json).toHaveBeenCalledWith(contadores);
    expect(next).not.toHaveBeenCalled();
  });

  test('obtenerContadores delega los errores en next', async () => {
    const error = new Error('Error de base de datos');
    inventarioServicio.obtenerContadoresAlertas.mockRejectedValue(error);

    await obtenerContadores({}, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  test('obtenerLotesPorVencer devuelve el total y los lotes', async () => {
    const lotes = [{ id_lote: 1 }, { id_lote: 2 }];
    inventarioServicio.listarLotesPorVencer.mockResolvedValue(lotes);

    await obtenerLotesPorVencer({}, res, next);

    expect(inventarioServicio.listarLotesPorVencer).toHaveBeenCalledWith();
    expect(res.json).toHaveBeenCalledWith({ total: 2, lotes });
  });

  test('obtenerLotesPorVencer devuelve total cero con lista vacía', async () => {
    inventarioServicio.listarLotesPorVencer.mockResolvedValue([]);

    await obtenerLotesPorVencer({}, res, next);

    expect(res.json).toHaveBeenCalledWith({ total: 0, lotes: [] });
  });

  test('obtenerLotesPorVencer delega los errores en next', async () => {
    const error = new Error('Error de base de datos');
    inventarioServicio.listarLotesPorVencer.mockRejectedValue(error);

    await obtenerLotesPorVencer({}, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });

  test('obtenerLotesVencidos devuelve el total y los lotes', async () => {
    const lotes = [{ id_lote: 3 }];
    inventarioServicio.listarLotesVencidos.mockResolvedValue(lotes);

    await obtenerLotesVencidos({}, res, next);

    expect(inventarioServicio.listarLotesVencidos).toHaveBeenCalledWith();
    expect(res.json).toHaveBeenCalledWith({ total: 1, lotes });
  });

  test('obtenerLotesVencidos delega los errores en next', async () => {
    const error = new Error('Error de base de datos');
    inventarioServicio.listarLotesVencidos.mockRejectedValue(error);

    await obtenerLotesVencidos({}, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  test('obtenerMedicamentosPorReponer devuelve el total y los medicamentos', async () => {
    const medicamentos = [{ id_medicamento: 1 }];
    inventarioServicio.listarMedicamentosPorReponer.mockResolvedValue(medicamentos);

    await obtenerMedicamentosPorReponer({}, res, next);

    expect(inventarioServicio.listarMedicamentosPorReponer).toHaveBeenCalledWith();
    expect(res.json).toHaveBeenCalledWith({ total: 1, medicamentos });
  });

  test('obtenerMedicamentosPorReponer devuelve total cero con lista vacía', async () => {
    inventarioServicio.listarMedicamentosPorReponer.mockResolvedValue([]);

    await obtenerMedicamentosPorReponer({}, res, next);

    expect(res.json).toHaveBeenCalledWith({ total: 0, medicamentos: [] });
  });

  test('obtenerMedicamentosPorReponer delega los errores en next', async () => {
    const error = new Error('Error de base de datos');
    inventarioServicio.listarMedicamentosPorReponer.mockRejectedValue(error);

    await obtenerMedicamentosPorReponer({}, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
