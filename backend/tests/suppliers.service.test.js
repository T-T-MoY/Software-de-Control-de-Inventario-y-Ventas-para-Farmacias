jest.mock('../data/repositories/suppliers.repository', () => ({
  listar: jest.fn(),
  buscarPorId: jest.fn(),
  crear: jest.fn(),
  actualizar: jest.fn(),
}));

jest.mock('../business/rules/suppliers.rules', () => ({
  normalizarDatosProveedor: jest.fn(),
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
    errorValidacion: jest.fn((mensaje) => new ErrorAplicacion(mensaje, {
      estado: 400,
      codigo: 'VALIDACION',
    })),
    errorNoEncontrado: jest.fn((mensaje) => new ErrorAplicacion(mensaje, {
      estado: 404,
      codigo: 'NO_ENCONTRADO',
    })),
  };
});

const proveedoresRepositorio = require('../data/repositories/suppliers.repository');
const { normalizarDatosProveedor } = require('../business/rules/suppliers.rules');
const {
  errorConflicto,
  errorNoEncontrado,
} = require('../business/errors/app-error');
const {
  listar,
  obtener,
  crear,
  actualizar,
} = require('../business/services/suppliers.service');

describe('servicio de proveedores', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const proveedorNormalizado = {
    nombre_comercial: 'Distribuidora Andina',
    ruc_nit: '123456789',
    telefono: '70000000',
    correo_electronico: 'ventas@andina.test',
    direccion: 'Calle 1',
  };

  describe('listar', () => {
    test('usa el término vacío por defecto', async () => {
      const proveedores = [{ id_proveedor: 1 }];
      proveedoresRepositorio.listar.mockResolvedValue(proveedores);

      await expect(listar()).resolves.toBe(proveedores);

      expect(proveedoresRepositorio.listar).toHaveBeenCalledWith('');
    });

    test('envía el término de búsqueda al repositorio', async () => {
      proveedoresRepositorio.listar.mockResolvedValue([]);

      await expect(listar(' Andina ')).resolves.toEqual([]);

      expect(proveedoresRepositorio.listar).toHaveBeenCalledWith(' Andina ');
    });

    test('propaga el error del repositorio', async () => {
      const error = new Error('Error de base de datos');
      proveedoresRepositorio.listar.mockRejectedValue(error);

      await expect(listar()).rejects.toBe(error);
    });
  });

  describe('obtener', () => {
    test('devuelve el proveedor encontrado', async () => {
      const proveedor = { id_proveedor: 1 };
      proveedoresRepositorio.buscarPorId.mockResolvedValue(proveedor);

      await expect(obtener(1)).resolves.toBe(proveedor);

      expect(proveedoresRepositorio.buscarPorId).toHaveBeenCalledWith(1);
    });

    test.each([null, undefined])('rechaza un proveedor ausente (%p)', async (id) => {
      proveedoresRepositorio.buscarPorId.mockResolvedValue(null);

      await expect(obtener(id)).rejects.toMatchObject({
        estado: 404,
        codigo: 'NO_ENCONTRADO',
        message: 'Proveedor no encontrado.',
      });

      expect(errorNoEncontrado).toHaveBeenCalledWith('Proveedor no encontrado.');
    });

    test('propaga el error del repositorio', async () => {
      const error = new Error('Error de base de datos');
      proveedoresRepositorio.buscarPorId.mockRejectedValue(error);

      await expect(obtener(1)).rejects.toBe(error);
    });
  });

  describe('crear', () => {
    test('normaliza y crea el proveedor', async () => {
      const creado = { id_proveedor: 9, ...proveedorNormalizado };
      normalizarDatosProveedor.mockReturnValue(proveedorNormalizado);
      proveedoresRepositorio.crear.mockResolvedValue(creado);

      await expect(crear({ nombre_comercial: ' Distribuidora Andina ' }))
        .resolves.toBe(creado);

      expect(normalizarDatosProveedor).toHaveBeenCalledWith({
        nombre_comercial: ' Distribuidora Andina ',
      });
      expect(proveedoresRepositorio.crear).toHaveBeenCalledWith(proveedorNormalizado);
    });

    test.each([
      ['23505', 409, 'CONFLICTO', 'Ya existe un proveedor registrado con ese RUC/NIT.'],
      ['22001', 400, 'VALIDACION', 'Uno de los campos supera la longitud permitida.'],
      ['23514', 400, 'VALIDACION', 'Los datos del proveedor no cumplen las reglas del sistema.'],
    ])('traduce el código PostgreSQL %s al crear', async (code, estado, codigo, mensaje) => {
      normalizarDatosProveedor.mockReturnValue(proveedorNormalizado);
      proveedoresRepositorio.crear.mockRejectedValue({ code });

      await expect(crear({})).rejects.toMatchObject({ estado, codigo, message: mensaje });

      expect(proveedoresRepositorio.crear).toHaveBeenCalledWith(proveedorNormalizado);
    });

    test('propaga errores no reconocidos al crear', async () => {
      const error = new Error('Error inesperado');
      normalizarDatosProveedor.mockReturnValue(proveedorNormalizado);
      proveedoresRepositorio.crear.mockRejectedValue(error);

      await expect(crear({})).rejects.toBe(error);
    });

    test('propaga el error de normalización sin llamar al repositorio', async () => {
      const error = new Error('El nombre comercial es obligatorio.');
      normalizarDatosProveedor.mockImplementation(() => {
        throw error;
      });

      await expect(crear({})).rejects.toBe(error);

      expect(proveedoresRepositorio.crear).not.toHaveBeenCalled();
    });
  });

  describe('actualizar', () => {
    test('normaliza y actualiza el proveedor indicado', async () => {
      const actualizado = { id_proveedor: 9, ...proveedorNormalizado };
      normalizarDatosProveedor.mockReturnValue(proveedorNormalizado);
      proveedoresRepositorio.actualizar.mockResolvedValue(actualizado);

      await expect(actualizar(9, { nombre_comercial: 'Andina' }))
        .resolves.toBe(actualizado);

      expect(normalizarDatosProveedor).toHaveBeenCalledWith({
        nombre_comercial: 'Andina',
      });
      expect(proveedoresRepositorio.actualizar)
        .toHaveBeenCalledWith(9, proveedorNormalizado);
    });

    test('rechaza un proveedor inexistente', async () => {
      normalizarDatosProveedor.mockReturnValue(proveedorNormalizado);
      proveedoresRepositorio.actualizar.mockResolvedValue(null);

      await expect(actualizar(99, {})).rejects.toMatchObject({
        estado: 404,
        codigo: 'NO_ENCONTRADO',
        message: 'Proveedor no encontrado.',
      });

      expect(errorNoEncontrado).toHaveBeenCalledWith('Proveedor no encontrado.');
    });

    test('repropaga los errores de negocio lanzados por el repositorio', async () => {
      const error = new Error('Conflicto de negocio');
      error.name = 'ErrorAplicacion';
      normalizarDatosProveedor.mockReturnValue(proveedorNormalizado);
      proveedoresRepositorio.actualizar.mockRejectedValue(error);

      await expect(actualizar(9, {})).rejects.toBe(error);
    });

    test.each([
      ['23505', 409, 'CONFLICTO', 'Ya existe un proveedor registrado con ese RUC/NIT.'],
      ['22001', 400, 'VALIDACION', 'Uno de los campos supera la longitud permitida.'],
      ['23514', 400, 'VALIDACION', 'Los datos del proveedor no cumplen las reglas del sistema.'],
    ])('traduce el código PostgreSQL %s al actualizar', async (code, estado, codigo, mensaje) => {
      normalizarDatosProveedor.mockReturnValue(proveedorNormalizado);
      proveedoresRepositorio.actualizar.mockRejectedValue({ code });

      await expect(actualizar(9, {})).rejects.toMatchObject({
        estado,
        codigo,
        message: mensaje,
      });
    });

    test('propaga errores no reconocidos al actualizar', async () => {
      const error = new Error('Error inesperado');
      normalizarDatosProveedor.mockReturnValue(proveedorNormalizado);
      proveedoresRepositorio.actualizar.mockRejectedValue(error);

      await expect(actualizar(9, {})).rejects.toBe(error);
    });

    test('propaga el error de normalización sin llamar al repositorio', async () => {
      const error = new Error('El RUC/NIT es obligatorio.');
      normalizarDatosProveedor.mockImplementation(() => {
        throw error;
      });

      await expect(actualizar(9, {})).rejects.toBe(error);

      expect(proveedoresRepositorio.actualizar).not.toHaveBeenCalled();
    });
  });
});
