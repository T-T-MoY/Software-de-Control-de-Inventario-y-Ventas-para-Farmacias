jest.mock('../business/services/suppliers.service', () => ({
  listar: jest.fn(),
  obtener: jest.fn(),
  crear: jest.fn(),
  actualizar: jest.fn(),
}));

jest.mock('../presentation/validators/supplier.validator', () => ({
  validarDatosProveedor: jest.fn(),
}));

const proveedoresServicio = require('../business/services/suppliers.service');
const { validarDatosProveedor } = require('../presentation/validators/supplier.validator');
const {
  obtenerProveedores,
  obtenerProveedor,
  crearProveedor,
  actualizarProveedor,
} = require('../presentation/controllers/suppliers.controller');

const crearRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('controlador de proveedores', () => {
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = crearRes();
    next = jest.fn();
    validarDatosProveedor.mockReturnValue(null);
  });

  describe('obtenerProveedores', () => {
    test('envía el término de búsqueda recortado', async () => {
      const proveedores = [{ id_proveedor: 1 }];
      proveedoresServicio.listar.mockResolvedValue(proveedores);

      await obtenerProveedores({ query: { buscar: ' Andina ' } }, res, next);

      expect(proveedoresServicio.listar).toHaveBeenCalledWith('Andina');
      expect(res.json).toHaveBeenCalledWith(proveedores);
    });

    test.each([
      ['sin query', {}],
      ['búsqueda no textual', { buscar: 123 }],
    ])('usa cadena vacía %s', async (_caso, query) => {
      proveedoresServicio.listar.mockResolvedValue([]);

      await obtenerProveedores({ query }, res, next);

      expect(proveedoresServicio.listar).toHaveBeenCalledWith('');
    });

    test('delega el error en next', async () => {
      const error = new Error('Error de base de datos');
      proveedoresServicio.listar.mockRejectedValue(error);

      await obtenerProveedores({ query: {} }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('obtenerProveedor', () => {
    test('convierte el id y devuelve el proveedor', async () => {
      const proveedor = { id_proveedor: 4 };
      proveedoresServicio.obtener.mockResolvedValue(proveedor);

      await obtenerProveedor({ params: { id: '4' } }, res, next);

      expect(proveedoresServicio.obtener).toHaveBeenCalledWith(4);
      expect(res.json).toHaveBeenCalledWith(proveedor);
    });

    test.each(['0', 'abc', '1.5', '', '-1'])(
      'rechaza el identificador inválido %p',
      async (id) => {
        await obtenerProveedor({ params: { id } }, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Identificador de proveedor inválido.',
        });
        expect(proveedoresServicio.obtener).not.toHaveBeenCalled();
      }
    );

    test('delega el error en next', async () => {
      const error = new Error('Proveedor no encontrado.');
      proveedoresServicio.obtener.mockRejectedValue(error);

      await obtenerProveedor({ params: { id: '4' } }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('crearProveedor', () => {
    test('valida y registra el proveedor', async () => {
      const body = { nombre_comercial: 'Andina' };
      const proveedor = { id_proveedor: 9 };
      proveedoresServicio.crear.mockResolvedValue(proveedor);

      await crearProveedor({ body }, res, next);

      expect(validarDatosProveedor).toHaveBeenCalledWith(body);
      expect(proveedoresServicio.crear).toHaveBeenCalledWith(body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Proveedor registrado correctamente.',
        proveedor,
      });
    });

    test('rechaza datos inválidos sin llamar al servicio', async () => {
      validarDatosProveedor.mockReturnValue('El nombre comercial es obligatorio.');

      await crearProveedor({ body: {} }, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'El nombre comercial es obligatorio.',
      });
      expect(proveedoresServicio.crear).not.toHaveBeenCalled();
    });

    test('delega el error en next', async () => {
      const error = new Error('Ya existe un proveedor registrado con ese RUC/NIT.');
      proveedoresServicio.crear.mockRejectedValue(error);

      await crearProveedor({ body: { nombre_comercial: 'Andina' } }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('actualizarProveedor', () => {
    test('valida y actualiza el proveedor', async () => {
      const body = { nombre_comercial: 'Andina' };
      const proveedor = { id_proveedor: 9 };
      proveedoresServicio.actualizar.mockResolvedValue(proveedor);

      await actualizarProveedor({ params: { id: '9' }, body }, res, next);

      expect(validarDatosProveedor).toHaveBeenCalledWith(body);
      expect(proveedoresServicio.actualizar).toHaveBeenCalledWith(9, body);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Proveedor actualizado correctamente.',
        proveedor,
      });
    });

    test('rechaza un identificador inválido antes de validar', async () => {
      await actualizarProveedor({
        params: { id: 'abc' },
        body: {},
      }, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(validarDatosProveedor).not.toHaveBeenCalled();
      expect(proveedoresServicio.actualizar).not.toHaveBeenCalled();
    });

    test('rechaza datos inválidos', async () => {
      validarDatosProveedor.mockReturnValue('El RUC/NIT es obligatorio.');

      await actualizarProveedor({
        params: { id: '9' },
        body: {},
      }, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(proveedoresServicio.actualizar).not.toHaveBeenCalled();
    });

    test('delega el error en next', async () => {
      const error = new Error('Proveedor no encontrado.');
      proveedoresServicio.actualizar.mockRejectedValue(error);

      await actualizarProveedor({
        params: { id: '9' },
        body: { nombre_comercial: 'Andina' },
      }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
