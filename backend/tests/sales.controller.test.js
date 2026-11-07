jest.mock('../business/services/sales.service', () => ({
  listarCatalogo: jest.fn(),
  crear: jest.fn(),
}));

jest.mock('../presentation/validators/sales.validator', () => ({
  validarDatosVenta: jest.fn(),
}));

jest.mock('../config/parameters', () => ({
  farmacia: {
    nombre: 'Farmacia Central',
    nit: '123456',
    direccion: 'Calle 1',
    telefono: '70000000',
  },
}));

const ventasServicio = require('../business/services/sales.service');
const { validarDatosVenta } = require('../presentation/validators/sales.validator');
const {
  obtenerCatalogo,
  crearVenta,
} = require('../presentation/controllers/sales.controller');

const crearRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('controlador de ventas', () => {
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = crearRes();
    next = jest.fn();
    validarDatosVenta.mockReturnValue(null);
  });

  describe('obtenerCatalogo', () => {
    test('envía el término de búsqueda recortado', async () => {
      const catalogo = [{ id_medicamento: 1 }];
      ventasServicio.listarCatalogo.mockResolvedValue(catalogo);

      await obtenerCatalogo({ query: { buscar: '  para  ' } }, res, next);

      expect(ventasServicio.listarCatalogo).toHaveBeenCalledWith('para');
      expect(res.json).toHaveBeenCalledWith(catalogo);
    });

    test.each([
      ['sin query', {}],
      ['búsqueda no textual', { buscar: 123 }],
    ])('usa cadena vacía %s', async (_caso, query) => {
      ventasServicio.listarCatalogo.mockResolvedValue([]);

      await obtenerCatalogo({ query }, res, next);

      expect(ventasServicio.listarCatalogo).toHaveBeenCalledWith('');
      expect(res.json).toHaveBeenCalledWith([]);
    });

    test('delega el error en next', async () => {
      const error = new Error('Error de base de datos');
      ventasServicio.listarCatalogo.mockRejectedValue(error);

      await obtenerCatalogo({ query: {} }, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('crearVenta', () => {
    test('valida y registra la venta con los datos de la farmacia', async () => {
      const body = { id_cliente: 1, items: [] };
      const venta = { id_venta: 10, total: 5 };
      ventasServicio.crear.mockResolvedValue(venta);

      await crearVenta({
        body,
        sessionUser: { id_usuario: 8 },
      }, res, next);

      expect(validarDatosVenta).toHaveBeenCalledWith(body);
      expect(ventasServicio.crear).toHaveBeenCalledWith(body, 8);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Venta registrada correctamente.',
        venta,
        farmacia: {
          nombre: 'Farmacia Central',
          nit: '123456',
          direccion: 'Calle 1',
          telefono: '70000000',
        },
      });
    });

    test('rechaza datos inválidos sin llamar al servicio', async () => {
      validarDatosVenta.mockReturnValue('Agrega entre 1 y 100 productos a la venta.');

      await crearVenta({
        body: {},
        sessionUser: { id_usuario: 8 },
      }, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Agrega entre 1 y 100 productos a la venta.',
      });
      expect(ventasServicio.crear).not.toHaveBeenCalled();
    });

    test('delega el error en next', async () => {
      const error = new Error('Stock insuficiente para Paracetamol.');
      ventasServicio.crear.mockRejectedValue(error);

      await crearVenta({
        body: { id_cliente: 1, items: [] },
        sessionUser: { id_usuario: 8 },
      }, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
