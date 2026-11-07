jest.mock('../data/repositories/customers.repository', () => ({
  listar: jest.fn(),
  buscarPorId: jest.fn(),
  crear: jest.fn(),
  actualizar: jest.fn(),
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

const clientesRepositorio = require('../data/repositories/customers.repository');
const {
  errorConflicto,
  errorNoEncontrado,
  errorValidacion,
} = require('../business/errors/app-error');
const {
  listar,
  obtener,
  crear,
  actualizar,
} = require('../business/services/customers.service');

describe('servicio de clientes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listar', () => {
    test('lista clientes usando el término vacío por defecto', async () => {
      const clientes = [{ id_cliente: 1, nombres: 'Ana' }];
      clientesRepositorio.listar.mockResolvedValue(clientes);

      await expect(listar()).resolves.toBe(clientes);

      expect(clientesRepositorio.listar).toHaveBeenCalledWith('');
    });

    test('envía el término de búsqueda al repositorio y devuelve sus resultados', async () => {
      const clientes = [{ id_cliente: 2, nombres: 'Luis' }];
      clientesRepositorio.listar.mockResolvedValue(clientes);

      await expect(listar(' Luis ')).resolves.toBe(clientes);

      expect(clientesRepositorio.listar).toHaveBeenCalledWith(' Luis ');
    });

    test('propaga errores del repositorio', async () => {
      const error = new Error('Error de base de datos');
      clientesRepositorio.listar.mockRejectedValue(error);

      await expect(listar('Ana')).rejects.toBe(error);

      expect(clientesRepositorio.listar).toHaveBeenCalledWith('Ana');
    });
  });

  describe('obtener', () => {
    test('devuelve el cliente encontrado', async () => {
      const cliente = { id_cliente: 7, nombres: 'Ana' };
      clientesRepositorio.buscarPorId.mockResolvedValue(cliente);

      await expect(obtener(7)).resolves.toBe(cliente);

      expect(clientesRepositorio.buscarPorId).toHaveBeenCalledWith(7);
    });

    test.each([null, undefined])('rechaza un cliente ausente para id %p', async (id) => {
      clientesRepositorio.buscarPorId.mockResolvedValue(null);

      await expect(obtener(id)).rejects.toMatchObject({
        name: 'ErrorAplicacion',
        estado: 404,
        codigo: 'NO_ENCONTRADO',
        message: 'Cliente no encontrado.',
      });

      expect(clientesRepositorio.buscarPorId).toHaveBeenCalledWith(id);
      expect(errorNoEncontrado).toHaveBeenCalledWith('Cliente no encontrado.');
    });

    test('propaga errores del repositorio', async () => {
      const error = new Error('Error de base de datos');
      clientesRepositorio.buscarPorId.mockRejectedValue(error);

      await expect(obtener(7)).rejects.toBe(error);

      expect(clientesRepositorio.buscarPorId).toHaveBeenCalledWith(7);
    });
  });

  describe('crear', () => {
    test('normaliza los campos antes de crear el cliente', async () => {
      const clienteCreado = { id_cliente: 3, nombres: 'Ana' };
      clientesRepositorio.crear.mockResolvedValue(clienteCreado);

      await expect(crear({
        nombres: '  Ana  ',
        apellido_paterno: '  Pérez ',
        apellido_materno: ' ',
        ci_nit: ' 123456 ',
      })).resolves.toBe(clienteCreado);

      expect(clientesRepositorio.crear).toHaveBeenCalledWith({
        nombres: 'Ana',
        apellido_paterno: 'Pérez',
        apellido_materno: null,
        ci_nit: '123456',
      });
    });

    test('convierte campos nulos o ausentes en cadenas vacías o null', async () => {
      clientesRepositorio.crear.mockResolvedValue({ id_cliente: 4 });

      await crear({
        nombres: null,
        apellido_paterno: null,
        ci_nit: undefined,
      });

      expect(clientesRepositorio.crear).toHaveBeenCalledWith({
        nombres: '',
        apellido_paterno: null,
        apellido_materno: null,
        ci_nit: '',
      });
    });

    test.each([null, undefined, [], 'cliente'])(
      'rechaza datos inválidos (%p) sin llamar al repositorio',
      async (datos) => {
        await expect(crear(datos)).rejects.toMatchObject({
          name: 'ErrorAplicacion',
          estado: 400,
          codigo: 'VALIDACION',
          message: 'Los datos del cliente son obligatorios.',
        });

        expect(clientesRepositorio.crear).not.toHaveBeenCalled();
        expect(errorValidacion).toHaveBeenCalledWith(
          'Los datos del cliente son obligatorios.'
        );
      }
    );

    test('traduce CI/NIT duplicado a conflicto', async () => {
      clientesRepositorio.crear.mockRejectedValue({ code: '23505' });

      await expect(crear({ nombres: 'Ana', ci_nit: '123' })).rejects.toMatchObject({
        estado: 409,
        codigo: 'CONFLICTO',
        message: 'Ya existe un cliente registrado con ese CI/NIT.',
      });

      expect(clientesRepositorio.crear).toHaveBeenCalledWith({
        nombres: 'Ana',
        apellido_paterno: null,
        apellido_materno: null,
        ci_nit: '123',
      });
      expect(errorConflicto).toHaveBeenCalledWith(
        'Ya existe un cliente registrado con ese CI/NIT.'
      );
    });

    test.each(['22001', '23514'])('traduce error de datos %s a validación', async (code) => {
      clientesRepositorio.crear.mockRejectedValue({ code });

      await expect(crear({ nombres: 'Ana', ci_nit: '123' })).rejects.toMatchObject({
        estado: 400,
        codigo: 'VALIDACION',
        message: 'Uno de los datos del cliente no cumple el formato permitido.',
      });

      expect(errorValidacion).toHaveBeenCalledWith(
        'Uno de los datos del cliente no cumple el formato permitido.'
      );
    });

    test('propaga errores de creación no reconocidos', async () => {
      const error = new Error('Error inesperado');
      clientesRepositorio.crear.mockRejectedValue(error);

      await expect(crear({ nombres: 'Ana', ci_nit: '123' })).rejects.toBe(error);

      expect(clientesRepositorio.crear).toHaveBeenCalledWith({
        nombres: 'Ana',
        apellido_paterno: null,
        apellido_materno: null,
        ci_nit: '123',
      });
    });
  });

  describe('actualizar', () => {
    test('normaliza datos y actualiza el cliente indicado', async () => {
      const clienteActualizado = { id_cliente: 5, nombres: 'María' };
      clientesRepositorio.actualizar.mockResolvedValue(clienteActualizado);

      await expect(actualizar(5, {
        nombres: ' María ',
        apellido_paterno: '',
        apellido_materno: ' López ',
        ci_nit: ' 789 ',
      })).resolves.toBe(clienteActualizado);

      expect(clientesRepositorio.actualizar).toHaveBeenCalledWith(5, {
        nombres: 'María',
        apellido_paterno: null,
        apellido_materno: 'López',
        ci_nit: '789',
      });
    });

    test('rechaza actualización cuando el cliente no existe', async () => {
      clientesRepositorio.actualizar.mockResolvedValue(null);

      await expect(actualizar(99, { nombres: 'Ana' })).rejects.toMatchObject({
        name: 'ErrorAplicacion',
        estado: 404,
        codigo: 'NO_ENCONTRADO',
        message: 'Cliente no encontrado.',
      });

      expect(clientesRepositorio.actualizar).toHaveBeenCalledWith(99, {
        nombres: 'Ana',
        apellido_paterno: null,
        apellido_materno: null,
        ci_nit: '',
      });
      expect(errorNoEncontrado).toHaveBeenCalledWith('Cliente no encontrado.');
    });

    test('rechaza datos inválidos antes de actualizar', async () => {
      await expect(actualizar(5, [])).rejects.toMatchObject({
        estado: 400,
        codigo: 'VALIDACION',
      });

      expect(clientesRepositorio.actualizar).not.toHaveBeenCalled();
    });

    test('traduce CI/NIT duplicado a conflicto', async () => {
      clientesRepositorio.actualizar.mockRejectedValue({ code: '23505' });

      await expect(actualizar(5, { nombres: 'Ana', ci_nit: '123' }))
        .rejects.toMatchObject({
          estado: 409,
          codigo: 'CONFLICTO',
        });

      expect(clientesRepositorio.actualizar).toHaveBeenCalledWith(5, {
        nombres: 'Ana',
        apellido_paterno: null,
        apellido_materno: null,
        ci_nit: '123',
      });
      expect(errorConflicto).toHaveBeenCalledWith(
        'Ya existe un cliente registrado con ese CI/NIT.'
      );
    });

    test.each(['22001', '23514'])('traduce error de datos %s a validación', async (code) => {
      clientesRepositorio.actualizar.mockRejectedValue({ code });

      await expect(actualizar(5, { nombres: 'Ana', ci_nit: '123' }))
        .rejects.toMatchObject({
          estado: 400,
          codigo: 'VALIDACION',
        });

      expect(errorValidacion).toHaveBeenCalledWith(
        'Uno de los datos del cliente no cumple el formato permitido.'
      );
    });

    test('propaga errores de actualización no reconocidos', async () => {
      const error = new Error('Error inesperado');
      clientesRepositorio.actualizar.mockRejectedValue(error);

      await expect(actualizar(5, { nombres: 'Ana' })).rejects.toBe(error);

      expect(clientesRepositorio.actualizar).toHaveBeenCalledWith(5, {
        nombres: 'Ana',
        apellido_paterno: null,
        apellido_materno: null,
        ci_nit: '',
      });
    });
  });
});
