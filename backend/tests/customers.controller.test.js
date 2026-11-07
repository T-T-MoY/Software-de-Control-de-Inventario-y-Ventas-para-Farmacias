jest.mock('../business/services/customers.service', () => ({
  listar: jest.fn(),
  obtener: jest.fn(),
  crear: jest.fn(),
  actualizar: jest.fn(),
}));

jest.mock('../presentation/validators/sales.validator', () => ({
  esIdValido: jest.fn(),
  validarDatosCliente: jest.fn(),
}));

const clientesServicio = require('../business/services/customers.service');
const {
  esIdValido,
  validarDatosCliente,
} = require('../presentation/validators/sales.validator');
const {
  obtenerClientes,
  obtenerCliente,
  crearCliente,
  actualizarCliente,
} = require('../presentation/controllers/customers.controller');

const crearRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('controlador de clientes', () => {
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = crearRes();
    next = jest.fn();
    esIdValido.mockReturnValue(true);
    validarDatosCliente.mockReturnValue(null);
  });

  describe('obtenerClientes', () => {
    test('envía el término de búsqueda recortado', async () => {
      const clientes = [{ id_cliente: 1 }];
      clientesServicio.listar.mockResolvedValue(clientes);

      await obtenerClientes({ query: { buscar: '  Ana  ' } }, res, next);

      expect(clientesServicio.listar).toHaveBeenCalledWith('Ana');
      expect(res.json).toHaveBeenCalledWith(clientes);
    });

    test.each([
      ['sin query', {}],
      ['búsqueda no textual', { buscar: 123 }],
    ])('usa cadena vacía %s', async (_caso, query) => {
      clientesServicio.listar.mockResolvedValue([]);

      await obtenerClientes({ query }, res, next);

      expect(clientesServicio.listar).toHaveBeenCalledWith('');
      expect(res.json).toHaveBeenCalledWith([]);
    });

    test('delega el error en next', async () => {
      const error = new Error('Error de base de datos');
      clientesServicio.listar.mockRejectedValue(error);

      await obtenerClientes({ query: {} }, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('obtenerCliente', () => {
    test('convierte el id y devuelve el cliente', async () => {
      const cliente = { id_cliente: 7 };
      clientesServicio.obtener.mockResolvedValue(cliente);

      await obtenerCliente({ params: { id: '7' } }, res, next);

      expect(esIdValido).toHaveBeenCalledWith('7');
      expect(clientesServicio.obtener).toHaveBeenCalledWith(7);
      expect(res.json).toHaveBeenCalledWith(cliente);
    });

    test('rechaza un identificador inválido', async () => {
      esIdValido.mockReturnValue(false);

      await obtenerCliente({ params: { id: 'abc' } }, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Identificador de cliente inválido.',
      });
      expect(clientesServicio.obtener).not.toHaveBeenCalled();
    });

    test('delega el error en next', async () => {
      const error = new Error('Cliente no encontrado.');
      clientesServicio.obtener.mockRejectedValue(error);

      await obtenerCliente({ params: { id: '7' } }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('crearCliente', () => {
    test('valida y registra el cliente', async () => {
      const cliente = { id_cliente: 9 };
      clientesServicio.crear.mockResolvedValue(cliente);

      await crearCliente({ body: { nombres: 'Ana' } }, res, next);

      expect(validarDatosCliente).toHaveBeenCalledWith({ nombres: 'Ana' });
      expect(clientesServicio.crear).toHaveBeenCalledWith({ nombres: 'Ana' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Cliente registrado correctamente.',
        cliente,
      });
    });

    test('rechaza datos inválidos sin llamar al servicio', async () => {
      validarDatosCliente.mockReturnValue('El nombre es obligatorio.');

      await crearCliente({ body: {} }, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'El nombre es obligatorio.' });
      expect(clientesServicio.crear).not.toHaveBeenCalled();
    });

    test('delega el error en next', async () => {
      const error = new Error('Ya existe un cliente.');
      clientesServicio.crear.mockRejectedValue(error);

      await crearCliente({ body: { nombres: 'Ana' } }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('actualizarCliente', () => {
    test('valida el id, los datos y actualiza el cliente', async () => {
      const cliente = { id_cliente: 5 };
      clientesServicio.actualizar.mockResolvedValue(cliente);

      await actualizarCliente({
        params: { id: '5' },
        body: { nombres: 'María' },
      }, res, next);

      expect(esIdValido).toHaveBeenCalledWith('5');
      expect(validarDatosCliente).toHaveBeenCalledWith({ nombres: 'María' });
      expect(clientesServicio.actualizar).toHaveBeenCalledWith(5, { nombres: 'María' });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Cliente actualizado correctamente.',
        cliente,
      });
    });

    test('rechaza un identificador inválido', async () => {
      esIdValido.mockReturnValue(false);

      await actualizarCliente({
        params: { id: '0' },
        body: { nombres: 'María' },
      }, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(validarDatosCliente).not.toHaveBeenCalled();
      expect(clientesServicio.actualizar).not.toHaveBeenCalled();
    });

    test('rechaza datos inválidos', async () => {
      validarDatosCliente.mockReturnValue('Datos inválidos.');

      await actualizarCliente({
        params: { id: '5' },
        body: {},
      }, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(clientesServicio.actualizar).not.toHaveBeenCalled();
    });

    test('delega el error en next', async () => {
      const error = new Error('Cliente no encontrado.');
      clientesServicio.actualizar.mockRejectedValue(error);

      await actualizarCliente({
        params: { id: '5' },
        body: { nombres: 'María' },
      }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
