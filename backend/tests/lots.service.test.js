jest.mock('../data/repositories/lots.repository', () => ({
  listar: jest.fn(),
  buscarPorId: jest.fn(),
  registrarRecepcion: jest.fn(),
  darBajaVencido: jest.fn(),
}));

jest.mock('../data/repositories/medicines.repository', () => ({
  buscarPorId: jest.fn(),
}));

jest.mock('../data/repositories/suppliers.repository', () => ({
  buscarPorId: jest.fn(),
}));

jest.mock('../business/rules/lots.rules', () => ({
  normalizarDatosLote: jest.fn(),
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
    errorValidacion: jest.fn((mensaje) => new ErrorAplicacion(mensaje, {
      estado: 400,
      codigo: 'VALIDACION',
    })),
    errorNoEncontrado: jest.fn((mensaje) => new ErrorAplicacion(mensaje, {
      estado: 404,
      codigo: 'NO_ENCONTRADO',
    })),
    errorConflicto: jest.fn((mensaje) => new ErrorAplicacion(mensaje, {
      estado: 409,
      codigo: 'CONFLICTO',
    })),
  };
});

const lotesRepositorio = require('../data/repositories/lots.repository');
const medicamentosRepositorio = require('../data/repositories/medicines.repository');
const proveedoresRepositorio = require('../data/repositories/suppliers.repository');
const { normalizarDatosLote } = require('../business/rules/lots.rules');
const {
  errorValidacion,
  errorNoEncontrado,
  errorConflicto,
} = require('../business/errors/app-error');
const {
  listar,
  obtener,
  registrarRecepcion,
  darBajaVencido,
} = require('../business/services/lots.service');

describe('servicio de lotes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const loteNormalizado = {
    id_medicamento: 4,
    id_proveedor: 2,
    lote_numero: 'L-2026-10',
    fecha_vencimiento: '2026-12-31',
    costo_unitario: 12.5,
    cantidad_stock: 100,
  };

  const loteGuardado = {
    id_lote: 25,
    ...loteNormalizado,
    estado_lote: 'Vigente',
    fecha_baja: null,
  };

  describe('listar', () => {
    test('usa el término vacío por defecto', async () => {
      const lotes = [{ id_lote: 1 }];
      lotesRepositorio.listar.mockResolvedValue(lotes);

      await expect(listar()).resolves.toBe(lotes);

      expect(lotesRepositorio.listar).toHaveBeenCalledWith('');
    });

    test('envía el término de búsqueda al repositorio', async () => {
      const lotes = [{ id_lote: 2 }];
      lotesRepositorio.listar.mockResolvedValue(lotes);

      await expect(listar(' L-2026 ')).resolves.toBe(lotes);

      expect(lotesRepositorio.listar).toHaveBeenCalledWith(' L-2026 ');
    });

    test('propaga el error del repositorio', async () => {
      const error = new Error('Error de base de datos');
      lotesRepositorio.listar.mockRejectedValue(error);

      await expect(listar('x')).rejects.toBe(error);

      expect(lotesRepositorio.listar).toHaveBeenCalledWith('x');
    });
  });

  describe('obtener', () => {
    test('devuelve el lote encontrado', async () => {
      lotesRepositorio.buscarPorId.mockResolvedValue(loteGuardado);

      await expect(obtener(25)).resolves.toBe(loteGuardado);

      expect(lotesRepositorio.buscarPorId).toHaveBeenCalledWith(25);
    });

    test.each([null, undefined])('rechaza un lote ausente (%p)', async (id) => {
      lotesRepositorio.buscarPorId.mockResolvedValue(null);

      await expect(obtener(id)).rejects.toMatchObject({
        name: 'ErrorAplicacion',
        estado: 404,
        codigo: 'NO_ENCONTRADO',
        message: 'Lote no encontrado.',
      });

      expect(lotesRepositorio.buscarPorId).toHaveBeenCalledWith(id);
      expect(errorNoEncontrado).toHaveBeenCalledWith('Lote no encontrado.');
    });

    test('propaga el error del repositorio', async () => {
      const error = new Error('Error de base de datos');
      lotesRepositorio.buscarPorId.mockRejectedValue(error);

      await expect(obtener(25)).rejects.toBe(error);

      expect(lotesRepositorio.buscarPorId).toHaveBeenCalledWith(25);
    });
  });

  describe('registrarRecepcion', () => {
    const datos = { id_medicamento: 4, id_proveedor: 2 };
    const medicamentoActivo = {
      id_medicamento: 4,
      nombre_comercial: 'Paracetamol',
      estado_medicamento: 'Activo',
    };
    const proveedor = { id_proveedor: 2, nombre_comercial: 'Proveedor' };

    test('registra la recepción y devuelve el lote completo', async () => {
      normalizarDatosLote.mockReturnValue(loteNormalizado);
      medicamentosRepositorio.buscarPorId.mockResolvedValue(medicamentoActivo);
      proveedoresRepositorio.buscarPorId.mockResolvedValue(proveedor);
      lotesRepositorio.registrarRecepcion.mockResolvedValue({ id_lote: 25 });
      lotesRepositorio.buscarPorId.mockResolvedValue(loteGuardado);

      await expect(registrarRecepcion(datos, '7')).resolves.toBe(loteGuardado);

      expect(normalizarDatosLote).toHaveBeenCalledWith(datos);
      expect(medicamentosRepositorio.buscarPorId).toHaveBeenCalledWith(4);
      expect(proveedoresRepositorio.buscarPorId).toHaveBeenCalledWith(2);
      expect(lotesRepositorio.registrarRecepcion)
        .toHaveBeenCalledWith(loteNormalizado, 7);
      expect(lotesRepositorio.buscarPorId).toHaveBeenCalledWith(25);
    });

    test.each([0, -1, 1.5, null, undefined, 'abc', ''])(
      'rechaza un usuario inválido (%p) sin consultar repositorios',
      async (idUsuario) => {
        normalizarDatosLote.mockReturnValue(loteNormalizado);

        await expect(registrarRecepcion(datos, idUsuario)).rejects.toMatchObject({
          estado: 400,
          codigo: 'VALIDACION',
          message: 'El usuario de la recepción no es válido.',
        });

        expect(errorValidacion)
          .toHaveBeenCalledWith('El usuario de la recepción no es válido.');
        expect(medicamentosRepositorio.buscarPorId).not.toHaveBeenCalled();
        expect(proveedoresRepositorio.buscarPorId).not.toHaveBeenCalled();
        expect(lotesRepositorio.registrarRecepcion).not.toHaveBeenCalled();
      }
    );

    test('propaga el error de normalización sin consultar repositorios', async () => {
      const error = new Error('Datos inválidos');
      normalizarDatosLote.mockImplementation(() => {
        throw error;
      });

      await expect(registrarRecepcion({}, 1)).rejects.toBe(error);

      expect(medicamentosRepositorio.buscarPorId).not.toHaveBeenCalled();
    });

    test('rechaza medicamentos inexistentes', async () => {
      normalizarDatosLote.mockReturnValue(loteNormalizado);
      medicamentosRepositorio.buscarPorId.mockResolvedValue(null);

      await expect(registrarRecepcion(datos, 1)).rejects.toMatchObject({
        estado: 404,
        codigo: 'NO_ENCONTRADO',
        message: 'El medicamento seleccionado no existe.',
      });

      expect(proveedoresRepositorio.buscarPorId).not.toHaveBeenCalled();
      expect(lotesRepositorio.registrarRecepcion).not.toHaveBeenCalled();
    });

    test('rechaza medicamentos no activos', async () => {
      normalizarDatosLote.mockReturnValue(loteNormalizado);
      medicamentosRepositorio.buscarPorId.mockResolvedValue({
        ...medicamentoActivo,
        estado_medicamento: 'Inactivo',
      });

      await expect(registrarRecepcion(datos, 1)).rejects.toMatchObject({
        estado: 400,
        codigo: 'VALIDACION',
        message: 'No se pueden recibir lotes de medicamentos inactivos.',
      });

      expect(proveedoresRepositorio.buscarPorId).not.toHaveBeenCalled();
      expect(lotesRepositorio.registrarRecepcion).not.toHaveBeenCalled();
    });

    test('rechaza proveedores inexistentes', async () => {
      normalizarDatosLote.mockReturnValue(loteNormalizado);
      medicamentosRepositorio.buscarPorId.mockResolvedValue(medicamentoActivo);
      proveedoresRepositorio.buscarPorId.mockResolvedValue(null);

      await expect(registrarRecepcion(datos, 1)).rejects.toMatchObject({
        estado: 404,
        codigo: 'NO_ENCONTRADO',
        message: 'El proveedor seleccionado no existe.',
      });

      expect(lotesRepositorio.registrarRecepcion).not.toHaveBeenCalled();
    });

    test.each([
      ['23505', 409, 'CONFLICTO', 'Ya existe un lote con ese número para el medicamento seleccionado.'],
      ['23503', 400, 'VALIDACION', 'El medicamento o proveedor seleccionado no existe.'],
      ['23514', 400, 'VALIDACION', 'Los datos de la recepción no cumplen las reglas del sistema. Comprueba la fecha, el costo y la cantidad.'],
      ['22001', 400, 'VALIDACION', 'Uno de los campos contiene un valor no válido.'],
      ['22P02', 400, 'VALIDACION', 'Uno de los campos contiene un valor no válido.'],
      ['22003', 400, 'VALIDACION', 'Uno de los campos contiene un valor no válido.'],
    ])('traduce el código PostgreSQL %s', async (code, estado, codigo, mensaje) => {
      normalizarDatosLote.mockReturnValue(loteNormalizado);
      medicamentosRepositorio.buscarPorId.mockResolvedValue(medicamentoActivo);
      proveedoresRepositorio.buscarPorId.mockResolvedValue(proveedor);
      lotesRepositorio.registrarRecepcion.mockRejectedValue({ code });

      await expect(registrarRecepcion(datos, 1)).rejects.toMatchObject({
        estado,
        codigo,
        message: mensaje,
      });

      expect(lotesRepositorio.registrarRecepcion)
        .toHaveBeenCalledWith(loteNormalizado, 1);
    });

    test('propaga errores no reconocidos del repositorio', async () => {
      const error = new Error('Error inesperado');
      normalizarDatosLote.mockReturnValue(loteNormalizado);
      medicamentosRepositorio.buscarPorId.mockResolvedValue(medicamentoActivo);
      proveedoresRepositorio.buscarPorId.mockResolvedValue(proveedor);
      lotesRepositorio.registrarRecepcion.mockRejectedValue(error);

      await expect(registrarRecepcion(datos, 1)).rejects.toBe(error);
    });
  });

  describe('darBajaVencido', () => {
    const loteVencido = {
      ...loteGuardado,
      estado_lote: 'Vencido',
      fecha_baja: null,
    };

    test.each([0, -1, 1.5, null, undefined, 'abc', ''])(
      'rechaza un usuario inválido (%p) sin consultar el lote',
      async (idUsuario) => {
        await expect(darBajaVencido(25, idUsuario)).rejects.toMatchObject({
          estado: 400,
          codigo: 'VALIDACION',
          message: 'El usuario que registra la baja no es válido.',
        });

        expect(errorValidacion).toHaveBeenCalledWith(
          'El usuario que registra la baja no es válido.'
        );
        expect(lotesRepositorio.buscarPorId).not.toHaveBeenCalled();
        expect(lotesRepositorio.darBajaVencido).not.toHaveBeenCalled();
      }
    );

    test('rechaza un lote inexistente', async () => {
      lotesRepositorio.buscarPorId.mockResolvedValue(null);

      await expect(darBajaVencido(99, 1)).rejects.toMatchObject({
        estado: 404,
        codigo: 'NO_ENCONTRADO',
        message: 'Lote no encontrado.',
      });

      expect(lotesRepositorio.darBajaVencido).not.toHaveBeenCalled();
    });

    test('rechaza un lote ya dado de baja', async () => {
      lotesRepositorio.buscarPorId.mockResolvedValue({
        ...loteVencido,
        fecha_baja: '2026-01-01',
      });

      await expect(darBajaVencido(25, 1)).rejects.toMatchObject({
        estado: 409,
        codigo: 'CONFLICTO',
        message: 'Este lote ya fue dado de baja.',
      });

      expect(lotesRepositorio.darBajaVencido).not.toHaveBeenCalled();
    });

    test('rechaza lotes que no están vencidos', async () => {
      lotesRepositorio.buscarPorId.mockResolvedValue({
        ...loteVencido,
        estado_lote: 'Vigente',
      });

      await expect(darBajaVencido(25, 1)).rejects.toMatchObject({
        estado: 400,
        codigo: 'VALIDACION',
        message: 'Solamente se pueden dar de baja lotes vencidos.',
      });

      expect(lotesRepositorio.darBajaVencido).not.toHaveBeenCalled();
    });

    test('da de baja el lote y devuelve el registro actualizado', async () => {
      const loteDadoDeBaja = {
        ...loteVencido,
        fecha_baja: '2026-11-06',
      };
      lotesRepositorio.buscarPorId
        .mockResolvedValueOnce(loteVencido)
        .mockResolvedValueOnce(loteDadoDeBaja);
      lotesRepositorio.darBajaVencido.mockResolvedValue({ id_lote: 25 });

      await expect(darBajaVencido('25', '3')).resolves.toBe(loteDadoDeBaja);

      expect(lotesRepositorio.buscarPorId).toHaveBeenNthCalledWith(1, '25');
      expect(lotesRepositorio.darBajaVencido).toHaveBeenCalledWith('25', 3);
      expect(lotesRepositorio.buscarPorId).toHaveBeenNthCalledWith(2, 25);
    });

    test('reporta conflicto cuando el lote cambió durante la operación', async () => {
      lotesRepositorio.buscarPorId.mockResolvedValue(loteVencido);
      lotesRepositorio.darBajaVencido.mockResolvedValue(null);

      await expect(darBajaVencido(25, 1)).rejects.toMatchObject({
        estado: 409,
        codigo: 'CONFLICTO',
        message: 'El lote ya fue modificado. Actualiza la información.',
      });

      expect(errorConflicto).toHaveBeenCalledWith(
        'El lote ya fue modificado. Actualiza la información.'
      );
    });

    test.each([
      ['23505', 409, 'CONFLICTO', 'Ya existe un lote con ese número para el medicamento seleccionado.'],
      ['23503', 400, 'VALIDACION', 'El medicamento o proveedor seleccionado no existe.'],
      ['23514', 400, 'VALIDACION', 'Los datos de la recepción no cumplen las reglas del sistema. Comprueba la fecha, el costo y la cantidad.'],
      ['22001', 400, 'VALIDACION', 'Uno de los campos contiene un valor no válido.'],
      ['22P02', 400, 'VALIDACION', 'Uno de los campos contiene un valor no válido.'],
      ['22003', 400, 'VALIDACION', 'Uno de los campos contiene un valor no válido.'],
    ])('traduce el código PostgreSQL %s al dar de baja', async (code, estado, codigo, mensaje) => {
      lotesRepositorio.buscarPorId.mockResolvedValue(loteVencido);
      lotesRepositorio.darBajaVencido.mockRejectedValue({ code });

      await expect(darBajaVencido(25, 1)).rejects.toMatchObject({
        estado,
        codigo,
        message: mensaje,
      });
    });

    test('repropaga los errores de negocio lanzados por el repositorio', async () => {
      const errorNegocio = new Error('Conflicto de negocio');
      errorNegocio.name = 'ErrorAplicacion';
      lotesRepositorio.buscarPorId.mockResolvedValue(loteVencido);
      lotesRepositorio.darBajaVencido.mockRejectedValue(errorNegocio);

      await expect(darBajaVencido(25, 1)).rejects.toBe(errorNegocio);
    });

    test('propaga errores no reconocidos al dar de baja', async () => {
      const error = new Error('Error inesperado');
      lotesRepositorio.buscarPorId.mockResolvedValue(loteVencido);
      lotesRepositorio.darBajaVencido.mockRejectedValue(error);

      await expect(darBajaVencido(25, 1)).rejects.toBe(error);
    });

    test('propaga el error al consultar el lote', async () => {
      const error = new Error('Error de base de datos');
      lotesRepositorio.buscarPorId.mockRejectedValue(error);

      await expect(darBajaVencido(25, 1)).rejects.toBe(error);

      expect(lotesRepositorio.darBajaVencido).not.toHaveBeenCalled();
    });
  });
});
