jest.mock('../data/repositories/sales.repository', () => ({
  listarCatalogo: jest.fn(),
  buscarMedicamentos: jest.fn(),
  buscarCliente: jest.fn(),
  crear: jest.fn(),
}));

jest.mock('../business/rules/sales.rules', () => ({
  calcularTotales: jest.fn(),
  normalizarDatosVenta: jest.fn(),
  validarReceta: jest.fn(),
  esClienteConsumidorFinal: jest.fn(),
}));

jest.mock('../business/errors/app-error', () => {
  class ErrorAplicacion extends Error {
    constructor(mensaje, { estado = 400, codigo = 'ERROR_APLICACION' } = {}) {
      super(mensaje);
      this.name = 'ErrorAplicacion';
      this.estado = estado;
      this.codigo = codigo;
    }
  }

  return {
    ErrorAplicacion,
    errorConflicto: jest.fn((mensaje) => new ErrorAplicacion(mensaje, {
      estado: 409,
      codigo: 'CONFLICTO',
    })),
    errorNoEncontrado: jest.fn((mensaje) => new ErrorAplicacion(mensaje, {
      estado: 404,
      codigo: 'NO_ENCONTRADO',
    })),
    errorValidacion: jest.fn((mensaje) => new ErrorAplicacion(mensaje, {
      estado: 400,
      codigo: 'VALIDACION',
    })),
  };
});

const ventasRepositorio = require('../data/repositories/sales.repository');
const {
  calcularTotales,
  normalizarDatosVenta,
  validarReceta,
  esClienteConsumidorFinal,
} = require('../business/rules/sales.rules');
const {
  errorConflicto,
  errorNoEncontrado,
  errorValidacion,
} = require('../business/errors/app-error');
const {
  listarCatalogo,
  crear,
} = require('../business/services/sales.service');

describe('servicio de ventas', () => {
  const ventaNormalizada = {
    id_cliente: 1,
    items: [{ id_medicamento: 10, cantidad: 2 }],
    descuento_porcentaje: 0,
    monto_recibido: 50,
    tipo_comprobante: 'Nota de venta',
    formato_impresion: 'Pantalla',
    receta: null,
  };

  const medicamento = {
    id_medicamento: 10,
    nombre_comercial: 'Paracetamol',
    estado_medicamento: 'Activo',
    stock_disponible: '10',
    precio_unitario: '2.50',
    tipo_venta: 'Libre',
  };

  const totales = {
    subtotal: 5,
    descuento_monto: 0,
    total: 5,
    cambio: 45,
  };

  const ventaGuardada = {
    id_venta: 1,
    descuento_monto: 0,
    monto_recibido: 50,
    tipo_comprobante: 'Nota de venta',
    num_serie: 'NV-0001',
    fecha_emision: '2026-11-06T10:00:00.000Z',
    items: [
      { id_medicamento: 10, precio_unitario: 2.5, cantidad: 2 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    normalizarDatosVenta.mockReturnValue({ ...ventaNormalizada });
    calcularTotales.mockReturnValue({ ...totales });
    validarReceta.mockReturnValue(undefined);
    esClienteConsumidorFinal.mockReturnValue(false);
    ventasRepositorio.buscarMedicamentos.mockResolvedValue([{ ...medicamento }]);
    ventasRepositorio.buscarCliente.mockResolvedValue({
      id_cliente: 1,
      nombres: 'Ana',
      ci_nit: '4521897',
    });
    ventasRepositorio.crear.mockResolvedValue({
      ...ventaGuardada,
      items: ventaGuardada.items.map((item) => ({ ...item })),
    });
  });

  describe('listarCatalogo', () => {
    test('usa el término vacío por defecto', async () => {
      const catalogo = [{ id_medicamento: 10 }];
      ventasRepositorio.listarCatalogo.mockResolvedValue(catalogo);

      await expect(listarCatalogo()).resolves.toBe(catalogo);

      expect(ventasRepositorio.listarCatalogo).toHaveBeenCalledWith('');
    });

    test('envía el término de búsqueda al repositorio', async () => {
      ventasRepositorio.listarCatalogo.mockResolvedValue([]);

      await expect(listarCatalogo(' para ')).resolves.toEqual([]);

      expect(ventasRepositorio.listarCatalogo).toHaveBeenCalledWith(' para ');
    });

    test('propaga el error del repositorio', async () => {
      const error = new Error('Error de base de datos');
      ventasRepositorio.listarCatalogo.mockRejectedValue(error);

      await expect(listarCatalogo('x')).rejects.toBe(error);
    });
  });

  describe('crear', () => {
    test('registra la venta, calcula subtotales y normaliza la respuesta', async () => {
      const resultado = await crear({ id_cliente: 1 }, '7');

      expect(resultado).toEqual({
        ...ventaGuardada,
        descuento: 0,
        montoRecibido: 50,
        tipoComprobante: 'Nota de venta',
        numSerie: 'NV-0001',
        fecha: '2026-11-06T10:00:00.000Z',
        items: [
          {
            id_medicamento: 10,
            precio_unitario: 2.5,
            cantidad: 2,
            precioUnitario: 2.5,
          },
        ],
      });

      expect(normalizarDatosVenta).toHaveBeenCalledWith({ id_cliente: 1 });
      expect(ventasRepositorio.buscarMedicamentos).toHaveBeenCalledWith([10]);
      expect(calcularTotales).toHaveBeenCalledWith({
        items: [
          {
            id_medicamento: 10,
            cantidad: 2,
            nombre_comercial: 'Paracetamol',
            precio_unitario: '2.50',
            tipo_venta: 'Libre',
            subtotal: 5,
          },
        ],
        descuentoPorcentaje: 0,
        montoRecibido: 50,
      });
      expect(validarReceta).not.toHaveBeenCalled();
      expect(ventasRepositorio.crear).toHaveBeenCalledWith({
        ...ventaNormalizada,
        items: [
          {
            id_medicamento: 10,
            cantidad: 2,
            nombre_comercial: 'Paracetamol',
            precio_unitario: '2.50',
            tipo_venta: 'Libre',
            subtotal: 5,
          },
        ],
        ...totales,
      }, 7);
    });

    test('valida la receta cuando hay medicamentos que la requieren', async () => {
      const receta = { paciente: 'Ana', medico: 'Dr. Pérez', matricula: '123' };
      normalizarDatosVenta.mockReturnValue({
        ...ventaNormalizada,
        receta,
      });
      ventasRepositorio.buscarMedicamentos.mockResolvedValue([
        { ...medicamento, tipo_venta: 'Con receta' },
      ]);

      await crear({ id_cliente: 1 }, 7);

      expect(validarReceta).toHaveBeenCalledWith(receta);
      expect(ventasRepositorio.crear).toHaveBeenCalledTimes(1);
      expect(ventasRepositorio.crear).toHaveBeenCalledWith(
        expect.objectContaining({ receta }),
        7
      );
    });

    test('rechaza la receta con Consumidor Final (CI/NIT 00000)', async () => {
      const receta = { paciente: 'Ana', medico: 'Dr. Pérez', matricula: '123' };
      normalizarDatosVenta.mockReturnValue({
        ...ventaNormalizada,
        receta,
      });
      ventasRepositorio.buscarMedicamentos.mockResolvedValue([
        { ...medicamento, tipo_venta: 'Con receta' },
      ]);
      ventasRepositorio.buscarCliente.mockResolvedValue({
        id_cliente: 1,
        nombres: 'Cliente general',
        ci_nit: '00000',
      });
      esClienteConsumidorFinal.mockReturnValue(true);

      await expect(crear({ id_cliente: 1 }, 7)).rejects.toMatchObject({
        estado: 400,
        codigo: 'VALIDACION',
        message: 'Para vender medicamentos con receta, selecciona o registra un cliente real; no se permite Consumidor Final.',
      });

      expect(esClienteConsumidorFinal).toHaveBeenCalledWith(
        expect.objectContaining({ ci_nit: '00000' })
      );
      expect(calcularTotales).not.toHaveBeenCalled();
      expect(ventasRepositorio.crear).not.toHaveBeenCalled();
    });

    test('rechaza cuando el cliente no existe', async () => {
      ventasRepositorio.buscarCliente.mockResolvedValue(null);

      await expect(crear({ id_cliente: 1 }, 7)).rejects.toMatchObject({
        estado: 404,
        codigo: 'NO_ENCONTRADO',
        message: 'El cliente seleccionado no existe.',
      });

      expect(ventasRepositorio.crear).not.toHaveBeenCalled();
    });

    test.each([0, -1, 1.5, null, undefined, 'abc', ''])(
      'rechaza un usuario inválido (%p) sin consultar el repositorio',
      async (idUsuario) => {
        await expect(crear({ id_cliente: 1 }, idUsuario)).rejects.toMatchObject({
          estado: 400,
          codigo: 'VALIDACION',
          message: 'El usuario que registra la venta no es válido.',
        });

        expect(errorValidacion).toHaveBeenCalledWith(
          'El usuario que registra la venta no es válido.'
        );
        expect(ventasRepositorio.buscarMedicamentos).not.toHaveBeenCalled();
        expect(ventasRepositorio.crear).not.toHaveBeenCalled();
      }
    );

    test('propaga el error de normalización sin consultar el repositorio', async () => {
      const error = new Error('Los datos de la venta son obligatorios.');
      normalizarDatosVenta.mockImplementation(() => {
        throw error;
      });

      await expect(crear(null, 1)).rejects.toBe(error);

      expect(ventasRepositorio.buscarMedicamentos).not.toHaveBeenCalled();
    });

    test('rechaza cuando algún medicamento no existe', async () => {
      ventasRepositorio.buscarMedicamentos.mockResolvedValue([]);

      await expect(crear({ id_cliente: 1 }, 1)).rejects.toMatchObject({
        estado: 404,
        codigo: 'NO_ENCONTRADO',
        message: 'Uno de los medicamentos seleccionados no existe.',
      });

      expect(errorNoEncontrado).toHaveBeenCalledWith(
        'Uno de los medicamentos seleccionados no existe.'
      );
      expect(calcularTotales).not.toHaveBeenCalled();
      expect(ventasRepositorio.crear).not.toHaveBeenCalled();
    });

    test('rechaza medicamentos inactivos', async () => {
      ventasRepositorio.buscarMedicamentos.mockResolvedValue([
        { ...medicamento, estado_medicamento: 'Inactivo' },
      ]);

      await expect(crear({ id_cliente: 1 }, 1)).rejects.toMatchObject({
        estado: 400,
        codigo: 'VALIDACION',
        message: 'Paracetamol no está activo y no se puede vender.',
      });

      expect(ventasRepositorio.crear).not.toHaveBeenCalled();
    });

    test('rechaza stock insuficiente', async () => {
      ventasRepositorio.buscarMedicamentos.mockResolvedValue([
        { ...medicamento, stock_disponible: '1' },
      ]);

      await expect(crear({ id_cliente: 1 }, 1)).rejects.toMatchObject({
        estado: 409,
        codigo: 'CONFLICTO',
        message: 'Stock insuficiente para Paracetamol.',
      });

      expect(errorConflicto).toHaveBeenCalledWith(
        'Stock insuficiente para Paracetamol.'
      );
      expect(ventasRepositorio.crear).not.toHaveBeenCalled();
    });

    test('propaga el error de validación de receta', async () => {
      const error = new Error('Para vender medicamentos con receta, ingresa los datos.');
      ventasRepositorio.buscarMedicamentos.mockResolvedValue([
        { ...medicamento, tipo_venta: 'Con receta' },
      ]);
      validarReceta.mockImplementation(() => {
        throw error;
      });

      await expect(crear({ id_cliente: 1 }, 1)).rejects.toBe(error);

      expect(validarReceta).toHaveBeenCalledWith(ventaNormalizada.receta);
      expect(calcularTotales).not.toHaveBeenCalled();
      expect(ventasRepositorio.crear).not.toHaveBeenCalled();
    });

    test('propaga el error del cálculo de totales', async () => {
      const error = new Error('El monto recibido no cubre el total de la venta.');
      calcularTotales.mockImplementation(() => {
        throw error;
      });

      await expect(crear({ id_cliente: 1 }, 1)).rejects.toBe(error);

      expect(ventasRepositorio.crear).not.toHaveBeenCalled();
    });

    test.each([
      ['STOCK_INSUFICIENTE', 409, 'CONFLICTO', 'Stock insuficiente para Paracetamol.'],
      ['PRECIO_ACTUALIZADO', 409, 'CONFLICTO', 'El precio del medicamento cambió.'],
      ['MEDICAMENTO_NO_DISPONIBLE', 409, 'CONFLICTO', 'El medicamento ya no está disponible.'],
      ['CLIENTE_NO_ENCONTRADO', 404, 'NO_ENCONTRADO', 'El cliente seleccionado no existe.'],
      ['23503', 400, 'VALIDACION', 'El cliente o usuario seleccionado no es válido.'],
      ['23514', 400, 'VALIDACION', 'Los datos de la venta superan los límites permitidos.'],
      ['22003', 400, 'VALIDACION', 'Los datos de la venta superan los límites permitidos.'],
      ['22001', 400, 'VALIDACION', 'Los datos de la venta superan los límites permitidos.'],
    ])('traduce el error %s al registrar la venta', async (code, estado, codigo, mensaje) => {
      ventasRepositorio.crear.mockRejectedValue({ code, message: mensaje });

      await expect(crear({ id_cliente: 1 }, 1)).rejects.toMatchObject({
        estado,
        codigo,
        message: mensaje,
      });
    });

    test('propaga errores no reconocidos al registrar la venta', async () => {
      const error = new Error('Error inesperado');
      ventasRepositorio.crear.mockRejectedValue(error);

      await expect(crear({ id_cliente: 1 }, 1)).rejects.toBe(error);
    });
  });
});
